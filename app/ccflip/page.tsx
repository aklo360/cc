'use client';

/**
 * CC Flip - Secure Escrow Coin Flip
 *
 * Uses commit-reveal pattern for provably fair gameplay:
 * 1. Server commits to result (sends hash)
 * 2. User deposits tokens (signs + sends tx)
 * 3. Server reveals result (user can verify hash)
 *
 * This ensures:
 * - User MUST deposit before result is revealed
 * - Server can't manipulate result after seeing deposit
 * - User can verify fairness using the revealed secret
 */

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  WalletProvider,
  ConnectWallet,
  BetInput,
  FeeDisplay,
  GameResult,
  ProvablyFair,
  useBalance,
} from '@/app/components/gamefi';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

// Game configuration
const GAME_CONFIG = {
  minBet: 1,
  maxBet: 1_000_000, // 1M $CC max bet
  platformFeeSol: 0.0005, // ~$0.05 USD platform fee (funds buyback & burn)
  houseEdgePercent: 2,
  multiplier: 1.96, // 2x minus 2% house edge
};

// Network-aware configuration
const MAINNET_CC_MINT = 'Hg23qBLJDvhQtGLHMvot7NK54qAhzQFj9BVd5jpABAGS';
const DEVNET_CC_MINT = 'GzoMpC5ywKJzHsKmHBepHUXBP72V9QMtVBqus3egCDe9';

// Default to mainnet (production), can be overridden via env var
const DEFAULT_NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta') as 'mainnet-beta' | 'devnet';

function getNetworkConfig(network: 'mainnet-beta' | 'devnet') {
  const isMainnet = network === 'mainnet-beta';
  return {
    network,
    isMainnet,
    ccMint: new PublicKey(
      isMainnet
        ? (process.env.NEXT_PUBLIC_CC_MINT || MAINNET_CC_MINT)
        : (process.env.NEXT_PUBLIC_DEVNET_CC_MINT || DEVNET_CC_MINT)
    ),
    solscanCluster: isMainnet ? '' : '?cluster=devnet',
  };
}

type CoinChoice = 'heads' | 'tails';
type GameState =
  | 'idle'
  | 'committing'    // Getting commitment from server
  | 'depositing'    // Building + signing transfer tx
  | 'confirming'    // Waiting for tx confirmation
  | 'resolving'     // Submitting tx to server for result
  | 'result';       // Showing result

interface Commitment {
  id: string;
  hash: string;
  depositTo: string;
  depositAmount: number;
  expiresAt: number;
  feeRecipient?: string;
  platformFeeLamports?: number;
}

