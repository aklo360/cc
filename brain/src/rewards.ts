/**
 * Rewards Pool Management - Bankroll for GameFi Casino
 *
 * The brain wallet holds 1-2% of total $CC supply as the ENTIRE CASINO BANKROLL.
 * This is distributed across ALL games over time, not per-game allocation.
 *
 * Key Principles:
 * - Self-sustaining: fees flow back to bankroll
 * - Safety limits: max single payout, reserve ratio
 * - Deflationary: portion of fees burned
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { loadWallet, getWalletState, CC_TOKEN_MINT } from './wallet.js';
import { getActiveGames, type GameType, type GameConfig } from './db.js';

// ============ BANKROLL CONFIGURATION ============

export const CASINO_BANKROLL = {
  // Total allocation from $CC supply (1.5% = 15M tokens)
  totalAllocation: 15_000_000,

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

  // Safety limits
  maxSinglePayout: 100_000,     // No single win > 100K $CC
  reserveRatio: 0.20,           // Keep 20% as reserve buffer
  maxDailyPayout: 1_000_000,    // Max 1M $CC paid out per day
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
  dailyPayoutSoFar: number;       // Paid out today
  canPayoutMore: boolean;         // Under daily limit?
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
    // This would query game_bets for today's payouts
    const dailyPayoutSoFar = 0; // TODO: Implement daily payout tracking

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
