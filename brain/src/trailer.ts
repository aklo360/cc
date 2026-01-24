/**
 * Trailer Generator - Creates dynamic trailers for features
 *
 * ALWAYS uses Remotion for all trailers.
 * For games/complex UIs, screen recordings are INTERCUT into the Remotion composition.
 * There is NEVER a trailer that is 100% screen recording.
 *
 * CRITICAL: Trailers use GROUND TRUTH from FeatureManifest.
 * The manifest is extracted from the ACTUAL deployed page, ensuring
 * we never claim features that don't exist (no multiplayer, no token rewards, etc.)
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
 * Generate scene content from a FeatureManifest (ground truth)
 * This uses ONLY verified information from the actual deployed page.
 * NO hallucination - if manifest is missing, uses safe fallbacks.
 */
function generateSceneContentFromManifest(config: TrailerConfig): TrailerSceneContent {
  if (config.manifest) {
    log(`🎭 Generating trailer script from MANIFEST (ground truth)`);
    log(`   Page title: "${config.manifest.pageTitle}"`);
    log(`   Interaction type: ${config.manifest.interactionType}`);
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
 * Generate fallback content when Claude API fails
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
 * Check if this feature has dedicated trailer components for exact UI recreation
 * These are created by the builder alongside the feature code
 */
function hasFeatureComponents(slug: string): string | null {
  // Map slugs to their component folder names
  // The builder creates folders like video/src/components/[FeatureName]/
  // These mappings are for features that have dedicated trailer compositions
  const componentMappings: Record<string, string> = {
    battle: 'BattleArena',
    arena: 'BattleArena',
    review: 'CodeReview',
    'code-review': 'CodeReview',
    // New features added by the builder will auto-detect based on folder naming
  };

  // Check known mappings first
  const slugLower = slug.toLowerCase();
  for (const [key, folder] of Object.entries(componentMappings)) {
    if (slugLower.includes(key)) {
      const componentPath = path.join(VIDEO_DIR, 'src/components', folder);
      if (fs.existsSync(componentPath)) {
        return folder;
      }
    }
  }

  // Check for auto-generated component folder based on slug
  // Convert slug like "code-review" to "CodeReview"
  const folderName = slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  const autoPath = path.join(VIDEO_DIR, 'src/components', folderName);
  if (fs.existsSync(autoPath)) {
    return folderName;
  }

  return null;
}

/**
 * Check if this feature should use the specialized BattleTrailer composition
 * BattleTrailer has exact UI recreation from /battle page
 */
function isBattleFeature(slug: string): boolean {
  const slugLower = slug.toLowerCase();
  return slugLower.includes('battle') || slugLower.includes('arena') || slugLower === 'battle';
}

/**
 * Main entry point - ALWAYS generates a Remotion trailer
 * For complex features, captures intercut footage first
 * For features with dedicated components, uses exact UI recreation
 * For battle features, uses dedicated BattleTrailer composition with exact UI
 */
export async function generateTrailer(
  config: TrailerConfig,
  deployUrl?: string
): Promise<TrailerResult> {
  log(`🎬 Generating Remotion trailer for: ${config.name}`);

  // Check if this feature has dedicated trailer components for exact UI recreation
  const featureComponents = hasFeatureComponents(config.slug);
  if (featureComponents) {
    log(`🎨 Found exact UI components: ${featureComponents}`);
    log(`   This trailer will use EXACT UI recreation from the feature`);
  }

  // Check if this is a battle feature - use dedicated BattleTrailer composition
  const useBattleTrailer = isBattleFeature(config.slug);

  if (useBattleTrailer) {
    log(`⚔️ Using BattleTrailer composition (exact UI recreation)`);
    return generateBattleTrailer(config);
  }

  // Check for other feature-specific compositions
  // These use the exact UI components created by the builder
  if (featureComponents && featureComponents !== 'BattleArena') {
    log(`🎭 Using feature-specific composition: ${featureComponents}Trailer`);
    return generateFeatureSpecificTrailer(config, featureComponents);
  }

  // CRITICAL: Generate scene content from MANIFEST (ground truth)
  // This ensures we NEVER claim features that don't exist
  const sceneContent = generateSceneContentFromManifest(config);

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
    // CRITICAL: Include the dynamically generated scene content
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

/**
 * Generate trailer using the dedicated BattleTrailer composition
 * This composition has exact UI recreation from the /battle page with audio
 */
async function generateBattleTrailer(config: TrailerConfig): Promise<TrailerResult> {
  const outputPath = path.join(OUTPUT_DIR, `${config.slug}_${Date.now()}.mp4`);

  try {
    // Check if Remotion is installed
    const packageJsonPath = path.join(VIDEO_DIR, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      log(`❌ Remotion not set up at ${VIDEO_DIR}`);
      return { success: false, error: 'Remotion not installed' };
    }

    log(`📹 Rendering BattleTrailer...`);
    log(`   Composition: BattleTrailer (exact UI recreation)`);
    log(`   Duration: 30 seconds`);
    log(`   Audio: trailer-music.mp3 + SFX`);
    log(`   Output: ${path.basename(outputPath)}`);

    // BattleTrailer doesn't need props - it uses hardcoded exact UI
    const command = `cd "${VIDEO_DIR}" && npx remotion render BattleTrailer "${outputPath}" --log=error`;

    const { stdout, stderr } = await execAsync(command, {
      timeout: 300000, // 5 minute timeout for 30s video with audio
      maxBuffer: 10 * 1024 * 1024,
    });

    if (stderr && !stderr.includes('Rendered')) {
      log(`⚠️ Remotion stderr: ${stderr}`);
    }

    // Verify output exists
    if (!fs.existsSync(outputPath)) {
      log(`❌ BattleTrailer output not found at ${outputPath}`);
      return { success: false, error: 'BattleTrailer render produced no output' };
    }

    // Read video as base64 for Twitter
    const videoBuffer = fs.readFileSync(outputPath);
    const videoBase64 = videoBuffer.toString('base64');

    const stats = fs.statSync(outputPath);
    const sizeMb = (stats.size / 1024 / 1024).toFixed(1);

    log(`✅ BattleTrailer generated: ${sizeMb} MB (30s with audio)`);

    return {
      success: true,
      videoPath: outputPath,
      videoBase64,
      durationSec: 30,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`❌ BattleTrailer render failed: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * Generate trailer using feature-specific components for exact UI recreation
 * Falls back to generic FeatureTrailer if the specific composition doesn't exist
 */
async function generateFeatureSpecificTrailer(
  config: TrailerConfig,
  componentFolder: string
): Promise<TrailerResult> {
  const outputPath = path.join(OUTPUT_DIR, `${config.slug}_${Date.now()}.mp4`);
  const compositionName = `${componentFolder}Trailer`;

  try {
    // Check if Remotion is installed
    const packageJsonPath = path.join(VIDEO_DIR, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      log(`❌ Remotion not set up at ${VIDEO_DIR}`);
      return { success: false, error: 'Remotion not installed' };
    }

    // Check if the specific composition exists in Root.tsx
    const rootPath = path.join(VIDEO_DIR, 'src/Root.tsx');
    const rootContent = fs.readFileSync(rootPath, 'utf-8');
    const hasComposition = rootContent.includes(compositionName);

    if (!hasComposition) {
      log(`⚠️ Composition "${compositionName}" not found in Root.tsx`);
      log(`   Falling back to FeatureTrailer with exact UI components`);
      // Fall through to use FeatureTrailer but with a note
    }

    const actualComposition = hasComposition ? compositionName : 'FeatureTrailer';
    const needsLong = needsLongTrailer(config.slug, config.description);

    log(`📹 Rendering ${actualComposition}...`);
    log(`   Using exact UI components from: ${componentFolder}`);
    log(`   Duration: ${needsLong ? '30' : '15'} seconds`);
    log(`   Output: ${path.basename(outputPath)}`);

    // Build props for the composition
    const sceneContent = generateSceneContentFromManifest(config);
    const props = {
      featureName: config.name,
      featureSlug: config.slug,
      description: config.description,
      featureType: needsLong ? 'complex' : 'static',
      tagline: config.tagline || config.description,
      sceneContent,
      componentFolder, // Pass the component folder name for dynamic loading
    };

    const propsJson = JSON.stringify(props).replace(/'/g, "'\\''");
    const command = `cd "${VIDEO_DIR}" && npx remotion render ${actualComposition} "${outputPath}" --props='${propsJson}' --log=error`;

    const { stdout, stderr } = await execAsync(command, {
      timeout: 300000, // 5 minute timeout
      maxBuffer: 10 * 1024 * 1024,
    });

    if (stderr && !stderr.includes('Rendered')) {
      log(`⚠️ Remotion stderr: ${stderr}`);
    }

    // Verify output exists
    if (!fs.existsSync(outputPath)) {
      log(`❌ ${actualComposition} output not found at ${outputPath}`);
      return { success: false, error: `${actualComposition} render produced no output` };
    }

    // Read video as base64 for Twitter
    const videoBuffer = fs.readFileSync(outputPath);
    const videoBase64 = videoBuffer.toString('base64');

    const stats = fs.statSync(outputPath);
    const sizeMb = (stats.size / 1024 / 1024).toFixed(1);
    const durationSec = needsLong ? 30 : 15;

    log(`✅ ${actualComposition} generated: ${sizeMb} MB (${durationSec}s with exact UI)`);

    return {
      success: true,
      videoPath: outputPath,
      videoBase64,
      durationSec,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`❌ Feature-specific trailer render failed: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}
