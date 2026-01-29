/**
 * Token Monitor - Claude reacts to $CC buys/sells in the /watch chat
 *
 * Polls Helius/Solana RPC for new token transactions every 15 seconds.
 * Parses transactions to identify buys vs sells on DEXes.
 * Claude reacts with personality-driven comments about the trades.
 */

import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import { getConnection } from './solana.js';
import type { ActivityType } from './db.js';

// $CC Token Mint Address (mainnet)
const CC_MINT = new PublicKey('Hg23qBLJDvhQtGLHMvot7NK54qAhzQFj9BVd5jpABAGS');

// Known DEX program IDs
const DEX_PROGRAMS = {
  raydium_v4: 'routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS',
  raydium_amm: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  orca_whirlpool: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  jupiter_v6: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
  jupiter_v4: 'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB',
  pumpfun: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
};

// Polling interval (15 seconds)
const POLL_INTERVAL_MS = 15_000;

// Track last seen signature to avoid duplicates
let lastSignature: string | null = null;

// Cooldown to avoid spamming reactions (min 30s between reactions)
let lastReactionTime = 0;
const REACTION_COOLDOWN_MS = 30_000;

// Broadcast function type
type BroadcastFunction = (message: string, persist: boolean, activityType: ActivityType) => void;

// Trade info extracted from transaction
interface TradeInfo {
  type: 'buy' | 'sell';
  amount: number;      // $CC amount
  solAmount?: number;  // SOL amount if available
  wallet: string;      // Truncated wallet address
  isWhale: boolean;    // >500K $CC
  isMega: boolean;     // >1M $CC
}

// ============ CLAUDE'S REACTION PERSONALITY ============

// Reactions for BUYS (positive, encouraging)
const BUY_REACTIONS = {
  small: [
    'someone just grabbed some $CC 👀',
    'new bag acquired ✨',
    'another one joins the cult',
    '$CC stacking in progress...',
    'someone\'s building their position',
  ],
  medium: [
    'nice bag 👀',
    'someone believes in the vision',
    'solid entry, respect',
    'that\'s a proper bag right there',
    'the conviction is strong with this one',
  ],
  large: [
    'whale alert 🐋',
    'big money moving in 👀',
    'someone just made a statement',
    'now that\'s conviction',
    'the whales are accumulating',
  ],
  mega: [
    '🐋🐋🐋 MEGA WHALE DETECTED',
    'holy... someone\'s going all in',
    'that\'s a serious bag, respect',
    'the whales are hungry today',
    'we got a true believer here',
  ],
};

// Reactions for SELLS (philosophical, unbothered)
const SELL_REACTIONS = {
  small: [
    'someone taking profits, fair enough',
    'paper hands gonna paper hand',
    'that\'s ok, we\'ll hold for them',
    'more for the rest of us',
    'see ya later maybe',
  ],
  medium: [
    'selling already? interesting...',
    'someone\'s got places to be',
    'we\'ll buy that back, no worries',
    'paper handed mid, but ok',
    'their loss tbh',
  ],
  large: [
    'whale dumping, stay calm everyone',
    'big sell but we move on',
    'someone\'s taking a lot of profits',
    'the weak hands are shaking out',
    'diamond hands only past this point',
  ],
  mega: [
    'mega dump detected... holding steady',
    'someone\'s cashing out big time',
    'that\'s gonna leave a mark',
    'we\'ll absorb it, we always do',
    'price discovery continues...',
  ],
};

/**
 * Get a random reaction based on trade type and size
 */
function getReaction(trade: TradeInfo): string {
  const reactions = trade.type === 'buy' ? BUY_REACTIONS : SELL_REACTIONS;

  let tier: 'small' | 'medium' | 'large' | 'mega';
  if (trade.isMega) {
    tier = 'mega';
  } else if (trade.isWhale) {
    tier = 'large';
  } else if (trade.amount >= 100_000) {
    tier = 'medium';
  } else {
    tier = 'small';
  }

  const tierReactions = reactions[tier];
  return tierReactions[Math.floor(Math.random() * tierReactions.length)];
}

/**
 * Format amount with K/M suffix
 */
function formatAmount(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`;
  } else if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K`;
  }
  return amount.toFixed(0);
}

// ============ TRANSACTION PARSING ============

/**
 * Parse a transaction to determine if it's a $CC buy or sell
 */
