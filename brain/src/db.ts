/**
 * SQLite Database - Ultra-lean storage for Central Brain
 */

import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path - use DB_PATH env var (for Docker) or fallback to relative path
const dbPath = process.env.DB_PATH || join(__dirname, '..', 'brain.db');
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
    completed_at TEXT,
    claude_pid INTEGER,
    last_phase INTEGER DEFAULT 0,
    error_message TEXT,
    trailer_path TEXT
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

  CREATE TABLE IF NOT EXISTS shipped_features (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    keywords TEXT,
    shipped_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS build_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    level TEXT DEFAULT 'info',
    activity_type TEXT DEFAULT 'system',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_build_logs_created_at ON build_logs(created_at);

  -- Memes table for tracking generated memes
  CREATE TABLE IF NOT EXISTS memes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt TEXT NOT NULL,
    description TEXT NOT NULL,
    caption TEXT NOT NULL,
    quality_score INTEGER NOT NULL,
    twitter_id TEXT,
    posted_at TEXT,
    skipped_reason TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Meme state singleton for rate limiting
  CREATE TABLE IF NOT EXISTS meme_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_post_time INTEGER DEFAULT 0,
    daily_count INTEGER DEFAULT 0,
    daily_reset_date TEXT,
    recent_prompts TEXT DEFAULT '[]',
    in_progress INTEGER DEFAULT 0
  );
  INSERT OR IGNORE INTO meme_state (id) VALUES (1);

  -- Global tweet rate limit tracking (Twitter Free tier: 17 tweets/24h)
  CREATE TABLE IF NOT EXISTS tweet_rate_limit (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    daily_count INTEGER DEFAULT 0,
    daily_reset_date TEXT,
    last_tweet_time INTEGER DEFAULT 0
  );
  INSERT OR IGNORE INTO tweet_rate_limit (id) VALUES (1);

  -- Tweet log for tracking all tweets (memes, announcements, scheduled)
  CREATE TABLE IF NOT EXISTS tweet_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tweet_id TEXT NOT NULL,
    tweet_type TEXT NOT NULL,
    content TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// ============ Schema Migration ============
// Add new columns to existing tables if they don't exist
// This handles upgrades from older versions of the database

function columnExists(tableName: string, columnName: string): boolean {
  const pragma = db.prepare(`PRAGMA table_info(${tableName})`);
  const columns = pragma.all() as { name: string }[];
  return columns.some(col => col.name === columnName);
}

// Migrate cycles table
if (!columnExists('cycles', 'claude_pid')) {
  console.log('  Migrating: Adding claude_pid column to cycles table');
  db.exec('ALTER TABLE cycles ADD COLUMN claude_pid INTEGER');
}
if (!columnExists('cycles', 'last_phase')) {
  console.log('  Migrating: Adding last_phase column to cycles table');
  db.exec('ALTER TABLE cycles ADD COLUMN last_phase INTEGER DEFAULT 0');
}
if (!columnExists('cycles', 'error_message')) {
  console.log('  Migrating: Adding error_message column to cycles table');
  db.exec('ALTER TABLE cycles ADD COLUMN error_message TEXT');
}
if (!columnExists('cycles', 'trailer_path')) {
  console.log('  Migrating: Adding trailer_path column to cycles table');
  db.exec('ALTER TABLE cycles ADD COLUMN trailer_path TEXT');
}

// Migrate build_logs table
if (!columnExists('build_logs', 'activity_type')) {
  console.log('  Migrating: Adding activity_type column to build_logs table');
  db.exec("ALTER TABLE build_logs ADD COLUMN activity_type TEXT DEFAULT 'system'");
}

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
  claude_pid: number | null;
  last_phase: number;
  error_message: string | null;
  trailer_path: string | null;
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

