/**
 * StarClaude64 Trailer Generator Agent v4
 *
 * FRAME-PERFECT CAPTURE
 * - Takes screenshot of each frame after forcing a render
 * - Uses page.screenshot() for each frame
 * - Zero dropped frames, perfect 30fps
 */

import puppeteer, { Page, Browser } from 'puppeteer';
import path from 'path';
import { execSync } from 'child_process';
import fs from 'fs';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const FOOTAGE_DIR = path.join(__dirname, '..', 'public', 'footage');
const OUTPUT_DIR = path.join(__dirname, '..', 'out');
const FRAMES_DIR = path.join(__dirname, '..', 'temp', 'frames');

fs.mkdirSync(FOOTAGE_DIR, { recursive: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(FRAMES_DIR, { recursive: true });

const TARGET_FPS = 30;

/**
 * Inject time control into Three.js game AFTER it's loaded
 * This takes control of the animation loop
 */
async function injectTimeControl(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Store original functions
    const originalRAF = window.requestAnimationFrame;
    const originalPerformanceNow = performance.now.bind(performance);
    const originalDateNow = Date.now;

    // Virtual time state
    (window as any).__virtualTime = originalPerformanceNow();
    (window as any).__frameCallbacks = [] as FrameRequestCallback[];
    (window as any).__frameDuration = 1000 / 30;
    (window as any).__timeControlActive = true;

    // Override requestAnimationFrame to queue callbacks
    window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
      if ((window as any).__timeControlActive) {
        (window as any).__frameCallbacks.push(callback);
        return (window as any).__frameCallbacks.length;
      }
      return originalRAF(callback);
    };

    // Override performance.now
    const perfNowOriginal = performance.now;
    performance.now = () => {
      if ((window as any).__timeControlActive) {
        return (window as any).__virtualTime;
      }
      return perfNowOriginal.call(performance);
    };

    // Function to advance one frame
    (window as any).__advanceFrame = () => {
      if (!(window as any).__timeControlActive) return;

      // Advance virtual time
      (window as any).__virtualTime += (window as any).__frameDuration;

      // Execute all queued callbacks
      const callbacks = [...(window as any).__frameCallbacks];
      (window as any).__frameCallbacks = [];

      for (const cb of callbacks) {
        try {
          cb((window as any).__virtualTime);
        } catch (e) {
          console.error('RAF callback error:', e);
        }
      }
    };

    console.log('[TimeControl] Virtual time control activated');
  });
}

/**
 * Records gameplay frame-by-frame
 */
