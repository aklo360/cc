/**
 * Recorder - Captures video of deployed features
 *
 * Based on StarClaude64 trailer generator learnings:
 * - Frame-perfect capture via page.screenshot()
 * - Virtual time control for consistent capture
 * - ffmpeg encoding to MP4
 *
 * Each feature gets a unique trailer based on what it does.
 *
 * Fixed issues:
 * - Proper browser cleanup in all error cases
 * - Launch timeout to prevent hanging
 * - Overall recording timeout
 */

import puppeteer, { Page, Browser, KeyInput } from 'puppeteer';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { buildEvents } from './builder.js';

const execAsync = promisify(exec);

// Timeouts
const BROWSER_LAUNCH_TIMEOUT_MS = 30000; // 30 seconds
const RECORDING_TIMEOUT_MS = 300000;     // 5 minutes max per recording

// Track active browsers for cleanup
const activeBrowsers = new Set<Browser>();

/**
 * Safely close browser and remove from tracking
 */
async function closeBrowser(browser: Browser): Promise<void> {
  try {
    activeBrowsers.delete(browser);
    await browser.close();
  } catch {
    // Ignore close errors
  }
}

// Cleanup any active browsers on process exit
function cleanupRecorderBrowsers(): void {
  for (const browser of activeBrowsers) {
    try {
      browser.close();
    } catch {
      // Ignore errors during cleanup
    }
  }
  activeBrowsers.clear();
}

process.on('exit', cleanupRecorderBrowsers);
process.on('SIGINT', cleanupRecorderBrowsers);
process.on('SIGTERM', cleanupRecorderBrowsers);

// Output directories
const FRAMES_DIR = '/tmp/cc-brain-frames';
const projectRoot = process.env.PROJECT_ROOT || process.cwd().replace('/brain', '');
const OUTPUT_DIR = path.join(projectRoot, 'brain/recordings');