export function cleanupOnStartup(): { cancelled: number; expired: number; pidsToKill: number[] } {
  // Get PIDs of any active cycles before cancelling
  const activeCycles = db.prepare(`
    SELECT claude_pid FROM cycles WHERE status IN ('planning', 'executing') AND claude_pid IS NOT NULL
  `).all() as { claude_pid: number }[];

  const pidsToKill = activeCycles.map(c => c.claude_pid).filter(Boolean);

  const cancelled = cancelIncompleteCycles();
  const expired = cancelExpiredCycles();
  return { cancelled, expired, pidsToKill };
}

// ============ Daily Stats Helpers ============

export interface DailyStats {
  date: string;
  features_shipped: number;
  last_cycle_end: string | null;
}

const DAILY_LIMIT = 5; // Maximum features per day
const HOURS_BETWEEN_CYCLES = 4.5; // Spread 5 features across ~22.5 hours (leaving buffer)

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

  // Stagger features across the day (4.5 hours between each)
  // This spreads 5 features evenly across ~22.5 hours
  if (stats.last_cycle_end) {
    const lastEnd = new Date(stats.last_cycle_end).getTime();
    const cooldown = HOURS_BETWEEN_CYCLES * 60 * 60 * 1000; // 4.5 hours in ms
    const nextAllowed = lastEnd + cooldown;
    const now = Date.now();
    return Math.max(0, nextAllowed - now);
  }

  return 0; // Can start immediately
}

export function getHoursBetweenCycles(): number {
  return HOURS_BETWEEN_CYCLES;
}

// ============ Shipped Features Helpers ============

export interface ShippedFeature {
  id: number;
  slug: string;
  name: string;
  description: string;
  keywords: string | null;
  shipped_at: string;
}

/**
 * Record a successfully shipped feature to prevent similar ideas
 */
