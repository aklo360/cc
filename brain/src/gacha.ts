/**
 * Gacha (Probability Engine) - On-Chain Commit-Reveal
 *
 * Same security model as flip:
 * 1. Server commits to secret (hash)
 * 2. User deposits tokens
 * 3. Result = tier based on SHA256(serverSecret + txSignature)
 *
 * Tier Distribution (~3% house edge, 0.97x EV):
 * - Basic: 75% @ 0.4x
 * - Advanced: 18% @ 2x
 * - Elite: 6% @ 4x
 * - Legendary: 1% @ 7x
 */

import { createHash, randomBytes } from 'crypto';
import { db } from './db.js';
import { v4 as uuidv4 } from 'uuid';

// Gacha tiers
export type GachaTier = 'Basic' | 'Advanced' | 'Elite' | 'Legendary';

// Tier distribution (matches frontend)
export const GACHA_DISTRIBUTION: Record<GachaTier, { prob: number; multiplier: number }> = {
  'Basic': { prob: 0.75, multiplier: 0.4 },
  'Advanced': { prob: 0.18, multiplier: 2 },
  'Elite': { prob: 0.06, multiplier: 4 },
  'Legendary': { prob: 0.01, multiplier: 7 },
};

// Game config
export const GACHA_CONFIG = {
  stakePerSample: 5_000, // Fixed 5,000 $CC per sample
  minSamples: 1,
  maxSamples: 10,
  expirySeconds: 300, // 5 minute expiry
  platformFeeLamports: 1_000_000, // 0.001 SOL
  maxDailyLoss: 1_000_000, // Max daily loss before circuit breaker (1M $CC)
};

// Database types
export interface GachaCommitment {
  id: string;
  wallet: string;
  sample_count: number;
  stake_amount: number; // Total stake (sample_count * 5)
  secret: string;
  commitment_hash: string;
  expires_at: number;
  status: 'pending' | 'deposited' | 'resolved' | 'expired';
  deposit_tx: string | null;
  results: string | null; // JSON array of tier results
  total_payout: number | null;
  payout_tx: string | null;
  created_at: string;
}

