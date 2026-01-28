'use client';

/**
 * Provably Fair Display - Two-Party Entropy verification component
 *
 * Security model:
 * 1. Server commits to serverSecret by sending SHA256(serverSecret) BEFORE the bet
 * 2. User deposits tokens, creating a transaction with unpredictable signature
 * 3. Result = SHA256(serverSecret + txSignature)[0] < 128 ? heads : tails
 *
 * Why this is secure:
 * - Server can't predict txSignature when committing (user hasn't signed yet)
 * - User can't predict serverSecret when signing (only sees commitment hash)
 * - Neither party can manipulate the final result
 *
 * User verification:
 * 1. Verify SHA256(serverSecret) === commitment
 * 2. Compute SHA256(serverSecret + txSignature)
 * 3. Check result matches: firstByte < 128 = heads, >= 128 = tails
 */

import React, { useState, useCallback } from 'react';

interface ProvablyFairProps {
  /** Commitment hash from server (SHA256(serverSecret), shown before bet) */
  commitment?: string;
  /** Server's secret (revealed after deposit) */
  serverSecret?: string;
  /** User's deposit transaction signature (contributes entropy) */
  txSignature?: string;
  /** The result (heads/tails) */
  result?: string;
  /** Deposit transaction signature */
  depositTx?: string;
  /** Payout transaction signature (if won) */
  payoutTx?: string;
  /** Solscan cluster parameter (e.g., '?cluster=devnet' or '' for mainnet) */
  solscanCluster?: string;
  className?: string;
}

