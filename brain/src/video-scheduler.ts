/**
 * Video Tweet Scheduler - Schedule video tweets over 24 hours
 */

import { db } from './db.js';
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
  const stmt = db.prepare(`
    SELECT * FROM video_scheduled_tweets
    WHERE posted = 0 AND datetime(scheduled_for) <= datetime('now')
    ORDER BY scheduled_for ASC
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
 * Execute any video tweets that are due
 */
export async function executeVideoTweets(): Promise<number> {
  const tweets = getUnpostedVideoTweets();
  if (tweets.length === 0) {
    return 0;
  }

  console.log(`[Video Scheduler] Found ${tweets.length} video tweet(s) due`);

  let posted = 0;
  for (const tweet of tweets) {
    try {
      // Check if video file exists
      if (!fs.existsSync(tweet.video_path)) {
        console.error(`  ✗ Video not found: ${tweet.video_path}`);
        continue;
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
      console.log(`  ✓ Posted: "${tweet.content.slice(0, 50)}..." (${result.id})`);
      posted++;

      // Wait between tweets to avoid rate limits
      if (tweets.indexOf(tweet) < tweets.length - 1) {
        await new Promise((r) => setTimeout(r, 5000));
      }
    } catch (error) {
      console.error(`  ✗ Failed to post video tweet:`, error);
    }
  }

  return posted;
}
