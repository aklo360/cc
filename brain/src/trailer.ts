/**
 * Trailer Generator - Creates 20-second trailers for features
 *
 * SIMPLIFIED ARCHITECTURE:
 * - ALL trailers are 20 seconds (universal format)
 * - Screen recording ONLY for WebGL/Three.js (detected from manifest)
 * - Uses manifest ground truth for content
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { buildEvents } from './builder.js';
import { recordFeature } from './recorder.js';
import { FeatureManifest, manifestToTrailerContent } from './manifest.js';

const execAsync = promisify(exec);

// Paths
const projectRoot = process.env.PROJECT_ROOT || process.cwd().replace('/brain', '');
const VIDEO_DIR = path.join(projectRoot, 'video');
const OUTPUT_DIR = path.join(projectRoot, 'brain/recordings');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Universal trailer duration: 20 seconds
const TRAILER_DURATION_SEC = 20;

/**
 * Scene content interface - matches FeatureTrailer.tsx TrailerSceneContent
 */
export interface TrailerSceneContent {
  inputDemo: string;
  inputLabel: string;
  buttonText: string;
  processingText: string;
  processingSubtext: string;
  outputHeader: string;
  outputLines: string[];
  outputStyle: 'poetry' | 'code' | 'terminal' | 'battle';
  calloutTitle: string;
  calloutDescription: string;
}

