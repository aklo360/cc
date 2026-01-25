import { extractFeatureManifest } from './src/manifest.js';
import { generateTrailer } from './src/trailer.js';

async function main() {
  const deployUrl = 'https://claudecode.wtf/refactor';
  const name = 'AI Code Refactor Machine';
  const slug = 'refactor';
  const description = 'Transform messy code into clean, optimized masterpieces with AI';

  console.log('🎬 Testing trailer generation for /refactor\n');

  // Step 1: Extract manifest (ground truth)
  console.log('📋 Step 1: Extracting feature manifest...');
  const manifest = await extractFeatureManifest(deployUrl, name, slug);

  console.log('\n📊 Manifest extracted:');
  console.log('   Page title: ' + manifest.pageTitle);
  console.log('   Buttons: ' + manifest.buttons.join(', '));
  console.log('   Inputs: ' + manifest.inputs.join(', '));
  console.log('   Headings: ' + manifest.headings.slice(0,3).join(', '));
  console.log('   Interaction type: ' + manifest.interactionType);
  console.log('   Rendering type: ' + manifest.renderingType);
  if (manifest.capturedOutputLines) {
    console.log('   Captured output: ' + manifest.capturedOutputLines.length + ' lines');
    manifest.capturedOutputLines.forEach((line, i) => {
      console.log('     ' + (i+1) + '. ' + line.slice(0, 80) + '...');
    });
  }

  // Step 2: Generate trailer
  console.log('\n🎥 Step 2: Generating trailer with Remotion...');
  const result = await generateTrailer({
    name,
    slug,
    description,
    manifest
  }, deployUrl);

  if (result.success) {
    console.log('\n✅ Trailer generated successfully!');
    console.log('   Path: ' + result.videoPath);
    console.log('   Duration: ' + result.durationSec + 's');
    if (result.videoBase64) {
      const sizeMb = (result.videoBase64.length / 1024 / 1024 * 0.75).toFixed(1);
      console.log('   Size: ~' + sizeMb + ' MB');
    }
  } else {
    console.log('\n❌ Trailer generation failed: ' + result.error);
  }
}

main().catch(console.error);
