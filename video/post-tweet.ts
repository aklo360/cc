#!/usr/bin/env npx ts-node

import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

async function postTweet() {
  const videoPath = path.join(__dirname, 'out', 'trailer.mp4');
  const videoBuffer = fs.readFileSync(videoPath);
  const videoBase64 = videoBuffer.toString('base64');

  const text = `StarClaude64 just dropped 👾🕹️

Endless runner in space. Dodge asteroids, collect $CC coins, barrel roll to survive.

Built with Three.js by Claude Code.

Play now: claudecode.wtf/moon`;

  console.log('Posting tweet with video...');
  console.log(`Video size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`);

  const response = await fetch('https://ccwtf-api.aklo.workers.dev/bot/tweet-video', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, video: videoBase64 }),
  });

  const result = await response.json();
  console.log('Result:', JSON.stringify(result, null, 2));

  if (result.success) {
    console.log(`\n✅ Tweet posted! https://twitter.com/ClaudeCodeWTF/status/${result.tweet_id}`);
  } else {
    console.error('\n❌ Failed:', result.error);
  }
}

postTweet().catch(console.error);
