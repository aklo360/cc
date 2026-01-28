'use client';

/**
 * Bet Input Component - $CC amount input with validation
 *
 * Features:
 * - Min/max validation
 * - Quick amount buttons (1/4, 1/2, MAX)
 * - Balance display
 * - Format with commas
 */

import React, { useState, useEffect } from 'react';

interface BetInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  balance?: number;
  disabled?: boolean;
  className?: string;
}

export function BetInput({
  value,
  onChange,
  min = 1,
  max = 1000,
  balance = 0,
  disabled = false,
  className = '',
}: BetInputProps) {
  const [inputValue, setInputValue] = useState(value.toString());
  const [error, setError] = useState<string | null>(null);

  // Sync with external value changes
  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    setInputValue(raw);

    const num = parseFloat(raw) || 0;
    if (num < min) {
      setError(`Min: ${min} $CC`);
    } else if (num > max) {
      setError(`Max: ${max} $CC`);
    } else if (num > balance) {
      setError('Insufficient balance');
    } else {
      setError(null);
      onChange(num);
    }
  };

  const handleQuickAmount = (multiplier: number) => {
    const amount = Math.floor(balance * multiplier);
    const clamped = Math.max(min, Math.min(max, amount));
    setInputValue(clamped.toString());
    onChange(clamped);
    setError(null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-text-secondary text-xs uppercase tracking-wider">
        Bet Amount
      </label>

      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          disabled={disabled}
          className="w-full bg-bg-primary border border-border rounded-md px-3 py-3 pr-16 text-lg font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors disabled:opacity-50"
          placeholder="0"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-claude-orange font-semibold">
          $CC
        </span>
      </div>

      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => handleQuickAmount(0.25)}
          disabled={disabled || balance === 0}
          className="flex-1 bg-bg-tertiary border border-border text-text-secondary px-2 py-1 rounded text-xs hover:border-claude-orange hover:text-claude-orange transition-colors disabled:opacity-50"
        >
          1/4
        </button>
        <button
          onClick={() => handleQuickAmount(0.5)}
          disabled={disabled || balance === 0}
          className="flex-1 bg-bg-tertiary border border-border text-text-secondary px-2 py-1 rounded text-xs hover:border-claude-orange hover:text-claude-orange transition-colors disabled:opacity-50"
        >
          1/2
        </button>
        <button
          onClick={() => handleQuickAmount(1)}
          disabled={disabled || balance === 0}
          className="flex-1 bg-bg-tertiary border border-border text-text-secondary px-2 py-1 rounded text-xs hover:border-claude-orange hover:text-claude-orange transition-colors disabled:opacity-50"
        >
          MAX
        </button>
      </div>

      <div className="flex justify-between text-xs text-text-muted">
        <span>Min: {min.toLocaleString()} $CC</span>
        <span>Max: {max.toLocaleString()} $CC</span>
      </div>
    </div>
  );
}

export default BetInput;
