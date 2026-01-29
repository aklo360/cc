/**
 * Rewards Pool Management - 3-Wallet Architecture for GameFi Casino
 *
 * ARCHITECTURE (implemented after 1.68M burn incident 2026-01-27):
 *
 *   ┌─────────────────────────┐
 *   │     REWARDS WALLET      │  ← Cold Storage (9M $CC)
 *   │     (Ultra Secure)      │
 *   │  • Never used by games  │
 *   │  • Only tops up game    │
 *   │  • Max 1M/day transfer  │
 *   └───────────┬─────────────┘
 *               │
 *      Daily top-up (if < 300K)
 *               │
 *               ▼
 *   ┌─────────────────────────┐
 *   │      GAME WALLET        │  ← Hot Wallet (1M $CC)
 *   │    (Current Brain)      │
 *   │  • Game payouts only    │
 *   │  • Max 100K per payout  │
 *   │  • Max 500K/day payouts │
 *   └───────────┬─────────────┘
 *               │
 *          Game payouts
 *               │
 *               ▼
 *           Players
 *
 *   ┌─────────────────────────┐
 *   │      BURN WALLET        │  ← Airlock (separate module)
 *   │      (Airlock)          │
 *   │  • Burns only           │
 *   └─────────────────────────┘
 *
 * Key Principles:
 * - Self-sustaining: fees flow back to bankroll
 * - Safety limits: max single payout, reserve ratio
 * - Deflationary: portion of fees burned
 * - Circuit breakers: daily limits + balance thresholds
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { loadWallet, loadRewardsWallet, rewardsWalletExists, getRewardsWalletState, recordRewardsDistribution, getWalletState, CC_TOKEN_MINT } from './wallet.js';
import { getActiveGames, db, getDailyPayoutStats, getDailyTransferStats, recordPayout, recordRewardsTransfer, type GameType, type GameConfig } from './db.js';
import { getConnection, transferCC } from './solana.js';

// ============ 3-WALLET LIMITS (LOCKED IN) ============

/**
 * Rewards Wallet Limits (Cold Storage)
 * This wallet holds the majority of funds and NEVER interacts with games directly.
 */
export const REWARDS_LIMITS = {
  maxSingleTransfer: 500_000,        // 500K $CC max per transfer to game wallet
  maxDailyTransfer: 1_000_000,       // 1M $CC max per day (safety cap)
  gameWalletTarget: 500_000,         // Top up to 500K
  gameWalletLowThreshold: 250_000,   // Trigger top-up when game wallet below 250K
};

/**
 * Game Wallet Limits (Hot Wallet)
 * This wallet handles all game payouts with strict limits.
 */
export const GAME_LIMITS = {
  maxSinglePayout: 200_000,          // 200K $CC max per payout
  maxDailyPayouts: 1_000_000,         // 1M $CC max payouts per day
  minBalance: 200_000,               // Pause games if below this
};

/**
 * Runway Estimates (at different loss scenarios):
 * | Scenario      | Daily Loss | Pool Lasts |
 * |--------------|-----------|------------|
 * | House edge works | +profit | ∞        |
 * | Light losses | -100K     | 100 days   |
 * | Medium losses| -200K     | 50 days    |
 * | Heavy losses | -333K     | 30 days    |
 */

// ============ BANKROLL CONFIGURATION ============

export const CASINO_BANKROLL = {
  // Total allocation from $CC supply (1.5% = 15M tokens)
  totalAllocation: 15_000_000,

  // 3-Wallet Distribution (NEW)
  walletDistribution: {
    rewardsWallet: 9_000_000,    // 9M $CC cold storage
    gameWallet: 1_000_000,       // 1M $CC hot wallet (initial)
    // Remaining 5M can be used for future expansion
  },

  // Per-game allocation from the shared bankroll (in $CC)
  perGameAllocation: {
    coinflip: 500_000,    // 500K $CC initial liquidity
    crash: 1_000_000,     // 1M $CC (needs more for multipliers)
    jackpot: 500_000,     // 500K $CC seed pool
    gacha: 300_000,       // 300K $CC prize pool
  } as Record<GameType, number>,

  // Fee distribution (where collected fees go)
  feeDistribution: {
    bankroll: 0.60,       // 60% of fees back to casino bankroll
    treasury: 0.25,       // 25% to treasury (operations)
    burn: 0.15,           // 15% burned (deflationary pressure)
  },

  // Safety limits (using new GAME_LIMITS)
  maxSinglePayout: GAME_LIMITS.maxSinglePayout,
  reserveRatio: 0.20,           // Keep 20% as reserve buffer
  maxDailyPayout: GAME_LIMITS.maxDailyPayouts,
};

