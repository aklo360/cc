'use client';

/**
 * Token Selector Modal
 *
 * A searchable popup for selecting any Solana token.
 * Features:
 * - Search by symbol, name, or mint address
 * - Default popular tokens
 * - Custom mint address input
 * - Verification badges
 * - Prevents selecting same token for both sides
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import {
  TokenOption,
  DEFAULT_TOKENS,
  searchTokens,
  loadTokenByMint,
} from '../lib/tokens';

interface TokenSelectorProps {
  selectedToken: TokenOption;
  onSelect: (token: TokenOption) => void;
  disallowMint?: string;
  label?: string;
}

export function TokenSelector({
  selectedToken,
  onSelect,
  disallowMint,
  label,
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<TokenOption[]>(DEFAULT_TOKENS);
  const [isLoading, setIsLoading] = useState(false);
  const [customMint, setCustomMint] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [isLoadingCustom, setIsLoadingCustom] = useState(false);
  const { connection } = useConnection();
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      // Delay to prevent immediate close on open click
      setTimeout(() => {
        window.addEventListener('mousedown', handleClickOutside);
      }, 0);
      return () => window.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Search tokens (debounced)
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      const tokens = await searchTokens(search);
      // Filter out disallowed mint
      const filtered = disallowMint
        ? tokens.filter((t) => t.mint !== disallowMint)
        : tokens;
      setResults(filtered);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, isOpen, disallowMint]);

  // Handle custom mint address
  const handleLoadCustomMint = useCallback(async () => {
    if (!customMint || customMint.length < 32) {
      setCustomError('Enter a valid mint address');
      return;
    }

    if (customMint === disallowMint) {
      setCustomError('Cannot select the same token');
      return;
    }

    setIsLoadingCustom(true);
    setCustomError(null);

    try {
      const token = await loadTokenByMint(customMint, connection);
      if (token) {
        onSelect(token);
        setIsOpen(false);
        setCustomMint('');
      } else {
        setCustomError('Token not found or invalid mint');
      }
    } catch {
      setCustomError('Failed to load token');
    } finally {
      setIsLoadingCustom(false);
    }
  }, [customMint, connection, disallowMint, onSelect]);

  // Handle token selection
  const handleSelect = useCallback(
    (token: TokenOption) => {
      if (token.mint === disallowMint) return;
      onSelect(token);
      setIsOpen(false);
      setSearch('');
    },
    [onSelect, disallowMint]
  );

  return (
    <>
      {/* Token Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-bg-secondary hover:bg-bg-tertiary px-3 py-2 rounded-md transition-colors"
      >
        {selectedToken.logoURI ? (
          <img
            src={selectedToken.logoURI}
            alt={selectedToken.symbol}
            width={20}
            height={20}
            className="rounded-full"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-bg-tertiary flex items-center justify-center text-xs">
            {selectedToken.symbol[0]}
          </div>
        )}
        <span className="font-semibold text-sm">{selectedToken.symbol}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-text-muted"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal Content */}
          <div
            ref={modalRef}
            className="relative bg-bg-primary border border-border rounded-lg w-[90%] max-w-[420px] max-h-[80vh] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-text-primary">
                {label || 'Select Token'}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Search Input */}
            <div className="px-4 py-3 border-b border-border">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or paste address"
                className="w-full bg-bg-tertiary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-claude-orange transition-colors"
              />
            </div>

            {/* Token List */}
            <div className="flex-1 overflow-y-auto px-2 py-2 min-h-[200px] max-h-[300px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-claude-orange border-t-transparent rounded-full" />
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-sm">
                  No tokens found
                </div>
              ) : (
                <div className="space-y-1">
                  {results.map((token) => {
                    const isDisabled = token.mint === disallowMint;
                    const isSelected = token.mint === selectedToken.mint;
                    return (
                      <button
                        key={token.mint}
                        onClick={() => handleSelect(token)}
                        disabled={isDisabled}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                          isDisabled
                            ? 'opacity-40 cursor-not-allowed'
                            : isSelected
                            ? 'bg-claude-orange/20 border border-claude-orange/40'
                            : 'hover:bg-bg-tertiary'
                        }`}
                      >
                        {/* Token Logo */}
                        {token.logoURI ? (
                          <img
                            src={token.logoURI}
                            alt={token.symbol}
                            width={32}
                            height={32}
                            className="rounded-full"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '';
                              (e.target as HTMLImageElement).className = 'w-8 h-8 rounded-full bg-bg-tertiary';
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-sm font-semibold">
                            {token.symbol[0]}
                          </div>
                        )}

                        {/* Token Info */}
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm text-text-primary">
                              {token.symbol}
                            </span>
                            {token.isVerified && (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="text-accent-green"
                              >
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </div>
                          <div className="text-xs text-text-muted truncate max-w-[200px]">
                            {token.name}
                          </div>
                        </div>

                        {/* Selected indicator */}
                        {isSelected && (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            className="text-claude-orange"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Custom Mint Input */}
            <div className="px-4 py-3 border-t border-border">
              <div className="text-xs text-text-muted mb-2">
                Or paste any token mint address:
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customMint}
                  onChange={(e) => {
                    setCustomMint(e.target.value);
                    setCustomError(null);
                  }}
                  placeholder="Token mint address..."
                  className="flex-1 bg-bg-tertiary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-claude-orange transition-colors font-mono"
                />
                <button
                  onClick={handleLoadCustomMint}
                  disabled={isLoadingCustom || !customMint}
                  className="px-3 py-2 bg-claude-orange text-white text-sm font-semibold rounded-md hover:bg-claude-orange/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingCustom ? '...' : 'Load'}
                </button>
              </div>
              {customError && (
                <div className="text-red-400 text-xs mt-1.5">{customError}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TokenSelector;
