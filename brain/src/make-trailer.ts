#!/usr/bin/env npx tsx
/**
 * Manual Trailer Generator
 *
 * Usage:
 *   npx tsx src/make-trailer.ts <slug> "<name>" "<description>"
 *
 * Examples:
 *   npx tsx src/make-trailer.ts poetry "Code Poetry Generator" "Turn your code into beautiful haikus"
 *   npx tsx src/make-trailer.ts moon "StarClaude64" "3D endless runner game"
 */

import 'dotenv/config';
import { generateTrailer } from './trailer.js';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);

if (args.length < 3) {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║              MANUAL TRAILER GENERATOR                         ║
╚═══════════════════════════════════════════════════════════════╝

Usage:
  npx tsx src/make-trailer.ts <slug> "<name>" "<description>"

Arguments:
  slug         URL slug (e.g., "poetry", "moon", "play")
  name         Feature name (e.g., "Code Poetry Generator")
  description  What the feature does

Examples:
  npx tsx src/make-trailer.ts poetry "Code Poetry Generator" "Turn your code into beautiful haikus"
  npx tsx src/make-trailer.ts moon "StarClaude64" "3D endless runner through space"

The trailer will be saved to: brain/recordings/<slug>_<timestamp>.mp4
`);
  process.exit(1);
}

const [slug, name, description] = args;
const deployUrl = `https://claudecode.wtf/${slug}`;

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║              GENERATING TRAILER                               ║
╚═══════════════════════════════════════════════════════════════╝

Feature: ${name}
Slug:    /${slug}
URL:     ${deployUrl}
Description: ${description}
`);

async function main() {
  const startTime = Date.now();

  const result = await generateTrailer(
    {
      name,
      slug,
      description,
    },
    deployUrl
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  if (result.success) {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║              ✅ TRAILER COMPLETE                              ║
╚═══════════════════════════════════════════════════════════════╝

Output:   ${result.videoPath}
Duration: ${result.durationSec}s
Time:     ${elapsed}s

To post to Twitter, use:
  npx tsx src/post-trailer.ts "${result.videoPath}" "Your tweet text here"
`);
  } else {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║              ❌ TRAILER FAILED                                ║
╚═══════════════════════════════════════════════════════════════╝

Error: ${result.error}
Time:  ${elapsed}s
`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
