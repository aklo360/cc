/**
 * SQLite Database - Ultra-lean storage for Central Brain
 */

import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database file in brain directory
const dbPath = join(__dirname, '..', 'brain.db');
export const db: DatabaseType = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS tweets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    twitter_id TEXT UNIQUE,
    content TEXT NOT NULL,
    category TEXT,
    likes INTEGER DEFAULT 0,
    retweets INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS experiments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'building',
    deployed_url TEXT,
    tweet_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    priority INTEGER DEFAULT 5,
    reasoning TEXT,
    parameters TEXT,
    executed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS game_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet TEXT NOT NULL,
    game TEXT NOT NULL,
    score INTEGER NOT NULL,
    tokens_earned REAL DEFAULT 0,
    claimed INTEGER DEFAULT 0,
    tx_signature TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cycles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT DEFAULT 'planning',
    project_idea TEXT,
    project_slug TEXT,
    started_at TEXT DEFAULT CURRENT_TIMESTAMP,
    ends_at TEXT,
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS scheduled_tweets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cycle_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    scheduled_for TEXT NOT NULL,
    tweet_type TEXT DEFAULT 'general',
    posted INTEGER DEFAULT 0,
    twitter_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cycle_id) REFERENCES cycles(id)
  );

  CREATE TABLE IF NOT EXISTS daily_stats (
    date TEXT PRIMARY KEY,
    features_shipped INTEGER DEFAULT 0,
    last_cycle_end TEXT
  );
`);

console.log('✓ SQLite database initialized');

// ============ Tweet Helpers ============

export interface Tweet {
  id: number;
  twitter_id: string | null;
  content: string;
  category: string | null;
  likes: number;
  retweets: number;
  created_at: string;
}

export function insertTweet(content: string, category?: string, twitterId?: string): number {
  const stmt = db.prepare(`
    INSERT INTO tweets (content, category, twitter_id) VALUES (?, ?, ?)
  `);
  const result = stmt.run(content, category || null, twitterId || null);
  return result.lastInsertRowid as number;
}

export function getRecentTweets(limit = 20): Tweet[] {
  const stmt = db.prepare(`
    SELECT * FROM tweets ORDER BY created_at DESC LIMIT ?
  `);
  return stmt.all(limit) as Tweet[];
}

export function getTweetCountToday(): number {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM tweets
    WHERE date(created_at) = date('now')
  `);
  const result = stmt.get() as { count: number };
  return result.count;
}

// ============ Experiment Helpers ============

export interface Experiment {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  status: string;
  deployed_url: string | null;
  tweet_id: string | null;
  created_at: string;
}

export function insertExperiment(slug: string, name: string, description?: string): number {
  const stmt = db.prepare(`
    INSERT INTO experiments (slug, name, description) VALUES (?, ?, ?)
  `);
  const result = stmt.run(slug, name, description || null);
  return result.lastInsertRowid as number;
}

export function updateExperimentStatus(id: number, status: string, deployedUrl?: string): void {
  const stmt = db.prepare(`
    UPDATE experiments SET status = ?, deployed_url = ? WHERE id = ?
  `);
  stmt.run(status, deployedUrl || null, id);
}

export function getActiveExperiments(): Experiment[] {
  const stmt = db.prepare(`
    SELECT * FROM experiments
    WHERE status IN ('building', 'deployed', 'viral')
    ORDER BY created_at DESC
  `);
  return stmt.all() as Experiment[];
}

export function getLastExperiment(): Experiment | null {
  const stmt = db.prepare(`
    SELECT * FROM experiments ORDER BY created_at DESC LIMIT 1
  `);
  return (stmt.get() as Experiment) || null;
}

// ============ Decision Helpers ============

export interface Decision {
  id: number;
  action: string;
  priority: number;
  reasoning: string | null;
  parameters: string | null;
  executed: number;
  created_at: string;
}