// Initialize gacha table
export function initGachaTable(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS gacha_commitments (
      id TEXT PRIMARY KEY,
      wallet TEXT NOT NULL,
      sample_count INTEGER NOT NULL,
      stake_amount INTEGER NOT NULL,
      secret TEXT NOT NULL,
      commitment_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      deposit_tx TEXT,
      results TEXT,
      total_payout INTEGER,
      payout_tx TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Index for wallet lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_gacha_wallet_status
    ON gacha_commitments(wallet, status)
  `);

  console.log('[Gacha] Database table initialized');
}

/**
 * Generate commitment (server secret + hash)
 */
export function generateGachaCommitment(): { secret: string; hash: string } {
  const secret = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(secret).digest('hex');
  return { secret, hash };
}

/**
 * Create a new gacha commitment
 */
export function createGachaCommitment(
  wallet: string,
  sampleCount: number,
  secret: string,
  commitmentHash: string,
  expiresAt: number
): string {
  const id = uuidv4();
  const stakeAmount = sampleCount * GACHA_CONFIG.stakePerSample;

  const stmt = db.prepare(`
    INSERT INTO gacha_commitments (id, wallet, sample_count, stake_amount, secret, commitment_hash, expires_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
  `);
  stmt.run(id, wallet, sampleCount, stakeAmount, secret, commitmentHash, expiresAt);

  return id;
}

/**
 * Get a gacha commitment by ID
 */
export function getGachaCommitment(id: string): GachaCommitment | null {
  const stmt = db.prepare('SELECT * FROM gacha_commitments WHERE id = ?');
  return (stmt.get(id) as GachaCommitment) || null;
}

/**
 * Get pending commitment for a wallet
 */
export function getPendingGachaCommitment(wallet: string): GachaCommitment | null {
  const stmt = db.prepare(`
    SELECT * FROM gacha_commitments
    WHERE wallet = ? AND status = 'pending' AND expires_at > ?
    ORDER BY created_at DESC LIMIT 1
  `);
  return (stmt.get(wallet, Date.now()) as GachaCommitment) || null;
}

/**
 * Expire old commitments for a wallet
 */
export function expireGachaCommitments(wallet: string): number {
  const stmt = db.prepare(`
    UPDATE gacha_commitments
    SET status = 'expired'
    WHERE wallet = ? AND status = 'pending' AND expires_at < ?
  `);
  const result = stmt.run(wallet, Date.now());
  return result.changes;
}

/**
 * Mark commitment as deposited
 */
export function markGachaDeposited(id: string, txSignature: string): void {
  const stmt = db.prepare(`
    UPDATE gacha_commitments
    SET status = 'deposited', deposit_tx = ?
    WHERE id = ?
  `);
  stmt.run(txSignature, id);
}

/**
 * Compute tier from combined entropy
 */
export function computeGachaTier(serverSecret: string, txSignature: string, sampleIndex: number = 0): GachaTier {
  const combined = serverSecret + txSignature + sampleIndex.toString();
  const hash = createHash('sha256').update(combined).digest();

  // Use first byte to determine roll (0-255 -> 0-99)
  const roll = hash[0] % 100;

  // Distribution mapping (75% Basic, 18% Advanced, 6% Elite, 1% Legendary)
  if (roll < 1) return 'Legendary';   // 0 (1%)
  if (roll < 7) return 'Elite';       // 1-6 (6%)
  if (roll < 25) return 'Advanced';   // 7-24 (18%)
  return 'Basic';                     // 25-99 (75%)
}

/**
 * Compute results for all samples
 */
export function computeGachaResults(
  serverSecret: string,
  txSignature: string,
  sampleCount: number
): { tiers: GachaTier[]; payouts: number[]; totalPayout: number } {
  const tiers: GachaTier[] = [];
  const payouts: number[] = [];
  let totalPayout = 0;
  let hasAdvancedPlus = false;

  for (let i = 0; i < sampleCount; i++) {
    const tier = computeGachaTier(serverSecret, txSignature, i);
    const multiplier = GACHA_DISTRIBUTION[tier].multiplier;
    const payout = Math.floor(GACHA_CONFIG.stakePerSample * multiplier);

    tiers.push(tier);
    payouts.push(payout);
    totalPayout += payout;

    if (tier !== 'Basic') hasAdvancedPlus = true;
  }

  // 10-sample guarantee: if no Advanced+ in first 9, force last one
  if (sampleCount === 10 && !hasAdvancedPlus) {
    // Use deterministic "pity" tier based on final hash
    const pityHash = createHash('sha256').update(serverSecret + txSignature + 'pity').digest();
    const pityTier: GachaTier = pityHash[0] < 205 ? 'Advanced' : 'Elite'; // 80% Advanced, 20% Elite
    const pityPayout = Math.floor(GACHA_CONFIG.stakePerSample * GACHA_DISTRIBUTION[pityTier].multiplier);

    // Replace last result
    totalPayout = totalPayout - payouts[9] + pityPayout;
    tiers[9] = pityTier;
    payouts[9] = pityPayout;
  }

  return { tiers, payouts, totalPayout };
}

/**
 * Resolve commitment with results
 */
export function resolveGachaCommitment(
  id: string,
  results: GachaTier[],
  totalPayout: number,
  payoutTx: string | null
): void {
  const stmt = db.prepare(`
    UPDATE gacha_commitments
    SET status = 'resolved', results = ?, total_payout = ?, payout_tx = ?
    WHERE id = ?
  `);
  stmt.run(JSON.stringify(results), totalPayout, payoutTx, id);
}

/**
 * Get daily gacha stats
 */
export function getDailyGachaStats(): {
  totalSamples: number;
  totalStaked: number;
  totalPaidOut: number;
  netProfit: number;
} {
  const today = new Date().toISOString().split('T')[0];
  const stmt = db.prepare(`
    SELECT
      COALESCE(SUM(sample_count), 0) as totalSamples,
      COALESCE(SUM(stake_amount), 0) as totalStaked,
      COALESCE(SUM(total_payout), 0) as totalPaidOut
    FROM gacha_commitments
    WHERE status = 'resolved' AND date(created_at) = ?
  `);
  const row = stmt.get(today) as { totalSamples: number; totalStaked: number; totalPaidOut: number };

  return {
    totalSamples: row.totalSamples,
    totalStaked: row.totalStaked,
    totalPaidOut: row.totalPaidOut,
    netProfit: row.totalStaked - row.totalPaidOut,
  };
}

/**
 * Get daily house loss (for circuit breaker)
 */
export function getDailyGachaLoss(): number {
  const stats = getDailyGachaStats();
  return Math.max(0, stats.totalPaidOut - stats.totalStaked);
}

// Initialize table on import
initGachaTable();
