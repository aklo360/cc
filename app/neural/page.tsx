'use client';

/**
 * Neural Network Genesis - On-Chain Gacha (Probability Engine)
 *
 * Uses commit-reveal pattern for provably fair gameplay:
 * 1. Server commits to result (sends hash)
 * 2. User deposits tokens (signs + sends tx)
 * 3. Server reveals tier results (user can verify hash)
 */

import Link from 'next/link';
import { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletProvider, ConnectWallet, FeeDisplay, GameResult, ProvablyFair, useBalance } from '@/app/components/gamefi';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
} from '@solana/spl-token';

// Brain API
const BRAIN_API = process.env.NEXT_PUBLIC_BRAIN_API || 'https://brain.claudecode.wtf';

// Mainnet $CC token
const CC_MINT = new PublicKey('Hg23qBLJDvhQtGLHMvot7NK54qAhzQFj9BVd5jpABAGS');

type NeuronTier = 'Basic' | 'Advanced' | 'Elite' | 'Legendary';
type GameState = 'idle' | 'committing' | 'depositing' | 'confirming' | 'resolving' | 'result';

interface Commitment {
  id: string;
  hash: string;
  depositTo: string;
  depositAmount: number;
  samples: number;
  stakeAmount: number;
  expiresAt: number;
  feeRecipient: string;
  platformFeeLamports: number;
}

interface GachaResult {
  results: NeuronTier[];
  payouts: number[];
  totalPayout: number;
  stakeAmount: number;
  netProfit: number;
  depositTx: string;
  payoutTx: string | null;
  serverSecret: string;
  commitment: string;
}

interface HistoryEntry {
  timestamp: number;
  stake: number;
  tier: NeuronTier;
  multiplier: number;
  payout: number;
}

interface SessionStats {
  samplesCount: number;
  totalStaked: number;
  totalReturned: number;
  netProfit: number;
  samplesSinceT3: number;
}

// Distribution (matches brain)
const DISTRIBUTION: Record<NeuronTier, { prob: number; multiplier: number }> = {
  'Basic': { prob: 0.75, multiplier: 0.4 },
  'Advanced': { prob: 0.18, multiplier: 2 },
  'Elite': { prob: 0.06, multiplier: 4 },
  'Legendary': { prob: 0.01, multiplier: 7 },
};

