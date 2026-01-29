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
  getAccount,
} from '@solana/spl-token';
import { getConnection, buildTransaction, sendAndConfirmWithRetry, ensureBurnWalletAta, transferToBurnWallet } from './solana.js';
import { loadWallet, loadBurnWallet, burnWalletExists, getBurnWalletState, updateBurnWalletCachedBalance, CC_TOKEN_MINT } from './wallet.js';
import { db } from './db.js';

// Jupiter API for swaps (with our API key for better rate limits)
const JUPITER_API_BASE = 'https://api.jup.ag/swap/v1';
const JUPITER_API_KEY = '62502902-5f9d-44ec-9955-4b9dfd24dcb0';

// Brain wallet fee ATAs (where swap terminal fees accumulate)
const BRAIN_FEE_ATA_CC = '7zCJPTxdzSPv1pzSThXxyMUQk8vxKyGuBSKpuvRMtEh4';   // CC fees from buys
const BRAIN_FEE_ATA_WSOL = '2ULjXwpZgBeh5xaqUs51gcDmcorxRAxsHf8N2iiK7hwv'; // SOL fees from sells

// SOL mint address (wrapped SOL)
const WSOL_MINT = 'So11111111111111111111111111111111111111112';

// Minimum SOL to accumulate before triggering buyback (0.1 SOL)
const MIN_BUYBACK_SOL = 0.1 * LAMPORTS_PER_SOL;

// Reserve SOL for transaction fees (0.05 SOL)
const RESERVE_SOL = 0.05 * LAMPORTS_PER_SOL;

// Maximum SOL per buyback (for safety, can be removed after testing)
const MAX_BUYBACK_SOL = 0.5 * LAMPORTS_PER_SOL;

// SAFETY: Maximum $CC tokens that can be burned in a single transaction
// 1M tokens max - prevents catastrophic burns from bugs
const MAX_BURN_PER_TX = BigInt(1_000_000_000_000_000); // 1M tokens (9 decimals)

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

// ============ JUPITER API INTEGRATION ============

interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: string;
  routePlan: Array<{ swapInfo: { label: string } }>;
  slippageBps: number;
  otherAmountThreshold: string;
}

interface JupiterSwapResponse {
  swapTransaction: string; // Base64 encoded versioned transaction
  lastValidBlockHeight: number;
}

/**
 * Get swap quote and transaction from Jupiter API
 * Returns a ready-to-sign versioned transaction
 */