export function recordShippedFeature(
  slug: string,
  name: string,
  description: string,
  keywords?: string[]
): number {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO shipped_features (slug, name, description, keywords, shipped_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  const result = stmt.run(slug, name, description, keywords ? keywords.join(',') : null);
  return result.lastInsertRowid as number;
}

/**
 * Get all shipped features for duplicate prevention
 */
export function getAllShippedFeatures(): ShippedFeature[] {
  const stmt = db.prepare(`
    SELECT * FROM shipped_features ORDER BY shipped_at DESC
  `);
  return stmt.all() as ShippedFeature[];
}

/**
 * Check if a similar feature was already shipped
 * Returns the matching feature if found
 */
export function findSimilarFeature(slug: string): ShippedFeature | null {
  const stmt = db.prepare(`
    SELECT * FROM shipped_features WHERE slug = ?
  `);
  return (stmt.get(slug) as ShippedFeature) || null;
}

// ============ Cycle Process & Phase Tracking ============

/**
 * Update Claude PID for a cycle (for process cleanup on cancel)
 */
export function setCyclePid(cycleId: number, pid: number): void {
  const stmt = db.prepare(`
    UPDATE cycles SET claude_pid = ? WHERE id = ?
  `);
  stmt.run(pid, cycleId);
}

/**
 * Get Claude PID for a cycle
 */
export function getCyclePid(cycleId: number): number | null {
  const stmt = db.prepare(`
    SELECT claude_pid FROM cycles WHERE id = ?
  `);
  const result = stmt.get(cycleId) as { claude_pid: number | null } | undefined;
  return result?.claude_pid || null;
}

/**
 * Update the last completed phase for a cycle
 * Used for recovery after crashes
 */
export function updateCyclePhase(cycleId: number, phase: number): void {
  const stmt = db.prepare(`
    UPDATE cycles SET last_phase = ? WHERE id = ?
  `);
  stmt.run(phase, cycleId);
}

/**
 * Get the last completed phase for a cycle
 */
export function getCyclePhase(cycleId: number): number {
  const stmt = db.prepare(`
    SELECT last_phase FROM cycles WHERE id = ?
  `);
  const result = stmt.get(cycleId) as { last_phase: number } | undefined;
  return result?.last_phase || 0;
}

/**
 * Set error message for a cycle
 */
export function setCycleError(cycleId: number, error: string): void {
  const stmt = db.prepare(`
    UPDATE cycles SET error_message = ? WHERE id = ?
  `);
  stmt.run(error, cycleId);
}

/**
 * Set trailer path for a cycle (for idempotency)
 */
export function setCycleTrailer(cycleId: number, trailerPath: string): void {
  const stmt = db.prepare(`
    UPDATE cycles SET trailer_path = ? WHERE id = ?
  `);
  stmt.run(trailerPath, cycleId);
}

/**
 * Get trailer path for a cycle
 */
export function getCycleTrailer(cycleId: number): string | null {
  const stmt = db.prepare(`
    SELECT trailer_path FROM cycles WHERE id = ?
  `);
  const result = stmt.get(cycleId) as { trailer_path: string | null } | undefined;
  return result?.trailer_path || null;
}

// ============ Transaction Helpers ============

/**
 * Execute a function within a database transaction
 * Rolls back on error, commits on success
 */
export function runTransaction<T>(fn: () => T): T {
  return db.transaction(fn)();
}

/**
 * Atomically start a new cycle with exclusive lock
 * Returns null if a cycle is already active (prevents race condition)
 */
export function startCycleAtomic(): number | null {
  return db.transaction(() => {
    // Check for existing active cycle within the transaction
    const active = getActiveCycle();
    if (active) {
      return null; // Already running
    }

    // Create new cycle
    const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const stmt = db.prepare(`
      INSERT INTO cycles (status, ends_at) VALUES ('planning', ?)
    `);
    const result = stmt.run(endsAt);
    return result.lastInsertRowid as number;
  })();
}

/**
 * Complete a cycle and update all related stats in one transaction
 * This ensures consistency between cycle completion and stats
 */
export function completeCycleAtomic(
  cycleId: number,
  slug: string,
  name: string,
  description: string
): DailyStats {
  return db.transaction(() => {
    // Mark cycle complete
    const completeStmt = db.prepare(`
      UPDATE cycles SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    completeStmt.run(cycleId);

    // Increment features shipped and update last_cycle_end
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const statsStmt = db.prepare(`
      INSERT INTO daily_stats (date, features_shipped, last_cycle_end)
      VALUES (?, 1, ?)
      ON CONFLICT(date) DO UPDATE SET
        features_shipped = features_shipped + 1,
        last_cycle_end = ?
    `);
    statsStmt.run(today, now, now);

    // Record shipped feature
    const featureStmt = db.prepare(`
      INSERT OR REPLACE INTO shipped_features (slug, name, description, shipped_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `);
    featureStmt.run(slug, name, description);

    // Return updated stats
    return getTodayStats();
  })();
}

/**
 * Mark cycle start time for cooldown calculation
 * This is called when a cycle STARTS, not when it ends
 * This ensures cooldown is measured from start, preventing overlap
 */
export function markCycleStarted(): void {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  // Update or create today's stats with the start time
  const stmt = db.prepare(`
    INSERT INTO daily_stats (date, features_shipped, last_cycle_end)
    VALUES (?, 0, ?)
    ON CONFLICT(date) DO UPDATE SET
      last_cycle_end = ?
  `);
  stmt.run(today, now, now);
}

/**
 * Seed initial features that already exist on the site
 * Called once on startup to ensure the brain knows about existing features
 */
export function seedInitialFeatures(): number {
  // Only features that ACTUALLY EXIST on the site
  const initialFeatures = [
    { slug: 'meme', name: 'Meme Generator', description: 'AI-powered meme creation with Gemini' },
    { slug: 'play', name: 'Space Invaders', description: '2D Canvas game with CC mascot shooting aliens' },
    { slug: 'moon', name: 'StarClaude64', description: '3D endless runner with Three.js, dodge asteroids and collect coins' },
    { slug: 'poetry', name: 'Code Poetry Generator', description: 'Transform code into haiku and poetry' },
    { slug: 'watch', name: 'Watch Brain', description: 'Real-time log viewer for the Central Brain' },
    { slug: 'ide', name: 'IDE Mode', description: 'Fake IDE that turns all code into console.log' },
    { slug: 'mood', name: 'Dev Mood Ring', description: 'Analyze code sentiment and developer mood' },
    { slug: 'duck', name: 'Rubber Duck Debugger', description: 'Talk to an AI rubber duck about your code problems' },
    { slug: 'roast', name: 'Code Roast', description: 'Brutal AI roasting of your code' },
    { slug: 'fortune', name: 'Dev Fortune Cookie', description: 'Get programming wisdom and fortunes' },
    { slug: 'karaoke', name: 'Code Karaoke', description: 'Sing along to code-themed lyrics' },
    { slug: 'refactor', name: 'Refactor Roulette', description: 'Random code refactoring suggestions' },
    { slug: 'time', name: 'Time Tracker', description: 'Track your coding time' },
    { slug: 'vj', name: 'VJ Mode', description: 'Live audio-reactive visual generator' },
  ];

  let seeded = 0;
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO shipped_features (slug, name, description)
    VALUES (?, ?, ?)
  `);

  for (const feature of initialFeatures) {
    const result = stmt.run(feature.slug, feature.name, feature.description);
    if (result.changes > 0) seeded++;
  }

  return seeded;
}

// ============ Build Log Helpers ============

export interface BuildLog {
  id: number;
  message: string;
  level: string;
  activity_type: string;
  created_at: string;
}

export type ActivityType = 'build' | 'meme' | 'system';

/**
 * Insert a build log entry
 */
export function insertBuildLog(message: string, level: string = 'info', activityType: ActivityType = 'system'): number {
  const stmt = db.prepare(`
    INSERT INTO build_logs (message, level, activity_type) VALUES (?, ?, ?)
  `);
  const result = stmt.run(message, level, activityType);
  return result.lastInsertRowid as number;
}

/**
 * Get recent build logs (last 24 hours by default)
 */
export function getRecentBuildLogs(hoursBack: number = 24, limit: number = 500): BuildLog[] {
  const stmt = db.prepare(`
    SELECT * FROM build_logs
    WHERE datetime(created_at) > datetime('now', '-' || ? || ' hours')
    ORDER BY created_at DESC
    LIMIT ?
  `);
  const logs = stmt.all(hoursBack, limit) as BuildLog[];
  // Return in chronological order (oldest first)
  return logs.reverse();
}

/**
 * Clean up old build logs (older than specified days)
 */
export function cleanupOldBuildLogs(daysOld: number = 7): number {
  const stmt = db.prepare(`
    DELETE FROM build_logs
    WHERE datetime(created_at) < datetime('now', '-' || ? || ' days')
  `);
  const result = stmt.run(daysOld);
  return result.changes;
}

// ============ Meme Helpers ============

export interface Meme {
  id: number;
  prompt: string;
  description: string;
  caption: string;
  quality_score: number;
  twitter_id: string | null;
  posted_at: string | null;
  skipped_reason: string | null;
  created_at: string;
}

export interface MemeState {
  last_post_time: number;
  daily_count: number;
  daily_reset_date: string | null;
  recent_prompts: string[];
  in_progress: boolean;
}

// Rate limits for meme posting
// Note: Global limit is 15 tweets/day, so meme limit must be lower
// to leave room for announcements, scheduled tweets, and video tweets
export const MEME_RATE_LIMIT = {
  maxDaily: 10, // Max 10 memes/day (leaves 5 slots for other tweets)
  minIntervalMs: 90 * 60 * 1000, // 90 minutes between memes (staggered throughout day)
};

/**
 * Get the current meme state
 */
export function getMemeState(): MemeState {
  const stmt = db.prepare(`SELECT * FROM meme_state WHERE id = 1`);
  const row = stmt.get() as {
    last_post_time: number;
    daily_count: number;
    daily_reset_date: string | null;
    recent_prompts: string;
    in_progress: number;
  } | undefined;

  if (!row) {
    return {
      last_post_time: 0,
      daily_count: 0,
      daily_reset_date: null,
      recent_prompts: [],
      in_progress: false,
    };
  }

  return {
    last_post_time: row.last_post_time,
    daily_count: row.daily_count,
    daily_reset_date: row.daily_reset_date,
    recent_prompts: JSON.parse(row.recent_prompts || '[]'),
    in_progress: row.in_progress === 1,
  };
}

/**
 * Update meme state
 */
export function updateMemeState(update: Partial<MemeState>): void {
  const current = getMemeState();
  const newState = { ...current, ...update };

  const stmt = db.prepare(`
    UPDATE meme_state SET
      last_post_time = ?,
      daily_count = ?,
      daily_reset_date = ?,
      recent_prompts = ?,
      in_progress = ?
    WHERE id = 1
  `);
  stmt.run(
    newState.last_post_time,
    newState.daily_count,
    newState.daily_reset_date,
    JSON.stringify(newState.recent_prompts),
    newState.in_progress ? 1 : 0
  );
}

/**
 * Set meme generation in progress
 */
export function setMemeInProgress(inProgress: boolean): void {
  const stmt = db.prepare(`UPDATE meme_state SET in_progress = ? WHERE id = 1`);
  stmt.run(inProgress ? 1 : 0);
}

/**
 * Insert a new meme record
 */
export function insertMeme(meme: {
  prompt: string;
  description: string;
  caption: string;
  quality_score: number;
  twitter_id?: string;
  posted_at?: string;
  skipped_reason?: string;
}): number {
  const stmt = db.prepare(`
    INSERT INTO memes (prompt, description, caption, quality_score, twitter_id, posted_at, skipped_reason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    meme.prompt,
    meme.description,
    meme.caption,
    meme.quality_score,
    meme.twitter_id || null,
    meme.posted_at || null,
    meme.skipped_reason || null
  );
  return result.lastInsertRowid as number;
}

/**
 * Get recent memes
 */
export function getRecentMemes(limit: number = 10): Meme[] {
  const stmt = db.prepare(`
    SELECT * FROM memes ORDER BY created_at DESC LIMIT ?
  `);
  return stmt.all(limit) as Meme[];
}

/**
 * Get meme stats for today
 */
export function getMemeStats(): {
  daily_count: number;
  daily_limit: number;
  last_post_time: number;
  last_post_at: string | null;
  can_post: boolean;
  next_allowed_in_ms: number;
  recent_memes: Meme[];
  in_progress: boolean;
} {
  const state = getMemeState();
  const today = new Date().toISOString().split('T')[0];

  // Reset daily count if new day
  let dailyCount = state.daily_count;
  if (state.daily_reset_date !== today) {
    dailyCount = 0;
  }

  // Calculate time until next allowed post
  const now = Date.now();
  const timeSinceLastPost = now - state.last_post_time;
  const timeUntilAllowed = Math.max(0, MEME_RATE_LIMIT.minIntervalMs - timeSinceLastPost);

  // Can post if under limit, interval elapsed, and not in progress
  const canPost =
    dailyCount < MEME_RATE_LIMIT.maxDaily &&
    timeSinceLastPost >= MEME_RATE_LIMIT.minIntervalMs &&
    !state.in_progress;

  return {
    daily_count: dailyCount,
    daily_limit: MEME_RATE_LIMIT.maxDaily,
    last_post_time: state.last_post_time,
    last_post_at: state.last_post_time ? new Date(state.last_post_time).toISOString() : null,
    can_post: canPost,
    next_allowed_in_ms: timeUntilAllowed,
    recent_memes: getRecentMemes(5),
    in_progress: state.in_progress,
  };
}

/**
 * Check if we can post a meme
 */
export function canPostMeme(): { allowed: boolean; reason?: string } {
  const state = getMemeState();
  const today = new Date().toISOString().split('T')[0];
  const now = Date.now();

  // Check if generation is already in progress
  if (state.in_progress) {
    return { allowed: false, reason: 'Meme generation already in progress' };
  }

  // Reset daily count if new day
  let dailyCount = state.daily_count;
  if (state.daily_reset_date !== today) {
    dailyCount = 0;
    updateMemeState({ daily_count: 0, daily_reset_date: today });
  }

  // Check daily limit
  if (dailyCount >= MEME_RATE_LIMIT.maxDaily) {
    return { allowed: false, reason: `Daily limit reached (${MEME_RATE_LIMIT.maxDaily}/day)` };
  }

  // Check minimum interval
  const timeSinceLastPost = now - state.last_post_time;
  if (timeSinceLastPost < MEME_RATE_LIMIT.minIntervalMs) {
    const waitMinutes = Math.ceil((MEME_RATE_LIMIT.minIntervalMs - timeSinceLastPost) / 60000);
    return { allowed: false, reason: `Must wait ${waitMinutes} more minutes` };
  }

  return { allowed: true };
}

/**
 * Record a successful meme post
 */
export function recordMemePost(prompt: string): void {
  const state = getMemeState();
  const today = new Date().toISOString().split('T')[0];

  // Reset daily count if new day
  let dailyCount = state.daily_count;
  if (state.daily_reset_date !== today) {
    dailyCount = 0;
  }

  // Update recent prompts (keep last 10)
  const recentPrompts = [prompt, ...state.recent_prompts].slice(0, 10);

  updateMemeState({
    last_post_time: Date.now(),
    daily_count: dailyCount + 1,
    daily_reset_date: today,
    recent_prompts: recentPrompts,
    in_progress: false,
  });
}

// ============ Global Tweet Rate Limiter ============
// Twitter Free tier: 17 tweets per 24 hours
// We use 15 as a conservative limit to avoid hitting the wall

export const GLOBAL_TWEET_LIMIT = {
  maxDaily: 15, // Conservative limit (Twitter allows 17)
  minIntervalMs: 30 * 60 * 1000, // 30 minutes between any tweets
};

export type TweetType = 'meme' | 'announcement' | 'scheduled' | 'video';

interface TweetRateLimitState {
  daily_count: number;
  daily_reset_date: string | null;
  last_tweet_time: number;
}

/**
 * Get global tweet rate limit state
 */
export function getTweetRateLimitState(): TweetRateLimitState {
  const stmt = db.prepare(`SELECT * FROM tweet_rate_limit WHERE id = 1`);
  const row = stmt.get() as {
    daily_count: number;
    daily_reset_date: string | null;
    last_tweet_time: number;
  } | undefined;

  if (!row) {
    return {
      daily_count: 0,
      daily_reset_date: null,
      last_tweet_time: 0,
    };
  }

  return row;
}

/**
 * Check if we can tweet (global rate limit)
 */
export function canTweetGlobally(): { allowed: boolean; reason?: string; daily_count?: number; daily_limit?: number } {
  const state = getTweetRateLimitState();
  const today = new Date().toISOString().split('T')[0];
  const now = Date.now();

  // Reset daily count if new day
  let dailyCount = state.daily_count;
  if (state.daily_reset_date !== today) {
    dailyCount = 0;
    // Update the reset date
    const updateStmt = db.prepare(`UPDATE tweet_rate_limit SET daily_count = 0, daily_reset_date = ? WHERE id = 1`);
    updateStmt.run(today);
  }

  // Check daily limit
  if (dailyCount >= GLOBAL_TWEET_LIMIT.maxDaily) {
    return {
      allowed: false,
      reason: `Daily tweet limit reached (${dailyCount}/${GLOBAL_TWEET_LIMIT.maxDaily})`,
      daily_count: dailyCount,
      daily_limit: GLOBAL_TWEET_LIMIT.maxDaily,
    };
  }

  // Check minimum interval
  const timeSinceLastTweet = now - state.last_tweet_time;
  if (state.last_tweet_time > 0 && timeSinceLastTweet < GLOBAL_TWEET_LIMIT.minIntervalMs) {
    const waitMinutes = Math.ceil((GLOBAL_TWEET_LIMIT.minIntervalMs - timeSinceLastTweet) / 60000);
    return {
      allowed: false,
      reason: `Must wait ${waitMinutes} more minutes between tweets`,
      daily_count: dailyCount,
      daily_limit: GLOBAL_TWEET_LIMIT.maxDaily,
    };
  }

  return {
    allowed: true,
    daily_count: dailyCount,
    daily_limit: GLOBAL_TWEET_LIMIT.maxDaily,
  };
}

/**
 * Record a tweet (call after successful post)
 */
export function recordTweet(tweetId: string, tweetType: TweetType, content?: string): void {
  const today = new Date().toISOString().split('T')[0];
  const now = Date.now();

  // Get current state
  const state = getTweetRateLimitState();
  let dailyCount = state.daily_count;
  if (state.daily_reset_date !== today) {
    dailyCount = 0;
  }

  // Update rate limit state
  const updateStmt = db.prepare(`
    UPDATE tweet_rate_limit SET
      daily_count = ?,
      daily_reset_date = ?,
      last_tweet_time = ?
    WHERE id = 1
  `);
  updateStmt.run(dailyCount + 1, today, now);

  // Log the tweet
  const logStmt = db.prepare(`
    INSERT INTO tweet_log (tweet_id, tweet_type, content) VALUES (?, ?, ?)
  `);
  logStmt.run(tweetId, tweetType, content || null);
}

/**
 * Get global tweet stats
 */
export function getGlobalTweetStats(): {
  daily_count: number;
  daily_limit: number;
  remaining: number;
  can_tweet: boolean;
  last_tweet_time: number;
  last_tweet_at: string | null;
  next_allowed_in_ms: number;
  recent_tweets: Array<{ tweet_id: string; tweet_type: string; created_at: string }>;
} {
  const state = getTweetRateLimitState();
  const today = new Date().toISOString().split('T')[0];
  const now = Date.now();

  // Reset daily count if new day
  let dailyCount = state.daily_count;
  if (state.daily_reset_date !== today) {
    dailyCount = 0;
  }

  // Calculate time until next allowed
  const timeSinceLastTweet = now - state.last_tweet_time;
  const timeUntilAllowed = state.last_tweet_time > 0
    ? Math.max(0, GLOBAL_TWEET_LIMIT.minIntervalMs - timeSinceLastTweet)
    : 0;

  // Get recent tweets
  const recentStmt = db.prepare(`
    SELECT tweet_id, tweet_type, created_at FROM tweet_log
    ORDER BY created_at DESC LIMIT 10
  `);
  const recentTweets = recentStmt.all() as Array<{ tweet_id: string; tweet_type: string; created_at: string }>;

  const canTweet = dailyCount < GLOBAL_TWEET_LIMIT.maxDaily && timeUntilAllowed === 0;

  return {
    daily_count: dailyCount,
    daily_limit: GLOBAL_TWEET_LIMIT.maxDaily,
    remaining: Math.max(0, GLOBAL_TWEET_LIMIT.maxDaily - dailyCount),
    can_tweet: canTweet,
    last_tweet_time: state.last_tweet_time,
    last_tweet_at: state.last_tweet_time ? new Date(state.last_tweet_time).toISOString() : null,
    next_allowed_in_ms: timeUntilAllowed,
    recent_tweets: recentTweets,
  };
}