function DevnetFaucetButton({ show }: { show: boolean }) {
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  if (!show) return null;

  const requestAirdrop = async () => {
    if (!publicKey) {
      setStatus('Connect wallet first');
      return;
    }

    setLoading(true);
    setStatus('Requesting airdrop...');

    try {
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const signature = await connection.requestAirdrop(publicKey, 0.5 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(signature, 'confirmed');
      setStatus('Got 0.5 SOL!');
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      console.error('Airdrop failed:', error);
      setStatus('Airdrop failed - try again');
      setTimeout(() => setStatus(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={requestAirdrop}
      disabled={loading || !publicKey}
      className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Requesting...' : status || 'Get Test SOL'}
    </button>
  );
}

// Brain API URL
const BRAIN_API = process.env.NEXT_PUBLIC_BRAIN_API || 'https://brain.claudecode.wtf';

interface NetworkConfig {
  network: 'mainnet-beta' | 'devnet';
  isMainnet: boolean;
  ccMint: PublicKey;
  solscanCluster: string;
}

function CoinFlipGame({ networkConfig }: { networkConfig: NetworkConfig }) {
  const { cc: balance, refresh: refreshBalance, isLoading: balanceLoading, error: balanceError } = useBalance();
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  // Debug: log connection and balance info
  useEffect(() => {
    console.log('[CCFlip] Network config:', networkConfig.network, networkConfig.isMainnet ? 'MAINNET' : 'DEVNET');
    console.log('[CCFlip] CC Mint:', networkConfig.ccMint.toBase58());
    console.log('[CCFlip] RPC:', connection.rpcEndpoint);
    console.log('[CCFlip] Balance:', balance, 'Loading:', balanceLoading, 'Error:', balanceError);
  }, [networkConfig, connection.rpcEndpoint, balance, balanceLoading, balanceError]);

  // Game state
  const [gameState, setGameState] = useState<GameState>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [betAmount, setBetAmount] = useState(10);
  const [choice, setChoice] = useState<CoinChoice>('heads');
  const [result, setResult] = useState<'win' | 'lose' | null>(null);
  const [flipResult, setFlipResult] = useState<CoinChoice | null>(null);
  const [payout, setPayout] = useState(0);
  const [showResult, setShowResult] = useState(false);

  // Commit-reveal state
  const [commitment, setCommitment] = useState<Commitment | null>(null);
  const [depositTxSignature, setDepositTxSignature] = useState<string | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [payoutTxSignature, setPayoutTxSignature] = useState<string | null>(null);

  // History
  const [history, setHistory] = useState<
    Array<{ choice: CoinChoice; result: CoinChoice; won: boolean; amount: number }>
  >([]);

  // Check for existing pending commitment on wallet change
  useEffect(() => {
    // Reset commitment when wallet changes
    if (commitment && publicKey?.toBase58() !== commitment.depositTo) {
      setCommitment(null);
    }
  }, [publicKey, commitment]);

  const handleFlip = useCallback(async () => {
    if (!publicKey || !signTransaction) {
      alert('Please connect your wallet first');
      return;
    }

    if (betAmount > balance) {
      alert('Insufficient $CC balance');
      return;
    }

    // Reset state
    setResult(null);
    setFlipResult(null);
    setRevealedSecret(null);
    setPayoutTxSignature(null);
    setDepositTxSignature(null);

    try {
      // ===== STEP 1: Get commitment from server =====
      setGameState('committing');
      setStatusMessage('Getting commitment from server...');

      const commitResponse = await fetch(`${BRAIN_API}/flip/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          bet: betAmount,
          choice,
        }),
      });

      const commitData = await commitResponse.json();

      if (!commitResponse.ok) {
        // If we have a pending commitment, try to cancel it and retry once
        if (commitResponse.status === 409 && commitData.commitmentId) {
          console.log('[Flip] Cancelling stale commitment and retrying...');
          setStatusMessage('Clearing stale session...');

          // Cancel the stale commitment
          const cancelResponse = await fetch(`${BRAIN_API}/flip/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet: publicKey.toBase58() }),
          });

          if (cancelResponse.ok) {
            // Retry the commit
            const retryResponse = await fetch(`${BRAIN_API}/flip/commit`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                wallet: publicKey.toBase58(),
                bet: betAmount,
                choice,
              }),
            });

            const retryData = await retryResponse.json();
            if (!retryResponse.ok) {
              throw new Error(retryData.error || 'Failed to get commitment after retry');
            }
            // Use the retry data instead
            Object.assign(commitData, retryData);
          } else {
            throw new Error(commitData.error || 'Failed to get commitment');
          }
        } else {
          throw new Error(commitData.error || 'Failed to get commitment');
        }
      }

      const newCommitment: Commitment = {
        id: commitData.commitmentId,
        hash: commitData.commitment,
        depositTo: commitData.depositTo,
        depositAmount: commitData.depositAmount,
        expiresAt: commitData.expiresAt,
        feeRecipient: commitData.feeRecipient,
        platformFeeLamports: commitData.platformFeeLamports,
      };
      setCommitment(newCommitment);

      // ===== STEP 2: Build and sign deposit transaction =====
      setGameState('depositing');
      setStatusMessage('Please approve the transaction in your wallet...');

      // Get ATAs using network-specific mint
      const userAta = await getAssociatedTokenAddress(networkConfig.ccMint, publicKey);
      const brainAta = new PublicKey(newCommitment.depositTo);

      // Build $CC transfer instruction
      const transferIx = createTransferInstruction(
        userAta,
        brainAta,
        publicKey,
        BigInt(newCommitment.depositAmount)
      );

      // Create transaction
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      const tx = new Transaction();
      tx.recentBlockhash = blockhash;
      tx.lastValidBlockHeight = lastValidBlockHeight;
      tx.feePayer = publicKey;
      tx.add(transferIx);

      // Add SOL platform fee transfer (funds buyback & burn)
      if (newCommitment.feeRecipient && newCommitment.platformFeeLamports && newCommitment.platformFeeLamports > 0) {
        const solFeeIx = SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(newCommitment.feeRecipient),
          lamports: newCommitment.platformFeeLamports,
        });
        tx.add(solFeeIx);
      }

      // Sign transaction (user approves in wallet)
      const signedTx = await signTransaction(tx);

      // ===== STEP 3: Send transaction to chain =====
      setGameState('confirming');
      setStatusMessage('Confirming deposit on chain...');

      const txSignature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction({
        signature: txSignature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      setDepositTxSignature(txSignature);

      // ===== STEP 4: Submit to server for resolution =====
      setGameState('resolving');
      setStatusMessage('Flipping coin...');

      const resolveResponse = await fetch(`${BRAIN_API}/flip/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commitmentId: newCommitment.id,
          txSignature,
        }),
      });

      const resolveData = await resolveResponse.json();

      if (!resolveResponse.ok) {
        throw new Error(resolveData.error || 'Failed to resolve flip');
      }

      // ===== STEP 5: Show result =====
      setFlipResult(resolveData.result);
      setResult(resolveData.won ? 'win' : 'lose');
      setPayout(resolveData.payout);
      setRevealedSecret(resolveData.secret);
      if (resolveData.payoutTx) {
        setPayoutTxSignature(resolveData.payoutTx);
      }

      // Add to history
      setHistory((prev) => [
        { choice, result: resolveData.result, won: resolveData.won, amount: betAmount },
        ...prev.slice(0, 9),
      ]);

      setGameState('result');
      setShowResult(true);

      // Refresh balance
      setTimeout(() => refreshBalance(), 2000);

    } catch (error) {
      console.error('Flip error:', error);
      const errorMessage = (error as Error).message;

      // Check if user rejected the transaction
      if (errorMessage.includes('User rejected') || errorMessage.includes('rejected')) {
        setStatusMessage('Transaction cancelled');
      } else {
        alert(`Flip failed: ${errorMessage}`);
      }

      setGameState('idle');
      setCommitment(null);
    }
  }, [betAmount, balance, choice, publicKey, signTransaction, connection, refreshBalance]);

  const handlePlayAgain = () => {
    setShowResult(false);
    setGameState('idle');
    setStatusMessage('');
    setResult(null);
    setFlipResult(null);
    setCommitment(null);
    setRevealedSecret(null);
    setDepositTxSignature(null);
    setPayoutTxSignature(null);
  };

  // Get button text based on state
  const getButtonText = () => {
    switch (gameState) {
      case 'committing':
        return 'GETTING COMMITMENT...';
      case 'depositing':
        return 'APPROVE IN WALLET...';
      case 'confirming':
        return 'CONFIRMING DEPOSIT...';
      case 'resolving':
        return 'FLIPPING...';
      default:
        return 'FLIP COIN';
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-4 sm:py-8 px-[5%]">
      <div className="max-w-[500px] w-[90%]">
        {/* Header */}
        <header className="flex items-center gap-3 py-3 mb-6">
          <Link href="/" className="flex gap-2 hover:opacity-80 transition-opacity">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </Link>
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <img src="/cc.png" alt="$CC" width={24} height={24} />
          </Link>
          <span className="text-claude-orange font-semibold text-sm">
            CC Flip
          </span>
          {/* Network Badge */}
          {networkConfig.isMainnet ? (
            <span className="bg-accent-green text-black text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase">
              Mainnet
            </span>
          ) : (
            <span className="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase">
              Devnet
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <DevnetFaucetButton show={!networkConfig.isMainnet} />
            <ConnectWallet showBalance />
          </div>
        </header>

        {/* Devnet Notice - Only show on devnet */}
        {!networkConfig.isMainnet && (
          <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-3 mb-4 text-center">
            <p className="text-purple-300 text-xs">
              Playing on Solana Devnet. Set your wallet to devnet network.
              <br />
              <span className="text-purple-400">Tokens have no real value.</span>
            </p>
          </div>
        )}

        {/* Main Game Area */}
        <div className="bg-bg-secondary border border-border rounded-lg p-6 mb-4">
          {/* Coin Display - 3D Flip with Heads/Tails */}
          <div className="flex justify-center mb-6" style={{ perspective: '1000px' }}>
            <div
              className="w-32 h-32 relative"
              style={{
                transformStyle: 'preserve-3d',
                animation: gameState === 'resolving' ? 'coinFlip 0.2s linear infinite' : 'none',
                transform: flipResult === 'tails' ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transition: gameState === 'resolving' ? 'none' : 'transform 0.3s ease-out',
              }}
            >
              {/* Heads side (front) */}
              <div
                className="absolute w-full h-full rounded-full bg-gradient-to-b from-claude-orange to-[#b85a3a] flex items-center justify-center text-4xl font-bold shadow-lg"
                style={{ backfaceVisibility: 'hidden' }}
              >
                👑
              </div>
              {/* Tails side (back) */}
              <div
                className="absolute w-full h-full rounded-full bg-gradient-to-b from-claude-orange to-[#b85a3a] flex items-center justify-center text-4xl font-bold shadow-lg"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                🛡️
              </div>
            </div>
          </div>
          <style jsx>{`
            @keyframes coinFlip {
              0% { transform: rotateY(0deg); }
              100% { transform: rotateY(360deg); }
            }
          `}</style>

          {/* Status Message */}
          {statusMessage && gameState !== 'idle' && gameState !== 'result' && (
            <div className="text-center mb-4">
              <p className="text-text-secondary text-sm">{statusMessage}</p>
            </div>
          )}

          {/* Choice Buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setChoice('heads')}
              disabled={gameState !== 'idle'}
              className={`flex-1 py-3 px-4 rounded-md font-semibold text-lg transition-all ${
                choice === 'heads'
                  ? 'bg-claude-orange text-white'
                  : 'bg-bg-tertiary border border-border text-text-secondary hover:border-claude-orange'
              } disabled:opacity-50`}
            >
              👑 HEADS
            </button>
            <button
              onClick={() => setChoice('tails')}
              disabled={gameState !== 'idle'}
              className={`flex-1 py-3 px-4 rounded-md font-semibold text-lg transition-all ${
                choice === 'tails'
                  ? 'bg-claude-orange text-white'
                  : 'bg-bg-tertiary border border-border text-text-secondary hover:border-claude-orange'
              } disabled:opacity-50`}
            >
              🛡️ TAILS
            </button>
          </div>

          {/* Bet Input */}
          <BetInput
            value={betAmount}
            onChange={setBetAmount}
            min={GAME_CONFIG.minBet}
            max={GAME_CONFIG.maxBet}
            balance={balance}
            disabled={gameState !== 'idle'}
            className="mb-4"
          />

          {/* Fee Display */}
          <FeeDisplay
            platformFeeSol={GAME_CONFIG.platformFeeSol}
            betAmount={betAmount}
            multiplier={GAME_CONFIG.multiplier}
            houseEdgePercent={GAME_CONFIG.houseEdgePercent}
            className="mb-4"
          />

          {/* Flip Button */}
          <button
            onClick={handleFlip}
            disabled={gameState !== 'idle' || balance === 0 || !publicKey}
            className="w-full bg-accent-green text-black font-bold py-4 rounded-md text-lg hover:bg-accent-green/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {getButtonText()}
          </button>

          {/* Security Badge */}
          <div className="mt-4 flex items-center justify-center gap-2 text-text-muted text-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Secure escrow • You sign deposits • Provably fair</span>
          </div>

          {/* Debug Panel */}
          <div className="mt-4 p-2 bg-bg-primary border border-border rounded text-[10px] font-mono text-text-muted">
            <div>Network: {networkConfig.isMainnet ? 'MAINNET' : 'DEVNET'}</div>
            <div>Mint: {networkConfig.ccMint.toBase58().slice(0, 8)}...</div>
            <div>RPC: {connection.rpcEndpoint.includes('mainnet') ? 'mainnet' : connection.rpcEndpoint.includes('devnet') ? 'devnet' : 'unknown'}</div>
            <div>Balance: {balanceLoading ? 'loading...' : balanceError ? 'ERROR' : `${balance.toLocaleString()} $CC`}</div>
            <div>Wallet: {publicKey ? publicKey.toBase58().slice(0, 8) + '...' : 'not connected'}</div>
          </div>
        </div>

        {/* Provably Fair - Show commitment info */}
        {(commitment || revealedSecret) && (
          <ProvablyFair
            commitment={commitment?.hash}
            serverSecret={revealedSecret || undefined}
            txSignature={depositTxSignature || undefined}
            result={flipResult || undefined}
            depositTx={depositTxSignature || undefined}
            payoutTx={payoutTxSignature || undefined}
            solscanCluster={networkConfig.solscanCluster}
            className="mb-4"
          />
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-text-secondary text-xs uppercase tracking-wider mb-3">
              Recent Flips
            </h3>
            <div className="space-y-2">
              {history.slice(0, 5).map((h, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-text-muted">
                    {h.choice === 'heads' ? '👑' : '🛡️'} → {h.result === 'heads' ? '👑' : '🛡️'}
                  </span>
                  <span
                    className={
                      h.won ? 'text-accent-green' : 'text-red-400'
                    }
                  >
                    {h.won ? `+${Math.floor(h.amount * 0.96)}` : `-${h.amount}`} $CC
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="py-4 mt-6 text-center">
          <Link
            href="/"
            className="text-claude-orange hover:underline text-sm"
          >
            ← back
          </Link>
          <p className="text-text-muted text-xs mt-2">
            claudecode.wtf · secure escrow coin flip
          </p>
        </footer>

        {/* Result Modal */}
        <GameResult
          isOpen={showResult}
          onClose={handlePlayAgain}
          onPlayAgain={handlePlayAgain}
          result={result}
          betAmount={betAmount}
          payout={payout}
          message={
            result === 'win'
              ? `The coin landed on ${flipResult?.toUpperCase()}!`
              : `The coin landed on ${flipResult?.toUpperCase()}.`
          }
        />
      </div>
    </div>
  );
}

function CCFlipPageInner({ network }: { network: 'mainnet-beta' | 'devnet' }) {
  const networkConfig = getNetworkConfig(network);
  return <CoinFlipGame networkConfig={networkConfig} />;
}

export default function CCFlipPage() {
  // Check for ?devnet=1 query param on client to enable devnet mode for testing
  const [network, setNetwork] = useState<'mainnet-beta' | 'devnet'>(DEFAULT_NETWORK);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('devnet') === '1') {
        setNetwork('devnet');
      }
    }
  }, []);

  return (
    <WalletProvider network={network}>
      <CCFlipPageInner network={network} />
    </WalletProvider>
  );
}