function NeuralGenesisEngineInner() {
  const { connected, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { cc: ccBalance, refresh: refreshBalance } = useBalance();

  // Game state
  const [gameState, setGameState] = useState<GameState>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [sampleSize, setSampleSize] = useState<1 | 10>(1);
  const [showResult, setShowResult] = useState(false);

  // Commit-reveal state
  const [commitment, setCommitment] = useState<Commitment | null>(null);
  const [gachaResult, setGachaResult] = useState<GachaResult | null>(null);

  // Session tracking
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    samplesCount: 0,
    totalStaked: 0,
    totalReturned: 0,
    netProfit: 0,
    samplesSinceT3: 0,
  });

  // Animation state
  const [evolutionProgress, setEvolutionProgress] = useState(0);

  const stakeAmount = 5_000; // Fixed 5,000 $CC per sample
  const totalStake = stakeAmount * sampleSize;

  const handleSample = useCallback(async () => {
    if (!publicKey || !signTransaction) {
      alert('Please connect your wallet first');
      return;
    }

    if (totalStake > ccBalance) {
      alert('Insufficient $CC balance');
      return;
    }

    // Reset state
    setGachaResult(null);
    setShowResult(false);
    setEvolutionProgress(0);

    try {
      // ===== STEP 1: Get commitment from server =====
      setGameState('committing');
      setStatusMessage('Getting commitment from server...');

      const commitResponse = await fetch(`${BRAIN_API}/gacha/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          samples: sampleSize,
        }),
      });

      const commitData = await commitResponse.json();

      if (!commitResponse.ok) {
        throw new Error(commitData.error || 'Failed to get commitment');
      }

      const newCommitment: Commitment = {
        id: commitData.commitmentId,
        hash: commitData.commitment,
        depositTo: commitData.depositTo,
        depositAmount: commitData.depositAmount,
        samples: commitData.samples,
        stakeAmount: commitData.stakeAmount,
        expiresAt: commitData.expiresAt,
        feeRecipient: commitData.feeRecipient,
        platformFeeLamports: commitData.platformFeeLamports,
      };
      setCommitment(newCommitment);

      // ===== STEP 2: Build and sign deposit transaction =====
      setGameState('depositing');
      setStatusMessage('Please approve the transaction in your wallet...');

      // Get ATAs
      const userAta = await getAssociatedTokenAddress(CC_MINT, publicKey);
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

      // Add SOL platform fee
      if (newCommitment.feeRecipient && newCommitment.platformFeeLamports > 0) {
        const solFeeIx = SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(newCommitment.feeRecipient),
          lamports: newCommitment.platformFeeLamports,
        });
        tx.add(solFeeIx);
      }

      // Sign transaction
      const signedTx = await signTransaction(tx);

      // ===== STEP 3: Send transaction to chain =====
      setGameState('confirming');
      setStatusMessage('Confirming deposit on chain...');

      // Start animation
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress += Math.random() * 10;
        if (currentProgress > 90) currentProgress = 90;
        setEvolutionProgress(currentProgress);
      }, 200);

      const txSignature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      const confirmation = await connection.confirmTransaction({
        signature: txSignature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      if (confirmation.value.err) {
        clearInterval(progressInterval);
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      // ===== STEP 4: Submit to server for resolution =====
      setGameState('resolving');
      setStatusMessage('Synthesizing neural pathways...');
      setEvolutionProgress(95);

      const resolveResponse = await fetch(`${BRAIN_API}/gacha/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commitmentId: newCommitment.id,
          txSignature,
        }),
      });

      clearInterval(progressInterval);
      setEvolutionProgress(100);

      const resolveData = await resolveResponse.json();

      if (!resolveResponse.ok) {
        throw new Error(resolveData.error || 'Failed to resolve gacha');
      }

      // Store result
      const result: GachaResult = {
        results: resolveData.results,
        payouts: resolveData.payouts,
        totalPayout: resolveData.totalPayout,
        stakeAmount: resolveData.stakeAmount,
        netProfit: resolveData.netProfit,
        depositTx: txSignature,
        payoutTx: resolveData.payoutTx,
        serverSecret: resolveData.serverSecret,
        commitment: resolveData.commitment,
      };
      setGachaResult(result);

      // Update history
      result.results.forEach((tier, idx) => {
        const entry: HistoryEntry = {
          timestamp: Date.now() + idx,
          stake: stakeAmount,
          tier,
          multiplier: DISTRIBUTION[tier].multiplier,
          payout: result.payouts[idx],
        };
        setHistory(prev => [entry, ...prev.slice(0, 49)]);
      });

      // Update session stats
      const hasElitePlus = result.results.some(t => t === 'Elite' || t === 'Legendary');
      setSessionStats(prev => ({
        samplesCount: prev.samplesCount + sampleSize,
        totalStaked: prev.totalStaked + totalStake,
        totalReturned: prev.totalReturned + result.totalPayout,
        netProfit: prev.netProfit + result.netProfit,
        samplesSinceT3: hasElitePlus ? 0 : prev.samplesSinceT3 + sampleSize,
      }));

      // Refresh balance
      refreshBalance();

      // Show result
      setGameState('result');
      setShowResult(true);

    } catch (error) {
      console.error('Gacha error:', error);
      alert(error instanceof Error ? error.message : 'Something went wrong');
      setGameState('idle');
      setEvolutionProgress(0);
    }
  }, [publicKey, signTransaction, connection, sampleSize, totalStake, ccBalance, refreshBalance]);

  const handlePlayAgain = () => {
    setShowResult(false);
    setGachaResult(null);
    setCommitment(null);
    setGameState('idle');
    setEvolutionProgress(0);
  };

  const getTierColor = (tier: NeuronTier) => {
    switch (tier) {
      case 'Legendary': return 'text-yellow-400';
      case 'Elite': return 'text-purple-400';
      case 'Advanced': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getTierEmoji = (tier: NeuronTier) => {
    switch (tier) {
      case 'Legendary': return '🧠';
      case 'Elite': return '⚡';
      case 'Advanced': return '🔷';
      default: return '⚪';
    }
  };

  const isProcessing = gameState !== 'idle' && gameState !== 'result';

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-4 sm:py-8 px-[5%]">
      <div className="max-w-[900px] w-[90%]">

        {/* HEADER */}
        <header className="flex items-center gap-3 py-3 mb-6">
          <Link href="/" className="flex gap-2 hover:opacity-80 transition-opacity">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </Link>
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <img src="/cc.png" alt="$CC" width={24} height={24} />
          </Link>
          <span className="text-claude-orange font-semibold text-sm">Neural Network Genesis</span>
          <span className="text-text-muted text-xs ml-auto">On-chain probability engine</span>
        </header>

        {/* WALLET CONNECTION */}
        <div className="mb-6 flex justify-end">
          <ConnectWallet />
        </div>

        {/* MAIN CONTENT */}
        <div className="space-y-4">

          {/* EXPERIMENT INFO */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h2 className="text-text-primary font-semibold mb-2">Cryptographic Neural Evolution</h2>
            <p className="text-text-secondary text-sm mb-3">
              Train AI neurons through verifiable random synthesis. Each sample evolves from basic nodes
              to legendary consciousness cores based on cryptographic entropy.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-bg-primary border border-border rounded p-2">
                <div className="text-text-muted text-xs mb-1">BASIC (75%)</div>
                <div className="text-gray-400 font-bold text-sm">0.4x</div>
              </div>
              <div className="bg-bg-primary border border-border rounded p-2">
                <div className="text-text-muted text-xs mb-1">ADVANCED (18%)</div>
                <div className="text-blue-400 font-bold text-sm">2x</div>
              </div>
              <div className="bg-bg-primary border border-border rounded p-2">
                <div className="text-text-muted text-xs mb-1">ELITE (6%)</div>
                <div className="text-purple-400 font-bold text-sm">4x</div>
              </div>
              <div className="bg-bg-primary border border-border rounded p-2">
                <div className="text-text-muted text-xs mb-1">LEGENDARY (1%)</div>
                <div className="text-yellow-400 font-bold text-sm">7x</div>
              </div>
            </div>
          </div>

          {/* SESSION STATS */}
          {sessionStats.samplesCount > 0 && (
            <div className="bg-bg-secondary border border-border rounded-lg p-4">
              <label className="text-text-secondary text-xs uppercase tracking-wider mb-3 block">
                Current Session
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
                <div>
                  <div className="text-text-muted text-xs mb-1">Samples</div>
                  <div className="text-text-primary font-semibold">{sessionStats.samplesCount}</div>
                </div>
                <div>
                  <div className="text-text-muted text-xs mb-1">Staked</div>
                  <div className="text-text-primary font-semibold">{sessionStats.totalStaked} $CC</div>
                </div>
                <div>
                  <div className="text-text-muted text-xs mb-1">Returns</div>
                  <div className="text-text-primary font-semibold">{sessionStats.totalReturned} $CC</div>
                </div>
                <div>
                  <div className="text-text-muted text-xs mb-1">Net Profit</div>
                  <div className={`font-semibold ${sessionStats.netProfit >= 0 ? 'text-accent-green' : 'text-red-400'}`}>
                    {sessionStats.netProfit >= 0 ? '+' : ''}{sessionStats.netProfit} $CC
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SAMPLE SIZE SELECTOR */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <label className="text-text-secondary text-xs uppercase tracking-wider mb-3 block">
              Select Sample Size
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSampleSize(1)}
                disabled={isProcessing}
                className={`py-6 rounded-lg border-2 transition-all ${
                  sampleSize === 1
                    ? 'border-claude-orange bg-claude-orange/10'
                    : 'border-border bg-bg-primary hover:border-claude-orange/50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="text-3xl mb-2">🔬</div>
                <div className="text-text-primary font-semibold text-lg">Single Sample</div>
                <div className="text-text-muted text-xs mt-1">5,000 $CC</div>
              </button>
              <button
                onClick={() => setSampleSize(10)}
                disabled={isProcessing}
                className={`py-6 rounded-lg border-2 transition-all ${
                  sampleSize === 10
                    ? 'border-claude-orange bg-claude-orange/10'
                    : 'border-border bg-bg-primary hover:border-claude-orange/50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="text-3xl mb-2">🧬</div>
                <div className="text-text-primary font-semibold text-lg">10-Sample Batch</div>
                <div className="text-text-muted text-xs mt-1">50,000 $CC total</div>
                <div className="text-accent-green text-xs mt-2 font-semibold">✓ Guaranteed Advanced+</div>
              </button>
            </div>
          </div>

          {/* STAKE DISPLAY */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <label className="text-text-secondary text-xs uppercase tracking-wider mb-3 block">
              Stake Amount
            </label>
            <div className="bg-bg-primary border border-border rounded-lg p-4 text-center">
              <div className="text-claude-orange text-3xl font-bold mb-2">
                {totalStake} $CC
              </div>
              <div className="text-text-muted text-xs">
                {sampleSize} sample{sampleSize > 1 ? 's' : ''} × 5,000 $CC each
              </div>
            </div>
          </div>

          {/* FEE DISPLAY */}
          {connected && (
            <FeeDisplay
              platformFeeSol={0.001}
              betAmount={totalStake}
              multiplier={2}
              houseEdgePercent={3}
            />
          )}

          {/* EVOLUTION ANIMATION */}
          {isProcessing && (
            <div className="bg-bg-secondary border border-claude-orange rounded-lg p-8">
              <div className="text-center">
                <div className="text-text-secondary text-sm mb-2">{statusMessage || 'NEURAL EVOLUTION IN PROGRESS'}</div>
                <div className="text-claude-orange text-4xl font-mono mb-4">
                  {evolutionProgress.toFixed(0)}%
                </div>
                <div className="w-full bg-bg-primary rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-claude-orange h-full transition-all duration-200"
                    style={{ width: `${evolutionProgress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* COMMIT BUTTON */}
          <button
            onClick={handleSample}
            disabled={!connected || isProcessing || totalStake > ccBalance}
            className="w-full bg-claude-orange text-white font-semibold py-4 px-4 rounded-md text-base hover:bg-claude-orange/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!connected
              ? 'Connect Wallet to Begin'
              : isProcessing
              ? statusMessage || 'Processing...'
              : `Initiate ${sampleSize === 10 ? '10-Sample Batch' : 'Single Sample'} (${totalStake} $CC)`}
          </button>

          {/* PROVABLY FAIR */}
          {gachaResult && (
            <ProvablyFair
              commitment={gachaResult.commitment}
              serverSecret={gachaResult.serverSecret}
              txSignature={gachaResult.depositTx}
              result={`${gachaResult.results.join(', ')} → ${gachaResult.totalPayout} $CC`}
              depositTx={gachaResult.depositTx}
              payoutTx={gachaResult.payoutTx || undefined}
              solscanCluster=""
            />
          )}

          {/* RECENT SAMPLES */}
          {history.length > 0 && (
            <div className="bg-bg-secondary border border-border rounded-lg p-4">
              <label className="text-text-secondary text-xs uppercase tracking-wider mb-3 block">
                Recent Samples
              </label>
              <div className="space-y-2">
                {history.slice(0, 10).map((entry, idx) => (
                  <div
                    key={idx}
                    className="bg-bg-primary border border-border rounded p-2 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`text-lg ${getTierColor(entry.tier)}`}>
                        {getTierEmoji(entry.tier)}
                      </div>
                      <div>
                        <div className={`font-semibold ${getTierColor(entry.tier)}`}>
                          {entry.tier}
                        </div>
                        <div className="text-text-muted text-xs">
                          {entry.stake} $CC → {entry.multiplier}x
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${entry.payout >= entry.stake ? 'text-accent-green' : 'text-red-400'}`}>
                        {entry.payout >= entry.stake ? '+' : ''}{entry.payout - entry.stake} $CC
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EXPECTED VALUE */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <label className="text-text-secondary text-xs uppercase tracking-wider mb-3 block">
              Protocol Economics
            </label>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-bg-primary border border-border rounded p-3">
                <div className="text-text-muted text-xs mb-1">Expected Value</div>
                <div className="text-text-primary font-semibold">0.97x return</div>
                <div className="text-text-muted text-xs mt-1">Long-term average</div>
              </div>
              <div className="bg-bg-primary border border-border rounded p-3">
                <div className="text-text-muted text-xs mb-1">Protocol Edge</div>
                <div className="text-claude-orange font-semibold">3%</div>
                <div className="text-text-muted text-xs mt-1">Built into tiers</div>
              </div>
            </div>
          </div>

        </div>

        {/* RESULT MODAL */}
        {gachaResult && (
          <GameResult
            isOpen={showResult}
            onClose={() => setShowResult(false)}
            onPlayAgain={handlePlayAgain}
            result={gachaResult.netProfit >= 0 ? 'win' : 'lose'}
            betAmount={gachaResult.stakeAmount}
            payout={gachaResult.totalPayout}
            message={
              sampleSize === 10
                ? `Batch complete! Results: ${gachaResult.results.filter(t => t !== 'Basic').length} hits`
                : `Neural evolution complete: ${gachaResult.results[0]} synthesized!`
            }
          />
        )}

        {/* FOOTER */}
        <footer className="py-4 mt-6 text-center">
          <Link href="/" className="text-claude-orange hover:underline text-sm">
            ← back
          </Link>
          <p className="text-text-muted text-xs mt-2">
            claudecode.wtf
          </p>
        </footer>

      </div>
    </div>
  );
}

export default function NeuralGenesisEngine() {
  return (
    <WalletProvider network="mainnet-beta">
      <NeuralGenesisEngineInner />
    </WalletProvider>
  );
}