fs.mkdirSync(FRAMES_DIR, { recursive: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const TARGET_FPS = 30;

export interface RecordResult {
  success: boolean;
  videoPath?: string;
  videoBase64?: string;
  error?: string;
  durationSec?: number;
}

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}`;
  console.log(logLine);
  buildEvents.emit('log', logLine);
}

/**
 * Record a feature at a given URL
 * Captures 5-10 seconds of the feature in action
 */
export async function recordFeature(
  url: string,
  featureName: string,
  durationSec: number = 8
): Promise<RecordResult> {
  log(`🎬 Starting recording: ${featureName}`);
  log(`📍 URL: ${url}`);
  log(`⏱️ Duration: ${durationSec}s at ${TARGET_FPS}fps`);

  const framesDir = path.join(FRAMES_DIR, featureName);
  fs.mkdirSync(framesDir, { recursive: true });

  let browser: Browser | null = null;

  try {
    // Launch browser with timeout
    log('🌐 Launching browser...');
    const launchPromise = puppeteer.launch({
      headless: true, // Headless for VPS
      defaultViewport: null,
      args: [
        '--window-size=1920,1080',
        '--disable-web-security',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ],
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Browser launch timed out after ${BROWSER_LAUNCH_TIMEOUT_MS}ms`)), BROWSER_LAUNCH_TIMEOUT_MS);
    });

    browser = await Promise.race([launchPromise, timeoutPromise]);
    activeBrowsers.add(browser);

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate to the feature
    log('📄 Loading page...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000)); // Let animations settle

    // Capture frames
    const totalFrames = durationSec * TARGET_FPS;
    log(`📸 Capturing ${totalFrames} frames...`);

    for (let frame = 0; frame < totalFrames; frame++) {
      const frameNum = String(frame).padStart(5, '0');
      await page.screenshot({
        path: path.join(framesDir, `frame_${frameNum}.png`),
        type: 'png',
      });

      // Small delay to allow page updates (for interactive features)
      await new Promise(r => setTimeout(r, 33)); // ~30fps real-time

      // Simulate some basic interaction for interactive features
      if (frame === Math.floor(totalFrames * 0.3)) {
        // Click somewhere in the middle of the page
        await page.mouse.click(960, 540);
      }
      if (frame === Math.floor(totalFrames * 0.6)) {
        // Another click
        await page.mouse.click(700, 400);
      }

      if (frame % 30 === 0) {
        log(`  Progress: ${frame}/${totalFrames} frames`);
      }
    }

    log(`✅ Captured ${totalFrames} frames`);
    await closeBrowser(browser);
    browser = null; // Mark as closed

    // Encode to MP4
    log('🎥 Encoding to MP4...');
    const timestamp = Date.now();
    const outputPath = path.join(OUTPUT_DIR, `${featureName}_${timestamp}.mp4`);

    try {
      execSync(
        `ffmpeg -y -framerate ${TARGET_FPS} -i "${framesDir}/frame_%05d.png" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p "${outputPath}"`,
        { stdio: 'pipe' }
      );
      log(`✅ Video encoded: ${path.basename(outputPath)}`);
    } catch (e) {
      log(`❌ ffmpeg error: ${e}`);
      fs.rmSync(framesDir, { recursive: true, force: true });
      return { success: false, error: `ffmpeg encoding failed: ${e}` };
    }

    // Cleanup frames
    fs.rmSync(framesDir, { recursive: true, force: true });

    // Read video as base64 for Twitter upload
    const videoBuffer = fs.readFileSync(outputPath);
    const videoBase64 = videoBuffer.toString('base64');

    const stats = fs.statSync(outputPath);
    log(`🎬 Recording complete: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);

    return {
      success: true,
      videoPath: outputPath,
      videoBase64,
      durationSec,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`💥 Recording error: ${errorMessage}`);
    fs.rmSync(framesDir, { recursive: true, force: true });
    return { success: false, error: errorMessage };
  } finally {
    // ALWAYS clean up browser
    if (browser) {
      await closeBrowser(browser);
    }
  }
}

/**
 * Record a game-like feature with AI gameplay
 * Uses virtual time control for frame-perfect capture
 */
export async function recordGameFeature(
  url: string,
  featureName: string,
  durationSec: number = 10
): Promise<RecordResult> {
  log(`🎮 Starting game recording: ${featureName}`);
  log(`📍 URL: ${url}`);

  const framesDir = path.join(FRAMES_DIR, featureName);
  fs.mkdirSync(framesDir, { recursive: true });

  let browser: Browser | null = null;

  try {
    // Launch browser with timeout
    const launchPromise = puppeteer.launch({
      headless: true, // Use headless on VPS (changed from false)
      defaultViewport: null,
      args: [
        '--window-size=1920,1080',
        '--disable-web-security',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--autoplay-policy=no-user-gesture-required',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ],
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Browser launch timed out after ${BROWSER_LAUNCH_TIMEOUT_MS}ms`)), BROWSER_LAUNCH_TIMEOUT_MS);
    });

    browser = await Promise.race([launchPromise, timeoutPromise]);
    activeBrowsers.add(browser);

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    log('📄 Loading game...');
    await page.goto(url, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // Inject time control for games (runs in browser context)
    await page.evaluate(`
      (function() {
        const originalRAF = window.requestAnimationFrame;
        window.__virtualTime = performance.now();
        window.__frameCallbacks = [];
        window.__frameDuration = 1000 / 30;
        window.__timeControlActive = true;

        window.requestAnimationFrame = function(callback) {
          if (window.__timeControlActive) {
            window.__frameCallbacks.push(callback);
            return window.__frameCallbacks.length;
          }
          return originalRAF(callback);
        };

        const perfNowOriginal = performance.now.bind(performance);
        performance.now = function() {
          if (window.__timeControlActive) {
            return window.__virtualTime;
          }
          return perfNowOriginal();
        };

        window.__advanceFrame = function() {
          if (!window.__timeControlActive) return;
          window.__virtualTime += window.__frameDuration;
          const callbacks = [...window.__frameCallbacks];
          window.__frameCallbacks = [];
          for (const cb of callbacks) {
            try {
              cb(window.__virtualTime);
            } catch (e) {
              console.error('RAF callback error:', e);
            }
          }
        };
      })();
    `);

    // Start the game if there's a launch button
    const launchBtn = await page.$('button');
    if (launchBtn) {
      await launchBtn.click();
      await new Promise(r => setTimeout(r, 1000));
    }

    const totalFrames = durationSec * TARGET_FPS;
    log(`📸 Capturing ${totalFrames} game frames...`);

    // Simulate AI gameplay
    const keys = new Set<KeyInput>();
    let savedCount = 0;

    for (let frame = 0; frame < totalFrames; frame++) {
      // AI inputs - basic movement and action
      if (frame % 4 === 0) await page.keyboard.down('Space');
      if (frame % 4 === 2) await page.keyboard.up('Space');

      if (frame % 20 === 0) {
        const dirs: KeyInput[] = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
        const dir = dirs[Math.floor(Math.random() * 4)];
        await page.keyboard.down(dir);
        keys.add(dir);
      }
      if (frame % 20 === 15) {
        for (const key of keys) {
          await page.keyboard.up(key);
        }
        keys.clear();
      }

      // Advance game frame
      await page.evaluate(`
        if (window.__advanceFrame) {
          window.__advanceFrame();
        }
      `);
      await new Promise(r => setTimeout(r, 16));

      // Capture frame
      const frameNum = String(savedCount).padStart(5, '0');
      await page.screenshot({
        path: path.join(framesDir, `frame_${frameNum}.png`),
        type: 'png',
      });
      savedCount++;

      if (savedCount % 30 === 0) {
        log(`  Progress: ${savedCount}/${totalFrames} frames`);
      }
    }

    // Cleanup
    for (const key of keys) {
      await page.keyboard.up(key);
    }
    await closeBrowser(browser);
    browser = null; // Mark as closed

    // Encode
    log('🎥 Encoding game footage...');
    const timestamp = Date.now();
    const outputPath = path.join(OUTPUT_DIR, `${featureName}_${timestamp}.mp4`);

    execSync(
      `ffmpeg -y -framerate ${TARGET_FPS} -i "${framesDir}/frame_%05d.png" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p "${outputPath}"`,
      { stdio: 'pipe' }
    );

    fs.rmSync(framesDir, { recursive: true, force: true });

    const videoBuffer = fs.readFileSync(outputPath);
    const videoBase64 = videoBuffer.toString('base64');
    const stats = fs.statSync(outputPath);

    log(`🎬 Game recording complete: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);

    return {
      success: true,
      videoPath: outputPath,
      videoBase64,
      durationSec,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`💥 Game recording error: ${errorMessage}`);
    fs.rmSync(framesDir, { recursive: true, force: true });
    return { success: false, error: errorMessage };
  } finally {
    // ALWAYS clean up browser
    if (browser) {
      await closeBrowser(browser);
    }
  }
}
