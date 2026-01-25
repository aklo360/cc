/**
 * Test the new Trailer V2 system with REAL page footage
 */

import { generateTrailerV2 } from './src/trailer-v2.js';

async function main() {
  console.log('🎬 TESTING TRAILER V2 - Real Page Footage\n');
  console.log('═'.repeat(60));

  const result = await generateTrailerV2({
    name: 'AI Code Refactor Machine',
    slug: 'refactor',
    description: 'Transform messy code into clean, optimized masterpieces',
    deployUrl: 'https://claudecode.wtf/refactor',
    tagline: 'Paste code. Click. Get clean code.',
  });

  console.log('\n' + '═'.repeat(60));

  if (result.success) {
    console.log('✅ TRAILER V2 GENERATED SUCCESSFULLY!\n');
    console.log('   Video: ' + result.videoPath);
    console.log('   Button clicked: ' + result.captureResult?.buttonText);
    if (result.captureResult?.outputLines) {
      console.log('   Output lines captured: ' + result.captureResult.outputLines.length);
    }
    if (result.videoBase64) {
      const sizeMb = (result.videoBase64.length * 0.75 / 1024 / 1024).toFixed(1);
      console.log('   Size: ~' + sizeMb + ' MB');
    }
  } else {
    console.log('❌ TRAILER V2 FAILED\n');
    console.log('   Error: ' + result.error);
  }
}

main().catch(console.error);