export function ProvablyFair({
  commitment,
  serverSecret,
  txSignature,
  result,
  depositTx,
  payoutTx,
  solscanCluster = '',
  className = '',
}: ProvablyFairProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    commitmentValid: boolean;
    resultValid: boolean;
    computedResult: string;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  // Full verification: check commitment AND compute result
  const verifyAll = useCallback(async () => {
    if (!commitment || !serverSecret || !txSignature) return;

    setIsVerifying(true);
    try {
      // Step 1: Verify SHA256(serverSecret) === commitment
      const encoder = new TextEncoder();
      const secretBuffer = new ArrayBuffer(serverSecret.length);
      new Uint8Array(secretBuffer).set(encoder.encode(serverSecret));
      const commitmentHashBuffer = await crypto.subtle.digest('SHA-256', secretBuffer);
      const commitmentHashArray = Array.from(new Uint8Array(commitmentHashBuffer));
      const computedCommitment = commitmentHashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      const commitmentValid = computedCommitment === commitment;

      // Step 2: Compute SHA256(serverSecret + txSignature)
      const combined = serverSecret + txSignature;
      const combinedBuffer = new ArrayBuffer(combined.length);
      new Uint8Array(combinedBuffer).set(encoder.encode(combined));
      const resultHashBuffer = await crypto.subtle.digest('SHA-256', combinedBuffer);
      const resultHashArray = Array.from(new Uint8Array(resultHashBuffer));

      // Step 3: First byte < 128 = heads, >= 128 = tails
      const firstByte = resultHashArray[0];
      const computedResult = firstByte < 128 ? 'heads' : 'tails';
      const resultValid = result ? computedResult === result : true;

      setVerificationResult({
        commitmentValid,
        resultValid,
        computedResult,
      });
    } catch (error) {
      console.error('Verification failed:', error);
      setVerificationResult({
        commitmentValid: false,
        resultValid: false,
        computedResult: 'error',
      });
    } finally {
      setIsVerifying(false);
    }
  }, [commitment, serverSecret, txSignature, result]);

  // Show nothing if no data to display
  if (!commitment && !serverSecret) {
    return null;
  }

  const isFullyVerified = verificationResult?.commitmentValid && verificationResult?.resultValid;

  // Solscan URL (mainnet by default, devnet with ?cluster=devnet)
  const getSolscanUrl = (signature: string) =>
    `https://solscan.io/tx/${signature}${solscanCluster}`;

  return (
    <div className={`bg-bg-tertiary border border-border rounded-md ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <span className="flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          Provably Fair
          {isFullyVerified && (
            <span className="text-accent-green text-xs">(Verified)</span>
          )}
        </span>
        <svg
          className={`w-4 h-4 transform transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
          {/* Explanation */}
          <div className="text-xs text-text-muted space-y-2">
            <p>
              <strong>Two-party entropy</strong> ensures neither server nor player can manipulate results:
            </p>
            <ol className="list-decimal list-inside space-y-1 pl-2">
              <li>Server commits to <code className="bg-bg-primary px-1 rounded">SHA256(serverSecret)</code> before you bet</li>
              <li>You create a deposit transaction with unpredictable signature</li>
              <li>Result = <code className="bg-bg-primary px-1 rounded">SHA256(serverSecret + txSignature)[0] &lt; 128 ? heads : tails</code></li>
            </ol>
            <p className="text-accent-green">
              Server can&apos;t predict your signature. You can&apos;t predict the secret. Neither can cheat.
            </p>
          </div>

          {/* Commitment Hash */}
          {commitment && (
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">
                Server Commitment
                <span className="text-text-muted ml-1">(SHA256 of secret, received before bet)</span>
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-bg-primary p-2 rounded text-xs font-mono text-text-primary overflow-x-auto">
                  {commitment.slice(0, 32)}...
                </code>
                <button
                  onClick={() => copyToClipboard(commitment, 'commitment')}
                  className="px-2 py-1 bg-bg-primary border border-border rounded text-xs hover:border-claude-orange transition-colors"
                >
                  {copied === 'commitment' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Server Secret */}
          {serverSecret && (
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">
                Server Secret
                <span className="text-text-muted ml-1">(revealed after deposit)</span>
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-bg-primary p-2 rounded text-xs font-mono text-text-primary overflow-x-auto">
                  {serverSecret.slice(0, 32)}...
                </code>
                <button
                  onClick={() => copyToClipboard(serverSecret, 'secret')}
                  className="px-2 py-1 bg-bg-primary border border-border rounded text-xs hover:border-claude-orange transition-colors"
                >
                  {copied === 'secret' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Transaction Signature (user entropy) */}
          {txSignature && (
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">
                Your TX Signature
                <span className="text-text-muted ml-1">(your entropy contribution)</span>
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-bg-primary p-2 rounded text-xs font-mono text-text-primary overflow-x-auto">
                  {txSignature.slice(0, 32)}...
                </code>
                <button
                  onClick={() => copyToClipboard(txSignature, 'txSig')}
                  className="px-2 py-1 bg-bg-primary border border-border rounded text-xs hover:border-claude-orange transition-colors"
                >
                  {copied === 'txSig' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Verification Button */}
          {commitment && serverSecret && txSignature && (
            <div className="space-y-2">
              <button
                onClick={verifyAll}
                disabled={isVerifying}
                className={`w-full py-2 px-4 rounded-md text-sm font-semibold transition-colors ${
                  isFullyVerified
                    ? 'bg-accent-green/20 text-accent-green border border-accent-green'
                    : verificationResult && !isFullyVerified
                    ? 'bg-red-500/20 text-red-400 border border-red-500'
                    : 'bg-claude-orange/10 text-claude-orange border border-claude-orange hover:bg-claude-orange/20'
                } disabled:opacity-50`}
              >
                {isVerifying ? (
                  'Verifying...'
                ) : isFullyVerified ? (
                  <>
                    <span className="mr-2">✓</span>
                    Verified: Result is {verificationResult?.computedResult}
                  </>
                ) : verificationResult && !isFullyVerified ? (
                  <>
                    <span className="mr-2">✗</span>
                    Verification Failed!
                  </>
                ) : (
                  'Verify Fairness'
                )}
              </button>

              {verificationResult && (
                <div className="text-xs space-y-1">
                  <div className={verificationResult.commitmentValid ? 'text-accent-green' : 'text-red-400'}>
                    {verificationResult.commitmentValid ? '✓' : '✗'} SHA256(serverSecret) = commitment
                  </div>
                  <div className={verificationResult.resultValid ? 'text-accent-green' : 'text-red-400'}>
                    {verificationResult.resultValid ? '✓' : '✗'} Computed result: {verificationResult.computedResult}
                  </div>
                </div>
              )}

              {isFullyVerified && (
                <p className="text-xs text-accent-green text-center">
                  The result was determined by combining server entropy (committed before your bet)
                  with your transaction signature. Neither party could manipulate the outcome.
                </p>
              )}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">Final Result</label>
              <code className="block bg-bg-primary p-2 rounded text-xs font-mono text-claude-orange uppercase">
                {result}
              </code>
            </div>
          )}

          {/* Transaction Links */}
          {(depositTx || payoutTx) && (
            <div className="space-y-2 pt-2 border-t border-border">
              <label className="text-xs text-text-secondary">Transactions</label>
              <div className="flex flex-col gap-1">
                {depositTx && (
                  <a
                    href={getSolscanUrl(depositTx)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-claude-orange hover:underline flex items-center gap-1"
                  >
                    <span>Deposit TX:</span>
                    <code className="text-text-primary">{depositTx.slice(0, 16)}...</code>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
                {payoutTx && (
                  <a
                    href={getSolscanUrl(payoutTx)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent-green hover:underline flex items-center gap-1"
                  >
                    <span>Payout TX:</span>
                    <code className="text-text-primary">{payoutTx.slice(0, 16)}...</code>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Learn More Link */}
          <div className="pt-2">
            <a
              href="https://en.wikipedia.org/wiki/Commitment_scheme"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-claude-orange hover:underline"
            >
              Learn more about commitment schemes →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProvablyFair;
