/**
 * Jupiter DEX Client - Client-side swap library
 *
 * Uses Jupiter Swap API v1 via our worker (CORS proxy) to get quotes
 * and pre-built transactions that the user signs with their wallet.
 *
 * Flow:
 * 1. getSwapQuote() - Get quote + pre-built transaction from Jupiter
 * 2. User signs transaction in wallet (no manual building needed)
 * 3. Transaction submitted to chain
 *
 * Platform Fee: 1% (100 bps) collected for $CC buyback & burn
 */

import {
  Connection,
  VersionedTransaction,
} from '@solana/web3.js';

// Worker API endpoint (CORS proxy to Jupiter)
const SWAP_API_BASE = 'https://ccwtf-api.aklo.workers.dev';

// Token addresses
export const WSOL_MINT = 'So11111111111111111111111111111111111111112';
export const CC_MINT_MAINNET = 'Hg23qBLJDvhQtGLHMvot7NK54qAhzQFj9BVd5jpABAGS';

// Quote expiry (30 seconds)
export const QUOTE_EXPIRY_MS = 30_000;

// ============ TYPES ============

export interface PlatformFeeInfo {
  bps: number;
  feeAccount: string;
  feeMint: string;
  amount: string;
}

export interface JupiterQuoteResponse {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: number;
  route: string;
  swapTransaction: string; // Base64 encoded VersionedTransaction
  lastValidBlockHeight: number;
  platformFee: PlatformFeeInfo;
}

export interface SwapQuoteResult {
  quote: JupiterQuoteResponse;
  inputAmount: number;
  outputAmount: number;
  priceImpactPercent: number;
  route: string;
  expiresAt: number;
  platformFee: PlatformFeeInfo;
}

// ============ API FUNCTIONS ============

/**
 * Get swap quote from Jupiter via our worker
 *
 * The worker handles:
 * - Adding platform fee (1%) to quote request
 * - Building the swap transaction with fee collection
 *
 * @param inputMint - Input token mint address
 * @param outputMint - Output token mint address
 * @param inputAmount - Amount in smallest units (lamports for SOL, raw for tokens)
 * @param userPublicKey - User's wallet address
 * @param slippageBps - Slippage tolerance in basis points (100 = 1%)
 */
export async function getSwapQuote(
  inputMint: string,
  outputMint: string,
  inputAmount: number,
  userPublicKey: string,
  slippageBps: number = 100
): Promise<SwapQuoteResult | null> {
  try {
    const response = await fetch(`${SWAP_API_BASE}/swap/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inMint: inputMint,
        outMint: outputMint,
        amountIn: inputAmount.toString(),
        slippageBps,
        userPublicKey,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error(`[Jupiter] Quote failed: ${response.status}`, data);
      return null;
    }

    const data = (await response.json()) as JupiterQuoteResponse;

    // Validate response has required fields
    if (!data.swapTransaction || !data.outAmount) {
      console.error('[Jupiter] Invalid response: missing swapTransaction or outAmount');
      return null;
    }

    return {
      quote: data,
      inputAmount: Number(data.inAmount),
      outputAmount: Number(data.outAmount),
      priceImpactPercent: data.priceImpactPct * 100, // Convert from decimal to percent
      route: data.route || 'Direct',
      expiresAt: Date.now() + QUOTE_EXPIRY_MS,
      platformFee: data.platformFee,
    };
  } catch (error) {
    console.error('[Jupiter] Failed to get quote:', error);
    return null;
  }
}

export interface BuildSwapResult {
  transaction: VersionedTransaction;
  lastValidBlockHeight: number;
}

/**
 * Build VersionedTransaction from Jupiter quote
 *
 * Jupiter returns a pre-built base64-encoded transaction.
 * We just need to decode it and return for signing.
 */
export async function buildSwapTransaction(
  connection: Connection,
  quote: JupiterQuoteResponse
): Promise<BuildSwapResult> {
  // Decode the base64-encoded transaction from Jupiter
  const transactionBuffer = Buffer.from(quote.swapTransaction, 'base64');
  const transaction = VersionedTransaction.deserialize(transactionBuffer);

  return {
    transaction,
    lastValidBlockHeight: quote.lastValidBlockHeight,
  };
}

// ============ UTILITY FUNCTIONS ============

/**
 * Format token amount for display
 * SOL: 9 decimals, show up to 4 decimal places
 * $CC: 9 decimals, show as integer for large amounts
 */
export function formatAmount(
  amount: number,
  decimals: number,
  maxDecimals: number = 4
): string {
  const value = amount / Math.pow(10, decimals);
  if (value >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: maxDecimals });
}

/**
 * Parse user input to raw amount
 */
export function parseAmount(input: string, decimals: number): number {
  const value = parseFloat(input);
  if (isNaN(value) || value < 0) return 0;
  return Math.floor(value * Math.pow(10, decimals));
}

/**
 * Calculate price from quote
 * Returns price of output token in terms of input token
 */
export function calculatePrice(
  inputAmount: number,
  outputAmount: number,
  inputDecimals: number,
  outputDecimals: number
): number {
  const inputValue = inputAmount / Math.pow(10, inputDecimals);
  const outputValue = outputAmount / Math.pow(10, outputDecimals);
  if (outputValue === 0) return 0;
  return inputValue / outputValue;
}
