/**
 * Buyback & Burn - Token Economics for CC Flip
 *
 * Every 6 hours, this module:
 * 1. Collects accumulated SOL platform fees from the brain wallet
 * 2. Swaps SOL → $CC via FrogX DEX
 * 3. Burns 100% of purchased $CC tokens using SPL Token burn
 *
 * This creates deflationary pressure on $CC supply:
 * - House edge profits stay in the game (never sold)
 * - Platform fees (SOL) buy back $CC from the market
 * - All bought $CC is permanently burned
 */

import {
  Connection,
  PublicKey,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createBurnInstruction,
} from '@solana/spl-token';
import { getConnection, buildTransaction, sendAndConfirmWithRetry } from './solana.js';
import { loadWallet, CC_TOKEN_MINT } from './wallet.js';
import { db } from './db.js';

// FrogX DEX API endpoints (Frog Trading Exchange - Titan-powered)
const FROGX_API_BASE = 'https://frogx-api.aklo.workers.dev';

// SOL mint address (wrapped SOL)
const WSOL_MINT = 'So11111111111111111111111111111111111111112';

// Minimum SOL to accumulate before triggering buyback (0.1 SOL)
const MIN_BUYBACK_SOL = 0.1 * LAMPORTS_PER_SOL;

// Reserve SOL for transaction fees (0.05 SOL)
const RESERVE_SOL = 0.05 * LAMPORTS_PER_SOL;

// ============ DATABASE ============

interface BuybackRecord {
  id: number;
  created_at: string;
  sol_spent: number;
  cc_bought: number;
  cc_burned: number;
  swap_tx: string;
  burn_tx: string;
  status: 'pending' | 'swapped' | 'burned' | 'failed';
  error?: string;
}

/**
 * Initialize buyback tracking table
 */
export function initBuybackTable(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS buybacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT DEFAULT (datetime('now')),
      sol_spent INTEGER NOT NULL DEFAULT 0,
      cc_bought INTEGER NOT NULL DEFAULT 0,
      cc_burned INTEGER NOT NULL DEFAULT 0,
      swap_tx TEXT,
      burn_tx TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      error TEXT
    )
  `);
}

/**
 * Record a new buyback attempt
 */
function createBuybackRecord(solAmount: number): number {
  const stmt = db.prepare(`
    INSERT INTO buybacks (sol_spent, status)
    VALUES (?, 'pending')
  `);
  const result = stmt.run(solAmount);
  return result.lastInsertRowid as number;
}

/**
 * Update buyback record after swap
 */
function updateBuybackSwap(id: number, ccBought: number, swapTx: string): void {
  const stmt = db.prepare(`
    UPDATE buybacks
    SET cc_bought = ?, swap_tx = ?, status = 'swapped'
    WHERE id = ?
  `);
  stmt.run(ccBought, swapTx, id);
}

/**
 * Update buyback record after burn
 */
function updateBuybackBurn(id: number, ccBurned: number, burnTx: string): void {
  const stmt = db.prepare(`
    UPDATE buybacks
    SET cc_burned = ?, burn_tx = ?, status = 'burned'
    WHERE id = ?
  `);
  stmt.run(ccBurned, burnTx, id);
}

/**
 * Mark buyback as failed
 */
function markBuybackFailed(id: number, error: string): void {
  const stmt = db.prepare(`
    UPDATE buybacks
    SET status = 'failed', error = ?
    WHERE id = ?
  `);
  stmt.run(error, id);
}

/**
 * Get buyback statistics
 */
export function getBuybackStats(): {
  totalBuybacks: number;
  totalSolSpent: number;
  totalCcBought: number;
  totalCcBurned: number;
  lastBuyback: string | null;
} {
  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total_buybacks,
      COALESCE(SUM(sol_spent), 0) as total_sol_spent,
      COALESCE(SUM(cc_bought), 0) as total_cc_bought,
      COALESCE(SUM(cc_burned), 0) as total_cc_burned,
      MAX(created_at) as last_buyback
    FROM buybacks
    WHERE status = 'burned'
  `);
  const result = stmt.get() as {
    total_buybacks: number;
    total_sol_spent: number;
    total_cc_bought: number;
    total_cc_burned: number;
    last_buyback: string | null;
  };

  return {
    totalBuybacks: result.total_buybacks,
    totalSolSpent: result.total_sol_spent / LAMPORTS_PER_SOL,
    totalCcBought: result.total_cc_bought / 1_000_000_000, // 9 decimals
    totalCcBurned: result.total_cc_burned / 1_000_000_000, // 9 decimals
    lastBuyback: result.last_buyback,
  };
}

// ============ FROGX DEX INTEGRATION ============

interface FrogXInstruction {
  programId: string;
  accounts: Array<{
    pubkey: string;
    isSigner: boolean;
    isWritable: boolean;
  }>;
  data: string; // Base64 encoded
}

