/**
 * WEBAPP TRAILER GENERATOR
 *
 * Generates trailers that look EXACTLY like the real webapp by:
 * 1. Extracting UI content from the manifest (real buttons, inputs, outputs)
 * 2. Passing that content to the WebappTrailer Remotion composition
 * 3. Rendering a video that recreates the exact user journey
 *
 * The result looks identical to the real webapp - same colors, components, layout.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { buildEvents } from './builder.js';
import { extractFeatureManifest, FeatureManifest } from './manifest.js';

const execAsync = promisify(exec);

const projectRoot = process.env.PROJECT_ROOT || process.cwd().replace('/brain', '');
const VIDEO_DIR = path.join(projectRoot, 'video');
const OUTPUT_DIR = path.join(process.cwd(), 'recordings');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}`;
  console.log(logLine);
  buildEvents.emit('log', logLine);
}

export interface WebappTrailerConfig {
  name: string;
  slug: string;
  description: string;
  deployUrl: string;
  tagline?: string;
}

export interface WebappTrailerResult {
  success: boolean;
  videoPath?: string;
  videoBase64?: string;
  error?: string;
  manifest?: FeatureManifest;
}

/**
 * Determine output style based on feature type
 */
function getOutputStyle(manifest: FeatureManifest): "text" | "code" | "poetry" {
  const slug = manifest.slug.toLowerCase();
  const name = manifest.name.toLowerCase();

  if (slug.includes('poetry') || slug.includes('haiku') || name.includes('poetry')) {
    return 'poetry';
  }

  if (slug.includes('refactor') || slug.includes('code') || slug.includes('review') ||
      manifest.inputs.some(i => i.toLowerCase().includes('code'))) {
    return 'code';
  }

  return 'text';
}

/**
 * Get example input content for the feature
 */
function getExampleInput(manifest: FeatureManifest): string {
  // Use captured example if available
  if (manifest.exampleInput && manifest.exampleInput.length > 10) {
    return manifest.exampleInput;
  }

  // Generate based on feature type
  const slug = manifest.slug.toLowerCase();

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

  if (slug.includes('mood')) {
    return `async function fetchData() {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch (e) {
    console.error(e);
  }
}`;
  }

  if (slug.includes('review')) {
    return `export const handler = async (req) => {
  const data = req.body;
  const result = process(data);
  return Response.json(result);
};`;
  }

  return `// Your input here
const example = "Hello $CC!";
console.log(example);`;
}

/**
 * Get output lines for the feature
 * Uses captured output if available, otherwise generates appropriate fallback
 */
function getOutputLines(manifest: FeatureManifest): string[] {
  // Use REAL captured output if available
  if (manifest.capturedOutputLines && manifest.capturedOutputLines.length > 0) {
    log(`   Using ${manifest.capturedOutputLines.length} REAL output lines from manifest`);
    return manifest.capturedOutputLines.slice(0, 6);
  }

  // Generate feature-specific output
  const slug = manifest.slug.toLowerCase();
  const name = manifest.name.toLowerCase();

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

  if (slug.includes('mood')) {
    return [
      "🟢 Calm & Collected",
      "",
      "Your code shows clear thinking.",
      "Good error handling, async/await pattern.",
      "Mood: Zen Developer 🧘",
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
      "Sometimes the bug is in your assumptions, not the code.",
    ];
  }

  // Generic fallback
  return [
    "✨ Processing complete!",
    "",
    `Your ${manifest.name} result is ready.`,
    `Try it at claudecode.wtf/${manifest.slug}`,
  ];
}

/**
 * Find the primary action button text
 */
function getPrimaryButton(manifest: FeatureManifest): string {
  const actionKeywords = ['generate', 'create', 'start', 'play', 'submit', 'run', 'build',
                          'analyze', 'roast', 'review', 'refactor', 'debug', 'get', 'check'];

  for (const btn of manifest.buttons) {
    if (actionKeywords.some(k => btn.toLowerCase().includes(k))) {
      return btn;
    }
  }

  return manifest.buttons[0] || 'Generate';
}

/**
 * Generate a webapp-style trailer
 */
export async function generateWebappTrailer(config: WebappTrailerConfig): Promise<WebappTrailerResult> {
  const { name, slug, description, deployUrl, tagline } = config;

  log(`🎬 WEBAPP TRAILER: Generating with exact UI recreation`);
  log(`   Feature: ${name}`);
  log(`   URL: ${deployUrl}`);

  // PHASE 1: Extract manifest from deployed page
  log(`\n📋 PHASE 1: Extracting manifest from deployed page...`);

  const manifest = await extractFeatureManifest(deployUrl, name, slug);

  log(`   Page title: ${manifest.pageTitle}`);
  log(`   Buttons: ${manifest.buttons.join(', ')}`);
  log(`   Inputs: ${manifest.inputs.length} found`);
  log(`   Captured output: ${manifest.capturedOutputLines?.length || 0} lines`);

  // PHASE 2: Build props for Remotion
  log(`\n🎨 PHASE 2: Building trailer props from manifest...`);

  const primaryButton = getPrimaryButton(manifest);
  const outputStyle = getOutputStyle(manifest);
  const inputContent = getExampleInput(manifest);
  const outputLines = getOutputLines(manifest);

  log(`   Button text: "${primaryButton}"`);
  log(`   Output style: ${outputStyle}`);
  log(`   Input placeholder: "${manifest.inputs[0] || 'Enter input...'}"`)
  log(`   Output lines: ${outputLines.length}`);

  const props = {
    featureName: name,
    featureSlug: slug,
    tagline: tagline || description.slice(0, 50),
    inputPlaceholder: manifest.inputs[0] || '// Paste your code here...',
    inputContent,
    buttonText: primaryButton,
    outputLines,
    outputStyle,
  };

  const propsJson = JSON.stringify(props).replace(/'/g, "'\\''");

  // PHASE 3: Render with Remotion
  log(`\n🎥 PHASE 3: Rendering with Remotion...`);

  const outputPath = path.join(OUTPUT_DIR, `${slug}_webapp_${Date.now()}.mp4`);

  try {
    const packageJsonPath = path.join(VIDEO_DIR, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return { success: false, error: 'Remotion not set up', manifest };
    }

    log(`   Composition: WebappTrailer`);
    log(`   Duration: 20 seconds`);
    log(`   Output: ${path.basename(outputPath)}`);

    const command = `cd "${VIDEO_DIR}" && npx remotion render WebappTrailer "${outputPath}" --props='${propsJson}' --log=error`;

    const { stderr } = await execAsync(command, {
      timeout: 180000,
      maxBuffer: 10 * 1024 * 1024,
    });

    if (stderr && !stderr.includes('Rendered')) {
      log(`   ⚠️ Remotion stderr: ${stderr}`);
    }

    if (!fs.existsSync(outputPath)) {
      return { success: false, error: 'Remotion render produced no output', manifest };
    }

    const videoBuffer = fs.readFileSync(outputPath);
    const videoBase64 = videoBuffer.toString('base64');

    const stats = fs.statSync(outputPath);
    const sizeMb = (stats.size / 1024 / 1024).toFixed(1);

    log(`\n✅ WEBAPP TRAILER COMPLETE`);
    log(`   Output: ${path.basename(outputPath)}`);
    log(`   Size: ${sizeMb} MB`);

    return {
      success: true,
      videoPath: outputPath,
      videoBase64,
      manifest,
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`   ❌ Remotion render failed: ${errorMsg}`);
    return { success: false, error: errorMsg, manifest };
  }
}