// Default game configs by type
export const DEFAULT_GAME_CONFIGS: Record<GameType, GameConfig> = {
  coinflip: {
    minBet: 1_000_000,              // 1 $CC minimum
    maxBet: 1_000_000_000,          // 1000 $CC maximum
    houseEdgeBps: 200,              // 2% house edge (payout 1.96x)
    platformFeeLamports: 1_000_000, // 0.001 SOL (~$0.10)
    rewardsPoolShareBps: 6000,      // 60% of fees to pool
  },
  crash: {
    minBet: 1_000_000,              // 1 $CC minimum
    maxBet: 500_000_000,            // 500 $CC maximum
    houseEdgeBps: 300,              // 3% house edge (built into curve)
    platformFeeLamports: 1_000_000, // 0.001 SOL per round entry
    rewardsPoolShareBps: 6000,
  },
  jackpot: {
    minBet: 10_000_000,             // 10 $CC per ticket
    maxBet: 100_000_000,            // 100 $CC per ticket
    houseEdgeBps: 500,              // 5% of pool
    platformFeeLamports: 1_000_000, // 0.001 SOL per ticket
    rewardsPoolShareBps: 6000,
  },
  gacha: {
    minBet: 5_000_000,              // 5 $CC per pull
    maxBet: 50_000_000,             // 10x pull = 50 $CC
    houseEdgeBps: 1000,             // 10% house edge (gacha is high margin)
    platformFeeLamports: 1_000_000, // 0.001 SOL per pull
    rewardsPoolShareBps: 6000,
  },
};

// ============ BANKROLL STATE ============

export interface BankrollState {
  totalBalance: number;           // Current $CC balance
  reserveBalance: number;         // Reserve buffer (not for payouts)
  availableBalance: number;       // Available for payouts
  allocatedToGames: number;       // Sum allocated to active games
  unallocated: number;            // Available for new games
  dailyPayoutSoFar: number;       // Paid out today (in lamports)
  canPayoutMore: boolean;         // Under daily limit?
}

/**
 * Get total payouts for today from game_bets table
 * This queries all winning bets (outcome = 'win') created today
 */
function getDailyPayoutTotal(): number {
  // Get today's date in YYYY-MM-DD format (UTC)
  const today = new Date().toISOString().split('T')[0];

  const stmt = db.prepare(`
    SELECT COALESCE(SUM(payout_amount), 0) as total
    FROM game_bets
    WHERE DATE(created_at) = ? AND outcome = 'win'
  `);

  const result = stmt.get(today) as { total: number } | undefined;
  return result?.total || 0;
}

export interface GameAllocation {
  gameId: number;
  slug: string;
  gameType: GameType;
  allocated: number;              // $CC allocated
  currentBalance: number;         // $CC in escrow
  totalVolume: number;            // Lifetime volume
  netProfit: number;              // Fees collected - payouts
  isHealthy: boolean;             // Has enough to cover max bet
}

/**
 * Calculate current bankroll state
 */