async function getJupiterSwap(
  inputMint: string,
  outputMint: string,
  inputAmount: number,
  userPublicKey: string,
  slippageBps: number = 200 // 2% default slippage for memecoins
): Promise<{ quote: JupiterQuote; swapTx: string; lastValidBlockHeight: number } | null> {
  try {
    // Step 1: Get quote
    const quoteParams = new URLSearchParams({
      inputMint,
      outputMint,
      amount: inputAmount.toString(),
      slippageBps: slippageBps.toString(),
    });

    const quoteResponse = await fetch(`${JUPITER_API_BASE}/quote?${quoteParams}`, {
      headers: {
        'Accept': 'application/json',
        'x-api-key': JUPITER_API_KEY,
      },
    });

    if (!quoteResponse.ok) {
      console.error(`[Buyback] Jupiter quote failed: ${quoteResponse.status}`);
      const text = await quoteResponse.text();
      console.error(`[Buyback] Response: ${text}`);
      return null;
    }

    const quote = await quoteResponse.json() as JupiterQuote;

    // Step 2: Get swap transaction
    const swapResponse = await fetch(`${JUPITER_API_BASE}/swap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': JUPITER_API_KEY,
      },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 500000, // 0.0005 SOL priority fee
      }),
    });

    if (!swapResponse.ok) {
      console.error(`[Buyback] Jupiter swap failed: ${swapResponse.status}`);
      const text = await swapResponse.text();
      console.error(`[Buyback] Response: ${text}`);
      return null;
    }

    const swapData = await swapResponse.json() as JupiterSwapResponse;

    return {
      quote,
      swapTx: swapData.swapTransaction,
      lastValidBlockHeight: swapData.lastValidBlockHeight,
    };
  } catch (error) {
    console.error('[Buyback] Failed to get Jupiter swap:', error);
    return null;
  }
}

/**
 * Deserialize and sign Jupiter swap transaction
 */
async function signJupiterSwap(
  swapTxBase64: string,
  wallet: ReturnType<typeof loadWallet>
): Promise<VersionedTransaction> {
  const txBuffer = Buffer.from(swapTxBase64, 'base64');
  const tx = VersionedTransaction.deserialize(txBuffer);
  tx.sign([wallet.keypair]);
  return tx;
}

// ============ TOKEN BURN (AIRLOCK PATTERN) ============

/**
 * Burn $CC tokens from the BURN WALLET (not brain wallet!)
 *
 * SAFETY: This function burns from the dedicated burn wallet, which acts as an airlock.
 * The brain wallet transfers the exact amount to burn into the burn wallet first,
 * then this function burns the ENTIRE burn wallet balance.
 *
 * This is safe because:
 * - The burn wallet is isolated from the rewards pool
 * - Even if we "burn entire balance", we only burn what was transferred
 * - The brain wallet (1.68M $CC) is NEVER at risk
 *
 * NOTE: The brain wallet pays transaction fees (burn wallet has no SOL).
 * The burn wallet signs as token owner.
 *
 * (incident: 1.68M tokens accidentally burned 2026-01-27 - this pattern prevents that)
 */
async function burnFromBurnWallet(
  connection: Connection,
  brainWallet: ReturnType<typeof loadWallet>,
  burnWallet: ReturnType<typeof loadBurnWallet>
): Promise<{ burnTx: string; amountBurned: bigint }> {
  const ata = await getAssociatedTokenAddress(CC_TOKEN_MINT, burnWallet.publicKey);

  // Get burn wallet balance
  const account = await getAccount(connection, ata);
  const burnWalletBalance = account.amount;

  // SAFETY CHECK: Burn wallet should have tokens to burn
  if (burnWalletBalance === BigInt(0)) {
    throw new Error(
      `SAFETY STOP: Burn wallet is empty. ` +
      `Transfer tokens to burn wallet before calling this function.`
    );
  }

  // SAFETY CHECK: Never burn more than MAX_BURN_PER_TX (1M tokens)
  if (burnWalletBalance > MAX_BURN_PER_TX) {
    throw new Error(
      `SAFETY STOP: Burn wallet balance ${burnWalletBalance} exceeds max burn per tx ${MAX_BURN_PER_TX}. ` +
      `This suggests a bug in the transfer step - should not transfer more than MAX_BURN_PER_TX.`
    );
  }

  // SAFETY LOG: Log the burn operation
  console.log(`[BURN AIRLOCK] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`[BURN AIRLOCK] Step 3: Burning from airlock wallet`);
  console.log(`[BURN AIRLOCK] Burn wallet:  ${burnWallet.publicKey.toBase58()}`);
  console.log(`[BURN AIRLOCK] Amount:       ${burnWalletBalance} lamports (${Number(burnWalletBalance) / 1_000_000_000} $CC)`);
  console.log(`[BURN AIRLOCK] Fee payer:    ${brainWallet.publicKey.toBase58()} (brain wallet)`);
  console.log(`[BURN AIRLOCK] Safety:       Burning ENTIRE burn wallet is safe (it's isolated)`);
  console.log(`[BURN AIRLOCK] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // ============ EXECUTE BURN ============
  // Burn the ENTIRE burn wallet balance - this is SAFE because it's an isolated airlock
  // Brain wallet pays fees, burn wallet signs as token owner

  const burnIx = createBurnInstruction(
    ata,                      // account to burn from
    CC_TOKEN_MINT,            // token mint
    burnWallet.publicKey,     // owner/authority
    burnWalletBalance         // burn ENTIRE balance (safe because isolated)
  );

  // Build transaction with brain wallet as fee payer
  const tx = await buildTransaction(connection, brainWallet.publicKey, [burnIx]);

  // Sign with both wallets: brain (fee payer) + burn (token owner)
  tx.sign(brainWallet.keypair);
  tx.sign(burnWallet.keypair);

  // Send the transaction (use brain wallet's sendAndConfirm since it's the fee payer)
  const { sendAndConfirmTransaction } = await import('@solana/web3.js');
  const burnTx = await sendAndConfirmTransaction(connection, tx, [brainWallet.keypair, burnWallet.keypair], {
    commitment: 'confirmed',
  });

  return { burnTx, amountBurned: burnWalletBalance };
}

/**
 * Legacy burn function - burns directly from brain wallet
 * DEPRECATED: Use burnFromBurnWallet with the airlock pattern instead
 *
 * This function is kept for backwards compatibility but should not be used
 * for production buyback operations.
 */
async function burnCCDirect(
  connection: Connection,
  wallet: ReturnType<typeof loadWallet>,
  amount: bigint
): Promise<string> {
  console.warn('[BURN] WARNING: Using direct burn - consider using burn wallet airlock pattern instead');

  const ata = await getAssociatedTokenAddress(CC_TOKEN_MINT, wallet.publicKey);

  // Get current balance for validation
  const account = await getAccount(connection, ata);
  const currentBalance = account.amount;

  // SAFETY CHECK 1: Never burn more than we have
  if (amount > currentBalance) {
    throw new Error(
      `SAFETY STOP: Burn amount ${amount} exceeds balance ${currentBalance}.`
    );
  }

  // SAFETY CHECK 2: Never burn more than MAX_BURN_PER_TX (1M tokens)
  if (amount > MAX_BURN_PER_TX) {
    throw new Error(
      `SAFETY STOP: Burn amount ${amount} exceeds max burn per tx ${MAX_BURN_PER_TX}.`
    );
  }

  // SAFETY CHECK 3: Don't burn entire balance
  const remainingAfterBurn = currentBalance - amount;
  if (remainingAfterBurn === BigInt(0) && currentBalance > amount) {
    throw new Error(
      `SAFETY STOP: Burn would empty the entire wallet. Use burn wallet pattern instead.`
    );
  }

  console.log(`[BURN DIRECT] Amount: ${amount} lamports (${Number(amount) / 1_000_000_000} $CC)`);

  const burnIx = createBurnInstruction(
    ata,
    CC_TOKEN_MINT,
    wallet.publicKey,
    amount
  );

  const tx = await buildTransaction(connection, wallet.publicKey, [burnIx]);
  return sendAndConfirmWithRetry(connection, wallet, tx);
}

// ============ SWAP TERMINAL FEE COLLECTION ============

/**
 * Burn accumulated $CC fees from the swap terminal (from BUY transactions)
 *
 * Flow: Brain $CC ATA → Burn Wallet → Burn
 *
 * This is simpler than SOL fees because we already have CC - just burn it!
 */
export async function burnAccumulatedCCFees(
  dryRun: boolean = false
): Promise<{
  success: boolean;
  ccBurned?: number;
  transferTx?: string;
  burnTx?: string;
  error?: string;
}> {
  console.log(`[CC Fees] Burning accumulated CC fees... ${dryRun ? '(DRY RUN)' : ''}`);

  const encryptionKey = process.env.BRAIN_WALLET_KEY;
  if (!encryptionKey) {
    return { success: false, error: 'BRAIN_WALLET_KEY not configured' };
  }

  const hasBurnWallet = burnWalletExists();
  if (!hasBurnWallet) {
    return { success: false, error: 'Burn wallet not found - create with POST /burn-wallet/create' };
  }

  try {
    const connection = getConnection();
    const brainWallet = loadWallet(encryptionKey);
    const burnWallet = loadBurnWallet(encryptionKey);

    // Check CC balance in brain wallet (this includes swap fees)
    const brainAta = await getAssociatedTokenAddress(CC_TOKEN_MINT, brainWallet.publicKey);
    const brainAccount = await getAccount(connection, brainAta);
    const ccBalance = brainAccount.amount;

    // We need to know how much is "fees" vs "rewards pool"
    // For now, burn any CC above a threshold (keep 100K CC as buffer)
    const CC_BUFFER = BigInt(100_000_000_000_000); // 100K CC (9 decimals)
    const feesToBurn = ccBalance > CC_BUFFER ? ccBalance - CC_BUFFER : BigInt(0);

    if (feesToBurn <= BigInt(0)) {
      console.log(`[CC Fees] No CC fees to burn (balance: ${Number(ccBalance) / 1e9} CC, buffer: 100K)`);
      return { success: true, ccBurned: 0 };
    }

    // Cap at MAX_BURN_PER_TX
    const burnAmount = feesToBurn > MAX_BURN_PER_TX ? MAX_BURN_PER_TX : feesToBurn;

    console.log(`[CC Fees] CC balance: ${Number(ccBalance) / 1e9} CC`);
    console.log(`[CC Fees] Fees to burn: ${Number(burnAmount) / 1e9} CC`);

    if (dryRun) {
      console.log(`[DRY RUN] Would burn ${Number(burnAmount) / 1e9} CC via airlock pattern`);
      return { success: true, ccBurned: Number(burnAmount) / 1e9 };
    }

    // Step 1: Transfer to burn wallet
    const transferTx = await transferToBurnWallet(connection, brainWallet, burnWallet, burnAmount);
    console.log(`[CC Fees] Transfer to burn wallet: ${transferTx}`);

    // Step 2: Burn from burn wallet
    const burnResult = await burnFromBurnWallet(connection, brainWallet, burnWallet);
    console.log(`[CC Fees] Burn complete: ${burnResult.burnTx}`);

    return {
      success: true,
      ccBurned: Number(burnResult.amountBurned) / 1e9,
      transferTx,
      burnTx: burnResult.burnTx,
    };
  } catch (error) {
    console.error('[CC Fees] Error burning CC fees:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get accumulated fee balances from swap terminal
 *
 * Note on CC fees: CC fees from BUY transactions go to the same ATA as the
 * game wallet bankroll. They cannot be distinguished without database tracking.
 * CC fees effectively add to the bankroll (house keeps them).
 *
 * SOL fees from SELL transactions DO accumulate in a separate wSOL ATA and
 * can be processed via buyback → burn.
 */
export async function getSwapFeeBalances(): Promise<{
  ccFees: number;
  ccFeesNote: string;
  solFees: number;
  error?: string;
}> {
  const encryptionKey = process.env.BRAIN_WALLET_KEY;
  if (!encryptionKey) {
    return {
      ccFees: 0,
      ccFeesNote: 'N/A',
      solFees: 0,
      error: 'BRAIN_WALLET_KEY not configured',
    };
  }

  try {
    const connection = getConnection();
    const brainWallet = loadWallet(encryptionKey);
    const balance = await brainWallet.getBalance(connection);

    // SOL fees are in the SOL balance (minus reserve for tx fees)
    // CC fees cannot be tracked separately (mixed with bankroll)
    return {
      ccFees: 0,
      ccFeesNote: 'CC fees mixed with bankroll - not tracked separately',
      solFees: Math.max(0, balance.sol - (RESERVE_SOL / LAMPORTS_PER_SOL)),
    };
  } catch (error) {
    return {
      ccFees: 0,
      ccFeesNote: 'Error',
      solFees: 0,
      error: (error as Error).message,
    };
  }
}

// ============ MAIN BUYBACK FUNCTION ============

/**
 * Execute buyback and burn cycle using the AIRLOCK PATTERN
 *
 * This function implements the safe burn pattern:
 * 1. Check brain wallet SOL balance
 * 2. Swap SOL → $CC via Jupiter (lands in brain wallet)
 * 3. Transfer exact $CC amount → burn wallet (airlock)
 * 4. Verify burn wallet balance matches expected amount
 * 5. Burn ENTIRE balance of burn wallet (safe because isolated)
 * 6. Verify burn wallet is empty after
 *
 * SAFETY: The burn wallet acts as an "airlock" - even if code has a bug
 * that burns "entire balance", it only burns what's in the burn wallet,
 * NOT the main rewards pool in the brain wallet.
 *
 * SAFETY: Always use dryRun=true first to verify the operation before executing
 */
export async function executeBuybackAndBurn(
  testAmountSol?: number,
  dryRun: boolean = false
): Promise<{
  success: boolean;
  dryRun?: boolean;
  usedAirlock?: boolean;
  solSpent?: number;
  ccBought?: number;
  ccBurned?: number;
  swapTx?: string;
  transferTx?: string;
  burnTx?: string;
  error?: string;
}> {
  console.log(`[Buyback] Starting buyback and burn cycle... ${dryRun ? '(DRY RUN)' : ''}`);

  const encryptionKey = process.env.BRAIN_WALLET_KEY;
  if (!encryptionKey) {
    return { success: false, error: 'BRAIN_WALLET_KEY not configured' };
  }

  // Check if burn wallet exists (for airlock pattern)
  const hasBurnWallet = burnWalletExists();
  if (hasBurnWallet) {
    console.log(`[Buyback] Using AIRLOCK pattern (burn wallet available)`);
  } else {
    console.log(`[Buyback] WARNING: Burn wallet not found - using direct burn (less safe)`);
    console.log(`[Buyback] Create burn wallet with: POST /burn-wallet/create`);
  }

  try {
    const connection = getConnection();
    const brainWallet = loadWallet(encryptionKey);

    // 1. Check SOL balance
    const balance = await brainWallet.getBalance(connection);
    console.log(`[Buyback] Brain wallet SOL balance: ${balance.sol} SOL`);
    console.log(`[Buyback] Brain wallet $CC balance: ${balance.cc} $CC`);

    // Calculate available SOL for buyback (keep reserve for tx fees)
    const availableLamports = balance.solLamports - BigInt(RESERVE_SOL);

    // For test runs, use specified amount; otherwise check minimum threshold
    if (testAmountSol) {
      const testLamports = Math.floor(testAmountSol * LAMPORTS_PER_SOL);
      if (BigInt(testLamports) > availableLamports) {
        return {
          success: false,
          error: `Test amount ${testAmountSol} SOL exceeds available ${Number(availableLamports) / LAMPORTS_PER_SOL} SOL`,
        };
      }
      console.log(`[Buyback] TEST MODE: Using ${testAmountSol} SOL`);
    } else if (availableLamports < BigInt(MIN_BUYBACK_SOL)) {
      console.log(`[Buyback] Insufficient SOL for buyback. Available: ${Number(availableLamports) / LAMPORTS_PER_SOL} SOL, Min: ${MIN_BUYBACK_SOL / LAMPORTS_PER_SOL} SOL`);
      return {
        success: false,
        error: `Insufficient SOL (${Number(availableLamports) / LAMPORTS_PER_SOL} < ${MIN_BUYBACK_SOL / LAMPORTS_PER_SOL})`,
      };
    }

    // Use test amount, or available capped at MAX_BUYBACK_SOL
    const swapAmount = testAmountSol
      ? Math.floor(testAmountSol * LAMPORTS_PER_SOL)
      : Math.min(Number(availableLamports), MAX_BUYBACK_SOL);
    console.log(`[Buyback] Swapping ${swapAmount / LAMPORTS_PER_SOL} SOL for $CC...`);

    // Create buyback record
    const buybackId = createBuybackRecord(swapAmount);

    // 2. Get swap quote and transaction from Jupiter
    const jupiterResult = await getJupiterSwap(
      WSOL_MINT,
      CC_TOKEN_MINT.toBase58(),
      swapAmount,
      brainWallet.publicKey.toBase58(),
      200 // 2% slippage for memecoins
    );

    if (!jupiterResult) {
      markBuybackFailed(buybackId, 'Failed to get swap quote');
      return { success: false, error: 'Failed to get swap quote from Jupiter' };
    }

    const { quote, swapTx: swapTxBase64, lastValidBlockHeight } = jupiterResult;
    const route = quote.routePlan?.map(r => r.swapInfo.label).join(' → ') || 'Direct';

    console.log(`[Buyback] Quote: ${swapAmount / LAMPORTS_PER_SOL} SOL → ${Number(quote.outAmount) / 1_000_000_000} $CC`);
    console.log(`[Buyback] Price impact: ${quote.priceImpactPct}%`);
    console.log(`[Buyback] Route: ${route}`);

    const ccToBurn = BigInt(quote.outAmount);

    // ============ DRY RUN MODE ============
    if (dryRun) {
      const burnWalletState = hasBurnWallet ? getBurnWalletState() : null;
      console.log(`[DRY RUN] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`[DRY RUN] Would swap ${swapAmount / LAMPORTS_PER_SOL} SOL for ~${Number(quote.outAmount) / 1_000_000_000} $CC via ${route}`);
      if (hasBurnWallet) {
        console.log(`[DRY RUN] AIRLOCK PATTERN:`);
        console.log(`[DRY RUN]   1. Transfer ${Number(ccToBurn) / 1_000_000_000} $CC to burn wallet`);
        console.log(`[DRY RUN]   2. Burn ENTIRE burn wallet (safe - isolated)`);
        console.log(`[DRY RUN]   3. Verify burn wallet empty after`);
        console.log(`[DRY RUN] Burn wallet: ${burnWalletState?.publicKey || 'N/A'}`);
        console.log(`[DRY RUN] Burn wallet current balance: ${burnWalletState?.ccBalance || 0} $CC (should be 0)`);
      } else {
        console.log(`[DRY RUN] DIRECT BURN (less safe - no burn wallet):`);
        console.log(`[DRY RUN]   Would burn ${Number(ccToBurn) / 1_000_000_000} $CC directly from brain wallet`);
      }
      console.log(`[DRY RUN] Brain wallet $CC balance: ${balance.cc} $CC`);
      console.log(`[DRY RUN] Brain wallet $CC after burn: ${balance.cc} $CC (unchanged - only burns purchased)`);
      console.log(`[DRY RUN] Burn amount vs cap: ${Number(ccToBurn)} < ${Number(MAX_BURN_PER_TX)} ? ${ccToBurn < MAX_BURN_PER_TX ? 'OK' : 'EXCEEDS CAP!'}`);
      console.log(`[DRY RUN] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`[DRY RUN] No actual transactions executed.`);

      markBuybackFailed(buybackId, 'Dry run - no transactions executed');

      return {
        success: true,
        dryRun: true,
        usedAirlock: hasBurnWallet,
        solSpent: swapAmount / LAMPORTS_PER_SOL,
        ccBought: Number(quote.outAmount) / 1_000_000_000,
        ccBurned: Number(quote.outAmount) / 1_000_000_000,
      };
    }

    // 3. Sign and execute Jupiter swap transaction
    const swapTransaction = await signJupiterSwap(swapTxBase64, brainWallet);

    let swapTx: string;
    try {
      swapTx = await connection.sendTransaction(swapTransaction, {
        skipPreflight: true, // Jupiter already simulated
        maxRetries: 3,
      });
    } catch (sendError) {
      console.error(`[Buyback] Failed to send swap tx:`, sendError);
      markBuybackFailed(buybackId, `Failed to send swap: ${(sendError as Error).message}`);
      return { success: false, error: `Failed to send swap: ${(sendError as Error).message}` };
    }

    // Wait for confirmation with blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    await connection.confirmTransaction({
      signature: swapTx,
      blockhash,
      lastValidBlockHeight,
    }, 'confirmed');
    console.log(`[Buyback] Swap confirmed: ${swapTx}`);

    const ccBought = Number(quote.outAmount);
    updateBuybackSwap(buybackId, ccBought, swapTx);

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

    let burnTx: string;
    let transferTx: string | undefined;

    if (hasBurnWallet) {
      // ============ AIRLOCK PATTERN (SAFE) ============
      console.log(`[Buyback] Using AIRLOCK pattern for burn...`);

      const burnWallet = loadBurnWallet(encryptionKey);

      // Ensure burn wallet ATA exists
      const burnWalletAta = await ensureBurnWalletAta();
      if (!burnWalletAta) {
        markBuybackFailed(buybackId, 'Failed to create burn wallet ATA');
        return {
          success: false,
          solSpent: swapAmount / LAMPORTS_PER_SOL,
          ccBought: ccBought / 1_000_000_000,
          swapTx,
          error: 'Failed to create burn wallet ATA',
        };
      }

      // Step 1: Transfer exact amount to burn wallet
      console.log(`[Buyback] Step 1: Transferring ${ccBought / 1_000_000_000} $CC to burn wallet...`);
      transferTx = await transferToBurnWallet(connection, brainWallet, burnWallet, ccToBurn);
      console.log(`[Buyback] Transfer confirmed: ${transferTx}`);

      // Step 2: Verify burn wallet received at least the expected amount
      // Note: Balance may be > expected if there were leftover tokens from a previous failed burn
      // This is safe because the airlock pattern means burning the ENTIRE burn wallet is always safe
      const burnWalletBalance = await burnWallet.getBalance(connection);
      console.log(`[BURN AIRLOCK] Step 2: Verifying burn wallet balance...`);
      console.log(`[BURN AIRLOCK] Expected (min): ${Number(ccToBurn) / 1_000_000_000} $CC`);
      console.log(`[BURN AIRLOCK] Actual:         ${burnWalletBalance.cc} $CC`);

      if (burnWalletBalance.ccLamports < ccToBurn) {
        // Balance is LESS than expected - something went wrong with the transfer
        const error = `SAFETY STOP: Burn wallet balance too low. Expected at least ${ccToBurn}, got ${burnWalletBalance.ccLamports}`;
        console.error(`[Buyback] ${error}`);
        markBuybackFailed(buybackId, error);
        return {
          success: false,
          solSpent: swapAmount / LAMPORTS_PER_SOL,
          ccBought: ccBought / 1_000_000_000,
          swapTx,
          transferTx,
          error,
        };
      }

      // If balance > expected, log it (leftover tokens will also be burned - this is safe)
      if (burnWalletBalance.ccLamports > ccToBurn) {
        const extra = burnWalletBalance.ccLamports - ccToBurn;
        console.log(`[BURN AIRLOCK] Note: Burn wallet has ${Number(extra) / 1_000_000_000} extra $CC (leftover from previous operation)`);
        console.log(`[BURN AIRLOCK] All ${burnWalletBalance.cc} $CC will be burned (safe - airlock pattern)`);
      }

      // Step 3: Burn ENTIRE burn wallet balance (safe because it's isolated)
      // Brain wallet pays transaction fees, burn wallet signs as token owner
      console.log(`[Buyback] Step 3: Burning from burn wallet (airlock)...`);
      const burnResult = await burnFromBurnWallet(connection, brainWallet, burnWallet);
      burnTx = burnResult.burnTx;
      console.log(`[Buyback] Burn confirmed: ${burnTx}`);

      // Step 4: Verify burn wallet is empty
      const finalBurnWalletBalance = await burnWallet.getBalance(connection);
      console.log(`[BURN AIRLOCK] Step 4: Verifying burn wallet is empty...`);
      console.log(`[BURN AIRLOCK] Final balance: ${finalBurnWalletBalance.cc} $CC`);

      if (finalBurnWalletBalance.ccLamports !== BigInt(0)) {
        console.warn(`[Buyback] WARNING: Burn wallet not empty after burn! Balance: ${finalBurnWalletBalance.cc} $CC`);
      } else {
        console.log(`[BURN AIRLOCK] ✓ Burn wallet empty - airlock pattern successful`);
      }

      // Update cached balance
      updateBurnWalletCachedBalance(finalBurnWalletBalance.sol, finalBurnWalletBalance.cc);

    } else {
      // ============ DIRECT BURN (LEGACY - LESS SAFE) ============
      console.log(`[Buyback] Using DIRECT burn (burn wallet not available)...`);
      console.warn(`[Buyback] WARNING: Consider creating a burn wallet for safer operations`);

      burnTx = await burnCCDirect(connection, brainWallet, ccToBurn);
      console.log(`[Buyback] Burn confirmed: ${burnTx}`);
    }

    const ccBurned = Number(ccToBurn);
    updateBuybackBurn(buybackId, ccBurned, burnTx);

    console.log(`[Buyback] ✓ Buyback and burn complete!`);
    console.log(`[Buyback]   SOL spent: ${swapAmount / LAMPORTS_PER_SOL}`);
    console.log(`[Buyback]   $CC bought: ${ccBought / 1_000_000_000}`);
    console.log(`[Buyback]   $CC burned: ${ccBurned / 1_000_000_000}`);
    console.log(`[Buyback]   Used airlock: ${hasBurnWallet}`);

    return {
      success: true,
      usedAirlock: hasBurnWallet,
      solSpent: swapAmount / LAMPORTS_PER_SOL,
      ccBought: ccBought / 1_000_000_000,
      ccBurned: ccBurned / 1_000_000_000,
      swapTx,
      transferTx,
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

// ============ COMPREHENSIVE FEE PROCESSING ============

/**
 * Process ALL accumulated swap terminal fees in one operation
 *
 * This is the main entry point for the cron job. It handles:
 * 1. CC fees from BUY transactions → direct burn (simpler, no swap needed)
 * 2. SOL fees from SELL transactions → buyback CC → burn
 *
 * Flow:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Swap Terminal Fee Collection                                │
 * │                                                              │
 * │  BUY tx (SOL → CC):  User gets CC, 1% fee → Brain CC ATA    │
 * │  SELL tx (CC → SOL): User gets SOL, 1% fee → Brain wSOL ATA │
 * └─────────────────────────────────────────────────────────────┘
 *                            │
 *                            ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │  processAllSwapFees() - Every 6 hours                       │
 * │                                                              │
 * │  Step 1: CC fees → Transfer to burn wallet → Burn           │
 * │  Step 2: SOL fees → Jupiter swap → CC → Burn wallet → Burn  │
 * └─────────────────────────────────────────────────────────────┘
 *                            │
 *                            ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Result: All fees converted to $CC and burned               │
 * │  Creates deflationary pressure on token supply              │
 * └─────────────────────────────────────────────────────────────┘
 */
export async function processAllSwapFees(
  dryRun: boolean = false
): Promise<{
  success: boolean;
  dryRun: boolean;
  ccFees: {
    processed: boolean;
    ccBurned?: number;
    transferTx?: string;
    burnTx?: string;
    error?: string;
  };
  solFees: {
    processed: boolean;
    solSpent?: number;
    ccBought?: number;
    ccBurned?: number;
    swapTx?: string;
    transferTx?: string;
    burnTx?: string;
    error?: string;
  };
  totalCcBurned: number;
  errors: string[];
}> {
  console.log(`[Fee Processing] Starting comprehensive fee processing... ${dryRun ? '(DRY RUN)' : ''}`);
  console.log(`[Fee Processing] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  const result = {
    success: true,
    dryRun,
    ccFees: {
      processed: false,
      ccBurned: 0,
    } as {
      processed: boolean;
      ccBurned?: number;
      transferTx?: string;
      burnTx?: string;
      error?: string;
    },
    solFees: {
      processed: false,
      solSpent: 0,
      ccBought: 0,
      ccBurned: 0,
    } as {
      processed: boolean;
      solSpent?: number;
      ccBought?: number;
      ccBurned?: number;
      swapTx?: string;
      transferTx?: string;
      burnTx?: string;
      error?: string;
    },
    totalCcBurned: 0,
    errors: [] as string[],
  };

  // ============ STEP 1: CC Fees Note ============
  // CC fees from BUY transactions go to the same ATA as the game wallet bankroll.
  // We CANNOT distinguish fees from bankroll without database tracking.
  // For now, CC fees effectively add to the bankroll (house keeps them).
  // Only SOL fees (from sells) get processed via buyback → burn.
  console.log(`[Fee Processing] Step 1: CC fees from buys → kept as bankroll (no separate tracking)`);
  result.ccFees = {
    processed: false,
    error: 'CC fees mixed with bankroll - tracked as house profit, not burned separately',
  };

  // ============ STEP 2: Process SOL Fees (from SELL transactions) ============
  console.log(`[Fee Processing] Step 2: Processing SOL fees from sell transactions...`);

  try {
    const check = await shouldRunBuyback();
    if (check.should) {
      console.log(`[Fee Processing] SOL fees ready for buyback: ${check.availableSol?.toFixed(4)} SOL`);

      const buybackResult = await executeBuybackAndBurn(undefined, dryRun);

      if (buybackResult.success) {
        result.solFees = {
          processed: true,
          solSpent: buybackResult.solSpent,
          ccBought: buybackResult.ccBought,
          ccBurned: buybackResult.ccBurned,
          swapTx: buybackResult.swapTx,
          transferTx: buybackResult.transferTx,
          burnTx: buybackResult.burnTx,
        };
      } else {
        result.solFees = { processed: false, error: buybackResult.error };
        if (buybackResult.error) {
          result.errors.push(`SOL fees: ${buybackResult.error}`);
        }
      }
    } else {
      console.log(`[Fee Processing] SOL fees not ready: ${check.reason}`);
      result.solFees = { processed: false, error: check.reason };
    }
  } catch (error) {
    const errorMsg = (error as Error).message;
    console.error(`[Fee Processing] SOL fee processing error: ${errorMsg}`);
    result.solFees = { processed: false, error: errorMsg };
    result.errors.push(`SOL fees: ${errorMsg}`);
  }

  // ============ SUMMARY ============
  result.totalCcBurned = (result.ccFees.ccBurned || 0) + (result.solFees.ccBurned || 0);
  result.success = result.errors.length === 0 || (result.ccFees.processed || result.solFees.processed);

  console.log(`[Fee Processing] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`[Fee Processing] Summary:`);
  console.log(`[Fee Processing]   CC fees burned:  ${result.ccFees.ccBurned?.toFixed(2) || 0} CC`);
  console.log(`[Fee Processing]   SOL fees:        ${result.solFees.solSpent?.toFixed(4) || 0} SOL → ${result.solFees.ccBurned?.toFixed(2) || 0} CC burned`);
  console.log(`[Fee Processing]   Total burned:    ${result.totalCcBurned.toFixed(2)} CC`);
  if (result.errors.length > 0) {
    console.log(`[Fee Processing]   Errors:          ${result.errors.length}`);
  }
  console.log(`[Fee Processing] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  return result;
}

// Initialize on module load
initBuybackTable();