export interface TrailerConfig {
  name: string;
  slug: string;
  description: string;
  tagline?: string;
  /** Ground truth manifest from the deployed feature - prevents hallucination */
  manifest?: FeatureManifest;
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
 * Check if feature needs screen recording based on manifest's renderingType.
 * Only WebGL features (Three.js, etc.) need recording because they can't be
 * recreated in Remotion.
 */
function needsWebGLFootage(manifest?: FeatureManifest): boolean {
  if (!manifest) return false;
  return manifest.renderingType === 'webgl';
}

/**
 * Generate scene content from a FeatureManifest (ground truth)
 * This uses ONLY verified information from the actual deployed page.
 * NO hallucination - if manifest is missing, uses safe fallbacks.
 */
function generateSceneContentFromManifest(config: TrailerConfig): TrailerSceneContent {
  if (config.manifest) {
    log(`🎭 Generating trailer script from MANIFEST (ground truth)`);
    log(`   Page title: "${config.manifest.pageTitle}"`);
    log(`   Interaction type: ${config.manifest.interactionType}`);
    log(`   Rendering type: ${config.manifest.renderingType}`);
    log(`   Buttons found: ${config.manifest.buttons.join(', ') || 'none'}`);

    // Use manifest to generate truthful content
    const content = manifestToTrailerContent(config.manifest);

    log(`✅ Trailer script from manifest:`);
    log(`   Button: "${content.buttonText}" (from actual page)`);
    log(`   Type: ${content.outputStyle}`);

    return content;
  }

  // No manifest - use safe fallback based on description keywords
  log(`⚠️ No manifest provided - using keyword-based fallback`);
  return generateFallbackContent(config);
}

/**
 * Generate fallback content when manifest is not available
 * Still tries to be feature-specific based on keywords
 */
function generateFallbackContent(config: TrailerConfig): TrailerSceneContent {
  const { slug, name, description } = config;
  const descLower = description.toLowerCase();

  // Battle/Arena features
  if (descLower.includes('battle') || descLower.includes('arena') || descLower.includes('versus')) {
    return {
      inputDemo: 'function solve(n) {\\n  return n * 2;\\n}',
      inputLabel: 'Submit your solution',
      buttonText: 'Enter Battle',
      processingText: 'Matching opponents',
      processingSubtext: 'Finding worthy challengers',
      outputHeader: 'Battle Results',
      outputLines: ['Your code: 95% efficient', 'Opponent: 87% efficient', 'YOU WIN!', '+100 XP earned'],
      outputStyle: 'battle',
      calloutTitle: 'THE ARENA',
      calloutDescription: 'Compete against other coders in real-time battles',
    };
  }

  // Poetry features
  if (descLower.includes('poetry') || descLower.includes('haiku') || descLower.includes('poem')) {
    return {
      inputDemo: 'function fibonacci(n) {\\n  if (n <= 1) return n;\\n  return fibonacci(n-1) + fibonacci(n-2);\\n}',
      inputLabel: 'Paste your code',
      buttonText: 'Generate Poetry',
      processingText: 'Composing',
      processingSubtext: 'AI transforming logic into verse',
      outputHeader: 'Your Code Poetry',
      outputLines: ['Recursive calls dance', 'Numbers spiral outward, grow', 'Fibonacci blooms'],
      outputStyle: 'poetry',
      calloutTitle: 'CODE TO ART',
      calloutDescription: 'Transform your algorithms into beautiful poetry',
    };
  }

  // Meme features
  if (descLower.includes('meme') || descLower.includes('image')) {
    return {
      inputDemo: 'When the code works on first try',
      inputLabel: 'Describe your meme',
      buttonText: 'Generate Meme',
      processingText: 'Creating',
      processingSubtext: 'AI generating your masterpiece',
      outputHeader: 'Your Meme',
      outputLines: ['[AI-generated meme image]', 'Ready to share!'],
      outputStyle: 'terminal',
      calloutTitle: 'AI POWERED',
      calloutDescription: 'Create viral dev memes in seconds',
    };
  }

  // Generic fallback
  return {
    inputDemo: `// Try ${name}\\nconsole.log("Hello $CC!");`,
    inputLabel: 'Enter your input',
    buttonText: 'Generate',
    processingText: 'Processing',
    processingSubtext: 'AI working its magic',
    outputHeader: 'Result',
    outputLines: ['Success!', 'Your output is ready', `Try it at /${slug}`],
    outputStyle: 'terminal',
    calloutTitle: 'NEW FEATURE',
    calloutDescription: description.slice(0, 100),
  };
}

/**
 * Capture intercut footage for WebGL features
 * This footage will be embedded into the Remotion composition
 */
async function captureIntercutFootage(
  config: TrailerConfig,
  deployUrl: string
): Promise<string | null> {
  log(`📹 Capturing WebGL footage at ${deployUrl}...`);

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
 * Main entry point - generates a 20-second Remotion trailer
 *
 * Flow:
 * 1. Check if manifest indicates WebGL (needs screen recording)
 * 2. If WebGL: capture 6s footage first
 * 3. Generate scene content from manifest (ground truth)
 * 4. Render with Remotion (always 20 seconds)
 */
export async function generateTrailer(
  config: TrailerConfig,
  deployUrl?: string
): Promise<TrailerResult> {
  log(`🎬 Generating ${TRAILER_DURATION_SEC}s trailer for: ${config.name}`);

  // Check if this needs WebGL footage (based on manifest detection)
  const needsFootage = needsWebGLFootage(config.manifest);
  let footagePath: string | undefined;

  if (needsFootage) {
    log(`   🎮 WebGL detected - will capture intercut footage`);
    if (deployUrl) {
      footagePath = (await captureIntercutFootage(config, deployUrl)) || undefined;
    }
  } else {
    log(`   📄 Static/Canvas2D - pure Remotion (no screen recording)`);
  }

  // Generate scene content from MANIFEST (ground truth)
  const sceneContent = generateSceneContentFromManifest(config);

  // Render with Remotion
  const outputPath = path.join(OUTPUT_DIR, `${config.slug}_${Date.now()}.mp4`);

  // Feature type: 'game' if we have footage, 'static' otherwise
  const featureType = footagePath ? 'game' : 'static';

  const props = {
    featureName: config.name,
    featureSlug: config.slug,
    description: config.description,
    featureType,
    tagline: config.tagline || config.description,
    footagePath: footagePath,
    sceneContent,
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
    log(`   Duration: ${TRAILER_DURATION_SEC} seconds`);
    log(`   WebGL footage: ${footagePath || 'none'}`);
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

    log(`✅ Trailer generated: ${sizeMb} MB (${TRAILER_DURATION_SEC}s)`);

    return {
      success: true,
      videoPath: outputPath,
      videoBase64,
      durationSec: TRAILER_DURATION_SEC,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`❌ Remotion render failed: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}