interface FrogXQuote {
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

/**
 * Get swap quote from FrogX DEX (Frog Trading Exchange)
 * Returns quote with instructions ready to build transaction
 */
async function getSwapQuote(
  inputMint: string,
  outputMint: string,
  inputAmount: number,
  userPublicKey: string,
  slippageBps: number = 100 // 1% default slippage
): Promise<FrogXQuote | null> {
  try {
    const response = await fetch(`${FROGX_API_BASE}/api/frogx/quotes`, {
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
      console.error(`[Buyback] FrogX quote failed: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error(`[Buyback] Response: ${text}`);
      return null;
    }

    const data = await response.json() as FrogXQuote;

    // Check if quote is executable
    if (!data.executable) {
      console.error(`[Buyback] Quote not executable: status=${data.status}`);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[Buyback] Failed to get FrogX quote:', error);
    return null;
  }
}

/**
 * Build transaction from FrogX quote instructions
 */
async function buildSwapTransaction(
  connection: Connection,
  quote: FrogXQuote,
  feePayer: PublicKey
): Promise<VersionedTransaction> {
  const { AddressLookupTableAccount, TransactionMessage } = await import('@solana/web3.js');

  // Load address lookup tables
  const lookupTableAccounts: InstanceType<typeof AddressLookupTableAccount>[] = [];
  for (const tableAddress of quote.addressLookupTables) {
    const tableAccount = await connection.getAddressLookupTable(new PublicKey(tableAddress));
    if (tableAccount.value) {
      lookupTableAccounts.push(tableAccount.value);
    }
  }

  // Convert FrogX instructions to Solana TransactionInstructions
  const { TransactionInstruction } = await import('@solana/web3.js');
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

  // Add compute budget instructions
  const { ComputeBudgetProgram } = await import('@solana/web3.js');
  const computeUnitsIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: quote.computeUnitsSafe,
  });
  const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 50000, // 0.00005 SOL per CU
  });

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();

  // Build versioned transaction
  const messageV0 = new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash: blockhash,
    instructions: [computeUnitsIx, priorityFeeIx, ...instructions],
  }).compileToV0Message(lookupTableAccounts);

  return new VersionedTransaction(messageV0);
}

// ============ TOKEN BURN ============

/**
 * Burn $CC tokens from brain wallet
 */
async function burnCC(
  connection: Connection,
  wallet: ReturnType<typeof loadWallet>,
  amount: bigint
): Promise<string> {
  const ata = await getAssociatedTokenAddress(CC_TOKEN_MINT, wallet.publicKey);

  // Create burn instruction
  const burnIx = createBurnInstruction(
    ata,                    // account to burn from
    CC_TOKEN_MINT,          // token mint
    wallet.publicKey,       // owner/authority
    amount                  // amount to burn
  );

  const tx = await buildTransaction(connection, wallet.publicKey, [burnIx]);
  return sendAndConfirmWithRetry(connection, wallet, tx);
}

// ============ MAIN BUYBACK FUNCTION ============

/**
 * Execute buyback and burn cycle
 *
 * This function:
 * 1. Checks brain wallet SOL balance
 * 2. If above threshold, swaps SOL → $CC via FrogX
 * 3. Burns 100% of purchased $CC
 */
export async function executeBuybackAndBurn(): Promise<{
  success: boolean;
  solSpent?: number;
  ccBought?: number;
  ccBurned?: number;
  swapTx?: string;
  burnTx?: string;
  error?: string;
}> {
  console.log('[Buyback] Starting buyback and burn cycle...');

  const encryptionKey = process.env.BRAIN_WALLET_KEY;
  if (!encryptionKey) {
    return { success: false, error: 'BRAIN_WALLET_KEY not configured' };
  }

  try {
    const connection = getConnection();
    const wallet = loadWallet(encryptionKey);

    // 1. Check SOL balance
    const balance = await wallet.getBalance(connection);
    console.log(`[Buyback] Brain wallet SOL balance: ${balance.sol} SOL`);

    // Calculate available SOL for buyback (keep reserve for tx fees)
    const availableLamports = balance.solLamports - BigInt(RESERVE_SOL);

    if (availableLamports < BigInt(MIN_BUYBACK_SOL)) {
      console.log(`[Buyback] Insufficient SOL for buyback. Available: ${Number(availableLamports) / LAMPORTS_PER_SOL} SOL, Min: ${MIN_BUYBACK_SOL / LAMPORTS_PER_SOL} SOL`);
      return {
        success: false,
        error: `Insufficient SOL (${Number(availableLamports) / LAMPORTS_PER_SOL} < ${MIN_BUYBACK_SOL / LAMPORTS_PER_SOL})`,
      };
    }

    const swapAmount = Number(availableLamports);
    console.log(`[Buyback] Swapping ${swapAmount / LAMPORTS_PER_SOL} SOL for $CC...`);

    // Create buyback record
    const buybackId = createBuybackRecord(swapAmount);

    // 2. Get swap quote from FrogX (Frog Trading Exchange)
    const quote = await getSwapQuote(
      WSOL_MINT,
      CC_TOKEN_MINT.toBase58(),
      swapAmount,
      wallet.publicKey.toBase58(),
      100 // 1% slippage
    );

    if (!quote) {
      markBuybackFailed(buybackId, 'Failed to get swap quote');
      return { success: false, error: 'Failed to get swap quote from FrogX' };
    }

    console.log(`[Buyback] Quote: ${swapAmount / LAMPORTS_PER_SOL} SOL → ${Number(quote.amountOut) / 1_000_000_000} $CC`);
    console.log(`[Buyback] Price impact: ${quote.priceImpactBps / 100}%`);
    console.log(`[Buyback] Router: ${quote.routers.join(', ')} via ${quote.provider}`);

    // 3. Build and execute swap transaction
    const swapTransaction = await buildSwapTransaction(connection, quote, wallet.publicKey);
    swapTransaction.sign([wallet.keypair]);

    let swapTx: string;
    try {
      swapTx = await connection.sendTransaction(swapTransaction, {
        skipPreflight: false,
        maxRetries: 3,
      });
    } catch (sendError) {
      console.error(`[Buyback] Failed to send swap tx:`, sendError);
      markBuybackFailed(buybackId, `Failed to send swap: ${(sendError as Error).message}`);
      return { success: false, error: `Failed to send swap: ${(sendError as Error).message}` };
    }

    // Wait for confirmation
    await connection.confirmTransaction(swapTx, 'confirmed');
    console.log(`[Buyback] Swap confirmed: ${swapTx}`);

    const ccBought = Number(quote.amountOut);
    updateBuybackSwap(buybackId, ccBought, swapTx);

    // 4. Burn all purchased $CC
    console.log(`[Buyback] Burning ${ccBought / 1_000_000_000} $CC...`);

    // Get actual $CC balance after swap (might be slightly different due to slippage)
    const postSwapBalance = await wallet.getBalance(connection);
    const ccToBurn = postSwapBalance.ccLamports;

    if (ccToBurn <= BigInt(0)) {
      markBuybackFailed(buybackId, 'No $CC to burn after swap');
      return {
        success: false,
        solSpent: swapAmount / LAMPORTS_PER_SOL,
        ccBought: ccBought / 1_000_000_000,
        swapTx,
        error: 'No $CC to burn after swap',
      };
    }

    const burnTx = await burnCC(connection, wallet, ccToBurn);
    console.log(`[Buyback] Burn confirmed: ${burnTx}`);

    const ccBurned = Number(ccToBurn);
    updateBuybackBurn(buybackId, ccBurned, burnTx);

    console.log(`[Buyback] ✓ Buyback and burn complete!`);
    console.log(`[Buyback]   SOL spent: ${swapAmount / LAMPORTS_PER_SOL}`);
    console.log(`[Buyback]   $CC bought: ${ccBought / 1_000_000_000}`);
    console.log(`[Buyback]   $CC burned: ${ccBurned / 1_000_000_000}`);

    return {
      success: true,
      solSpent: swapAmount / LAMPORTS_PER_SOL,
      ccBought: ccBought / 1_000_000_000,
      ccBurned: ccBurned / 1_000_000_000,
      swapTx,
      burnTx,
    };
  } catch (error) {
    console.error('[Buyback] Error during buyback and burn:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Check if buyback should run
 * Returns true if:
 * - At least 6 hours since last successful buyback
 * - Sufficient SOL accumulated
 */
export async function shouldRunBuyback(): Promise<{
  should: boolean;
  reason: string;
  availableSol?: number;
}> {
  // Check time since last buyback
  const stats = getBuybackStats();
  if (stats.lastBuyback) {
    const lastBuybackTime = new Date(stats.lastBuyback).getTime();
    const hoursSinceLastBuyback = (Date.now() - lastBuybackTime) / (1000 * 60 * 60);

    if (hoursSinceLastBuyback < 6) {
      return {
        should: false,
        reason: `Only ${hoursSinceLastBuyback.toFixed(1)} hours since last buyback (need 6)`,
      };
    }
  }

  // Check SOL balance
  const encryptionKey = process.env.BRAIN_WALLET_KEY;
  if (!encryptionKey) {
    return { should: false, reason: 'BRAIN_WALLET_KEY not configured' };
  }

  try {
    const connection = getConnection();
    const wallet = loadWallet(encryptionKey);
    const balance = await wallet.getBalance(connection);
    const availableLamports = balance.solLamports - BigInt(RESERVE_SOL);
    const availableSol = Number(availableLamports) / LAMPORTS_PER_SOL;

    if (availableLamports < BigInt(MIN_BUYBACK_SOL)) {
      return {
        should: false,
        reason: `Insufficient SOL: ${availableSol.toFixed(4)} < ${MIN_BUYBACK_SOL / LAMPORTS_PER_SOL}`,
        availableSol,
      };
    }

    return {
      should: true,
      reason: `Ready: ${availableSol.toFixed(4)} SOL available for buyback`,
      availableSol,
    };
  } catch (error) {
    return {
      should: false,
      reason: `Error checking balance: ${(error as Error).message}`,
    };
  }
}

// Initialize on module load
initBuybackTable();
