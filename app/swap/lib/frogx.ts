/**
 * FrogX DEX Client - Client-side swap library
 *
 * Uses the FrogX DEX API (already integrated for buybacks) to get swap quotes
 * and build transactions that the user signs with their wallet.
 *
 * Flow:
 * 1. getSwapQuote() - Get quote with instructions from FrogX
 * 2. buildSwapTransaction() - Build VersionedTransaction from quote
 * 3. User signs transaction in wallet
 * 4. Transaction submitted to chain
 */

import {
  Connection,
  PublicKey,
  VersionedTransaction,
  TransactionInstruction,
  TransactionMessage,
  AddressLookupTableAccount,
  ComputeBudgetProgram,
} from '@solana/web3.js';

// Frog Trading Exchange API endpoint (via CORS proxy)
const SWAP_API_BASE = 'https://ccwtf-api.aklo.workers.dev';

// Token addresses
export const WSOL_MINT = 'So11111111111111111111111111111111111111112';
export const CC_MINT_MAINNET = 'Hg23qBLJDvhQtGLHMvot7NK54qAhzQFj9BVd5jpABAGS';

// Quote expiry (30 seconds)
export const QUOTE_EXPIRY_MS = 30_000;

// ============ TYPES ============

export interface FrogXInstruction {
  programId: string;
  accounts: Array<{
    pubkey: string;
    isSigner: boolean;
    isWritable: boolean;
  }>;
  data: string; // Base64 encoded
}

export interface FrogXQuote {
  status: string;
  updatedAt: string;
  inMint: string;
  outMint: string;
  amountIn: string;
  amountOut: string;
  priceImpactBps: number;
  routers: string[];
  provider: string;
  routeId: string;
  inAmount: string;
  instructions: FrogXInstruction[];
  addressLookupTables: string[];
  computeUnits: number;
  computeUnitsSafe: number;
  executable: boolean;
  simulated: boolean;
}

export interface PlatformFeeInfo {
  bps: number;
  feeAccount: string;
  feeMint: string;
}

export interface SwapQuoteResult {
  quote: FrogXQuote;
  inputAmount: number;
  outputAmount: number;
  priceImpactPercent: number;
  route: string;
  expiresAt: number;
  platformFee?: PlatformFeeInfo;
}

// ============ API FUNCTIONS ============

/**
 * Get swap quote from FrogX DEX
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
      const text = await response.text();
      console.error(`[FrogX] Quote failed: ${response.status} ${response.statusText}`);
      console.error(`[FrogX] Response: ${text}`);
      return null;
    }

    const data = (await response.json()) as FrogXQuote & { platformFee?: PlatformFeeInfo };

    // Check if quote is executable
    if (!data.executable) {
      console.error(`[FrogX] Quote not executable: status=${data.status}`);
      return null;
    }

    return {
      quote: data,
      inputAmount: Number(data.amountIn),
      outputAmount: Number(data.amountOut),
      priceImpactPercent: data.priceImpactBps / 100,
      route: data.routers.join(' → ') + ` (${data.provider})`,
      expiresAt: Date.now() + QUOTE_EXPIRY_MS,
      platformFee: data.platformFee,
    };
  } catch (error) {
    console.error('[FrogX] Failed to get quote:', error);
    return null;
  }
}

export interface BuildSwapResult {
  transaction: VersionedTransaction;
  blockhash: string;
  lastValidBlockHeight: number;
}

/**
 * Build VersionedTransaction from FrogX quote
 *
 * The transaction needs to be signed by the user's wallet after building.
 * Returns the transaction along with blockhash info for proper confirmation.
 */
export async function buildSwapTransaction(
  connection: Connection,
  quote: FrogXQuote,
  feePayer: PublicKey
): Promise<BuildSwapResult> {
  // Load address lookup tables
  const lookupTableAccounts: AddressLookupTableAccount[] = [];
  for (const tableAddress of quote.addressLookupTables) {
    const tableAccount = await connection.getAddressLookupTable(
      new PublicKey(tableAddress)
    );
    if (tableAccount.value) {
      lookupTableAccounts.push(tableAccount.value);
    }
  }

  // Convert FrogX instructions to Solana TransactionInstructions
  const instructions = quote.instructions.map((ix) => {
    return new TransactionInstruction({
      programId: new PublicKey(ix.programId),
      keys: ix.accounts.map((acc) => ({
        pubkey: new PublicKey(acc.pubkey),
        isSigner: acc.isSigner,
        isWritable: acc.isWritable,
      })),
      data: Buffer.from(ix.data, 'base64'),
    });
  });

  // Add compute budget instructions for priority
  const computeUnitsIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: quote.computeUnitsSafe,
  });
  const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 50000, // 0.00005 SOL per CU - reasonable priority
  });

  // Get recent blockhash with confirmed commitment for faster finality
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

  // Build versioned transaction
  const messageV0 = new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash: blockhash,
    instructions: [computeUnitsIx, priorityFeeIx, ...instructions],
  }).compileToV0Message(lookupTableAccounts);

  return {
    transaction: new VersionedTransaction(messageV0),
    blockhash,
    lastValidBlockHeight,
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