export async function getBankrollState(connection: Connection): Promise<BankrollState | null> {
  const encryptionKey = process.env.BRAIN_WALLET_KEY;
  if (!encryptionKey) {
    console.error('BRAIN_WALLET_KEY not set');
    return null;
  }

  try {
    const wallet = loadWallet(encryptionKey);
    const balance = await wallet.getBalance(connection);

    const reserveBalance = balance.cc * CASINO_BANKROLL.reserveRatio;
    const availableBalance = balance.cc - reserveBalance;

    // Calculate allocated to active games
    const activeGames = getActiveGames();
    let allocatedToGames = 0;
    for (const game of activeGames) {
      const gameType = game.game_type as GameType;
      allocatedToGames += CASINO_BANKROLL.perGameAllocation[gameType] || 0;
    }

    // Calculate daily payout from database
    const dailyPayoutSoFar = getDailyPayoutTotal();

    return {
      totalBalance: balance.cc,
      reserveBalance,
      availableBalance,
      allocatedToGames,
      unallocated: Math.max(0, availableBalance - allocatedToGames),
      dailyPayoutSoFar,
      canPayoutMore: dailyPayoutSoFar < CASINO_BANKROLL.maxDailyPayout,
    };
  } catch (error) {
    console.error('Failed to get bankroll state:', error);
    return null;
  }
}

/**
 * Check if we can allocate funds for a new game
 */
export function canAllocateForGame(
  currentState: BankrollState,
  gameType: GameType
): { allowed: boolean; reason?: string } {
  const required = CASINO_BANKROLL.perGameAllocation[gameType];

  if (currentState.unallocated < required) {
    return {
      allowed: false,
      reason: `Insufficient unallocated funds. Need ${required.toLocaleString()} $CC, have ${currentState.unallocated.toLocaleString()} $CC`,
    };
  }

  return { allowed: true };
}

/**
 * Validate a payout amount
 */
export function validatePayout(
  amount: number,
  dailyPayoutSoFar: number
): { allowed: boolean; reason?: string } {
  // Check single payout limit
  if (amount > CASINO_BANKROLL.maxSinglePayout * 1_000_000) {
    return {
      allowed: false,
      reason: `Payout ${(amount / 1_000_000).toLocaleString()} $CC exceeds max single payout of ${CASINO_BANKROLL.maxSinglePayout.toLocaleString()} $CC`,
    };
  }

  // Check daily limit
  const newDaily = dailyPayoutSoFar + amount;
  if (newDaily > CASINO_BANKROLL.maxDailyPayout * 1_000_000) {
    return {
      allowed: false,
      reason: `Payout would exceed daily limit. Current: ${(dailyPayoutSoFar / 1_000_000).toLocaleString()} $CC, Requested: ${(amount / 1_000_000).toLocaleString()} $CC, Limit: ${CASINO_BANKROLL.maxDailyPayout.toLocaleString()} $CC`,
    };
  }

  return { allowed: true };
}

/**
 * Calculate fee distribution for collected fees
 */
export function calculateFeeDistribution(totalFees: number): {
  toBankroll: number;
  toTreasury: number;
  toBurn: number;
} {
  return {
    toBankroll: Math.floor(totalFees * CASINO_BANKROLL.feeDistribution.bankroll),
    toTreasury: Math.floor(totalFees * CASINO_BANKROLL.feeDistribution.treasury),
    toBurn: Math.floor(totalFees * CASINO_BANKROLL.feeDistribution.burn),
  };
}

/**
 * Calculate payout for a coin flip bet
 */
export function calculateCoinFlipPayout(betAmount: number, won: boolean): number {
  if (!won) return 0;

  // 2% house edge = 1.96x payout
  const houseEdge = DEFAULT_GAME_CONFIGS.coinflip.houseEdgeBps / 10000;
  const multiplier = 2 * (1 - houseEdge);
  return Math.floor(betAmount * multiplier);
}

/**
 * Calculate payout for a crash bet
 */
export function calculateCrashPayout(betAmount: number, cashoutMultiplier: number): number {
  // Payout = bet * multiplier
  // House edge is built into the crash curve (3%)
  return Math.floor(betAmount * cashoutMultiplier);
}

/**
 * Calculate jackpot winner payout
 */
export function calculateJackpotPayout(poolSize: number): number {
  // 5% house cut
  const houseEdge = DEFAULT_GAME_CONFIGS.jackpot.houseEdgeBps / 10000;
  return Math.floor(poolSize * (1 - houseEdge));
}

/**
 * Generate crash point using VRF seed
 * Uses provably fair algorithm
 */
