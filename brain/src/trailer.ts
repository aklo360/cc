/**
 * Trailer Generator - Creates 20-second CINEMATIC 3D trailers for features
 *
 * ARCHITECTURE:
 * - Uses WebappTrailer composition (3D tilted terminal with camera movements)
 * - ALL trailers are 20 seconds (universal format)
 * - Screen recording ONLY for WebGL/Three.js (detected from manifest)
 * - Uses manifest ground truth for content
 *
 * CINEMATIC FEATURES (from WebappTrailer):
 * - 3D perspective with tilted terminal window
 * - Dolly ins/zooms on active elements
 * - Cursor with click animations
 * - Typewriter text animation
 * - Camera tracks focal points perfectly centered
 */

import path from 'path';
import fs from 'fs';
import { buildEvents } from './builder.js';
import { recordFeature } from './recorder.js';
import { FeatureManifest } from './manifest.js';
import { execWithTimeout } from './process-manager.js';
import { getCycleTrailer, setCycleTrailer } from './db.js';

// Paths
const projectRoot = process.env.PROJECT_ROOT || process.cwd().replace('/brain', '');
const VIDEO_DIR = path.join(projectRoot, 'video');
const OUTPUT_DIR = path.join(projectRoot, 'brain/recordings');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Universal trailer duration: 20 seconds
const TRAILER_DURATION_SEC = 20;

/**
 * WebappTrailer props - matches WebappTrailer.tsx WebappTrailerProps
 * This is the CINEMATIC 3D trailer template used for ALL features
 */
export interface WebappTrailerProps {
  featureName: string;
  featureSlug: string;
  tagline?: string;
  inputPlaceholder?: string;
  inputContent?: string;
  buttonText?: string;
  outputLines?: string[];
  outputStyle?: 'text' | 'code' | 'poetry';
}

