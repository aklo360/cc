/**
 * Trailer Generator - Creates dynamic trailers for features
 *
 * ALWAYS uses Remotion for all trailers.
 * For games/complex UIs, screen recordings are INTERCUT into the Remotion composition.
 * There is NEVER a trailer that is 100% screen recording.
 */

import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { buildEvents } from './builder.js';
import { recordFeature } from './recorder.js';

const execAsync = promisify(exec);

// Paths
const projectRoot = process.env.PROJECT_ROOT || process.cwd().replace('/brain', '');
const VIDEO_DIR = path.join(projectRoot, 'video');
const OUTPUT_DIR = path.join(projectRoot, 'brain/recordings');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

export interface TrailerConfig {
  name: string;
  slug: string;
  description: string;
  tagline?: string;
}

export interface TrailerResult {
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
 * Classify a feature to determine if screen recording footage should be intercut
 * ALL trailers use Remotion - this just determines if we capture footage to include
 */
export function needsScreenRecording(slug: string, description: string): boolean {
  // Keywords that indicate we need intercut screen recordings
  const recordingKeywords = [
    '3d',
    'three.js',
    'canvas',
    'webgl',
    'physics',
    'real-time',
    'interactive game',
    'arcade',
    'shooter',
    'runner',
    'invaders',
    'animation',
  ];

  const descLower = description.toLowerCase();
  const slugLower = slug.toLowerCase();

  // Check description and slug for complex UI keywords
  for (const keyword of recordingKeywords) {
    if (descLower.includes(keyword) || slugLower.includes(keyword)) {
      log(`[Trailer] Feature "${slug}" needs intercut footage (keyword: ${keyword})`);
      return true;
    }
  }

  // Known game/complex routes that need screen recording
  const complexRoutes = ['moon', 'play'];
  if (complexRoutes.some((r) => slugLower.includes(r))) {
    log(`[Trailer] Feature "${slug}" needs intercut footage (known complex route)`);
    return true;
  }

  log(`[Trailer] Feature "${slug}" - pure Remotion (no screen recording needed)`);
  return false;
}

/**
 * Determine if a feature needs a longer (30s) trailer for better explanation
 * Used for code-heavy, complex, or conceptually dense features
 */
export function needsLongTrailer(slug: string, description: string): boolean {
  const descLower = description.toLowerCase();
  const slugLower = slug.toLowerCase();

  // Keywords that indicate complexity needing more explanation time
  const complexKeywords = [
    'battle',
    'arena',
    'algorithm',
    'code challenge',
    'code battle',
    'ai vs',
    'versus',
    'competition',
    'tournament',
    'multiplayer',
    'real-time',
    'simulation',
    'engine',
    'compiler',
    'interpreter',
    'debugger',
    'analyzer',
  ];

  for (const keyword of complexKeywords) {
    if (descLower.includes(keyword) || slugLower.includes(keyword)) {
      log(`[Trailer] Feature "${slug}" needs 30s trailer (complex/code-heavy: ${keyword})`);
      return true;
    }
  }

  // Known code-heavy/complex routes
  const complexRoutes = ['battle', 'arena', 'challenge', 'tournament'];
  if (complexRoutes.some((r) => slugLower.includes(r))) {
    log(`[Trailer] Feature "${slug}" needs 30s trailer (known complex route)`);
    return true;
  }

  return false;
}

/**
 * Capture intercut footage for complex features (games, 3D, etc.)
 * This footage will be embedded into the Remotion composition
 */
async function captureIntercutFootage(
  config: TrailerConfig,
  deployUrl: string
): Promise<string | null> {
  log(`📹 Capturing intercut footage at ${deployUrl}...`);

  const recordResult = await recordFeature(deployUrl, config.slug, 6); // 6 seconds

  if (!recordResult.success || !recordResult.videoPath) {
    log(`⚠️ Footage capture failed: ${recordResult.error}`);
    log(`   Trailer will use pure Remotion without intercut footage`);
    return null;
  }

  // Copy the recording to video/public/footage for Remotion to access
  const footageDir = path.join(VIDEO_DIR, 'public/footage');
  fs.mkdirSync(footageDir, { recursive: true });

  const footageFilename = `${config.slug}_footage.mp4`;
  const footagePath = path.join(footageDir, footageFilename);

  fs.copyFileSync(recordResult.videoPath, footagePath);
  log(`📁 Footage saved: ${footageFilename}`);

  return `footage/${footageFilename}`;
}

/**
 * Main entry point - ALWAYS generates a Remotion trailer
 * For complex features, captures intercut footage first
 */
export async function generateTrailer(
  config: TrailerConfig,
  deployUrl?: string
): Promise<TrailerResult> {
  log(`🎬 Generating Remotion trailer for: ${config.name}`);

  // Determine if we need to capture intercut footage
  const needsFootage = needsScreenRecording(config.slug, config.description);
  let footagePath: string | undefined;

  if (needsFootage && deployUrl) {
    footagePath = (await captureIntercutFootage(config, deployUrl)) || undefined;
  }

  // Determine if this needs a longer trailer (30s vs 15s)
  const needsLong = needsLongTrailer(config.slug, config.description);

  // Always render with Remotion
  const outputPath = path.join(OUTPUT_DIR, `${config.slug}_${Date.now()}.mp4`);

  // Determine feature type for Remotion:
  // - 'game' = has screen recording footage, 30s
  // - 'complex' = code-heavy/dense, needs 30s for explanation
  // - 'static' = simple feature, 15s
  let featureType: string;
  if (footagePath) {
    featureType = 'game';
  } else if (needsLong) {
    featureType = 'complex'; // New type for code-heavy features
  } else {
    featureType = 'static';
  }

  const props = {
    featureName: config.name,
    featureSlug: config.slug,
    description: config.description,
    featureType,
    tagline: config.tagline || config.description,
    footagePath: footagePath,
  };

  const propsJson = JSON.stringify(props).replace(/'/g, "'\\''");

  try {
    // Check if Remotion is installed
    const packageJsonPath = path.join(VIDEO_DIR, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      log(`❌ Remotion not set up at ${VIDEO_DIR}`);
      return { success: false, error: 'Remotion not installed' };
    }

    log(`📹 Rendering with Remotion...`);
    log(`   Composition: FeatureTrailer`);
    log(`   Intercut footage: ${footagePath || 'none'}`);
    log(`   Output: ${path.basename(outputPath)}`);

    const command = `cd "${VIDEO_DIR}" && npx remotion render FeatureTrailer "${outputPath}" --props='${propsJson}' --log=error`;

    const { stdout, stderr } = await execAsync(command, {
      timeout: 180000, // 3 minute timeout
      maxBuffer: 10 * 1024 * 1024,
    });

    if (stderr && !stderr.includes('Rendered')) {
      log(`⚠️ Remotion stderr: ${stderr}`);
    }

    // Verify output exists
    if (!fs.existsSync(outputPath)) {
      log(`❌ Remotion output not found at ${outputPath}`);
      return { success: false, error: 'Remotion render produced no output' };
    }

    // Read video as base64 for Twitter
    const videoBuffer = fs.readFileSync(outputPath);
    const videoBase64 = videoBuffer.toString('base64');

    const stats = fs.statSync(outputPath);
    const sizeMb = (stats.size / 1024 / 1024).toFixed(1);

    // Duration: games and complex features get 30s, standard features get 15s
    const durationSec = (footagePath || needsLong) ? 30 : 15;
    log(`✅ Trailer generated: ${sizeMb} MB (${durationSec}s)`);

    return {
      success: true,
      videoPath: outputPath,
      videoBase64,
      durationSec,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`❌ Remotion render failed: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}