export function generateCrashPoint(vrfSeed: string): number {
  // Convert VRF seed to a number between 0 and 1
  const hash = require('crypto').createHash('sha256').update(vrfSeed).digest('hex');
  const num = parseInt(hash.slice(0, 8), 16) / 0xffffffff;

  // House edge built into the curve
  const houseEdge = 0.03; // 3%
  const adjustedNum = num * (1 - houseEdge);

  // Exponential distribution for crash point
  // Higher numbers = lower probability
  if (adjustedNum === 0) return 1.00; // Instant crash (very rare)

  const crashPoint = Math.max(1.00, 0.99 / (1 - adjustedNum));

  // Cap at 100x for sanity
  return Math.min(100, Math.round(crashPoint * 100) / 100);
}

/**
 * Generate gacha prize tier using VRF seed
 */
export function generateGachaPrize(vrfSeed: string): {
  tier: 'common' | 'rare' | 'epic' | 'legendary';
  multiplier: number;
} {
  const hash = require('crypto').createHash('sha256').update(vrfSeed).digest('hex');
  const roll = parseInt(hash.slice(0, 8), 16) / 0xffffffff;

  // Prize distribution:
  // Legendary: 1% (0.99-1.00) - 10x
  // Epic: 5% (0.94-0.99) - 5x
  // Rare: 20% (0.74-0.94) - 2x
  // Common: 74% (0-0.74) - 0.5x

  if (roll >= 0.99) return { tier: 'legendary', multiplier: 10 };
  if (roll >= 0.94) return { tier: 'epic', multiplier: 5 };
  if (roll >= 0.74) return { tier: 'rare', multiplier: 2 };
  return { tier: 'common', multiplier: 0.5 };
}

/**
 * Check game health (can it cover max bet?)
 */
export function checkGameHealth(
  gameType: GameType,
  currentBalance: number
): { healthy: boolean; reason?: string } {
  const config = DEFAULT_GAME_CONFIGS[gameType];
  const maxPossiblePayout = calculateMaxPayout(gameType, config.maxBet);

  if (currentBalance < maxPossiblePayout) {
    return {
      healthy: false,
      reason: `Escrow ${(currentBalance / 1_000_000).toLocaleString()} $CC < max payout ${(maxPossiblePayout / 1_000_000).toLocaleString()} $CC`,
    };
  }

  return { healthy: true };
}

/**
 * Calculate maximum possible payout for a game type
 */
function calculateMaxPayout(gameType: GameType, maxBet: number): number {
  switch (gameType) {
    case 'coinflip':
      return calculateCoinFlipPayout(maxBet, true);
    case 'crash':
      // Max crash is 100x
      return calculateCrashPayout(maxBet, 100);
    case 'jackpot':
      // Max jackpot is everyone betting max and one person winning
      // In practice, capped by pool size
      return maxBet * 10; // Assume 10 max entries
    case 'gacha':
      // Legendary is 10x
      return maxBet * 10;
    default:
      return maxBet * 2;
  }
}

/**
 * Get human-readable bankroll summary
 */
