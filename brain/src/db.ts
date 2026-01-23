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
