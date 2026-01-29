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

  -- ============ BRAIN 2.0 GAMEFI TABLES ============

  -- Brain wallet state (singleton)
  CREATE TABLE IF NOT EXISTS brain_wallet (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    public_key TEXT NOT NULL,
    encrypted_keypair BLOB NOT NULL,
    sol_balance INTEGER DEFAULT 0,
    cc_balance INTEGER DEFAULT 0,
    total_distributed INTEGER DEFAULT 0,
    last_sync TEXT
  );

  -- Game deployments (extends shipped_features concept for games)
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    game_type TEXT NOT NULL,
    theme TEXT,
    program_id TEXT,
    escrow_pda TEXT,
    config TEXT NOT NULL,
    total_volume INTEGER DEFAULT 0,
    total_fees INTEGER DEFAULT 0,
    total_players INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    deployed_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Game rounds (for crash/jackpot style games)
  CREATE TABLE IF NOT EXISTS game_rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    round_number INTEGER NOT NULL,
    vrf_seed TEXT,
    result TEXT,
    participants INTEGER DEFAULT 0,
    pool_size INTEGER DEFAULT 0,
    started_at TEXT,
    ended_at TEXT,
    FOREIGN KEY (game_id) REFERENCES games(id)
  );
  CREATE INDEX IF NOT EXISTS idx_game_rounds_game_id ON game_rounds(game_id);

  -- Individual bets/plays
  CREATE TABLE IF NOT EXISTS game_bets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    round_id INTEGER,
    wallet TEXT NOT NULL,
    bet_amount INTEGER NOT NULL,
    fee_amount INTEGER NOT NULL,
    bet_choice TEXT,
    outcome TEXT,
    payout_amount INTEGER DEFAULT 0,
    bet_tx TEXT,
    payout_tx TEXT,
    vrf_proof TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id),
    FOREIGN KEY (round_id) REFERENCES game_rounds(id)
  );
  CREATE INDEX IF NOT EXISTS idx_game_bets_game_id ON game_bets(game_id);
  CREATE INDEX IF NOT EXISTS idx_game_bets_wallet ON game_bets(wallet);
  CREATE INDEX IF NOT EXISTS idx_game_bets_created_at ON game_bets(created_at);

  -- Game leaderboard (aggregate stats per wallet per game)
  CREATE TABLE IF NOT EXISTS game_leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    wallet TEXT NOT NULL,
    total_bets INTEGER DEFAULT 0,
    total_wagered INTEGER DEFAULT 0,
    total_won INTEGER DEFAULT 0,
    total_lost INTEGER DEFAULT 0,
    net_profit INTEGER DEFAULT 0,
    biggest_win INTEGER DEFAULT 0,
    win_streak INTEGER DEFAULT 0,
    last_played TEXT,
    UNIQUE(game_id, wallet),
    FOREIGN KEY (game_id) REFERENCES games(id)
  );
  CREATE INDEX IF NOT EXISTS idx_game_leaderboard_game ON game_leaderboard(game_id);
  CREATE INDEX IF NOT EXISTS idx_game_leaderboard_profit ON game_leaderboard(net_profit DESC);

  -- ============ SECURE ESCROW COIN FLIP TABLES ============

  -- Flip commitments for commit-reveal pattern
  -- User must deposit before result is revealed
  CREATE TABLE IF NOT EXISTS flip_commitments (
    id TEXT PRIMARY KEY,
    wallet TEXT NOT NULL,
    bet_amount INTEGER NOT NULL,
    choice TEXT NOT NULL,
    secret TEXT NOT NULL,
    commitment_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    deposit_tx TEXT,
    result TEXT,
    won INTEGER,
    payout_tx TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_flip_commitments_wallet ON flip_commitments(wallet);
  CREATE INDEX IF NOT EXISTS idx_flip_commitments_status ON flip_commitments(status);
  CREATE INDEX IF NOT EXISTS idx_flip_commitments_expires ON flip_commitments(expires_at);

  -- Used transaction signatures for replay protection
  CREATE TABLE IF NOT EXISTS used_tx_signatures (
    signature TEXT PRIMARY KEY,
    commitment_id TEXT NOT NULL,
    used_at TEXT DEFAULT CURRENT_TIMESTAMP
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

// Migrate flip_commitments table for VRF
if (!columnExists('flip_commitments', 'vrf_result')) {
  console.log('  Migrating: Adding vrf_result column to flip_commitments table');
  db.exec('ALTER TABLE flip_commitments ADD COLUMN vrf_result TEXT');
}
if (!columnExists('flip_commitments', 'vrf_proof')) {
  console.log('  Migrating: Adding vrf_proof column to flip_commitments table');
  db.exec('ALTER TABLE flip_commitments ADD COLUMN vrf_proof TEXT');
}
if (!columnExists('flip_commitments', 'vrf_request_id')) {
  console.log('  Migrating: Adding vrf_request_id column to flip_commitments table');
  db.exec('ALTER TABLE flip_commitments ADD COLUMN vrf_request_id TEXT');
}
if (!columnExists('flip_commitments', 'is_fallback')) {
  console.log('  Migrating: Adding is_fallback column to flip_commitments table');
  db.exec('ALTER TABLE flip_commitments ADD COLUMN is_fallback INTEGER DEFAULT 0');
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

// Brain 2.0 GameFi: 1 high-quality game per day
const DAILY_LIMIT = 1; // Maximum games per day
const HOURS_BETWEEN_CYCLES = 24; // Full day between game builds

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
 * Reset and seed shipped features with the actual features on the site
 * This clears old data and inserts only the real features
 */
export function resetShippedFeatures(): number {
  // Clear existing features
  db.prepare('DELETE FROM shipped_features').run();

  // The 6 actual features on claudecode.wtf (ordered by shipped date, oldest first)
  // ccflip is most recent, so it gets the latest timestamp
  const actualFeatures = [
    { slug: 'meme', name: 'Meme Generator', description: 'AI-powered meme creation with Gemini', daysAgo: 30 },
    { slug: 'play', name: 'Space Invaders', description: '2D Canvas game with CC mascot shooting aliens', daysAgo: 25 },
    { slug: 'moon', name: 'StarClaude64', description: '3D endless runner with Three.js, dodge asteroids and collect coins', daysAgo: 20 },
    { slug: 'watch', name: 'Watch Brain', description: 'Real-time log viewer for the Central Brain', daysAgo: 15 },
    { slug: 'vj', name: 'VJ Mode', description: 'Live audio-reactive visual generator with Hydra', daysAgo: 10 },
    { slug: 'ccflip', name: 'CC Flip', description: 'Mainnet coin flip game with 1.96x payout', daysAgo: 0 },
  ];

  const stmt = db.prepare(`
    INSERT INTO shipped_features (slug, name, description, shipped_at)
    VALUES (?, ?, ?, datetime('now', ?))
  `);

  for (const feature of actualFeatures) {
    stmt.run(feature.slug, feature.name, feature.description, `-${feature.daysAgo} days`);
  }

  return actualFeatures.length;
}

/**
 * Seed initial features that already exist on the site
 * Called once on startup to ensure the brain knows about existing features
 */
export function seedInitialFeatures(): number {
  // Check if we already have features
  const existing = db.prepare('SELECT COUNT(*) as count FROM shipped_features').get() as { count: number };
  if (existing.count > 0) {
    return 0; // Already seeded
  }

  return resetShippedFeatures();
}

// ============ Build Log Helpers ============

export interface BuildLog {
  id: number;
  message: string;
  level: string;
  activity_type: string;
  created_at: string;
}

export type ActivityType = 'build' | 'experiment' | 'system' | 'grind' | 'token';

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

// ============ MEME SYSTEM REMOVED IN BRAIN 2.0 ============
// Tables kept for historical data, but functions removed
// See Crypto Lab experiment system for new functionality

// ============ Global Tweet Rate Limiter ============
// Safety cooldown timestamp (kept from legacy system for Twitter rate limit safety)
const SAFETY_COOLDOWN_UNTIL = 0; // No cooldown in Brain 2.0 - was used after account lock incident
// CONSERVATIVE LIMITS after account lock incident
// Twitter Free tier allows 17/day, but we stay well below to appear human-like

export const GLOBAL_TWEET_LIMIT = {
  maxDaily: 6, // Very conservative (Twitter allows 17)
  minIntervalMs: 3 * 60 * 60 * 1000, // 3 hours between any tweets
};

export type TweetType = 'experiment' | 'announcement' | 'scheduled' | 'video' | 'meme' | 'ai_insight';

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
  const now = Date.now();

  // Check 12-hour safety cooldown first (after account lock incident)
  if (now < SAFETY_COOLDOWN_UNTIL) {
    const hoursRemaining = Math.ceil((SAFETY_COOLDOWN_UNTIL - now) / (60 * 60 * 1000));
    return {
      allowed: false,
      reason: `Safety cooldown active (${hoursRemaining}h remaining after account lock incident)`,
      daily_count: 0,
      daily_limit: GLOBAL_TWEET_LIMIT.maxDaily,
    };
  }

  const state = getTweetRateLimitState();
  const today = new Date().toISOString().split('T')[0];

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

// ============ BRAIN 2.0 GAMEFI HELPERS ============

export type GameType = 'coinflip' | 'crash' | 'jackpot' | 'gacha';

export interface Game {
  id: number;
  slug: string;
  name: string;
  game_type: GameType;
  theme: string | null;
  program_id: string | null;
  escrow_pda: string | null;
  config: string;
  total_volume: number;
  total_fees: number;
  total_players: number;
  is_active: number;
  deployed_at: string;
}

export interface GameConfig {
  minBet: number;        // Minimum $CC bet (in lamports)
  maxBet: number;        // Maximum $CC bet (in lamports)
  houseEdgeBps: number;  // House edge in basis points (100 = 1%)
  platformFeeLamports: number;  // SOL fee per play
  rewardsPoolShareBps: number;  // % of fees to rewards pool
}

export interface GameRound {
  id: number;
  game_id: number;
  round_number: number;
  vrf_seed: string | null;
  result: string | null;
  participants: number;
  pool_size: number;
  started_at: string | null;
  ended_at: string | null;
}

export interface GameBet {
  id: number;
  game_id: number;
  round_id: number | null;
  wallet: string;
  bet_amount: number;
  fee_amount: number;
  bet_choice: string | null;
  outcome: string | null;
  payout_amount: number;
  bet_tx: string | null;
  payout_tx: string | null;
  vrf_proof: string | null;
  created_at: string;
}

export interface LeaderboardEntry {
  id: number;
  game_id: number;
  wallet: string;
  total_bets: number;
  total_wagered: number;
  total_won: number;
  total_lost: number;
  net_profit: number;
  biggest_win: number;
  win_streak: number;
  last_played: string | null;
}

/**
 * Create a new game
 */
export function createGame(
  slug: string,
  name: string,
  gameType: GameType,
  config: GameConfig,
  theme?: string
): number {
  const stmt = db.prepare(`
    INSERT INTO games (slug, name, game_type, theme, config)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(slug, name, gameType, theme || null, JSON.stringify(config));
  return result.lastInsertRowid as number;
}

/**
 * Get a game by slug
 */
export function getGameBySlug(slug: string): Game | null {
  const stmt = db.prepare('SELECT * FROM games WHERE slug = ?');
  return (stmt.get(slug) as Game) || null;
}

/**
 * Get a game by ID
 */
export function getGameById(id: number): Game | null {
  const stmt = db.prepare('SELECT * FROM games WHERE id = ?');
  return (stmt.get(id) as Game) || null;
}

/**
 * Get all active games
 */
export function getActiveGames(): Game[] {
  const stmt = db.prepare('SELECT * FROM games WHERE is_active = 1 ORDER BY deployed_at DESC');
  return stmt.all() as Game[];
}

/**
 * Update game on-chain info after deployment
 */
export function updateGameOnChainInfo(gameId: number, programId: string, escrowPda: string): void {
  const stmt = db.prepare(`
    UPDATE games SET program_id = ?, escrow_pda = ? WHERE id = ?
  `);
  stmt.run(programId, escrowPda, gameId);
}

/**
 * Deactivate a game (soft delete)
 */
export function deactivateGame(gameId: number): void {
  const stmt = db.prepare('UPDATE games SET is_active = 0 WHERE id = ?');
  stmt.run(gameId);
}

/**
 * Record a bet
 */
export function recordGameBet(bet: {
  gameId: number;
  roundId?: number;
  wallet: string;
  betAmount: number;
  feeAmount: number;
  betChoice?: string;
  betTx?: string;
}): number {
  const stmt = db.prepare(`
    INSERT INTO game_bets (game_id, round_id, wallet, bet_amount, fee_amount, bet_choice, bet_tx, outcome)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
  `);
  const result = stmt.run(
    bet.gameId,
    bet.roundId || null,
    bet.wallet,
    bet.betAmount,
    bet.feeAmount,
    bet.betChoice || null,
    bet.betTx || null
  );
  return result.lastInsertRowid as number;
}

/**
 * Resolve a bet (update outcome and payout)
 */
export function resolveBet(
  betId: number,
  outcome: 'win' | 'lose',
  payoutAmount: number,
  payoutTx?: string,
  vrfProof?: string
): void {
  const stmt = db.prepare(`
    UPDATE game_bets
    SET outcome = ?, payout_amount = ?, payout_tx = ?, vrf_proof = ?
    WHERE id = ?
  `);
  stmt.run(outcome, payoutAmount, payoutTx || null, vrfProof || null, betId);

  // Update game stats
  const bet = db.prepare('SELECT * FROM game_bets WHERE id = ?').get(betId) as GameBet;
  if (bet) {
    const updateGameStmt = db.prepare(`
      UPDATE games
      SET total_volume = total_volume + ?,
          total_fees = total_fees + ?
      WHERE id = ?
    `);
    updateGameStmt.run(bet.bet_amount, bet.fee_amount, bet.game_id);

    // Update leaderboard
    updateLeaderboard(bet.game_id, bet.wallet, bet.bet_amount, payoutAmount, outcome);
  }
}

/**
 * Update leaderboard entry for a player
 */
function updateLeaderboard(
  gameId: number,
  wallet: string,
  betAmount: number,
  payoutAmount: number,
  outcome: 'win' | 'lose'
): void {
  const netChange = payoutAmount - betAmount;

  const stmt = db.prepare(`
    INSERT INTO game_leaderboard (game_id, wallet, total_bets, total_wagered, total_won, total_lost, net_profit, biggest_win, last_played)
    VALUES (?, ?, 1, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(game_id, wallet) DO UPDATE SET
      total_bets = total_bets + 1,
      total_wagered = total_wagered + ?,
      total_won = total_won + ?,
      total_lost = total_lost + ?,
      net_profit = net_profit + ?,
      biggest_win = MAX(biggest_win, ?),
      last_played = datetime('now')
  `);

  const won = outcome === 'win' ? payoutAmount : 0;
  const lost = outcome === 'lose' ? betAmount : 0;
  const biggestWin = outcome === 'win' ? payoutAmount : 0;

  stmt.run(
    gameId, wallet, betAmount, won, lost, netChange, biggestWin,
    betAmount, won, lost, netChange, biggestWin
  );
}

/**
 * Get leaderboard for a game
 */
export function getGameLeaderboard(gameId: number, limit: number = 10): LeaderboardEntry[] {
  const stmt = db.prepare(`
    SELECT * FROM game_leaderboard
    WHERE game_id = ?
    ORDER BY net_profit DESC
    LIMIT ?
  `);
  return stmt.all(gameId, limit) as LeaderboardEntry[];
}

/**
 * Get player stats for a game
 */
export function getPlayerGameStats(gameId: number, wallet: string): LeaderboardEntry | null {
  const stmt = db.prepare(`
    SELECT * FROM game_leaderboard
    WHERE game_id = ? AND wallet = ?
  `);
  return (stmt.get(gameId, wallet) as LeaderboardEntry) || null;
}

/**
 * Create a new game round (for crash/jackpot)
 */
export function createGameRound(gameId: number): number {
  // Get next round number
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM game_rounds WHERE game_id = ?');
  const count = (countStmt.get(gameId) as { count: number }).count;

  const stmt = db.prepare(`
    INSERT INTO game_rounds (game_id, round_number, started_at)
    VALUES (?, ?, datetime('now'))
  `);
  const result = stmt.run(gameId, count + 1);
  return result.lastInsertRowid as number;
}

/**
 * End a game round
 */
export function endGameRound(
  roundId: number,
  vrfSeed: string,
  result: string,
  participants: number,
  poolSize: number
): void {
  const stmt = db.prepare(`
    UPDATE game_rounds
    SET vrf_seed = ?, result = ?, participants = ?, pool_size = ?, ended_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(vrfSeed, result, participants, poolSize, roundId);
}

/**
 * Get current/active round for a game
 */
export function getCurrentRound(gameId: number): GameRound | null {
  const stmt = db.prepare(`
    SELECT * FROM game_rounds
    WHERE game_id = ? AND ended_at IS NULL
    ORDER BY id DESC LIMIT 1
  `);
  return (stmt.get(gameId) as GameRound) || null;
}

/**
 * Get recent rounds for a game
 */
export function getRecentRounds(gameId: number, limit: number = 10): GameRound[] {
  const stmt = db.prepare(`
    SELECT * FROM game_rounds
    WHERE game_id = ?
    ORDER BY id DESC
    LIMIT ?
  `);
  return stmt.all(gameId, limit) as GameRound[];
}

/**
 * Get bets for a round
 */
export function getRoundBets(roundId: number): GameBet[] {
  const stmt = db.prepare(`
    SELECT * FROM game_bets
    WHERE round_id = ?
    ORDER BY created_at ASC
  `);
  return stmt.all(roundId) as GameBet[];
}

/**
 * Get player's recent bets
 */
export function getPlayerRecentBets(wallet: string, limit: number = 20): GameBet[] {
  const stmt = db.prepare(`
    SELECT * FROM game_bets
    WHERE wallet = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(wallet, limit) as GameBet[];
}

/**
 * Get aggregate game stats
 */
export function getGameStats(gameId: number): {
  totalVolume: number;
  totalFees: number;
  totalPlayers: number;
  totalBets: number;
  avgBetSize: number;
  winRate: number;
} {
  const game = getGameById(gameId);
  if (!game) {
    return { totalVolume: 0, totalFees: 0, totalPlayers: 0, totalBets: 0, avgBetSize: 0, winRate: 0 };
  }

  const statsStmt = db.prepare(`
    SELECT
      COUNT(*) as total_bets,
      COUNT(DISTINCT wallet) as unique_players,
      SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) as wins,
      AVG(bet_amount) as avg_bet
    FROM game_bets
    WHERE game_id = ?
  `);
  const stats = statsStmt.get(gameId) as {
    total_bets: number;
    unique_players: number;
    wins: number;
    avg_bet: number;
  };

  return {
    totalVolume: game.total_volume / 1_000_000,
    totalFees: game.total_fees / 1_000_000_000,  // SOL
    totalPlayers: stats.unique_players || 0,
    totalBets: stats.total_bets || 0,
    avgBetSize: (stats.avg_bet || 0) / 1_000_000,
    winRate: stats.total_bets > 0 ? (stats.wins / stats.total_bets) * 100 : 0,
  };
}

/**
 * Get all games stats summary
 */
export function getAllGamesStats(): {
  totalGames: number;
  activeGames: number;
  totalVolume: number;
  totalFees: number;
  totalPlayers: number;
  gamesByType: Record<GameType, number>;
} {
  const gamesStmt = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
      SUM(total_volume) as volume,
      SUM(total_fees) as fees
    FROM games
  `);
  const gamesStats = gamesStmt.get() as {
    total: number;
    active: number;
    volume: number;
    fees: number;
  };

  const playersStmt = db.prepare('SELECT COUNT(DISTINCT wallet) as count FROM game_bets');
  const players = (playersStmt.get() as { count: number }).count;

  const typeStmt = db.prepare(`
    SELECT game_type, COUNT(*) as count FROM games GROUP BY game_type
  `);
  const types = typeStmt.all() as { game_type: GameType; count: number }[];
  const gamesByType: Record<GameType, number> = {
    coinflip: 0,
    crash: 0,
    jackpot: 0,
    gacha: 0,
  };
  for (const t of types) {
    gamesByType[t.game_type] = t.count;
  }

  return {
    totalGames: gamesStats.total || 0,
    activeGames: gamesStats.active || 0,
    totalVolume: (gamesStats.volume || 0) / 1_000_000,
    totalFees: (gamesStats.fees || 0) / 1_000_000_000,
    totalPlayers: players,
    gamesByType,
  };
}

// ============ SECURE ESCROW COIN FLIP HELPERS ============

export type FlipChoice = 'heads' | 'tails';
export type FlipStatus = 'pending' | 'deposited' | 'resolved' | 'expired';

export interface FlipCommitment {
  id: string;
  wallet: string;
  bet_amount: number;
  choice: FlipChoice;
  secret: string;
  commitment_hash: string;
  expires_at: number;
  status: FlipStatus;
  deposit_tx: string | null;
  result: FlipChoice | null;
  won: number | null;
  payout_tx: string | null;
  created_at: string;
  // VRF fields
  vrf_result: FlipChoice | null;
  vrf_proof: string | null;
  vrf_request_id: string | null;
  is_fallback: number;
}

/**
 * Create a new flip commitment
 * Returns the commitment ID
 */
export function createFlipCommitment(
  id: string,
  wallet: string,
  betAmount: number,
  choice: FlipChoice,
  secret: string,
  commitmentHash: string,
  expiresAt: number,
  vrfData?: {
    vrfResult: FlipChoice;
    vrfProof?: string;
    vrfRequestId?: string;
    isFallback: boolean;
  }
): string {
  const stmt = db.prepare(`
    INSERT INTO flip_commitments (id, wallet, bet_amount, choice, secret, commitment_hash, expires_at, status, vrf_result, vrf_proof, vrf_request_id, is_fallback)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    wallet,
    betAmount,
    choice,
    secret,
    commitmentHash,
    expiresAt,
    vrfData?.vrfResult || null,
    vrfData?.vrfProof || null,
    vrfData?.vrfRequestId || null,
    vrfData?.isFallback ? 1 : 0
  );
  return id;
}

/**
 * Get a flip commitment by ID
 */
export function getFlipCommitment(id: string): FlipCommitment | null {
  const stmt = db.prepare('SELECT * FROM flip_commitments WHERE id = ?');
  return (stmt.get(id) as FlipCommitment) || null;
}

/**
 * Get pending commitment for a wallet (only one allowed at a time)
 */
export function getPendingCommitmentForWallet(wallet: string): FlipCommitment | null {
  const stmt = db.prepare(`
    SELECT * FROM flip_commitments
    WHERE wallet = ? AND status = 'pending' AND expires_at > ?
    ORDER BY created_at DESC LIMIT 1
  `);
  return (stmt.get(wallet, Date.now()) as FlipCommitment) || null;
}

/**
 * Update commitment status to deposited
 */
export function markCommitmentDeposited(id: string, depositTx: string): void {
  const stmt = db.prepare(`
    UPDATE flip_commitments
    SET status = 'deposited', deposit_tx = ?
    WHERE id = ?
  `);
  stmt.run(depositTx, id);
}

/**
 * Resolve a commitment with the result
 */
export function resolveCommitment(
  id: string,
  result: FlipChoice,
  won: boolean,
  payoutTx?: string
): void {
  const stmt = db.prepare(`
    UPDATE flip_commitments
    SET status = 'resolved', result = ?, won = ?, payout_tx = ?
    WHERE id = ?
  `);
  stmt.run(result, won ? 1 : 0, payoutTx || null, id);
}

/**
 * Mark commitment as expired
 */
export function expireCommitment(id: string): void {
  const stmt = db.prepare(`
    UPDATE flip_commitments SET status = 'expired' WHERE id = ?
  `);
  stmt.run(id);
}

/**
 * Expire all pending commitments for a wallet that have passed their expiry time
 * Returns number of commitments expired
 */
export function expireWalletCommitments(wallet: string): number {
  const now = Date.now();
  const stmt = db.prepare(`
    UPDATE flip_commitments
    SET status = 'expired'
    WHERE wallet = ? AND status = 'pending' AND expires_at < ?
  `);
  const result = stmt.run(wallet, now);
  return result.changes;
}

/**
 * Check if a transaction signature has been used
 */
export function isTxSignatureUsed(signature: string): boolean {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM used_tx_signatures WHERE signature = ?');
  const result = stmt.get(signature) as { count: number };
  return result.count > 0;
}

/**
 * Mark a transaction signature as used
 */
export function markTxSignatureUsed(signature: string, commitmentId: string): void {
  const stmt = db.prepare(`
    INSERT INTO used_tx_signatures (signature, commitment_id) VALUES (?, ?)
  `);
  stmt.run(signature, commitmentId);
}

/**
 * Cleanup expired commitments (call periodically)
 * Returns number of commitments expired
 */
export function cleanupExpiredCommitments(): number {
  const now = Date.now();
  const stmt = db.prepare(`
    UPDATE flip_commitments
    SET status = 'expired'
    WHERE status = 'pending' AND expires_at < ?
  `);
  const result = stmt.run(now);
  return result.changes;
}

/**
 * Get flip stats for a wallet
 */
export function getFlipStats(wallet: string): {
  totalFlips: number;
  totalWins: number;
  totalLosses: number;
  totalWagered: number;
  netProfit: number;
} {
  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total_flips,
      SUM(CASE WHEN won = 1 THEN 1 ELSE 0 END) as total_wins,
      SUM(CASE WHEN won = 0 THEN 1 ELSE 0 END) as total_losses,
      SUM(bet_amount) as total_wagered,
      SUM(CASE WHEN won = 1 THEN bet_amount * 0.96 ELSE -bet_amount END) as net_profit
    FROM flip_commitments
    WHERE wallet = ? AND status = 'resolved'
  `);
  const result = stmt.get(wallet) as {
    total_flips: number | null;
    total_wins: number | null;
    total_losses: number | null;
    total_wagered: number | null;
    net_profit: number | null;
  };

  return {
    totalFlips: result.total_flips || 0,
    totalWins: result.total_wins || 0,
    totalLosses: result.total_losses || 0,
    totalWagered: result.total_wagered || 0,
    netProfit: result.net_profit || 0,
  };
}

/**
 * Get recent flips for a wallet
 */
export function getRecentFlips(wallet: string, limit: number = 10): FlipCommitment[] {
  const stmt = db.prepare(`
    SELECT * FROM flip_commitments
    WHERE wallet = ? AND status = 'resolved'
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(wallet, limit) as FlipCommitment[];
}

/**
 * Get daily house loss (positive = house lost money, negative = house profited)
 * Used for circuit breaker to protect bankroll
 */
export function getDailyHouseLoss(): number {
  // Get start of today (UTC midnight)
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).getTime();

  // Calculate net loss from resolved flips today
  // House loses when player wins: payout (bet * 1.96) - deposit (bet) = bet * 0.96
  // House wins when player loses: deposit (bet) - 0 = bet (profit)
  // Net house loss = sum of (player wins * 0.96 * bet) - sum of (player losses * bet)
  const stmt = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN won = 1 THEN bet_amount * 0.96 ELSE 0 END), 0) as payouts,
      COALESCE(SUM(bet_amount), 0) as deposits
    FROM flip_commitments
    WHERE status = 'resolved' AND created_at >= ?
  `);

  const result = stmt.get(todayStart) as { payouts: number; deposits: number };

  // House loss = payouts - deposits
  // If positive, house lost money. If negative, house profited.
  return result.payouts - result.deposits;
}

/**
 * Get daily flip stats for monitoring
 */
export function getDailyFlipStats(): {
  totalFlips: number;
  totalWagered: number;
  houseLoss: number;
  wins: number;
  losses: number;
} {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).getTime();

  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total_flips,
      COALESCE(SUM(bet_amount), 0) as total_wagered,
      COALESCE(SUM(CASE WHEN won = 1 THEN bet_amount * 0.96 ELSE 0 END), 0) as payouts,
      COALESCE(SUM(bet_amount), 0) as deposits,
      COALESCE(SUM(CASE WHEN won = 1 THEN 1 ELSE 0 END), 0) as wins,
      COALESCE(SUM(CASE WHEN won = 0 THEN 1 ELSE 0 END), 0) as losses
    FROM flip_commitments
    WHERE status = 'resolved' AND created_at >= ?
  `);

  const result = stmt.get(todayStart) as {
    total_flips: number;
    total_wagered: number;
    payouts: number;
    deposits: number;
    wins: number;
    losses: number;
  };

  return {
    totalFlips: result.total_flips,
    totalWagered: result.total_wagered,
    houseLoss: result.payouts - result.deposits,
    wins: result.wins,
    losses: result.losses,
  };
}

// ============ DAILY PAYOUT STATS (Circuit Breaker Support) ============

/**
 * Initialize daily payout stats table
 * Tracks payouts per day for circuit breaker protection
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS daily_payout_stats (
    date TEXT PRIMARY KEY,
    total_payouts INTEGER DEFAULT 0,
    payout_count INTEGER DEFAULT 0,
    largest_payout INTEGER DEFAULT 0,
    last_payout_at TEXT
  )
`);

/**
 * Initialize daily transfer stats table
 * Tracks transfers from rewards wallet to game wallet
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS daily_transfer_stats (
    date TEXT PRIMARY KEY,
    total_transferred INTEGER DEFAULT 0,
    transfer_count INTEGER DEFAULT 0,
    last_transfer_at TEXT
  )
`);

export interface DailyPayoutStats {
  date: string;
  totalPayouts: number;  // In $CC (not lamports)
  payoutCount: number;
  largestPayout: number; // In $CC
  lastPayoutAt: string | null;
}

export interface DailyTransferStats {
  date: string;
  totalTransferred: number;  // In $CC
  transferCount: number;
  lastTransferAt: string | null;
}

/**
 * Get daily payout stats for circuit breaker
 */
export function getDailyPayoutStats(date?: string): DailyPayoutStats {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const stmt = db.prepare(`
    SELECT * FROM daily_payout_stats WHERE date = ?
  `);
  const row = stmt.get(targetDate) as {
    date: string;
    total_payouts: number;
    payout_count: number;
    largest_payout: number;
    last_payout_at: string | null;
  } | undefined;

  if (!row) {
    return {
      date: targetDate,
      totalPayouts: 0,
      payoutCount: 0,
      largestPayout: 0,
      lastPayoutAt: null,
    };
  }

  return {
    date: row.date,
    totalPayouts: row.total_payouts / 1_000_000_000, // 9 decimals
    payoutCount: row.payout_count,
    largestPayout: row.largest_payout / 1_000_000_000, // 9 decimals
    lastPayoutAt: row.last_payout_at,
  };
}

/**
 * Record a payout for circuit breaker tracking
 * @param amountLamports - Amount in token lamports (9 decimals)
 */
export function recordPayout(amountLamports: bigint): void {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  const amount = Number(amountLamports);

  const stmt = db.prepare(`
    INSERT INTO daily_payout_stats (date, total_payouts, payout_count, largest_payout, last_payout_at)
    VALUES (?, ?, 1, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      total_payouts = total_payouts + ?,
      payout_count = payout_count + 1,
      largest_payout = MAX(largest_payout, ?),
      last_payout_at = ?
  `);
  stmt.run(today, amount, amount, now, amount, amount, now);
}

/**
 * Get daily transfer stats (rewards → game wallet)
 */
export function getDailyTransferStats(date?: string): DailyTransferStats {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const stmt = db.prepare(`
    SELECT * FROM daily_transfer_stats WHERE date = ?
  `);
  const row = stmt.get(targetDate) as {
    date: string;
    total_transferred: number;
    transfer_count: number;
    last_transfer_at: string | null;
  } | undefined;

  if (!row) {
    return {
      date: targetDate,
      totalTransferred: 0,
      transferCount: 0,
      lastTransferAt: null,
    };
  }

  return {
    date: row.date,
    totalTransferred: row.total_transferred / 1_000_000_000, // 9 decimals
    transferCount: row.transfer_count,
    lastTransferAt: row.last_transfer_at,
  };
}

/**
 * Record a transfer from rewards wallet to game wallet
 * @param amountLamports - Amount in token lamports (9 decimals)
 */
export function recordRewardsTransfer(amountLamports: bigint): void {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  const amount = Number(amountLamports);

  const stmt = db.prepare(`
    INSERT INTO daily_transfer_stats (date, total_transferred, transfer_count, last_transfer_at)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(date) DO UPDATE SET
      total_transferred = total_transferred + ?,
      transfer_count = transfer_count + 1,
      last_transfer_at = ?
  `);
  stmt.run(today, amount, now, amount, now);
}

// ============ IDLE GRIND STATE ============

/**
 * Initialize grind_state table for the Idle Grind System
 * Tracks current activity, timing, and metrics for the continuous grind loop
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS grind_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    current_activity TEXT DEFAULT 'reflecting',
    task_started_at INTEGER DEFAULT 0,
    next_step_at INTEGER DEFAULT 0,
    last_holder_count INTEGER DEFAULT 0,
    last_thought TEXT,
    last_thought_at INTEGER DEFAULT 0,
    recent_activities TEXT DEFAULT '[]'
  );
  INSERT OR IGNORE INTO grind_state (id) VALUES (1);
`);

// ============ REASONING SYSTEM V2: THINKING SESSIONS ============

/**
 * Thinking Sessions - Multi-turn reasoning with exposed logic
 * Each session works through a single problem with visible chain of thought
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS thinking_sessions (
    id TEXT PRIMARY KEY,
    problem TEXT NOT NULL,
    category TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    status TEXT DEFAULT 'thinking',
    thought_count INTEGER DEFAULT 0,
    conclusion TEXT,
    insight_ids TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_thinking_sessions_status ON thinking_sessions(status);
  CREATE INDEX IF NOT EXISTS idx_thinking_sessions_started ON thinking_sessions(started_at);
`);

/**
 * Session Thoughts - The visible reasoning chain
 * Each thought builds on previous, showing the logic
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS session_thoughts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    thought_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    thought_type TEXT DEFAULT 'observation',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES thinking_sessions(id)
  );

  CREATE INDEX IF NOT EXISTS idx_session_thoughts_session ON session_thoughts(session_id);
`);

/**
 * Grind Insights - Cumulative learning system
 * Insights are permanently stored and retrieved in future sessions
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS grind_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    insight TEXT NOT NULL,
    category TEXT NOT NULL,
    confidence TEXT DEFAULT 'hypothesis',
    session_id TEXT,
    supporting_data TEXT,
    times_referenced INTEGER DEFAULT 0,
    last_referenced_at TEXT,
    still_valid INTEGER DEFAULT 1
  );

  CREATE INDEX IF NOT EXISTS idx_grind_insights_category ON grind_insights(category);
  CREATE INDEX IF NOT EXISTS idx_grind_insights_confidence ON grind_insights(confidence);
`);

export type GrindActivityType =
  | 'researching'
  | 'strategizing'
  | 'monitoring'
  | 'scouting'
  | 'planning'
  | 'analyzing'
  | 'reflecting';

export interface GrindState {
  currentActivity: GrindActivityType;
  taskStartedAt: number;
  nextStepAt: number;
  lastHolderCount: number;
  lastThought: string | null;
  lastThoughtAt: number;
  recentActivities: GrindActivityType[];
}

/**
 * Get the current grind state
 */
export function getGrindState(): GrindState {
  const stmt = db.prepare('SELECT * FROM grind_state WHERE id = 1');
  const row = stmt.get() as {
    current_activity: string;
    task_started_at: number;
    next_step_at: number;
    last_holder_count: number;
    last_thought: string | null;
    last_thought_at: number;
    recent_activities: string;
  } | undefined;

  if (!row) {
    return {
      currentActivity: 'reflecting',
      taskStartedAt: 0,
      nextStepAt: 0,
      lastHolderCount: 0,
      lastThought: null,
      lastThoughtAt: 0,
      recentActivities: [],
    };
  }

  let recentActivities: GrindActivityType[] = [];
  try {
    recentActivities = JSON.parse(row.recent_activities || '[]');
  } catch {
    recentActivities = [];
  }

  return {
    currentActivity: row.current_activity as GrindActivityType,
    taskStartedAt: row.task_started_at,
    nextStepAt: row.next_step_at,
    lastHolderCount: row.last_holder_count,
    lastThought: row.last_thought,
    lastThoughtAt: row.last_thought_at,
    recentActivities,
  };
}

/**
 * Update the grind state
 */
export function updateGrindState(updates: Partial<{
  currentActivity: GrindActivityType;
  taskStartedAt: number;
  nextStepAt: number;
  lastHolderCount: number;
  lastThought: string;
  lastThoughtAt: number;
  recentActivities: GrindActivityType[];
}>): void {
  const current = getGrindState();

  const newState = {
    currentActivity: updates.currentActivity ?? current.currentActivity,
    taskStartedAt: updates.taskStartedAt ?? current.taskStartedAt,
    nextStepAt: updates.nextStepAt ?? current.nextStepAt,
    lastHolderCount: updates.lastHolderCount ?? current.lastHolderCount,
    lastThought: updates.lastThought ?? current.lastThought,
    lastThoughtAt: updates.lastThoughtAt ?? current.lastThoughtAt,
    recentActivities: updates.recentActivities ?? current.recentActivities,
  };

  const stmt = db.prepare(`
    UPDATE grind_state SET
      current_activity = ?,
      task_started_at = ?,
      next_step_at = ?,
      last_holder_count = ?,
      last_thought = ?,
      last_thought_at = ?,
      recent_activities = ?
    WHERE id = 1
  `);

  stmt.run(
    newState.currentActivity,
    newState.taskStartedAt,
    newState.nextStepAt,
    newState.lastHolderCount,
    newState.lastThought,
    newState.lastThoughtAt,
    JSON.stringify(newState.recentActivities.slice(-10)) // Keep last 10
  );
}

/**
 * Record a grind thought in the build_logs table with 'grind' activity type
 */
export function recordGrindThought(
  activity: GrindActivityType,
  thought: string
): void {
  const now = Date.now();

  // Insert into build_logs for historical access
  const stmt = db.prepare(`
    INSERT INTO build_logs (message, level, activity_type) VALUES (?, 'info', 'grind')
  `);
  stmt.run(`[${activity.toUpperCase()}] ${thought}`);

  // Update grind state
  const current = getGrindState();
  const recentActivities = [...current.recentActivities, activity].slice(-10);

  updateGrindState({
    lastThought: thought,
    lastThoughtAt: now,
    recentActivities,
  });
}

// ============ THINKING SESSIONS HELPERS ============

export type ThoughtType = 'observation' | 'analysis' | 'hypothesis' | 'conclusion';
export type SessionStatus = 'thinking' | 'concluding' | 'complete' | 'resting';

export interface ThinkingSession {
  id: string;
  problem: string;
  category: string;
  startedAt: number;
  endedAt: number | null;
  status: SessionStatus;
  thoughtCount: number;
  conclusion: string | null;
  insightIds: number[];
}

export interface SessionThought {
  id: number;
  sessionId: string;
  thoughtIndex: number;
  content: string;
  thoughtType: ThoughtType;
  createdAt: number;
}

/**
 * Create a new thinking session
 */
export function createThinkingSession(
  id: string,
  problem: string,
  category: string
): ThinkingSession {
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO thinking_sessions (id, problem, category, started_at, status, thought_count)
    VALUES (?, ?, ?, ?, 'thinking', 0)
  `);
  stmt.run(id, problem, category, now);

  return {
    id,
    problem,
    category,
    startedAt: now,
    endedAt: null,
    status: 'thinking',
    thoughtCount: 0,
    conclusion: null,
    insightIds: [],
  };
}

/**
 * Get a thinking session by ID
 */
export function getThinkingSession(id: string): ThinkingSession | null {
  const stmt = db.prepare('SELECT * FROM thinking_sessions WHERE id = ?');
  const row = stmt.get(id) as {
    id: string;
    problem: string;
    category: string;
    started_at: number;
    ended_at: number | null;
    status: string;
    thought_count: number;
    conclusion: string | null;
    insight_ids: string | null;
  } | undefined;

  if (!row) return null;

  let insightIds: number[] = [];
  try {
    insightIds = row.insight_ids ? JSON.parse(row.insight_ids) : [];
  } catch {
    insightIds = [];
  }

  return {
    id: row.id,
    problem: row.problem,
    category: row.category,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    status: row.status as SessionStatus,
    thoughtCount: row.thought_count,
    conclusion: row.conclusion,
    insightIds,
  };
}

/**
 * Get the current active session (if any)
 */
export function getActiveThinkingSession(): ThinkingSession | null {
  const stmt = db.prepare(`
    SELECT * FROM thinking_sessions
    WHERE status IN ('thinking', 'concluding')
    ORDER BY started_at DESC LIMIT 1
  `);
  const row = stmt.get() as {
    id: string;
    problem: string;
    category: string;
    started_at: number;
    ended_at: number | null;
    status: string;
    thought_count: number;
    conclusion: string | null;
    insight_ids: string | null;
  } | undefined;

  if (!row) return null;

  let insightIds: number[] = [];
  try {
    insightIds = row.insight_ids ? JSON.parse(row.insight_ids) : [];
  } catch {
    insightIds = [];
  }

  return {
    id: row.id,
    problem: row.problem,
    category: row.category,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    status: row.status as SessionStatus,
    thoughtCount: row.thought_count,
    conclusion: row.conclusion,
    insightIds,
  };
}

/**
 * Update session status
 */
export function updateSessionStatus(
  id: string,
  status: SessionStatus,
  conclusion?: string,
  insightIds?: number[]
): void {
  const endedAt = status === 'complete' ? Date.now() : null;
  const stmt = db.prepare(`
    UPDATE thinking_sessions
    SET status = ?, ended_at = ?, conclusion = ?, insight_ids = ?
    WHERE id = ?
  `);
  stmt.run(
    status,
    endedAt,
    conclusion || null,
    insightIds ? JSON.stringify(insightIds) : null,
    id
  );
}

/**
 * Add a thought to a session
 */
export function addSessionThought(
  sessionId: string,
  content: string,
  thoughtType: ThoughtType = 'observation'
): SessionThought {
  const now = Date.now();

  // Get current thought count
  const session = getThinkingSession(sessionId);
  const thoughtIndex = (session?.thoughtCount || 0) + 1;

  // Insert thought
  const stmt = db.prepare(`
    INSERT INTO session_thoughts (session_id, thought_index, content, thought_type, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(sessionId, thoughtIndex, content, thoughtType, now);

  // Update session thought count
  const updateStmt = db.prepare(`
    UPDATE thinking_sessions SET thought_count = ? WHERE id = ?
  `);
  updateStmt.run(thoughtIndex, sessionId);

  return {
    id: result.lastInsertRowid as number,
    sessionId,
    thoughtIndex,
    content,
    thoughtType,
    createdAt: now,
  };
}

/**
 * Get all thoughts for a session
 */
export function getSessionThoughts(sessionId: string): SessionThought[] {
  const stmt = db.prepare(`
    SELECT * FROM session_thoughts
    WHERE session_id = ?
    ORDER BY thought_index ASC
  `);
  const rows = stmt.all(sessionId) as Array<{
    id: number;
    session_id: string;
    thought_index: number;
    content: string;
    thought_type: string;
    created_at: number;
  }>;

  return rows.map(row => ({
    id: row.id,
    sessionId: row.session_id,
    thoughtIndex: row.thought_index,
    content: row.content,
    thoughtType: row.thought_type as ThoughtType,
    createdAt: row.created_at,
  }));
}

/**
 * Get recent completed sessions
 */
export function getRecentSessions(limit: number = 10): ThinkingSession[] {
  const stmt = db.prepare(`
    SELECT * FROM thinking_sessions
    WHERE status = 'complete'
    ORDER BY ended_at DESC
    LIMIT ?
  `);
  const rows = stmt.all(limit) as Array<{
    id: string;
    problem: string;
    category: string;
    started_at: number;
    ended_at: number | null;
    status: string;
    thought_count: number;
    conclusion: string | null;
    insight_ids: string | null;
  }>;

  return rows.map(row => {
    let insightIds: number[] = [];
    try {
      insightIds = row.insight_ids ? JSON.parse(row.insight_ids) : [];
    } catch {
      insightIds = [];
    }

    return {
      id: row.id,
      problem: row.problem,
      category: row.category,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      status: row.status as SessionStatus,
      thoughtCount: row.thought_count,
      conclusion: row.conclusion,
      insightIds,
    };
  });
}

// ============ GRIND INSIGHTS HELPERS ============

export type InsightConfidence = 'hypothesis' | 'tested' | 'proven';

export interface GrindInsight {
  id: number;
  createdAt: string;
  insight: string;
  category: string;
  confidence: InsightConfidence;
  sessionId: string | null;
  supportingData: Record<string, unknown> | null;
  timesReferenced: number;
  lastReferencedAt: string | null;
  stillValid: boolean;
}

/**
 * Store a new insight
 */
export function storeInsight(
  insight: string,
  category: string,
  sessionId?: string,
  supportingData?: Record<string, unknown>
): number {
  const stmt = db.prepare(`
    INSERT INTO grind_insights (insight, category, session_id, supporting_data, confidence)
    VALUES (?, ?, ?, ?, 'hypothesis')
  `);
  const result = stmt.run(
    insight,
    category,
    sessionId || null,
    supportingData ? JSON.stringify(supportingData) : null
  );
  return result.lastInsertRowid as number;
}

/**
 * Get insights by category
 */
export function getInsightsByCategory(category: string): GrindInsight[] {
  const stmt = db.prepare(`
    SELECT * FROM grind_insights
    WHERE category = ? AND still_valid = 1
    ORDER BY times_referenced DESC, created_at DESC
  `);
  const rows = stmt.all(category) as Array<{
    id: number;
    created_at: string;
    insight: string;
    category: string;
    confidence: string;
    session_id: string | null;
    supporting_data: string | null;
    times_referenced: number;
    last_referenced_at: string | null;
    still_valid: number;
  }>;

  return rows.map(row => ({
    id: row.id,
    createdAt: row.created_at,
    insight: row.insight,
    category: row.category,
    confidence: row.confidence as InsightConfidence,
    sessionId: row.session_id,
    supportingData: row.supporting_data ? JSON.parse(row.supporting_data) : null,
    timesReferenced: row.times_referenced,
    lastReferencedAt: row.last_referenced_at,
    stillValid: row.still_valid === 1,
  }));
}

/**
 * Get all valid insights
 */
export function getAllInsights(): GrindInsight[] {
  const stmt = db.prepare(`
    SELECT * FROM grind_insights
    WHERE still_valid = 1
    ORDER BY times_referenced DESC, created_at DESC
  `);
  const rows = stmt.all() as Array<{
    id: number;
    created_at: string;
    insight: string;
    category: string;
    confidence: string;
    session_id: string | null;
    supporting_data: string | null;
    times_referenced: number;
    last_referenced_at: string | null;
    still_valid: number;
  }>;

  return rows.map(row => ({
    id: row.id,
    createdAt: row.created_at,
    insight: row.insight,
    category: row.category,
    confidence: row.confidence as InsightConfidence,
    sessionId: row.session_id,
    supportingData: row.supporting_data ? JSON.parse(row.supporting_data) : null,
    timesReferenced: row.times_referenced,
    lastReferencedAt: row.last_referenced_at,
    stillValid: row.still_valid === 1,
  }));
}

/**
 * Mark insight as referenced (tracks usage)
 */
export function referenceInsight(insightId: number): void {
  const stmt = db.prepare(`
    UPDATE grind_insights
    SET times_referenced = times_referenced + 1, last_referenced_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(insightId);
}

/**
 * Update insight confidence level
 */
export function updateInsightConfidence(insightId: number, confidence: InsightConfidence): void {
  const stmt = db.prepare(`UPDATE grind_insights SET confidence = ? WHERE id = ?`);
  stmt.run(confidence, insightId);
}

/**
 * Invalidate an insight (mark as no longer valid)
 */
export function invalidateInsight(insightId: number): void {
  const stmt = db.prepare(`UPDATE grind_insights SET still_valid = 0 WHERE id = ?`);
  stmt.run(insightId);
}

/**
 * Get insight count by confidence level
 */
export function getInsightStats(): { total: number; hypothesis: number; tested: number; proven: number } {
  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN confidence = 'hypothesis' THEN 1 ELSE 0 END) as hypothesis,
      SUM(CASE WHEN confidence = 'tested' THEN 1 ELSE 0 END) as tested,
      SUM(CASE WHEN confidence = 'proven' THEN 1 ELSE 0 END) as proven
    FROM grind_insights
    WHERE still_valid = 1
  `);
  const row = stmt.get() as { total: number; hypothesis: number; tested: number; proven: number };
  return row;
}