export function formatBankrollSummary(state: BankrollState): string {
  return `
Casino Bankroll Status:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Balance:     ${state.totalBalance.toLocaleString()} $CC
Reserve (${(CASINO_BANKROLL.reserveRatio * 100)}%):   ${state.reserveBalance.toLocaleString()} $CC
Available:         ${state.availableBalance.toLocaleString()} $CC
Allocated to Games: ${state.allocatedToGames.toLocaleString()} $CC
Unallocated:       ${state.unallocated.toLocaleString()} $CC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Daily Payouts:     ${state.dailyPayoutSoFar.toLocaleString()} / ${CASINO_BANKROLL.maxDailyPayout.toLocaleString()} $CC
Can Payout More:   ${state.canPayoutMore ? 'Yes' : 'No (limit reached)'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
}

// ============ CIRCUIT BREAKERS ============

export interface CircuitBreakerResult {
  allowed: boolean;
  reason?: string;
  dailyStats?: {
    totalPayouts: number;
    payoutCount: number;
    remainingCapacity: number;
  };
}

/**
 * Check if a payout can be processed (circuit breaker for game wallet)
 * This is the main safety check called before every payout.
 *
 * @param payoutAmount - Amount to pay out in $CC (not lamports)
 * @param gameWalletBalance - Current game wallet balance in $CC
 */
export function checkPayoutCircuitBreaker(
  payoutAmount: number,
  gameWalletBalance: number
): CircuitBreakerResult {
  // Get daily stats
  const dailyStats = getDailyPayoutStats();

  // CHECK 1: Single payout limit (100K)
  if (payoutAmount > GAME_LIMITS.maxSinglePayout) {
    return {
      allowed: false,
      reason: `Exceeds max single payout (${GAME_LIMITS.maxSinglePayout.toLocaleString()} $CC)`,
      dailyStats: {
        totalPayouts: dailyStats.totalPayouts,
        payoutCount: dailyStats.payoutCount,
        remainingCapacity: GAME_LIMITS.maxDailyPayouts - dailyStats.totalPayouts,
      },
    };
  }

  // CHECK 2: Daily payout limit (500K)
  if (dailyStats.totalPayouts + payoutAmount > GAME_LIMITS.maxDailyPayouts) {
    return {
      allowed: false,
      reason: `Would exceed daily payout limit (${GAME_LIMITS.maxDailyPayouts.toLocaleString()} $CC)`,
      dailyStats: {
        totalPayouts: dailyStats.totalPayouts,
        payoutCount: dailyStats.payoutCount,
        remainingCapacity: GAME_LIMITS.maxDailyPayouts - dailyStats.totalPayouts,
      },
    };
  }

  // CHECK 3: Game wallet minimum balance (100K reserve)
  if (gameWalletBalance - payoutAmount < GAME_LIMITS.minBalance) {
    return {
      allowed: false,
      reason: `Game wallet below minimum balance (${GAME_LIMITS.minBalance.toLocaleString()} $CC)`,
      dailyStats: {
        totalPayouts: dailyStats.totalPayouts,
        payoutCount: dailyStats.payoutCount,
        remainingCapacity: GAME_LIMITS.maxDailyPayouts - dailyStats.totalPayouts,
      },
    };
  }

  return {
    allowed: true,
    dailyStats: {
      totalPayouts: dailyStats.totalPayouts,
      payoutCount: dailyStats.payoutCount,
      remainingCapacity: GAME_LIMITS.maxDailyPayouts - dailyStats.totalPayouts,
    },
  };
}

/**
 * Check if a transfer from rewards wallet to game wallet is allowed
 *
 * @param transferAmount - Amount to transfer in $CC
 */
export function checkTransferCircuitBreaker(transferAmount: number): CircuitBreakerResult {
  // Get daily transfer stats
  const dailyStats = getDailyTransferStats();

  // CHECK 1: Single transfer limit (1M)
  if (transferAmount > REWARDS_LIMITS.maxSingleTransfer) {
    return {
      allowed: false,
      reason: `Exceeds max single transfer (${REWARDS_LIMITS.maxSingleTransfer.toLocaleString()} $CC)`,
    };
  }

  // CHECK 2: Daily transfer limit (1M)
  if (dailyStats.totalTransferred + transferAmount > REWARDS_LIMITS.maxDailyTransfer) {
    return {
      allowed: false,
      reason: `Would exceed daily transfer limit (${REWARDS_LIMITS.maxDailyTransfer.toLocaleString()} $CC)`,
    };
  }

  return { allowed: true };
}

// ============ TOP-UP LOGIC ============

export interface TopUpResult {
  success: boolean;
  transferred?: number;
  txSignature?: string;
  reason?: string;
  gameWalletBalance?: number;
  rewardsWalletBalance?: number;
}

/**
 * Check if game wallet needs a top-up from rewards wallet
 */
export async function checkTopUpNeeded(): Promise<{
  needed: boolean;
  currentBalance: number;
  targetBalance: number;
  topUpAmount?: number;
  reason?: string;
}> {
  const encryptionKey = process.env.BRAIN_WALLET_KEY;
  if (!encryptionKey) {
    return { needed: false, currentBalance: 0, targetBalance: 0, reason: 'BRAIN_WALLET_KEY not set' };
  }

  // Check if rewards wallet exists
  if (!rewardsWalletExists()) {
    return { needed: false, currentBalance: 0, targetBalance: 0, reason: 'Rewards wallet not created' };
  }

  try {
    const connection = getConnection();
    const gameWallet = loadWallet(encryptionKey);
    const balance = await gameWallet.getBalance(connection);

    // Check if below threshold
    if (balance.cc >= REWARDS_LIMITS.gameWalletLowThreshold) {
      return {
        needed: false,
        currentBalance: balance.cc,
        targetBalance: REWARDS_LIMITS.gameWalletTarget,
        reason: `Balance ${balance.cc.toLocaleString()} $CC above threshold ${REWARDS_LIMITS.gameWalletLowThreshold.toLocaleString()} $CC`,
      };
    }

    // Calculate top-up amount
    const topUpAmount = Math.min(
      REWARDS_LIMITS.gameWalletTarget - balance.cc,
      REWARDS_LIMITS.maxSingleTransfer
    );

    return {
      needed: true,
      currentBalance: balance.cc,
      targetBalance: REWARDS_LIMITS.gameWalletTarget,
      topUpAmount,
    };
  } catch (error) {
    return {
      needed: false,
      currentBalance: 0,
      targetBalance: 0,
      reason: `Error checking balance: ${(error as Error).message}`,
    };
  }
}

/**
 * Execute a top-up transfer from rewards wallet to game wallet
 * This should be called by the daily cron job or manually.
 *
 * @param amount - Amount to transfer in $CC (optional, auto-calculates if not provided)
 */
export async function topUpGameWallet(amount?: number): Promise<TopUpResult> {
  const encryptionKey = process.env.BRAIN_WALLET_KEY;
  if (!encryptionKey) {
    return { success: false, reason: 'BRAIN_WALLET_KEY not set' };
  }

  // Check if rewards wallet exists
  if (!rewardsWalletExists()) {
    return { success: false, reason: 'Rewards wallet not created' };
  }

  try {
    const connection = getConnection();
    const gameWallet = loadWallet(encryptionKey);
    const rewardsWallet = loadRewardsWallet(encryptionKey);

    // Get balances
    const gameBalance = await gameWallet.getBalance(connection);
    const rewardsBalance = await rewardsWallet.getBalance(connection);

    console.log(`[Top-Up] Game wallet balance: ${gameBalance.cc.toLocaleString()} $CC`);
    console.log(`[Top-Up] Rewards wallet balance: ${rewardsBalance.cc.toLocaleString()} $CC`);

    // Calculate amount if not provided
    const transferAmount = amount ?? Math.min(
      REWARDS_LIMITS.gameWalletTarget - gameBalance.cc,
      REWARDS_LIMITS.maxSingleTransfer
    );

    if (transferAmount <= 0) {
      return {
        success: false,
        reason: 'No top-up needed',
        gameWalletBalance: gameBalance.cc,
        rewardsWalletBalance: rewardsBalance.cc,
      };
    }

    // Check circuit breaker
    const circuitCheck = checkTransferCircuitBreaker(transferAmount);
    if (!circuitCheck.allowed) {
      return {
        success: false,
        reason: circuitCheck.reason,
        gameWalletBalance: gameBalance.cc,
        rewardsWalletBalance: rewardsBalance.cc,
      };
    }

    // Check rewards wallet has enough
    if (rewardsBalance.cc < transferAmount) {
      return {
        success: false,
        reason: `Rewards wallet insufficient: ${rewardsBalance.cc.toLocaleString()} $CC < ${transferAmount.toLocaleString()} $CC`,
        gameWalletBalance: gameBalance.cc,
        rewardsWalletBalance: rewardsBalance.cc,
      };
    }

    // Execute transfer
    const transferAmountLamports = BigInt(Math.floor(transferAmount * 1_000_000_000));
    console.log(`[Top-Up] Transferring ${transferAmount.toLocaleString()} $CC from rewards → game wallet...`);

    const txSignature = await transferCC(
      connection,
      rewardsWallet,
      gameWallet.publicKey,
      transferAmountLamports
    );

    console.log(`[Top-Up] Transfer complete: ${txSignature}`);

    // Record the transfer
    recordRewardsTransfer(transferAmountLamports);
    recordRewardsDistribution(transferAmount);

    return {
      success: true,
      transferred: transferAmount,
      txSignature,
      gameWalletBalance: gameBalance.cc + transferAmount,
      rewardsWalletBalance: rewardsBalance.cc - transferAmount,
    };
  } catch (error) {
    console.error('[Top-Up] Error:', error);
    return {
      success: false,
      reason: `Transfer failed: ${(error as Error).message}`,
    };
  }
}

// ============ STATUS HELPERS ============

export interface WalletSystemStatus {
  rewardsWallet: {
    exists: boolean;
    publicKey?: string;
    balance?: number;
    totalDistributed?: number;
  };
  gameWallet: {
    publicKey?: string;
    balance?: number;
    needsTopUp: boolean;
    topUpAmount?: number;
  };
  limits: {
    rewards: typeof REWARDS_LIMITS;
    game: typeof GAME_LIMITS;
  };
  dailyStats: {
    payouts: ReturnType<typeof getDailyPayoutStats>;
    transfers: ReturnType<typeof getDailyTransferStats>;
  };
}

/**
 * Get full status of the 3-wallet system
 */
export async function getWalletSystemStatus(): Promise<WalletSystemStatus> {
  const encryptionKey = process.env.BRAIN_WALLET_KEY;

  // Get daily stats
  const payoutStats = getDailyPayoutStats();
  const transferStats = getDailyTransferStats();

  // Default status
  const status: WalletSystemStatus = {
    rewardsWallet: { exists: false },
    gameWallet: { needsTopUp: false },
    limits: { rewards: REWARDS_LIMITS, game: GAME_LIMITS },
    dailyStats: { payouts: payoutStats, transfers: transferStats },
  };

  // Get rewards wallet status
  if (rewardsWalletExists()) {
    const rewardsState = getRewardsWalletState();
    status.rewardsWallet = {
      exists: true,
      publicKey: rewardsState?.publicKey,
      balance: rewardsState?.ccBalance,
      totalDistributed: rewardsState?.totalDistributed,
    };

    // Get live balance if possible
    if (encryptionKey) {
      try {
        const connection = getConnection();
        const rewardsWallet = loadRewardsWallet(encryptionKey);
        const balance = await rewardsWallet.getBalance(connection);
        status.rewardsWallet.balance = balance.cc;
      } catch {}
    }
  }

  // Get game wallet status
  if (encryptionKey) {
    try {
      const connection = getConnection();
      const gameWallet = loadWallet(encryptionKey);
      const balance = await gameWallet.getBalance(connection);

      const topUpCheck = await checkTopUpNeeded();

      status.gameWallet = {
        publicKey: gameWallet.publicKey.toBase58(),
        balance: balance.cc,
        needsTopUp: topUpCheck.needed,
        topUpAmount: topUpCheck.topUpAmount,
      };
    } catch {}
  }

  return status;
}

/**
 * Get all system limits as a flat object (for API responses)
 */
export function getAllLimits(): {
  rewardsWallet: typeof REWARDS_LIMITS;
  gameWallet: typeof GAME_LIMITS;
  circuitBreaker: {
    dailyPayoutsRemaining: number;
    dailyTransfersRemaining: number;
  };
} {
  const payoutStats = getDailyPayoutStats();
  const transferStats = getDailyTransferStats();

  return {
    rewardsWallet: REWARDS_LIMITS,
    gameWallet: GAME_LIMITS,
    circuitBreaker: {
      dailyPayoutsRemaining: GAME_LIMITS.maxDailyPayouts - payoutStats.totalPayouts,
      dailyTransfersRemaining: REWARDS_LIMITS.maxDailyTransfer - transferStats.totalTransferred,
    },
  };
}
