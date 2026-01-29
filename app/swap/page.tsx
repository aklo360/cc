'use client';

/**
 * CC Trading Terminal - Dedicated SOL/$CC Trading Interface
 *
 * Features:
 * - GMGN price chart (embeddable iframe)
 * - Buy/Sell panel with Jupiter integration
 * - SOL ↔ $CC pair only (not a general DEX)
 * - Platform fee: 1% (100 bps) → Brain wallet for buyback & burn
 * - Real-time price display
 * - DVD-style bouncing sell button (anti-sell friction for the lols)
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { WalletProvider, ConnectWallet, useBalance } from '@/app/components/gamefi';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
  getSwapQuote,
  buildSwapTransaction,
  WSOL_MINT,
  formatAmount,
  type SwapQuoteResult,
} from './lib/jupiter';

// $CC Token
const CC_MINT = 'Hg23qBLJDvhQtGLHMvot7NK54qAhzQFj9BVd5jpABAGS';
const CC_DECIMALS = 9;

// Slippage options (basis points) - higher defaults for memecoins
const SLIPPAGE_OPTIONS = [
  { label: '3%', value: 300 },
  { label: '5%', value: 500 },
  { label: '7%', value: 700 },
  { label: '10%', value: 1000 },
];

// Price impact thresholds
const PRICE_IMPACT_WARNING = 5;
const PRICE_IMPACT_DANGER = 10;

type TradeMode = 'buy' | 'sell';
type SwapState = 'idle' | 'quoting' | 'swapping' | 'confirming' | 'success' | 'error';

function TradingTerminal() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  // Trade mode (buy CC with SOL, or sell CC for SOL)
  const [tradeMode, setTradeMode] = useState<TradeMode>('buy');

  // Balance from shared hook (already optimized with polling)
  const { sol: solBalance, cc: ccBalance, isLoading: balanceLoading, refresh: refreshBalances } = useBalance();

  // Swap state
  const [inputAmount, setInputAmount] = useState('');
  const [slippageBps, setSlippageBps] = useState(500); // 5% default for memecoins
  const [quote, setQuote] = useState<SwapQuoteResult | null>(null);
  const [swapState, setSwapState] = useState<SwapState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [showSlippage, setShowSlippage] = useState(false);

  // Chart timeframe
  const [chartInterval, setChartInterval] = useState('15');

  // DVD Bouncing Sell Button - anti-sell friction for the lols
  const [buttonPos, setButtonPos] = useState({ x: 100, y: 100 });
  const [buttonVel, setButtonVel] = useState({ x: 3, y: 2 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const animationRef = useRef<number | null>(null);

  // DVD bounce animation - only active in sell mode
  useEffect(() => {
    if (tradeMode !== 'sell' || swapState !== 'idle' || !publicKey) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const BUTTON_WIDTH = 160;
    const BUTTON_HEIGHT = 56;
    const SPEED_MULTIPLIER = 1.5;

    const animate = () => {
      setButtonPos((pos) => {
        let newX = pos.x + buttonVel.x * SPEED_MULTIPLIER;
        let newY = pos.y + buttonVel.y * SPEED_MULTIPLIER;
        let newVelX = buttonVel.x;
        let newVelY = buttonVel.y;

        // Bounce off edges
        if (newX <= 0 || newX + BUTTON_WIDTH >= window.innerWidth) {
          newVelX = -newVelX;
          newX = Math.max(0, Math.min(newX, window.innerWidth - BUTTON_WIDTH));
        }
        if (newY <= 0 || newY + BUTTON_HEIGHT >= window.innerHeight) {
          newVelY = -newVelY;
          newY = Math.max(0, Math.min(newY, window.innerHeight - BUTTON_HEIGHT));
        }

        // Update velocity if changed
        if (newVelX !== buttonVel.x || newVelY !== buttonVel.y) {
          setButtonVel({ x: newVelX, y: newVelY });
        }

        return { x: newX, y: newY };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [tradeMode, swapState, publicKey, buttonVel]);

  // Reset button position when switching to sell mode
  useEffect(() => {
    if (tradeMode === 'sell') {
      // Start from a random position
      setButtonPos({
        x: Math.random() * (window.innerWidth - 200) + 50,
        y: Math.random() * (window.innerHeight - 200) + 50,
      });
      // Random velocity direction
      setButtonVel({
        x: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2),
        y: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2),
      });
    }
  }, [tradeMode]);

  // Determine tokens based on trade mode
  const fromToken = tradeMode === 'buy' ? { mint: WSOL_MINT, decimals: 9, symbol: 'SOL' } : { mint: CC_MINT, decimals: CC_DECIMALS, symbol: '$CC' };
  const toToken = tradeMode === 'buy' ? { mint: CC_MINT, decimals: CC_DECIMALS, symbol: '$CC' } : { mint: WSOL_MINT, decimals: 9, symbol: 'SOL' };
  const fromBalance = tradeMode === 'buy' ? solBalance : ccBalance;
  const toBalance = tradeMode === 'buy' ? ccBalance : solBalance;


  // Parse input amount to raw value
  const rawInputAmount = useMemo(() => {
    const value = parseFloat(inputAmount);
    if (isNaN(value) || value <= 0) return 0;
    return Math.floor(value * Math.pow(10, fromToken.decimals));
  }, [inputAmount, fromToken.decimals]);

  // Check if quote is expired
  const isQuoteExpired = useMemo(() => {
    if (!quote) return true;
    return Date.now() > quote.expiresAt;
  }, [quote]);

  // Quote countdown timer
  const [quoteTimeLeft, setQuoteTimeLeft] = useState(0);
  useEffect(() => {
    if (!quote || isQuoteExpired) {
      setQuoteTimeLeft(0);
      return;
    }
    const interval = setInterval(() => {
      const left = Math.max(0, quote.expiresAt - Date.now());
      setQuoteTimeLeft(Math.ceil(left / 1000));
      if (left <= 0) {
        setQuote(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [quote, isQuoteExpired]);

  // Auto-fetch quote when input changes (debounced)
  useEffect(() => {
    setQuote(null);
    setError(null);

    if (!publicKey || rawInputAmount <= 0) return;

    const timer = setTimeout(async () => {
      setSwapState('quoting');
      try {
        const result = await getSwapQuote(
          fromToken.mint,
          toToken.mint,
          rawInputAmount,
          publicKey.toBase58(),
          slippageBps
        );

        if (!result) {
          setError('Failed to get quote. Try a different amount or try again later.');
          setSwapState('idle');
          return;
        }

        setQuote(result);
        setSwapState('idle');
      } catch (err) {
        console.error('Quote error:', err);
        setError((err as Error).message || 'Failed to get quote');
        setSwapState('idle');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [inputAmount, fromToken.mint, toToken.mint, slippageBps, publicKey, rawInputAmount]);

  // Handle percentage buttons
  const handlePercentage = useCallback(
    (percent: number) => {
      if (fromBalance <= 0) return;
      let amount = fromBalance * (percent / 100);
      // Leave some SOL for fees when selling all SOL
      if (tradeMode === 'buy' && percent === 100) {
        amount = Math.max(0, fromBalance - 0.01);
      }
      const decimalPlaces = fromToken.decimals >= 6 ? 4 : 2;
      setInputAmount(amount.toFixed(decimalPlaces));
    },
    [fromBalance, tradeMode, fromToken.decimals]
  );

  // Switch trade mode
  const handleSwitchMode = useCallback((mode: TradeMode) => {
    setTradeMode(mode);
    setInputAmount('');
    setQuote(null);
    setError(null);
  }, []);

  // Execute swap
  const handleSwap = useCallback(async () => {
    if (!publicKey || !signTransaction || !quote) return;

    setSwapState('swapping');
    setError(null);
    setTxSignature(null);

    try {
      // IMPORTANT: Get a FRESH quote right before executing
      // This ensures the transaction blockhash is not stale
      console.log('[Swap] Fetching fresh quote before execution...');
      const freshQuote = await getSwapQuote(
        fromToken.mint,
        toToken.mint,
        rawInputAmount,
        publicKey.toBase58(),
        slippageBps
      );

      if (!freshQuote) {
        throw new Error('Failed to get fresh quote. Please try again.');
      }

      const { transaction, lastValidBlockHeight } = await buildSwapTransaction(
        connection,
        freshQuote.quote
      );

      setSwapState('confirming');
      const signedTx = await signTransaction(transaction);

      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,
        maxRetries: 3,
      });

      // Get the blockhash that was used in the transaction for confirmation
      const { blockhash } = await connection.getLatestBlockhash('confirmed');

      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        'confirmed'
      );

      // Check if transaction actually succeeded on-chain
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      setTxSignature(signature);
      setSwapState('success');

      // Refresh balances
      setTimeout(refreshBalances, 2000);
    } catch (err) {
      console.error('Swap error:', err);
      const message = (err as Error).message || 'Swap failed';

      // User-friendly error messages
      if (message.includes('User rejected') || message.includes('rejected')) {
        setError('Transaction cancelled');
      } else if (message.includes('6025') || message.includes('SlippageToleranceExceeded')) {
        setError('Price moved too much. Try increasing slippage or try again.');
      } else if (message.includes('6001') || message.includes('insufficient') || message.includes('0x1')) {
        setError('Insufficient balance for this swap.');
      } else if (message.includes('expired') || message.includes('blockhash') || message.includes('BlockhashNotFound')) {
        setError('Transaction expired. Please try again.');
      } else if (message.includes('InstructionError')) {
        // Extract error code if possible
        const match = message.match(/Custom":(\d+)/);
        const code = match ? match[1] : 'unknown';
        setError(`Swap failed (error ${code}). Try increasing slippage.`);
      } else {
        // Show full error for debugging
        setError(`Swap failed: ${message.slice(0, 100)}`);
      }
      setSwapState('error');
    }
  }, [publicKey, signTransaction, quote, connection, refreshBalances, fromToken.mint, toToken.mint, rawInputAmount, slippageBps]);

  // Reset state
  const handleReset = useCallback(() => {
    setSwapState('idle');
    setInputAmount('');
    setQuote(null);
    setError(null);
    setTxSignature(null);
  }, []);

  // Format output amount for display
  const formattedOutput = useMemo(() => {
    if (!quote) return '—';
    const decimalPlaces = toToken.decimals >= 6 ? 4 : 2;
    return formatAmount(quote.outputAmount, toToken.decimals, decimalPlaces);
  }, [quote, toToken.decimals]);

  // Price display (CC per SOL)
  const priceDisplay = useMemo(() => {
    if (!quote) return null;
    // Always show CC per SOL
    if (tradeMode === 'buy') {
      const ccPerSol = (quote.outputAmount / Math.pow(10, CC_DECIMALS)) / (quote.inputAmount / Math.pow(10, 9));
      return `${ccPerSol.toLocaleString(undefined, { maximumFractionDigits: 0 })} $CC / SOL`;
    } else {
      const ccPerSol = (quote.inputAmount / Math.pow(10, CC_DECIMALS)) / (quote.outputAmount / Math.pow(10, 9));
      return `${ccPerSol.toLocaleString(undefined, { maximumFractionDigits: 0 })} $CC / SOL`;
    }
  }, [quote, tradeMode]);

  // Price impact color
  const priceImpactColor = useMemo(() => {
    if (!quote) return 'text-text-muted';
    if (quote.priceImpactPercent >= PRICE_IMPACT_DANGER) return 'text-red-400';
    if (quote.priceImpactPercent >= PRICE_IMPACT_WARNING) return 'text-yellow-400';
    return 'text-text-muted';
  }, [quote]);

  // GMGN Chart URL
  const chartUrl = `https://www.gmgn.cc/kline/sol/${CC_MINT}?theme=dark&interval=${chartInterval}`;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center py-4 sm:py-8 px-4">
      {/* Header */}
      <header className="flex items-center justify-between w-full max-w-[1100px] py-3 mb-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex gap-2 hover:opacity-80 transition-opacity">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </Link>
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <img src="/cc.png" alt="$CC" width={24} height={24} />
          </Link>
          <span className="text-claude-orange font-semibold text-sm">Trading Terminal</span>
          <span className="text-text-muted text-xs">SOL / $CC</span>
        </div>
        <ConnectWallet showBalance />
      </header>

      {/* Main Layout: Chart Left, Trade Panel Right */}
      <div className="flex flex-col lg:flex-row w-full max-w-[1100px] h-[600px] bg-bg-secondary border border-border rounded-lg overflow-hidden">
        {/* Chart Section (Left) */}
        <div className="w-full lg:flex-1 h-[300px] lg:h-full flex flex-col min-w-0">
          {/* Chart Controls */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-bg-secondary shrink-0">
            <span className="text-text-muted text-xs mr-2">Interval:</span>
            {['1', '5', '15', '60', '240', '1D'].map((interval) => (
              <button
                key={interval}
                onClick={() => setChartInterval(interval)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  chartInterval === interval
                    ? 'bg-claude-orange text-white'
                    : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                }`}
              >
                {interval === '1D' ? '1D' : `${interval}m`}
              </button>
            ))}
            <a
              href={`https://gmgn.ai/sol/token/${CC_MINT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-text-muted text-xs hover:text-claude-orange transition-colors"
            >
              Open in GMGN
            </a>
          </div>

          {/* Chart Iframe */}
          <div className="flex-1 bg-bg-tertiary min-h-0">
            <iframe
              src={chartUrl}
              className="w-full h-full border-0"
              title="CC Price Chart"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        </div>

        {/* Trading Panel (Right) */}
        <div className="w-full lg:w-[340px] lg:shrink-0 h-[400px] lg:h-full border-t lg:border-t-0 lg:border-l border-border bg-bg-secondary flex flex-col overflow-hidden">
          {/* Buy/Sell Tabs */}
          <div className="flex border-b border-border shrink-0">
            <button
              onClick={() => handleSwitchMode('buy')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                tradeMode === 'buy'
                  ? 'bg-accent-green/20 text-accent-green border-b-2 border-accent-green'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Buy $CC
            </button>
            <button
              onClick={() => handleSwitchMode('sell')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                tradeMode === 'sell'
                  ? 'bg-red-500/20 text-red-400 border-b-2 border-red-400'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Sell $CC
            </button>
          </div>

          {/* Trading Form */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {/* Balance Display */}
            <div className="flex justify-between text-sm">
              <div>
                <span className="text-text-muted">SOL: </span>
                <span className="text-text-primary">
                  {balanceLoading ? '...' : solBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </span>
              </div>
              <div>
                <span className="text-text-muted">$CC: </span>
                <span className="text-text-primary">
                  {balanceLoading ? '...' : ccBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            {/* Input Section */}
            <div className="bg-bg-tertiary border border-border rounded-lg p-4 w-full overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-text-muted text-xs uppercase">
                  {tradeMode === 'buy' ? 'Pay with SOL' : 'Sell $CC'}
                </span>
                <span className="text-text-muted text-xs truncate">
                  Balance: {balanceLoading ? '...' : fromBalance.toLocaleString(undefined, { maximumFractionDigits: tradeMode === 'buy' ? 4 : 0 })}
                </span>
              </div>
              <div className="flex items-center gap-2 w-full">
                <div className="flex items-center gap-2 bg-bg-secondary px-3 py-2 rounded-lg shrink-0">
                  <img
                    src={tradeMode === 'buy' ? '/sol.png' : '/cc.png'}
                    alt={fromToken.symbol}
                    className="w-6 h-6"
                  />
                  <span className="text-text-primary font-medium">{fromToken.symbol}</span>
                </div>
                <input
                  type="number"
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value)}
                  placeholder="0.0"
                  disabled={swapState !== 'idle'}
                  className="flex-1 min-w-0 w-full bg-transparent text-right text-xl font-semibold text-text-primary outline-none disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="flex gap-2 mt-3">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => handlePercentage(pct)}
                    disabled={swapState !== 'idle' || balanceLoading}
                    className="flex-1 text-xs py-1.5 bg-bg-secondary hover:bg-border rounded transition-colors disabled:opacity-50"
                  >
                    {pct === 100 ? 'MAX' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Output Section */}
            <div className="bg-bg-tertiary border border-border rounded-lg p-4 w-full overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-text-muted text-xs uppercase">
                  {tradeMode === 'buy' ? 'Receive $CC' : 'Receive SOL'}
                </span>
                {quoteTimeLeft > 0 && (
                  <span className="text-text-muted text-xs">
                    Quote: {quoteTimeLeft}s
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 w-full">
                <div className="flex items-center gap-2 bg-bg-secondary px-3 py-2 rounded-lg shrink-0">
                  <img
                    src={tradeMode === 'buy' ? '/cc.png' : '/sol.png'}
                    alt={toToken.symbol}
                    className="w-6 h-6"
                  />
                  <span className="text-text-primary font-medium">{toToken.symbol}</span>
                </div>
                <div className="flex-1 min-w-0 text-right text-xl font-semibold text-text-primary truncate">
                  {swapState === 'quoting' ? (
                    <span className="text-text-muted animate-pulse">...</span>
                  ) : (
                    formattedOutput
                  )}
                </div>
              </div>
            </div>

            {/* Quote Info */}
            {quote && !isQuoteExpired && (
              <div className="bg-bg-tertiary border border-border rounded-lg p-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Rate</span>
                  <span className="text-text-primary">{priceDisplay}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Price Impact</span>
                  <span className={priceImpactColor}>{quote.priceImpactPercent.toFixed(2)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Route</span>
                  <span className="text-text-primary text-xs truncate max-w-[150px]">{quote.route}</span>
                </div>
              </div>
            )}

            {/* Price Impact Warning */}
            {quote && quote.priceImpactPercent >= PRICE_IMPACT_WARNING && (
              <div
                className={`border rounded-lg p-3 ${
                  quote.priceImpactPercent >= PRICE_IMPACT_DANGER
                    ? 'bg-red-900/20 border-red-500/50'
                    : 'bg-yellow-900/20 border-yellow-500/50'
                }`}
              >
                <p className={`text-sm ${quote.priceImpactPercent >= PRICE_IMPACT_DANGER ? 'text-red-400' : 'text-yellow-400'}`}>
                  {quote.priceImpactPercent >= PRICE_IMPACT_DANGER
                    ? 'High price impact! Consider reducing your trade size.'
                    : 'Price impact is elevated.'}
                </p>
              </div>
            )}

            {/* Slippage Settings */}
            <div>
              <button
                onClick={() => setShowSlippage(!showSlippage)}
                className="flex items-center gap-2 text-text-muted text-sm hover:text-text-primary transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Slippage: {slippageBps / 100}%
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`transform transition-transform ${showSlippage ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {showSlippage && (
                <div className="flex gap-2 mt-2">
                  {SLIPPAGE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSlippageBps(option.value)}
                      className={`flex-1 py-2 rounded-md text-sm transition-colors ${
                        slippageBps === option.value
                          ? 'bg-claude-orange text-white'
                          : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Action Button (Fixed at bottom) */}
          <div className="p-4 border-t border-border shrink-0">
            {!publicKey ? (
              <ConnectWallet className="w-full justify-center py-4 text-lg" />
            ) : swapState === 'success' ? (
              <div className="space-y-3">
                <div className="bg-accent-green/20 border border-accent-green/50 rounded-lg p-3 text-center">
                  <p className="text-accent-green font-semibold text-sm mb-1">
                    {tradeMode === 'buy' ? 'Purchase' : 'Sale'} Successful!
                  </p>
                  {txSignature && (
                    <a
                      href={`https://solscan.io/tx/${txSignature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-claude-orange text-xs hover:underline"
                    >
                      View on Solscan
                    </a>
                  )}
                </div>
                <button
                  onClick={handleReset}
                  className="w-full bg-bg-tertiary border border-border text-text-primary font-semibold py-3 rounded-md hover:bg-border transition-colors"
                >
                  Trade Again
                </button>
              </div>
            ) : tradeMode === 'buy' ? (
              <button
                onClick={handleSwap}
                disabled={!quote || swapState !== 'idle'}
                className="w-full font-bold py-4 rounded-md text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-accent-green text-white hover:bg-accent-green/80"
              >
                {swapState === 'quoting'
                  ? 'Getting Quote...'
                  : swapState === 'swapping'
                  ? 'Building Transaction...'
                  : swapState === 'confirming'
                  ? 'Confirm in Wallet...'
                  : 'Buy $CC'}
              </button>
            ) : (
              /* Sell mode - show placeholder where button would be */
              <div className="w-full py-4 rounded-md text-lg text-center text-text-muted bg-bg-tertiary border border-dashed border-red-500/30">
                {swapState === 'quoting'
                  ? 'Getting Quote...'
                  : swapState === 'swapping'
                  ? 'Building Transaction...'
                  : swapState === 'confirming'
                  ? 'Confirm in Wallet...'
                  : quote
                  ? '← Catch the button!'
                  : 'Enter amount to sell'}
              </div>
            )}

            {/* Fee Notice */}
            <div className="mt-3 flex items-center justify-center gap-2 text-text-muted text-xs">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>1% fee → $CC buyback & burn</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center mt-4">
        <Link href="/" className="text-claude-orange hover:underline text-sm">
          &larr; back
        </Link>
        <p className="text-text-muted text-xs mt-2">
          claudecode.wtf &middot; Chart by GMGN &middot; Swaps via Jupiter
        </p>
      </footer>

      {/* DVD Bouncing Sell Button - only visible in sell mode with a valid quote */}
      {tradeMode === 'sell' && publicKey && quote && swapState === 'idle' && (
        <button
          ref={buttonRef}
          onClick={handleSwap}
          style={{
            position: 'fixed',
            left: buttonPos.x,
            top: buttonPos.y,
            zIndex: 9999,
            transition: 'box-shadow 0.1s',
          }}
          className="px-8 py-4 font-bold text-lg rounded-md bg-red-500 text-white hover:bg-red-600 shadow-2xl shadow-red-500/50 animate-pulse cursor-pointer select-none"
        >
          Sell $CC
        </button>
      )}
    </div>
  );
}

export default function SwapPage() {
  return (
    <WalletProvider network="mainnet-beta">
      <TradingTerminal />
    </WalletProvider>
  );
}
