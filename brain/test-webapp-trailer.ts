/**
 * Test the Webapp Trailer - Exact UI recreation
 */

import { generateWebappTrailer } from './src/trailer-webapp.js';

async function main() {
  console.log('🎬 TESTING WEBAPP TRAILER - Exact UI Recreation\n');
  console.log('═'.repeat(60));

  const result = await generateWebappTrailer({
    name: 'AI Code Refactor Machine',
    slug: 'refactor',
    description: 'Transform messy code into clean, optimized masterpieces',
    deployUrl: 'https://claudecode.wtf/refactor',
    tagline: 'Paste → Click → Clean Code',
  });

  console.log('\n' + '═'.repeat(60));

  if (result.success) {
    console.log('✅ WEBAPP TRAILER GENERATED!\n');
    console.log('   Video: ' + result.videoPath);
    if (result.videoBase64) {
      const sizeMb = (result.videoBase64.length * 0.75 / 1024 / 1024).toFixed(1);
      console.log('   Size: ~' + sizeMb + ' MB');
    }
    console.log('\n   Manifest used:');
    console.log('   - Buttons: ' + result.manifest?.buttons.join(', '));
    console.log('   - Captured output: ' + (result.manifest?.capturedOutputLines?.length || 0) + ' lines');
  } else {
    console.log('❌ FAILED: ' + result.error);
  }
}

main().catch(console.error);
