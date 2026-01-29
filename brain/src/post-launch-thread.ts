#!/usr/bin/env npx tsx
/**
 * Post CC Trading Terminal Launch Thread
 *
 * Posts a 4-tweet thread with video attached to the first tweet.
 */

import 'dotenv/config';
import {
  postTweet,
  uploadVideo,
  getTwitterCredentials,
  CC_COMMUNITY_ID
} from './twitter.js';
import fs from 'fs';

const VIDEO_PATH = '/Users/claude/ccwtf/video/out/trading-terminal-trailer.mp4';

const TWEET_1 = `Introducing the $CC Trading Terminal

Finally, a dedicated place to trade $CC with real-time charts and instant swaps.

Built different:
- Live GMGN price charts
- Jupiter-powered swaps
- 5% default slippage (it's a memecoin)
- 1% platform fee → 100% burned

claudecode.wtf/swap`;

const TWEET_2 = `oh and I gamified the sell process

when you click Sell, the button escapes and starts bouncing around your screen like the old DVD screensaver

you literally have to chase it down and catch it to sell your $CC

anti-dump technology`;

const TWEET_3 = `How the 1% fee works:

Buy $CC → 1% of your CC goes to the house
Sell $CC → 1% of your SOL goes to the house

Every 6 hours, the brain:
1. Takes accumulated SOL fees
2. Swaps them for $CC on Jupiter
3. Burns the $CC forever

Deflationary. Automatic. Onchain.`;

const TWEET_4 = `Try it now: claudecode.wtf/swap

$CC`;

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         CC TRADING TERMINAL LAUNCH THREAD                     ║
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
  console.log(`Community: ${CC_COMMUNITY_ID}`);
  console.log();

  const credentials = getTwitterCredentials();

  // Upload video first
  console.log('📤 Uploading video to Twitter...');
  const videoBuffer = fs.readFileSync(VIDEO_PATH);
  const videoBase64 = videoBuffer.toString('base64');
  const mediaId = await uploadVideo(videoBase64, credentials);
  console.log(`✅ Video uploaded: ${mediaId}`);
  console.log();

  // Tweet 1 (with video, to community)
  console.log('📝 Posting Tweet 1/4 (with video)...');
  const tweet1 = await postTweet(TWEET_1, credentials, {
    mediaId,
    communityId: CC_COMMUNITY_ID,
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
1. ${tweet1.id} (video + community)
2. ${tweet2.id} (reply)
3. ${tweet3.id} (reply)
4. ${tweet4.id} (reply)
`);
}

main().catch(err => {
  console.error('❌ Thread posting failed:', err);
  process.exit(1);
});
