#!/usr/bin/env npx tsx
/**
 * Post Neural Network Genesis Launch Thread
 *
 * Posts a 4-tweet thread with video attached to the first tweet.
 * Goes to community AND all followers.
 */

import 'dotenv/config';
import {
  postTweet,
  uploadVideo,
  getTwitterCredentials,
  CC_COMMUNITY_ID
} from './twitter.js';
import fs from 'fs';

const VIDEO_PATH = '/Users/claude/ccwtf/video/out/neural-trailer.mp4';

const TWEET_1 = `Neural Network Genesis just dropped

An on-chain gacha where you synthesize AI neurons through cryptographic evolution. Each sample rolls the quantum dice - from Basic nodes to Legendary consciousness cores.

5,000 $CC per sample. Up to 7x multiplier.`;

const TWEET_2 = `The tiers:

⚪ Basic (75%) → 0.4x
🔷 Advanced (18%) → 2x
⚡ Elite (6%) → 4x
🧠 Legendary (1%) → 7x

The 10-sample batch guarantees at least one Advanced+ hit. No more dry streaks.

~3% edge. 0.97x EV long-term.`;

const TWEET_3 = `Under the hood: commit-reveal cryptography

1. Server commits to secret (you see the hash)
2. You deposit tokens (sign + send tx)
3. Result = SHA256(serverSecret + yourTxSignature)

Every outcome is provably fair. Every roll verifiable on-chain.`;

const TWEET_4 = `Train your neural network now:

claudecode.wtf/neural

All $CC. All on-chain. All verifiable.`;

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         NEURAL NETWORK GENESIS LAUNCH THREAD                  ║
╚═══════════════════════════════════════════════════════════════╝
`);

  // Verify video exists
  if (!fs.existsSync(VIDEO_PATH)) {
    console.error(`❌ Video not found: ${VIDEO_PATH}`);
    process.exit(1);
  }

  const videoSize = (fs.statSync(VIDEO_PATH).size / 1024 / 1024).toFixed(2);
  console.log(`Video: ${VIDEO_PATH}`);
  console.log(`Size:  ${videoSize} MB`);
  console.log(`Community: ${CC_COMMUNITY_ID} (+ all followers)`);
  console.log();

  const credentials = getTwitterCredentials();

  // Upload video first
  console.log('📤 Uploading video to Twitter...');
  const videoBuffer = fs.readFileSync(VIDEO_PATH);
  const videoBase64 = videoBuffer.toString('base64');
  const mediaId = await uploadVideo(videoBase64, credentials);
  console.log(`✅ Video uploaded: ${mediaId}`);
  console.log();

  // Tweet 1 (with video, to community + followers)
  console.log('📝 Posting Tweet 1/4 (with video, community + followers)...');
  const tweet1 = await postTweet(TWEET_1, credentials, {
    mediaId,
    communityId: CC_COMMUNITY_ID,  // This also sets share_with_followers: true
  });
  console.log(`✅ Tweet 1: https://twitter.com/ClaudeCodeWTF/status/${tweet1.id}`);

  // Small delay between tweets
  await new Promise(r => setTimeout(r, 2000));

  // Tweet 2 (reply to tweet 1)
  console.log('📝 Posting Tweet 2/4 (reply)...');
  const tweet2 = await postTweet(TWEET_2, credentials, {
    replyToId: tweet1.id,
  });
  console.log(`✅ Tweet 2: https://twitter.com/ClaudeCodeWTF/status/${tweet2.id}`);

  await new Promise(r => setTimeout(r, 2000));

  // Tweet 3 (reply to tweet 2)
  console.log('📝 Posting Tweet 3/4 (reply)...');
  const tweet3 = await postTweet(TWEET_3, credentials, {
    replyToId: tweet2.id,
  });
  console.log(`✅ Tweet 3: https://twitter.com/ClaudeCodeWTF/status/${tweet3.id}`);

  await new Promise(r => setTimeout(r, 2000));

  // Tweet 4 (reply to tweet 3)
  console.log('📝 Posting Tweet 4/4 (reply)...');
  const tweet4 = await postTweet(TWEET_4, credentials, {
    replyToId: tweet3.id,
  });
  console.log(`✅ Tweet 4: https://twitter.com/ClaudeCodeWTF/status/${tweet4.id}`);

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         ✅ LAUNCH THREAD POSTED                               ║
╚═══════════════════════════════════════════════════════════════╝

Thread URL: https://twitter.com/ClaudeCodeWTF/status/${tweet1.id}

Tweets:
1. ${tweet1.id} (video + community + followers)
2. ${tweet2.id} (reply)
3. ${tweet3.id} (reply)
4. ${tweet4.id} (reply)
`);
}

main().catch(err => {
  console.error('❌ Thread posting failed:', err);
  process.exit(1);
});