export function insertDecision(
  action: string,
  priority: number,
  reasoning?: string,
  parameters?: Record<string, unknown>
): number {
  const stmt = db.prepare(`
    INSERT INTO decisions (action, priority, reasoning, parameters) VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(
    action,
    priority,
    reasoning || null,
    parameters ? JSON.stringify(parameters) : null
  );
  return result.lastInsertRowid as number;
}

export function markDecisionExecuted(id: number): void {
  const stmt = db.prepare(`UPDATE decisions SET executed = 1 WHERE id = ?`);
  stmt.run(id);
}

export function getPendingDecisions(): Decision[] {
  const stmt = db.prepare(`
    SELECT * FROM decisions WHERE executed = 0 ORDER BY priority DESC, created_at ASC
  `);
  return stmt.all() as Decision[];
}

// ============ Game Score Helpers ============

export interface GameScore {
  id: number;
  wallet: string;
  game: string;
  score: number;
  tokens_earned: number;
  claimed: number;
  tx_signature: string | null;
  created_at: string;
}

export function insertGameScore(wallet: string, game: string, score: number): number {
  const stmt = db.prepare(`
    INSERT INTO game_scores (wallet, game, score) VALUES (?, ?, ?)
  `);
  const result = stmt.run(wallet, game, score);
  return result.lastInsertRowid as number;
}

export function getUnclaimedScores(wallet: string): GameScore[] {
  const stmt = db.prepare(`
    SELECT * FROM game_scores WHERE wallet = ? AND claimed = 0
  `);
  return stmt.all(wallet) as GameScore[];
}

export function markScoreClaimed(id: number, tokensEarned: number, txSignature: string): void {
  const stmt = db.prepare(`
    UPDATE game_scores SET claimed = 1, tokens_earned = ?, tx_signature = ? WHERE id = ?
  `);
  stmt.run(tokensEarned, txSignature, id);
}

export function getDailyClaimedTokens(wallet: string): number {
  const stmt = db.prepare(`
    SELECT COALESCE(SUM(tokens_earned), 0) as total FROM game_scores
    WHERE wallet = ? AND claimed = 1 AND date(created_at) = date('now')
  `);
  const result = stmt.get(wallet) as { total: number };
  return result.total;
}

// ============ Cycle Helpers ============

export interface Cycle {
  id: number;
  status: string;
  project_idea: string | null;
  project_slug: string | null;
  started_at: string;
  ends_at: string | null;
  completed_at: string | null;
}

export function createCycle(): number {
  const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const stmt = db.prepare(`
    INSERT INTO cycles (status, ends_at) VALUES ('planning', ?)
  `);
  const result = stmt.run(endsAt);
  return result.lastInsertRowid as number;
}

export function updateCycleProject(id: number, projectIdea: string, projectSlug: string): void {
  const stmt = db.prepare(`
    UPDATE cycles SET project_idea = ?, project_slug = ?, status = 'executing' WHERE id = ?
  `);
  stmt.run(projectIdea, projectSlug, id);
}

export function completeCycle(id: number): void {
  const stmt = db.prepare(`
    UPDATE cycles SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?
  `);
  stmt.run(id);
}

export function getActiveCycle(): Cycle | null {
  const stmt = db.prepare(`
    SELECT * FROM cycles WHERE status IN ('planning', 'executing') ORDER BY id DESC LIMIT 1
  `);
  return (stmt.get() as Cycle) || null;
}

export function getLastCycle(): Cycle | null {
  const stmt = db.prepare(`
    SELECT * FROM cycles ORDER BY id DESC LIMIT 1
  `);
  return (stmt.get() as Cycle) || null;
}

// ============ Scheduled Tweet Helpers ============

export interface ScheduledTweet {
  id: number;
  cycle_id: number;
  content: string;
  scheduled_for: string;
  tweet_type: string;
  posted: number;
  twitter_id: string | null;
  created_at: string;
}

export function insertScheduledTweet(
  cycleId: number,
  content: string,
  scheduledFor: string,
  tweetType: string = 'general'
): number {
  const stmt = db.prepare(`
    INSERT INTO scheduled_tweets (cycle_id, content, scheduled_for, tweet_type)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(cycleId, content, scheduledFor, tweetType);
  return result.lastInsertRowid as number;
}

export function getUnpostedTweets(cycleId: number): ScheduledTweet[] {
  const stmt = db.prepare(`
    SELECT * FROM scheduled_tweets
    WHERE cycle_id = ? AND posted = 0 AND datetime(scheduled_for) <= datetime('now')
    ORDER BY scheduled_for ASC
  `);
  return stmt.all(cycleId) as ScheduledTweet[];
}

export function getAllScheduledTweets(cycleId: number): ScheduledTweet[] {
  const stmt = db.prepare(`
    SELECT * FROM scheduled_tweets WHERE cycle_id = ? ORDER BY scheduled_for ASC
  `);
  return stmt.all(cycleId) as ScheduledTweet[];
}

export function markTweetPosted(id: number, twitterId: string): void {
  const stmt = db.prepare(`
    UPDATE scheduled_tweets SET posted = 1, twitter_id = ? WHERE id = ?
  `);
  stmt.run(twitterId, id);
}

// ============ Cleanup Helpers ============

export function cancelIncompleteCycles(): number {
  // Cancel any cycles that are still in 'planning' status (interrupted before completion)
  const stmt = db.prepare(`
    UPDATE cycles SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP
    WHERE status = 'planning'
  `);
  const result = stmt.run();
  return result.changes;
}

export function cancelExpiredCycles(): number {
  // Cancel any cycles that have passed their end time but are still 'executing'
  const stmt = db.prepare(`
    UPDATE cycles SET status = 'completed', completed_at = CURRENT_TIMESTAMP
    WHERE status = 'executing' AND datetime(ends_at) < datetime('now')
  `);
  const result = stmt.run();
  return result.changes;
}

export function cleanupOnStartup(): { cancelled: number; expired: number } {
  const cancelled = cancelIncompleteCycles();
  const expired = cancelExpiredCycles();
  return { cancelled, expired };
}

// ============ Daily Stats Helpers ============

export interface DailyStats {
  date: string;
  features_shipped: number;
  last_cycle_end: string | null;
}

const DAILY_LIMIT = 5; // Maximum features per day

export function getTodayStats(): DailyStats {
  const today = new Date().toISOString().split('T')[0];
  const stmt = db.prepare(`
    SELECT * FROM daily_stats WHERE date = ?
  `);
  const result = stmt.get(today) as DailyStats | undefined;

  if (!result) {
    // Create today's entry
    const insertStmt = db.prepare(`
      INSERT INTO daily_stats (date, features_shipped) VALUES (?, 0)
    `);
    insertStmt.run(today);
    return { date: today, features_shipped: 0, last_cycle_end: null };
  }

  return result;
}

export function incrementFeaturesShipped(): DailyStats {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  // Upsert: increment if exists, insert if not
  const stmt = db.prepare(`
    INSERT INTO daily_stats (date, features_shipped, last_cycle_end)
    VALUES (?, 1, ?)
    ON CONFLICT(date) DO UPDATE SET
      features_shipped = features_shipped + 1,
      last_cycle_end = ?
  `);
  stmt.run(today, now, now);

  return getTodayStats();
}

export function canShipMore(): boolean {
  const stats = getTodayStats();
  return stats.features_shipped < DAILY_LIMIT;
}

export function getDailyLimit(): number {
  return DAILY_LIMIT;
}

export function getTimeUntilNextAllowed(): number {
  const stats = getTodayStats();

  // If we've hit the daily limit, wait until midnight UTC
  if (stats.features_shipped >= DAILY_LIMIT) {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCHours(24, 0, 0, 0);
    return tomorrow.getTime() - now.getTime();
  }

  // Otherwise, 30-minute cooldown from last cycle
  if (stats.last_cycle_end) {
    const lastEnd = new Date(stats.last_cycle_end).getTime();
    const cooldown = 30 * 60 * 1000; // 30 minutes
    const nextAllowed = lastEnd + cooldown;
    const now = Date.now();
    return Math.max(0, nextAllowed - now);
  }

  return 0; // Can start immediately
}