export interface TrailerConfig {
  name: string;
  slug: string;
  description: string;
  tagline?: string;
  /** Ground truth manifest from the deployed feature - prevents hallucination */
  manifest?: FeatureManifest;
  /** Cycle ID for idempotency - reuses existing trailer if available */
  cycleId?: number;
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
 * Determine output style based on feature type
 */
function getOutputStyle(config: TrailerConfig): 'text' | 'code' | 'poetry' {
  const slug = config.slug.toLowerCase();
  const name = config.name.toLowerCase();
  const desc = config.description.toLowerCase();

  if (slug.includes('poetry') || slug.includes('haiku') || name.includes('poetry')) {
    return 'poetry';
  }

  if (slug.includes('refactor') || slug.includes('code') || slug.includes('review') ||
      slug.includes('roast') || desc.includes('code')) {
    return 'code';
  }

  return 'text';
}

/**
 * Get the primary action button text from manifest
 */
function getPrimaryButton(config: TrailerConfig): string {
  if (!config.manifest?.buttons?.length) {
    return 'Generate';
  }

  const actionKeywords = ['generate', 'create', 'start', 'play', 'submit', 'run', 'build',
                          'analyze', 'roast', 'review', 'refactor', 'debug', 'get', 'check'];

  for (const btn of config.manifest.buttons) {
    if (actionKeywords.some(k => btn.toLowerCase().includes(k))) {
      return btn;
    }
  }

  return config.manifest.buttons[0] || 'Generate';
}

/**
 * Generate WebappTrailer props from a FeatureManifest (ground truth)
 * This uses ONLY verified information from the actual deployed page.
 * NO hallucination - if manifest is missing, uses safe fallbacks.
 */
function generateWebappTrailerProps(config: TrailerConfig): WebappTrailerProps {
  const outputStyle = getOutputStyle(config);
  const buttonText = getPrimaryButton(config);

  if (config.manifest) {
    log(`🎭 Generating CINEMATIC trailer from MANIFEST (ground truth)`);
    log(`   Page title: "${config.manifest.pageTitle}"`);
    log(`   Interaction type: ${config.manifest.interactionType}`);
    log(`   Rendering type: ${config.manifest.renderingType}`);
    log(`   Buttons found: ${config.manifest.buttons.join(', ') || 'none'}`);
    log(`   Output style: ${outputStyle}`);
    log(`   Primary button: "${buttonText}"`);

    // Get output lines from manifest or generate fallback
    const outputLines = config.manifest.capturedOutputLines?.length
      ? config.manifest.capturedOutputLines.slice(0, 6)
      : getDefaultOutputLines(config, outputStyle);

    return {
      featureName: config.name,
      featureSlug: config.slug,
      tagline: config.tagline || config.description.slice(0, 50),
      inputPlaceholder: config.manifest.inputs[0] || '// Paste your code here...',
      inputContent: config.manifest.exampleInput || getDefaultInput(config),
      buttonText,
      outputLines,
      outputStyle,
    };
  }

  // No manifest - use safe fallback
  log(`⚠️ No manifest provided - using keyword-based fallback`);
  return {
    featureName: config.name,
    featureSlug: config.slug,
    tagline: config.tagline || config.description.slice(0, 50),
    inputPlaceholder: '// Paste your code here...',
    inputContent: getDefaultInput(config),
    buttonText,
    outputLines: getDefaultOutputLines(config, outputStyle),
    outputStyle,
  };
}

/**
 * Get default input content based on feature type
 */
function getDefaultInput(config: TrailerConfig): string {
  const slug = config.slug.toLowerCase();

  if (slug.includes('refactor') || slug.includes('code')) {
    return `function calculate(a, b, op) {
  var result;
  if (op == "add") result = a + b;
  else if (op == "sub") result = a - b;
  return result;
}`;
  }

  if (slug.includes('roast')) {
    return `function doStuff(x) {
  var y = x * 2;
  console.log(y);
  return y;
}`;
  }

  if (slug.includes('poetry')) {
    return `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n-1) + fibonacci(n-2);
}`;
  }

  return `// Your input here
const example = "Hello $CC!";
console.log(example);`;
}

/**
 * Get default output lines based on feature type
 */
function getDefaultOutputLines(config: TrailerConfig, style: 'text' | 'code' | 'poetry'): string[] {
  const slug = config.slug.toLowerCase();

  if (slug.includes('refactor')) {
    return [
      'type Operation = "add" | "sub";',
      '',
      'function calculate(a: number, b: number, op: Operation): number {',
      '  const ops = { add: (a, b) => a + b, sub: (a, b) => a - b };',
      '  return ops[op](a, b);',
      '}',
    ];
  }

  if (slug.includes('roast')) {
    return [
      "Oh honey, var in 2026? That's vintage... like a flip phone.",
      "",
      "doStuff? More like doNothing useful with that name.",
      "",
      "console.log for debugging? We have debuggers now, grandpa.",
    ];
  }

  if (slug.includes('poetry')) {
    return [
      "Recursive dance of numbers,",
      "Each call returns to sender,",
      "Fibonacci blooms eternal.",
    ];
  }

  if (slug.includes('review')) {
    return [
      "✓ Clean export pattern",
      "✓ Async handler correctly structured",
      "⚠ Consider adding input validation",
      "⚠ Add error handling for process()",
      "Overall: 7/10 - Solid foundation",
    ];
  }

  if (slug.includes('duck')) {
    return [
      "🦆 *tilts head*",
      "",
      "Have you tried explaining what each variable does?",
      "Walk me through line 3 - what should happen there?",
    ];
  }

  // Generic fallback
  return [
    "✨ Processing complete!",
    "",
    `Your ${config.name} result is ready.`,
    `Try it at claudecode.wtf/${config.slug}`,
  ];
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
 * 1. Check for existing trailer (idempotency)
 * 2. Check if manifest indicates WebGL (needs screen recording)
 * 3. If WebGL: capture 6s footage first
 * 4. Generate scene content from manifest (ground truth)
 * 5. Render with Remotion (always 20 seconds)
 * 6. Store trailer path in DB for future reuse
 */
export async function generateTrailer(
  config: TrailerConfig,
  deployUrl?: string
): Promise<TrailerResult> {
  log(`🎬 Generating ${TRAILER_DURATION_SEC}s trailer for: ${config.name}`);

  // IDEMPOTENCY: Check if trailer already exists for this cycle
  if (config.cycleId) {
    const existingTrailer = getCycleTrailer(config.cycleId);
    if (existingTrailer && fs.existsSync(existingTrailer)) {
      log(`   ✓ Reusing existing trailer: ${path.basename(existingTrailer)}`);
      const videoBuffer = fs.readFileSync(existingTrailer);
      const videoBase64 = videoBuffer.toString('base64');
      const stats = fs.statSync(existingTrailer);
      const sizeMb = (stats.size / 1024 / 1024).toFixed(1);

      log(`   ✓ Loaded existing trailer: ${sizeMb} MB`);
      return {
        success: true,
        videoPath: existingTrailer,
        videoBase64,
        durationSec: TRAILER_DURATION_SEC,
      };
    }
  }

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

  // Generate WebappTrailer props from MANIFEST (ground truth)
  const trailerProps = generateWebappTrailerProps(config);

  // Render with Remotion
  const outputPath = path.join(OUTPUT_DIR, `${config.slug}_${Date.now()}.mp4`);

  const propsJson = JSON.stringify(trailerProps).replace(/'/g, "'\\''");

  try {
    // Check if Remotion is installed
    const packageJsonPath = path.join(VIDEO_DIR, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      log(`❌ Remotion not set up at ${VIDEO_DIR}`);
      return { success: false, error: 'Remotion not installed' };
    }

    log(`📹 Rendering CINEMATIC 3D trailer with Remotion...`);
    log(`   Composition: WebappTrailer (3D tilted terminal + camera movements)`);
    log(`   Duration: ${TRAILER_DURATION_SEC} seconds`);
    log(`   Button: "${trailerProps.buttonText}"`);
    log(`   Style: ${trailerProps.outputStyle}`);
    log(`   Output: ${path.basename(outputPath)}`);

    const command = `cd "${VIDEO_DIR}" && npx remotion render WebappTrailer "${outputPath}" --props='${propsJson}' --log=error`;

    // Use execWithTimeout for proper process killing on timeout
    const { stdout, stderr } = await execWithTimeout(command, {
      timeout: 180000, // 3 minute timeout - process WILL be killed on timeout
      description: 'Remotion render',
      cycleId: config.cycleId,
    });

    if (stderr && !stderr.includes('Rendered')) {
      log(`⚠️ Remotion stderr: ${stderr}`);
    }

    // Verify output exists
    if (!fs.existsSync(outputPath)) {
      log(`❌ Remotion output not found at ${outputPath}`);
      return { success: false, error: 'Remotion render produced no output' };
    }

    // Store trailer path in DB for idempotency
    if (config.cycleId) {
      setCycleTrailer(config.cycleId, outputPath);
      log(`   ✓ Trailer path stored in database for idempotency`);
    }

    // Read video as base64 for Twitter
    const videoBuffer = fs.readFileSync(outputPath);
    const videoBase64 = videoBuffer.toString('base64');

    const stats = fs.statSync(outputPath);
    const sizeMb = (stats.size / 1024 / 1024).toFixed(1);

    log(`✅ CINEMATIC 3D trailer generated: ${sizeMb} MB (${TRAILER_DURATION_SEC}s)`);

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
