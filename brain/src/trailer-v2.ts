/**
 * TRAILER V2 - Real UI Capture + Remotion Composition
 *
 * This generates trailers using ACTUAL page footage:
 * 1. CAPTURE: Record real page interaction with Puppeteer
 * 2. COMPOSE: Wrap with title card + CTA using Remotion
 *
 * The result is 100% authentic - shows the real UI/UX journey.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { buildEvents } from './builder.js';
import { captureAIFeature, CaptureResult } from './capture.js';

const execAsync = promisify(exec);

const projectRoot = process.env.PROJECT_ROOT || process.cwd().replace('/brain', '');
const VIDEO_DIR = path.join(projectRoot, 'video');
const OUTPUT_DIR = path.join(process.cwd(), 'recordings');
const FOOTAGE_DIR = path.join(VIDEO_DIR, 'public/footage');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(FOOTAGE_DIR, { recursive: true });

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}`;
  console.log(logLine);
  buildEvents.emit('log', logLine);
}

export interface TrailerV2Config {
  name: string;
  slug: string;
  description: string;
  deployUrl: string;
  tagline?: string;
}

export interface TrailerV2Result {
  success: boolean;
  videoPath?: string;
  videoBase64?: string;
  error?: string;
  captureResult?: CaptureResult;
}

/**
 * Generate a trailer with REAL page footage
 *
 * Pipeline:
 * 1. Capture real page interaction (Puppeteer screen recording)
 * 2. Copy footage to Remotion public folder
 * 3. Render composition: Title (3s) → Real Footage → CTA (3s)
 */
export async function generateTrailerV2(config: TrailerV2Config): Promise<TrailerV2Result> {
  const { name, slug, description, deployUrl, tagline } = config;

  log(`🎬 TRAILER V2: Generating with REAL page footage`);
  log(`   Feature: ${name}`);
  log(`   URL: ${deployUrl}`);

  // PHASE 1: Capture real page interaction
  log(`\n📹 PHASE 1: Capturing real page interaction...`);

  const captureResult = await captureAIFeature(deployUrl, slug);

  if (!captureResult.success || !captureResult.videoPath) {
    log(`   ❌ Capture failed: ${captureResult.error}`);
    return { success: false, error: captureResult.error, captureResult };
  }

  log(`   ✅ Capture complete: ${captureResult.videoPath}`);
  log(`   Button clicked: "${captureResult.buttonText}"`);
  if (captureResult.outputLines && captureResult.outputLines.length > 0) {
    log(`   Output captured: ${captureResult.outputLines.length} lines`);
  }

  // PHASE 2: Copy footage to Remotion public folder
  log(`\n📁 PHASE 2: Preparing footage for Remotion...`);

  const footageFilename = `${slug}_footage.mp4`;
  const footageDest = path.join(FOOTAGE_DIR, footageFilename);
  fs.copyFileSync(captureResult.videoPath, footageDest);
  log(`   Copied to: ${footageFilename}`);

  // PHASE 3: Render with Remotion
  log(`\n🎥 PHASE 3: Rendering final trailer with Remotion...`);

  const outputPath = path.join(OUTPUT_DIR, `${slug}_trailer_${Date.now()}.mp4`);

  const props = {
    featureName: name,
    featureSlug: slug,
    description: tagline || description,
    footagePath: `footage/${footageFilename}`,
  };

  const propsJson = JSON.stringify(props).replace(/'/g, "'\\''");

  try {
    // Check Remotion setup
    const packageJsonPath = path.join(VIDEO_DIR, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return { success: false, error: 'Remotion not set up', captureResult };
    }

    log(`   Composition: RealFootageTrailer`);
    log(`   Footage: ${footageFilename}`);

    const command = `cd "${VIDEO_DIR}" && npx remotion render RealFootageTrailer "${outputPath}" --props='${propsJson}' --log=error`;

    const { stderr } = await execAsync(command, {
      timeout: 180000,
      maxBuffer: 10 * 1024 * 1024,
    });

    if (stderr && !stderr.includes('Rendered')) {
      log(`   ⚠️ Remotion stderr: ${stderr}`);
    }

    // Verify output
    if (!fs.existsSync(outputPath)) {
      return { success: false, error: 'Remotion render produced no output', captureResult };
    }

    // Read as base64 for Twitter
    const videoBuffer = fs.readFileSync(outputPath);
    const videoBase64 = videoBuffer.toString('base64');

    const stats = fs.statSync(outputPath);
    const sizeMb = (stats.size / 1024 / 1024).toFixed(1);

    log(`\n✅ TRAILER V2 COMPLETE`);
    log(`   Output: ${path.basename(outputPath)}`);
    log(`   Size: ${sizeMb} MB`);

    return {
      success: true,
      videoPath: outputPath,
      videoBase64,
      captureResult,
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`   ❌ Remotion render failed: ${errorMsg}`);
    return { success: false, error: errorMsg, captureResult };
  }
}