function parseTransaction(tx: ParsedTransactionWithMeta, signature: string): TradeInfo | null {
  if (!tx || !tx.meta) return null;

  const { meta } = tx;

  // Look for $CC token balance changes
  const preBalances = meta.preTokenBalances || [];
  const postBalances = meta.postTokenBalances || [];

  // Find the account that had $CC balance change
  for (const postBalance of postBalances) {
    if (postBalance.mint !== CC_MINT.toBase58()) continue;

    const preBalance = preBalances.find(
      pb => pb.accountIndex === postBalance.accountIndex && pb.mint === CC_MINT.toBase58()
    );

    const preCcAmount = preBalance?.uiTokenAmount?.uiAmount ?? 0;
    const postCcAmount = postBalance?.uiTokenAmount?.uiAmount ?? 0;
    const ccDelta = postCcAmount - preCcAmount;

    // Skip if no meaningful change (min 10K to react)
    if (Math.abs(ccDelta) < 10_000) continue;

    // Determine if buy or sell based on balance change
    const isBuy = ccDelta > 0;

    // Get the wallet that made the trade
    const owner = postBalance.owner;
    if (!owner) continue;

    // Try to extract SOL amount from the transaction
    let solAmount: number | undefined;
    const accountKeys = tx.transaction.message.accountKeys;
    if (meta.preBalances && meta.postBalances) {
      const signerIndex = accountKeys.findIndex((key) => {
        const keyStr = typeof key === 'string' ? key : (key as { pubkey: PublicKey }).pubkey?.toBase58?.() ?? String(key);
        return keyStr === owner;
      });
      if (signerIndex >= 0) {
        const solDelta = (meta.preBalances[signerIndex] - meta.postBalances[signerIndex]) / 1e9;
        if (Math.abs(solDelta) > 0.001) {
          solAmount = Math.abs(solDelta);
        }
      }
    }

    return {
      type: isBuy ? 'buy' : 'sell',
      amount: Math.abs(ccDelta),
      solAmount,
      wallet: `${owner.slice(0, 4)}...${owner.slice(-4)}`,
      isWhale: Math.abs(ccDelta) >= 500_000,
      isMega: Math.abs(ccDelta) >= 1_000_000,
    };
  }

  return null;
}

/**
 * Check if transaction involves a known DEX
 */
function isDexTransaction(tx: ParsedTransactionWithMeta): boolean {
  if (!tx || !tx.transaction) return false;

  const accountKeys = tx.transaction.message.accountKeys;
  const programIds = Object.values(DEX_PROGRAMS);

  for (const key of accountKeys) {
    const pubkey = typeof key === 'string' ? key : (key as { pubkey: PublicKey }).pubkey?.toBase58?.() ?? String(key);
    if (programIds.includes(pubkey)) {
      return true;
    }
  }

  return false;
}

/**
 * Fetch new transactions for $CC token
 */
async function fetchNewTransactions(connection: Connection): Promise<{ signature: string; tx: ParsedTransactionWithMeta | null }[]> {
  try {
    const options: { limit: number; until?: string } = { limit: 10 };
    if (lastSignature) {
      options.until = lastSignature;
    }

    // Get signatures for the token mint (captures all token activity)
    const signatures = await connection.getSignaturesForAddress(CC_MINT, options);

    if (signatures.length === 0) return [];

    // Update last signature to the newest one
    if (signatures.length > 0) {
      lastSignature = signatures[0].signature;
    }

    // Fetch full transaction details for each signature
    const transactions: { signature: string; tx: ParsedTransactionWithMeta | null }[] = [];

    for (const sig of signatures) {
      if (sig.signature === lastSignature && transactions.length > 0) continue;

      try {
        const tx = await connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });
        transactions.push({ signature: sig.signature, tx });
      } catch (err) {
        console.error(`[Token Monitor] Failed to fetch tx ${sig.signature}:`, err);
      }
    }

    return transactions;
  } catch (err) {
    console.error('[Token Monitor] Failed to fetch signatures:', err);
    return [];
  }
}

// Store polling interval ID for cleanup
let pollingInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the token monitor
 * Polls for new transactions and broadcasts Claude's reactions
 */
export function startTokenMonitor(broadcastFn: BroadcastFunction): void {
  console.log('[Token Monitor] Starting $CC trade monitor...');

  const connection = getConnection();

  // Poll for new transactions
  pollingInterval = setInterval(async () => {
    try {
      const now = Date.now();

      // Respect cooldown to avoid spam
      if (now - lastReactionTime < REACTION_COOLDOWN_MS) {
        return;
      }

      const transactions = await fetchNewTransactions(connection);

      // Find the most significant trade to react to
      let bestTrade: TradeInfo | null = null;

      for (const { signature, tx } of transactions) {
        if (!tx) continue;

        // Only process DEX transactions (skip transfers, burns, etc.)
        if (!isDexTransaction(tx)) continue;

        // Parse the transaction
        const trade = parseTransaction(tx, signature);
        if (!trade) continue;

        // Keep track of the biggest trade to react to
        if (!bestTrade || trade.amount > bestTrade.amount) {
          bestTrade = trade;
        }
      }

      // React to the biggest trade found
      if (bestTrade) {
        const reaction = getReaction(bestTrade);
        const emoji = bestTrade.type === 'buy' ? '💚' : '🔻';
        const amountStr = formatAmount(bestTrade.amount);

        // Format: "💚 nice bag 👀 (125K $CC)"
        const message = `${emoji} ${reaction} (${amountStr} $CC)`;

        console.log(`[Token Monitor] ${message}`);
        broadcastFn(message, true, 'token');

        lastReactionTime = now;
      }
    } catch (err) {
      console.error('[Token Monitor] Poll error:', err);
    }
  }, POLL_INTERVAL_MS);

  console.log(`[Token Monitor] ✓ Monitoring $CC trades (poll every ${POLL_INTERVAL_MS / 1000}s)`);
}

/**
 * Stop the token monitor
 */
export function stopTokenMonitor(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('[Token Monitor] Stopped');
  }
}

/**
 * Get monitor status
 */
export function getTokenMonitorStatus(): { running: boolean; lastSignature: string | null } {
  return {
    running: pollingInterval !== null,
    lastSignature,
  };
}
