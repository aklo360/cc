'use client';

/**
 * Fee Display Component - Shows platform fee and potential payout
 *
 * Features:
 * - SOL platform fee display
 * - Potential payout calculation
 * - House edge info
 */

import React from 'react';

interface FeeDisplayProps {
  platformFeeSol?: number;
  betAmount: number;
  multiplier: number;
  houseEdgePercent?: number;
  className?: string;
}

export function FeeDisplay({
  platformFeeSol = 0.001,
  betAmount,
  multiplier,
  houseEdgePercent = 2,
  className = '',
}: FeeDisplayProps) {
  const potentialPayout = betAmount * multiplier;
  const netPayout = potentialPayout - betAmount;

  return (
    <div className={`bg-bg-tertiary border border-border rounded-md p-3 space-y-2 ${className}`}>
      <div className="flex justify-between text-sm">
        <span className="text-text-secondary">
          Platform Fee
          <span className="text-text-muted text-xs ml-1">(buyback & burn)</span>
        </span>
        <span className="text-text-primary">~{platformFeeSol} SOL</span>
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-text-secondary">
          House Edge
          <span className="text-text-muted text-xs ml-1">(never sold)</span>
        </span>
        <span className="text-text-primary">{houseEdgePercent}%</span>
      </div>

      <div className="border-t border-border my-2" />

      <div className="flex justify-between text-sm">
        <span className="text-text-secondary">Potential Payout</span>
        <span className="text-accent-green font-semibold">
          {potentialPayout.toLocaleString()} $CC
        </span>
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-text-secondary">Net Profit</span>
        <span className="text-accent-green font-semibold">
          +{netPayout.toLocaleString()} $CC
        </span>
      </div>

      <div className="flex justify-between text-xs">
        <span className="text-text-muted">Multiplier</span>
        <span className="text-claude-orange">{multiplier}x</span>
      </div>
    </div>
  );
}

export default FeeDisplay;
