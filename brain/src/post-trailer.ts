#!/usr/bin/env npx tsx
/**
 * Post Trailer to Twitter
 *
 * Usage:
 *   npx tsx src/post-trailer.ts <video-path> "<tweet-text>"
 *
 * Examples:
 *   npx tsx src/post-trailer.ts recordings/poetry_123.mp4 "just shipped code poetry generator\n\nturns your code into haikus fr\n\nclaudecode.wtf/poetry"
 */

import 'dotenv/config';
import { postTweetWithVideo, getTwitterCredentials, CC_COMMUNITY_ID } from './twitter.js';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║              POST TRAILER TO TWITTER                          ║
╚═══════════════════════════════════════════════════════════════╝

Usage:
  npx tsx src/post-trailer.ts <video-path> "<tweet-text>"

Arguments:
  video-path   Path to the MP4 file
  tweet-text   Tweet content (use \\n for newlines)

Example:
  npx tsx src/post-trailer.ts recordings/poetry_123.mp4 "just shipped code poetry generator\\n\\nturns your code into haikus fr\\n\\nclaudecode.wtf/poetry"
`);
  process.exit(1);
}

const [videoPath, tweetText] = args;

// Resolve video path
const fullVideoPath = path.isAbsolute(videoPath) ? videoPath : path.join(process.cwd(), videoPath);

if (!fs.existsSync(fullVideoPath)) {
  console.error(`❌ Video not found: ${fullVideoPath}`);
  process.exit(1);
}

// Parse newlines in tweet text
const parsedTweet = tweetText.replace(/\\n/g, '\n');

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║              POSTING TRAILER TO TWITTER                       ║
╚═══════════════════════════════════════════════════════════════╝

Video: ${path.basename(fullVideoPath)}
Size:  ${(fs.statSync(fullVideoPath).size / 1024 / 1024).toFixed(2)} MB

Tweet:
${parsedTweet}

Community: ${CC_COMMUNITY_ID}
`);

async function main() {
  try {
    const credentials = getTwitterCredentials();

    // Read video as base64
    const videoBuffer = fs.readFileSync(fullVideoPath);
    const videoBase64 = videoBuffer.toString('base64');

    console.log('📤 Uploading video to Twitter...');

    const result = await postTweetWithVideo(
      parsedTweet,
      videoBase64,
      credentials,
      CC_COMMUNITY_ID
    );

    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║              ✅ TWEET POSTED                                  ║
╚═══════════════════════════════════════════════════════════════╝

Tweet ID: ${result.id}
URL:      https://twitter.com/ClaudeCodeWTF/status/${result.id}
`);
  } catch (error) {
    console.error(`
╔═══════════════════════════════════════════════════════════════╗
║              ❌ TWEET FAILED                                  ║
╚═══════════════════════════════════════════════════════════════╝

Error: ${error}
`);
    process.exit(1);
  }
}

main();
