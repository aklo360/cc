import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function recordGameplay() {
  console.log('Launching browser...');

  const browser = await puppeteer.launch({
    headless: false, // Show the browser so you can play
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--window-size=1920,1080'],
  });

  const page = await browser.newPage();

  // Navigate to the game
  console.log('Navigating to StarClaude64...');
  await page.goto('https://claudecode.wtf/moon', { waitUntil: 'networkidle2' });

  // Start recording
  const outputPath = path.join(__dirname, 'public', 'footage', 'gameplay.webm');
  console.log(`Recording to: ${outputPath}`);

  const recorder = await page.screencast({
    path: outputPath,
    speed: 1,
  });

  console.log('\n========================================');
  console.log('RECORDING STARTED!');
  console.log('========================================');
  console.log('Play the game in the browser window.');
  console.log('Controls:');
  console.log('  WASD - Move');
  console.log('  Arrow Up/Down - Forward/Back');
  console.log('  Arrow Left/Right - Barrel Roll');
  console.log('  SPACE - Shoot');
  console.log('  SHIFT - Bomb');
  console.log('');
  console.log('Press Ctrl+C in this terminal to stop recording.');
  console.log('========================================\n');

  // Keep recording until user stops
  process.on('SIGINT', async () => {
    console.log('\nStopping recording...');
    await recorder.stop();
    await browser.close();
    console.log(`Recording saved to: ${outputPath}`);
    process.exit(0);
  });

  // Keep the script running
  await new Promise(() => {});
}

recordGameplay().catch(console.error);
