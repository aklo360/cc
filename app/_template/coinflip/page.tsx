'use client';

/**
 * Coin Flip Game Template - Reference implementation for coin flip games
 *
 * This template provides:
 * - Full wallet integration
 * - Bet placement UI
 * - Coin flip animation
 * - Result display with confetti
 * - Provably fair verification
 *
 * To create a themed version:
 * 1. Copy this file to app/[your-slug]/page.tsx
 * 2. Update the theme (colors, animations, copy)
 * 3. Keep the game mechanics the same
 */

import React, { useState, useCallback } from 'react';
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

// Game configuration
const GAME_CONFIG = {
  minBet: 1,
  maxBet: 1000,
  platformFeeSol: 0.001,
  houseEdgePercent: 2,
  multiplier: 1.96, // 2x minus 2% house edge
};

type CoinChoice = 'heads' | 'tails';
type GameState = 'idle' | 'betting' | 'flipping' | 'result';

function CoinFlipGame() {
  const { cc: balance, refresh: refreshBalance } = useBalance();

  // Game state
  const [gameState, setGameState] = useState<GameState>('idle');
  const [betAmount, setBetAmount] = useState(10);
  const [choice, setChoice] = useState<CoinChoice>('heads');
  const [result, setResult] = useState<'win' | 'lose' | null>(null);
  const [flipResult, setFlipResult] = useState<CoinChoice | null>(null);
  const [payout, setPayout] = useState(0);
  const [commitment, setCommitment] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  // History
  const [history, setHistory] = useState<
    Array<{ choice: CoinChoice; result: CoinChoice; won: boolean; amount: number }>
  >([]);

  const handleFlip = useCallback(async () => {
    if (betAmount > balance) {
      alert('Insufficient balance');
      return;
    }

    setGameState('betting');

    // Simulate transaction delay
    await new Promise((r) => setTimeout(r, 500));

    setGameState('flipping');

    // Simulate VRF and flip (in production, this would be on-chain)
    await new Promise((r) => setTimeout(r, 2000));

    // Generate mock commit-reveal (in production, comes from server)
    const mockSecret = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    // SHA256 mock (in production, server sends commitment BEFORE bet)
    const mockCommitment = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    setCommitment(mockCommitment);
    setSecret(mockSecret);

    // Determine result (50/50)
    const coinResult: CoinChoice = Math.random() < 0.5 ? 'heads' : 'tails';
    setFlipResult(coinResult);

    const won = coinResult === choice;
    setResult(won ? 'win' : 'lose');
    setPayout(won ? Math.floor(betAmount * GAME_CONFIG.multiplier) : 0);

    // Add to history
    setHistory((prev) => [
      { choice, result: coinResult, won, amount: betAmount },
      ...prev.slice(0, 9),
    ]);

    setGameState('result');
    setShowResult(true);

    // Refresh balance after bet
    await refreshBalance();
  }, [betAmount, balance, choice, refreshBalance]);

  const handlePlayAgain = () => {
    setGameState('idle');
    setResult(null);
    setFlipResult(null);
    setCommitment(null);
    setSecret(null);
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
            Coin Flip
          </span>
          <div className="ml-auto">
            <ConnectWallet showBalance />
          </div>
        </header>

        {/* Main Game Area */}
        <div className="bg-bg-secondary border border-border rounded-lg p-6 mb-4">
          {/* Coin Display */}
          <div className="flex justify-center mb-6">
            <div
              className={`w-32 h-32 rounded-full bg-gradient-to-b from-yellow-400 to-yellow-600 flex items-center justify-center text-4xl font-bold shadow-lg ${
                gameState === 'flipping' ? 'animate-spin' : ''
              }`}
              style={{
                animationDuration: '0.2s',
              }}
            >
              {flipResult ? (flipResult === 'heads' ? '👑' : '🛡️') : '?'}
            </div>
          </div>

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
            disabled={gameState !== 'idle' || balance === 0}
            className="w-full bg-accent-green text-black font-bold py-4 rounded-md text-lg hover:bg-accent-green/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {gameState === 'betting'
              ? 'PLACING BET...'
              : gameState === 'flipping'
              ? 'FLIPPING...'
              : 'FLIP COIN'}
          </button>
        </div>

        {/* Provably Fair */}
        {(commitment || secret) && (
          <ProvablyFair
            commitment={commitment || undefined}
            serverSecret={secret || undefined}
            txSignature="mock-tx-signature-for-demo"
            result={flipResult || undefined}
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
            claudecode.wtf · provably fair gambling
          </p>
        </footer>

        {/* Result Modal */}
        <GameResult
          isOpen={showResult}
          onClose={() => setShowResult(false)}
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

export default function CoinFlipPage() {
  return (
    <WalletProvider>
      <CoinFlipGame />
    </WalletProvider>
  );
}
