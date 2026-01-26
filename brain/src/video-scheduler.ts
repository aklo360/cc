/**
 * Video Tweet Scheduler - Schedule video tweets over 24 hours
 */

import { db, canTweetGlobally, recordTweet } from './db.js';
import { postTweetWithVideo, getTwitterCredentials } from './twitter.js';
import fs from 'fs';
import path from 'path';

const COMMUNITY_ID = '2014131779628618154';

// Create video_scheduled_tweets table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS video_scheduled_tweets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_path TEXT NOT NULL,
    content TEXT NOT NULL,
    scheduled_for TEXT NOT NULL,
    posted INTEGER DEFAULT 0,
    twitter_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

export interface VideoScheduledTweet {
  id: number;
  video_path: string;
  content: string;
  scheduled_for: string;
  posted: number;
  twitter_id: string | null;
  created_at: string;
}

export function scheduleVideoTweet(videoPath: string, content: string, scheduledFor: Date): number {
  const stmt = db.prepare(`
    INSERT INTO video_scheduled_tweets (video_path, content, scheduled_for)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(videoPath, content, scheduledFor.toISOString());
  return result.lastInsertRowid as number;
}

export function getUnpostedVideoTweets(): VideoScheduledTweet[] {
  // Only get tweets that are due but not more than 30 minutes overdue
  // This prevents posting a flood of tweets after a restart
  const stmt = db.prepare(`
    SELECT * FROM video_scheduled_tweets
    WHERE posted = 0
      AND datetime(scheduled_for) <= datetime('now')
      AND datetime(scheduled_for) >= datetime('now', '-30 minutes')
    ORDER BY scheduled_for ASC
    LIMIT 1
  `);
  return stmt.all() as VideoScheduledTweet[];
}

export function markVideoTweetPosted(id: number, twitterId: string): void {
  const stmt = db.prepare(`
    UPDATE video_scheduled_tweets SET posted = 1, twitter_id = ? WHERE id = ?
  `);
  stmt.run(twitterId, id);
}

export function getPendingVideoTweets(): VideoScheduledTweet[] {
  const stmt = db.prepare(`
    SELECT * FROM video_scheduled_tweets
    WHERE posted = 0
    ORDER BY scheduled_for ASC
  `);
  return stmt.all() as VideoScheduledTweet[];
}

export function clearVideoSchedule(): void {
  db.exec(`DELETE FROM video_scheduled_tweets WHERE posted = 0`);
}

/**
 * Mark old unposted tweets as skipped (more than 1 hour overdue)
 * This prevents them from accumulating and being posted in bulk later
 */
export function cleanupOldScheduledTweets(): number {
  const stmt = db.prepare(`
    UPDATE video_scheduled_tweets
    SET posted = -1
    WHERE posted = 0
      AND datetime(scheduled_for) < datetime('now', '-1 hour')
  `);
  const result = stmt.run();
  return result.changes;
}

/**
 * Execute any video tweets that are due
 * Respects global Twitter rate limits (15 tweets/day, 30 min between tweets)
 */
export async function executeVideoTweets(): Promise<number> {
  // Check global rate limit first
  const globalCheck = canTweetGlobally();
  if (!globalCheck.allowed) {
    const pending = getPendingVideoTweets();
    if (pending.length > 0) {
      console.log(`[Video Scheduler] Global limit: ${globalCheck.reason} (${pending.length} video tweets pending)`);
    }
    return 0;
  }

  const tweets = getUnpostedVideoTweets();
  if (tweets.length === 0) {
    return 0;
  }

  // Only post ONE tweet per execution to respect global rate limits
  const tweet = tweets[0];
  console.log(`[Video Scheduler] Posting 1 video tweet (${getPendingVideoTweets().length} total pending)`);

  try {
    // Check if video file exists
    if (!fs.existsSync(tweet.video_path)) {
      console.error(`  ✗ Video not found: ${tweet.video_path}`);
      return 0;
    }

    // Read video
    const videoBuffer = fs.readFileSync(tweet.video_path);
    const videoBase64 = videoBuffer.toString('base64');
    const sizeMb = (videoBuffer.length / 1024 / 1024).toFixed(1);
    console.log(`  📹 Uploading ${path.basename(tweet.video_path)} (${sizeMb} MB)...`);

    // Post tweet with video
    const credentials = getTwitterCredentials();
    const result = await postTweetWithVideo(
      tweet.content,
      videoBase64,
      credentials,
      COMMUNITY_ID
    );

    markVideoTweetPosted(tweet.id, result.id);

    // Record in global tweet rate limiter
    recordTweet(result.id, 'video', tweet.content);

    console.log(`  ✓ Posted: "${tweet.content.slice(0, 50)}..." (${result.id})`);
    return 1;
  } catch (error) {
    console.error(`  ✗ Failed to post video tweet:`, error);
    return 0;
  }
}