async function recordClipFrameByFrame(
  browser: Browser,
  clipName: string,
  durationSec: number,
  isFirstClip: boolean = false
): Promise<string> {
  console.log(`\n📹 Recording: ${clipName} (${durationSec}s at ${TARGET_FPS}fps)`);

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Navigate to game normally first
  console.log('  Navigating...');
  await page.goto('https://claudecode.wtf/moon', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  // Mute music
  console.log('  Muting music...');
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const btn of btns) {
      if (btn.textContent?.includes('🔊') || btn.textContent?.includes('🔇')) {
        btn.click();
        break;
      }
    }
  });

  // Create frames directory
  const clipFramesDir = path.join(FRAMES_DIR, clipName);
  fs.mkdirSync(clipFramesDir, { recursive: true });

  // Click LAUNCH and wait for game to start
  console.log('  Launching game...');
  const launchBtn = await page.$('button');
  if (launchBtn) {
    await launchBtn.click();
  }

  // Wait for game to fully initialize (2 seconds real time)
  await new Promise(r => setTimeout(r, 2500));

  // NOW inject time control (after game is running)
  console.log('  Injecting time control...');
  await injectTimeControl(page);

  // AI input state
  const keys = new Set<string>();
  const pressKey = async (key: string) => {
    if (!keys.has(key)) {
      keys.add(key);
      await page.keyboard.down(key);
    }
  };
  const releaseKey = async (key: string) => {
    if (keys.has(key)) {
      keys.delete(key);
      await page.keyboard.up(key);
    }
  };

  // Calculate frames
  // Add 8 extra frames (4 head + 4 tail) as buffer for transitions
  const BUFFER_FRAMES = 8;
  const totalFrames = (durationSec * TARGET_FPS) + BUFFER_FRAMES;
  const skipFrames = isFirstClip ? 0 : Math.ceil(1.5 * TARGET_FPS);
  const captureTotal = totalFrames + skipFrames;

  console.log(`  Capturing ${captureTotal} frames (skipping first ${skipFrames})...`);

  // Track virtual position to keep character centered
  let posX = 0; // -1 (left) to 1 (right)
  let posY = 0; // -1 (down) to 1 (up)
  let currentDir: string | null = null;

  let savedCount = 0;
  for (let frame = 0; frame < captureTotal; frame++) {
    // AI inputs - CINEMATIC: keep character more center-frame

    // Shooting - constant for action
    if (frame % 4 === 0) await pressKey(' ');

    // Movement - gentle, with center bias
    if (frame % 15 === 0) {
      // Release current direction
      if (currentDir) {
        await releaseKey(currentDir);
        // Update virtual position based on what we were pressing
        if (currentDir === 'a') posX -= 0.15;
        if (currentDir === 'd') posX += 0.15;
        if (currentDir === 'w') posY += 0.15;
        if (currentDir === 's') posY -= 0.15;
        posX = Math.max(-1, Math.min(1, posX));
        posY = Math.max(-1, Math.min(1, posY));
      }

      // Choose next direction with CENTER BIAS
      // If too far from center, move back toward center
      let nextDir: string | null = null;

      if (Math.abs(posX) > 0.4 || Math.abs(posY) > 0.4) {
        // Return to center
        if (posX > 0.3) nextDir = 'a';
        else if (posX < -0.3) nextDir = 'd';
        else if (posY > 0.3) nextDir = 's';
        else if (posY < -0.3) nextDir = 'w';
      } else {
        // Small random movements when centered
        if (Math.random() < 0.6) { // 60% chance to move
          const dirs = ['w', 'a', 's', 'd'];
          nextDir = dirs[Math.floor(Math.random() * 4)];
        }
      }

      if (nextDir) {
        await pressKey(nextDir);
        currentDir = nextDir;
      } else {
        currentDir = null;
      }
    }

    // Barrel rolls - less frequent, quick
    if (frame % 60 === 30) {
      await pressKey(Math.random() < 0.5 ? 'ArrowLeft' : 'ArrowRight');
    }
    if (frame % 60 === 38) {
      await releaseKey('ArrowLeft'); await releaseKey('ArrowRight');
    }

    // Advance game by one frame
    await page.evaluate(() => {
      if ((window as any).__advanceFrame) {
        (window as any).__advanceFrame();
      }
    });

    // Wait for render to complete
    await new Promise(r => setTimeout(r, 16));

    // Save frame (skip loading frames for non-first clips)
    if (frame >= skipFrames) {
      const frameNum = String(savedCount).padStart(5, '0');
      await page.screenshot({
        path: path.join(clipFramesDir, `frame_${frameNum}.png`),
        type: 'png'
      });
      savedCount++;

      if (savedCount % 30 === 0) {
        process.stdout.write(`\r  Progress: ${savedCount}/${totalFrames} frames`);
      }
    }
  }

  console.log(`\n  Captured ${savedCount} frames`);

  // Cleanup
  for (const key of keys) await page.keyboard.up(key);
  await page.close();

  // Encode to video
  console.log('  Encoding to MP4...');
  const outputPath = path.join(FOOTAGE_DIR, `${clipName}.mp4`);

  try {
    execSync(
      `ffmpeg -y -framerate ${TARGET_FPS} -i "${clipFramesDir}/frame_%05d.png" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p "${outputPath}"`,
      { stdio: 'pipe' }
    );
    console.log(`  ✅ Encoded: ${path.basename(outputPath)}`);
  } catch (e: any) {
    console.error(`  ⚠️ ffmpeg error:`, e.message);
  }

  fs.rmSync(clipFramesDir, { recursive: true, force: true });
  console.log(`  ✅ ${clipName} complete`);
  return outputPath;
}

async function runAgent() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     STARCLAUDE64 CINEMATIC TRAILER GENERATOR v4              ║');
  console.log('║     FRAME-PERFECT 30fps via Screenshot Capture               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  console.log('▸ Step 1: Launching browser...');
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--window-size=1920,1080',
      '--disable-web-security',
      '--autoplay-policy=no-user-gesture-required',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ],
  });

  try {
    console.log('\n▸ Step 2: Recording clips frame-by-frame...');

    const clips = [
      { name: 'clip_action', duration: 3, isFirst: true },
      { name: 'clip_combat', duration: 3, isFirst: false },
      { name: 'clip_barrelroll', duration: 2, isFirst: false },
    ];

    const recordings: string[] = [];
    for (const clip of clips) {
      const clipPath = await recordClipFrameByFrame(browser, clip.name, clip.duration, clip.isFirst);
      recordings.push(clipPath);
    }

    console.log('\n▸ Step 3: Closing browser...');
    await browser.close();

    console.log('\n▸ Step 4: Recorded footage (PERFECT 30fps):');
    for (const rec of recordings) {
      const stats = fs.statSync(rec);
      try {
        const probe = execSync(`ffprobe -v quiet -show_streams "${rec}" 2>&1 | grep avg_frame_rate`, { encoding: 'utf8' });
        console.log(`  - ${path.basename(rec)} (${(stats.size / 1024 / 1024).toFixed(1)} MB) - ${probe.trim()}`);
      } catch {
        console.log(`  - ${path.basename(rec)} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
      }
    }

    console.log('\n▸ Step 5: Rendering trailer with Remotion...');
    try {
      execSync('npm run render', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });

      const outputPath = path.join(OUTPUT_DIR, 'trailer.mp4');
      const stats = fs.statSync(outputPath);

      console.log('');
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║                    🎬 TRAILER COMPLETE!                       ║');
      console.log('╠══════════════════════════════════════════════════════════════╣');
      console.log(`║  Output: video/out/trailer.mp4                               ║`);
      console.log(`║  Size: ${(stats.size / 1024 / 1024).toFixed(1)} MB                                              ║`);
      console.log('╚══════════════════════════════════════════════════════════════╝');
    } catch (e) {
      console.error('  ⚠️ Render failed:', e);
    }

    fs.rmSync(FRAMES_DIR, { recursive: true, force: true });

  } catch (error) {
    console.error('Agent error:', error);
    await browser.close();
    process.exit(1);
  }
}

runAgent();
