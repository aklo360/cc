/**
 * CAPTURE - Records REAL page interaction with Puppeteer
 *
 * This captures the ACTUAL UI/UX journey:
 * 1. Page loads with input visible
 * 2. User clicks the action button
 * 3. Processing/loading state appears
 * 4. Output reveals with real content
 *
 * The result is authentic footage of the real feature, not a recreation.
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { buildEvents } from './builder.js';

const OUTPUT_DIR = path.join(process.cwd(), 'recordings');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] ${message}`);
  buildEvents.emit('log', message);
}

export interface CaptureConfig {
  url: string;
  slug: string;
  /** Duration to record initial state before clicking (ms) */
  preClickDuration?: number;
  /** Duration to wait for output after clicking (ms) */
  postClickDuration?: number;
  /** Total max recording duration (ms) */
  maxDuration?: number;
}

export interface CaptureResult {
  success: boolean;
  videoPath?: string;
  error?: string;
  /** What button was clicked */
  buttonText?: string;
  /** Lines of output captured */
  outputLines?: string[];
}

/**
 * Capture the real page interaction as video
 */
export async function capturePageInteraction(config: CaptureConfig): Promise<CaptureResult> {
  const {
    url,
    slug,
    preClickDuration = 3000,
    postClickDuration = 8000,
    maxDuration = 15000,
  } = config;

  log(`📹 CAPTURE: Recording real page interaction`);
  log(`   URL: ${url}`);
  log(`   Pre-click: ${preClickDuration}ms, Post-click: ${postClickDuration}ms`);

  let browser: Browser | null = null;
  let ffmpegProcess: ReturnType<typeof spawn> | null = null;

  const outputPath = path.join(OUTPUT_DIR, `${slug}_capture_${Date.now()}.mp4`);
  const framesDir = path.join(OUTPUT_DIR, `${slug}_frames_${Date.now()}`);
  fs.mkdirSync(framesDir, { recursive: true });

  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

    // Navigate to the feature
    log(`   → Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for initial render
    await new Promise(r => setTimeout(r, 1000));

    // Find the action button BEFORE we start recording
    const buttonInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button:not([disabled]), [role="button"]:not([disabled])'));
      const actionKeywords = ['generate', 'create', 'start', 'play', 'submit', 'run', 'build', 'analyze', 'roast', 'review', 'refactor', 'debug', 'convert', 'get', 'check'];

      for (const btn of buttons) {
        const text = btn.textContent?.trim() || '';
        if (actionKeywords.some(k => text.toLowerCase().includes(k))) {
          // Get button position for visual reference
          const rect = btn.getBoundingClientRect();
          return {
            text,
            found: true,
            x: rect.x + rect.width / 2,
            y: rect.y + rect.height / 2,
          };
        }
      }

      // Fallback to first button
      const first = buttons[0];
      if (first) {
        const rect = first.getBoundingClientRect();
        return {
          text: first.textContent?.trim() || 'Button',
          found: true,
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
        };
      }

      return { text: '', found: false, x: 0, y: 0 };
    });

    if (!buttonInfo.found) {
      log(`   ⚠️ No action button found on page`);
      await browser.close();
      return { success: false, error: 'No action button found' };
    }

    log(`   → Found button: "${buttonInfo.text}"`);

    // Start frame capture
    log(`   → Starting frame capture...`);
    let frameCount = 0;
    const fps = 30;
    const frameInterval = 1000 / fps;
    let capturing = true;

    const captureFrame = async () => {
      if (!capturing) return;
      try {
        const screenshot = await page.screenshot({ type: 'png' });
        const framePath = path.join(framesDir, `frame_${String(frameCount).padStart(5, '0')}.png`);
        fs.writeFileSync(framePath, screenshot);
        frameCount++;
      } catch (e) {
        // Ignore frame capture errors
      }
    };

    // Capture loop
    const captureInterval = setInterval(captureFrame, frameInterval);

    // PHASE 1: Capture initial state (input visible)
    log(`   → Phase 1: Recording initial state (${preClickDuration}ms)...`);
    await new Promise(r => setTimeout(r, preClickDuration));

    // PHASE 2: Click the action button
    log(`   → Phase 2: Clicking "${buttonInfo.text}"...`);
    await page.mouse.click(buttonInfo.x, buttonInfo.y);

    // PHASE 3: Capture processing + output
    log(`   → Phase 3: Recording output generation (${postClickDuration}ms)...`);
    await new Promise(r => setTimeout(r, postClickDuration));

    // Stop capturing
    capturing = false;
    clearInterval(captureInterval);

    log(`   → Captured ${frameCount} frames`);

    // Capture final output text
    const outputLines = await page.evaluate(() => {
      const outputSelectors = [
        '[class*="result"]', '[class*="output"]', '[class*="response"]',
        '[class*="generated"]', 'pre', 'code', '.prose',
      ];
      const lines: string[] = [];
      for (const selector of outputSelectors) {
        document.querySelectorAll(selector).forEach(el => {
          const text = el.textContent?.trim();
          if (text && text.length > 20 && text.length < 500) {
            lines.push(text);
          }
        });
      }
      return lines.slice(0, 5);
    });

    await browser.close();
    browser = null;

    // Encode frames to video with ffmpeg
    log(`   → Encoding ${frameCount} frames to video...`);

    await new Promise<void>((resolve, reject) => {
      ffmpegProcess = spawn('ffmpeg', [
        '-y',
        '-framerate', String(fps),
        '-i', path.join(framesDir, 'frame_%05d.png'),
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-preset', 'fast',
        '-crf', '23',
        outputPath,
      ]);

      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg exited with code ${code}`));
        }
      });

      ffmpegProcess.on('error', reject);
    });

    // Cleanup frames
    fs.rmSync(framesDir, { recursive: true, force: true });

    // Verify output
    if (!fs.existsSync(outputPath)) {
      return { success: false, error: 'Video encoding failed' };
    }

    const stats = fs.statSync(outputPath);
    const sizeMb = (stats.size / 1024 / 1024).toFixed(1);
    const duration = (frameCount / fps).toFixed(1);

    log(`   ✅ Captured: ${sizeMb}MB, ${duration}s, ${frameCount} frames`);

    return {
      success: true,
      videoPath: outputPath,
      buttonText: buttonInfo.text,
      outputLines,
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`   ❌ Capture failed: ${errorMsg}`);

    if (browser) await browser.close();

    // Cleanup frames
    if (fs.existsSync(framesDir)) {
      fs.rmSync(framesDir, { recursive: true, force: true });
    }

    return { success: false, error: errorMsg };
  }
}

/**
 * Capture with enhanced timing for AI-generated content
 * Waits longer for AI to generate output
 */
export async function captureAIFeature(url: string, slug: string): Promise<CaptureResult> {
  return capturePageInteraction({
    url,
    slug,
    preClickDuration: 2500,   // 2.5s showing input
    postClickDuration: 10000, // 10s for AI generation + output display
    maxDuration: 15000,
  });
}
