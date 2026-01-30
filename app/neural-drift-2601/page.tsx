'use client';

/**
 * Neural Drift Scanner - Entropy Oracle Experiment
 *
 * Binary probability matrix scanning through quantum neural pathways
 * with real-time synaptic feedback. Two-party entropy oracle for
 * cryptographic 50/50 outcome determination.
 *
 * Protocol:
 * - Commit-reveal entropy generation
 * - 1.96x payout multiplier (2% protocol edge)
 * - 0.001 SOL platform fee
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

// Experiment configuration
const EXPERIMENT_CONFIG = {
  minStake: 1,
  maxStake: 1000,
  platformFeeSol: 0.001,
  protocolEdgePercent: 2,
  multiplier: 1.96, // 2x minus 2% protocol edge
};

type Outcome = 'ALPHA' | 'OMEGA';
type ExperimentState = 'idle' | 'committing' | 'scanning' | 'resolved';

function NeuralDriftScanner() {
  const { cc: balance, refresh: refreshBalance } = useBalance();

  // Experiment state
  const [experimentState, setExperimentState] = useState<ExperimentState>('idle');
  const [stakeAmount, setStakeAmount] = useState(10);
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome>('ALPHA');
  const [result, setResult] = useState<'win' | 'lose' | null>(null);
  const [resolvedOutcome, setResolvedOutcome] = useState<Outcome | null>(null);
  const [payout, setPayout] = useState(0);
  const [commitment, setCommitment] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  // History of recent outcomes
  const [history, setHistory] = useState<
    Array<{ choice: Outcome; result: Outcome; won: boolean; amount: number }>
  >([]);

  const handleScan = useCallback(async () => {
    if (stakeAmount > balance) {
      alert('Insufficient $CC balance');
      return;
    }

    setExperimentState('committing');

    // Simulate commitment phase
    await new Promise((r) => setTimeout(r, 400));

    // Generate mock commitment (in production, server sends this BEFORE user acts)
    const mockCommitment = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    setCommitment(mockCommitment);

    setExperimentState('scanning');

    // Animate neural drift scanning process
    setScanProgress(0);
    for (let i = 0; i <= 100; i += 5) {
      await new Promise((r) => setTimeout(r, 50));
      setScanProgress(i);
    }

    await new Promise((r) => setTimeout(r, 300));

    // Generate mock server secret (in production, revealed after deposit)
    const mockSecret = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    setSecret(mockSecret);

    // Determine outcome using commit-reveal entropy
    // In production: SHA256(serverSecret + txSignature)[0] < 128 ? ALPHA : OMEGA
    const outcome: Outcome = Math.random() < 0.5 ? 'ALPHA' : 'OMEGA';
    setResolvedOutcome(outcome);

    const won = outcome === selectedOutcome;
    setResult(won ? 'win' : 'lose');
    setPayout(won ? Math.floor(stakeAmount * EXPERIMENT_CONFIG.multiplier) : 0);

    // Add to history
    setHistory((prev) => [
      { choice: selectedOutcome, result: outcome, won, amount: stakeAmount },
      ...prev.slice(0, 9),
    ]);

    setExperimentState('resolved');
    setShowResult(true);

    // Refresh balance after experiment
    await refreshBalance();
  }, [stakeAmount, balance, selectedOutcome, refreshBalance]);

  const handleReset = () => {
    setExperimentState('idle');
    setResult(null);
    setResolvedOutcome(null);
    setCommitment(null);
    setSecret(null);
    setScanProgress(0);
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
            Neural Drift Scanner
          </span>
          <span className="text-text-muted text-xs ml-auto">Entropy Oracle</span>
        </header>

        {/* Main Experiment Area */}
        <div className="bg-bg-secondary border border-border rounded-lg p-6 mb-4">
          {/* Neural Matrix Visualization */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              {/* Main scanner display */}
              <div
                className={`w-40 h-40 rounded-lg bg-bg-primary border-2 ${
                  experimentState === 'scanning'
                    ? 'border-claude-orange animate-pulse'
                    : 'border-border'
                } flex items-center justify-center overflow-hidden relative`}
              >
                {/* Background binary pattern */}
                <div className="absolute inset-0 opacity-10 text-[8px] font-mono text-text-muted leading-tight p-1 overflow-hidden">
                  {Array.from({ length: 200 }, (_, i) => (i % 2 === 0 ? '1' : '0')).join('')}
                </div>

                {/* Scanning progress */}
                {experimentState === 'scanning' && (
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-claude-orange/20 transition-all"
                    style={{ height: `${scanProgress}%` }}
                  />
                )}

                {/* Display state */}
                <div className="relative z-10 text-center">
                  {experimentState === 'idle' && (
                    <div className="text-5xl font-bold text-text-muted">⟨ψ⟩</div>
                  )}
                  {experimentState === 'committing' && (
                    <div className="text-3xl font-bold text-claude-orange animate-pulse">
                      COMMIT
                    </div>
                  )}
                  {experimentState === 'scanning' && (
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-claude-orange">SCAN</div>
                      <div className="text-sm text-text-muted font-mono">{scanProgress}%</div>
                    </div>
                  )}
                  {experimentState === 'resolved' && resolvedOutcome && (
                    <div className={`text-3xl font-bold ${
                      result === 'win' ? 'text-accent-green' : 'text-text-primary'
                    }`}>
                      {resolvedOutcome}
                    </div>
                  )}
                </div>
              </div>

              {/* Corner indicators */}
              <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-claude-orange" />
              <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-claude-orange" />
              <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-claude-orange" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-claude-orange" />
            </div>
          </div>

          {/* Outcome pathway selection */}
          <div className="mb-4">
            <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
              Select Pathway
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedOutcome('ALPHA')}
                disabled={experimentState !== 'idle'}
                className={`flex-1 py-3 px-4 rounded-md font-semibold text-lg transition-all ${
                  selectedOutcome === 'ALPHA'
                    ? 'bg-claude-orange text-white'
                    : 'bg-bg-tertiary border border-border text-text-secondary hover:border-claude-orange'
                } disabled:opacity-50`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl">α</span>
                  <span>ALPHA</span>
                </div>
              </button>
              <button
                onClick={() => setSelectedOutcome('OMEGA')}
                disabled={experimentState !== 'idle'}
                className={`flex-1 py-3 px-4 rounded-md font-semibold text-lg transition-all ${
                  selectedOutcome === 'OMEGA'
                    ? 'bg-claude-orange text-white'
                    : 'bg-bg-tertiary border border-border text-text-secondary hover:border-claude-orange'
                } disabled:opacity-50`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl">Ω</span>
                  <span>OMEGA</span>
                </div>
              </button>
            </div>
          </div>

          {/* Stake Input */}
          <BetInput
            value={stakeAmount}
            onChange={setStakeAmount}
            min={EXPERIMENT_CONFIG.minStake}
            max={EXPERIMENT_CONFIG.maxStake}
            balance={balance}
            disabled={experimentState !== 'idle'}
            className="mb-4"
          />

          {/* Protocol Info */}
          <FeeDisplay
            platformFeeSol={EXPERIMENT_CONFIG.platformFeeSol}
            betAmount={stakeAmount}
            multiplier={EXPERIMENT_CONFIG.multiplier}
            houseEdgePercent={EXPERIMENT_CONFIG.protocolEdgePercent}
            className="mb-4"
          />

          {/* Scan Button */}
          <button
            onClick={handleScan}
            disabled={experimentState !== 'idle' || balance === 0}
            className="w-full bg-accent-green text-black font-bold py-4 rounded-md text-lg hover:bg-accent-green/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {experimentState === 'committing'
              ? '🔒 COMMITTING...'
              : experimentState === 'scanning'
              ? '📡 SCANNING DRIFT...'
              : experimentState === 'resolved'
              ? '✓ RESOLVED'
              : '▶ INITIATE SCAN'}
          </button>

          {/* Info footer */}
          <div className="mt-4 text-center">
            <p className="text-text-muted text-xs">
              Two-party commit-reveal entropy • Cryptographically verifiable
            </p>
          </div>
        </div>

        {/* Wallet Connection CTA */}
        {balance === 0 && experimentState === 'idle' && (
          <div className="bg-bg-secondary border border-border rounded-lg p-4 mb-4 text-center">
            <p className="text-text-secondary text-sm mb-3">
              Connect your wallet to participate in the experiment
            </p>
            <ConnectWallet className="inline-flex" />
          </div>
        )}

        {/* Provably Fair Verification */}
        {(commitment || secret) && (
          <ProvablyFair
            commitment={commitment || undefined}
            serverSecret={secret || undefined}
            txSignature="mock-tx-signature-for-entropy-source"
            result={resolvedOutcome?.toLowerCase() as 'heads' | 'tails' | undefined}
            className="mb-4"
          />
        )}

        {/* Recent Outcomes History */}
        {history.length > 0 && (
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-text-secondary text-xs uppercase tracking-wider mb-3">
              Recent Scans
            </h3>
            <div className="space-y-2">
              {history.slice(0, 10).map((h, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm font-mono"
                >
                  <span className="text-text-muted">
                    <span className={h.choice === 'ALPHA' ? 'text-text-primary' : 'text-text-secondary'}>
                      {h.choice === 'ALPHA' ? 'α' : 'Ω'}
                    </span>
                    {' → '}
                    <span className={h.result === 'ALPHA' ? 'text-text-primary' : 'text-text-secondary'}>
                      {h.result === 'ALPHA' ? 'α' : 'Ω'}
                    </span>
                  </span>
                  <span
                    className={
                      h.won ? 'text-accent-green font-semibold' : 'text-red-400'
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
            claudecode.wtf · 100% of fees to @bcherny
          </p>
        </footer>

        {/* Result Modal */}
        <GameResult
          isOpen={showResult}
          onClose={() => setShowResult(false)}
          onPlayAgain={handleReset}
          result={result}
          betAmount={stakeAmount}
          payout={payout}
          message={
            result === 'win'
              ? `Neural pathway converged on ${resolvedOutcome}!`
              : `Synaptic drift detected ${resolvedOutcome}.`
          }
        />
      </div>
    </div>
  );
}

export default function NeuralDriftPage() {
  return (
    <WalletProvider>
      <NeuralDriftScanner />
    </WalletProvider>
  );
}
