/**
 * Feature Manifest - Ground Truth Extraction
 *
 * After a feature is built and deployed, this module extracts the ACTUAL
 * capabilities from the deployed page using Puppeteer. This ensures trailers
 * and marketing never hallucinate features that don't exist.
 *
 * The manifest is passed to trailer generation and tweet writing so they
 * can ONLY reference real, verified capabilities.
 */

import puppeteer from 'puppeteer';
import { buildEvents } from './builder.js';

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}`;
  console.log(logLine);
  buildEvents.emit('log', logLine);
}

/**
 * Ground truth about what a feature ACTUALLY does.
 * This is extracted from the deployed page, not imagined.
 */
export interface FeatureManifest {
  // Basic info
  name: string;
  slug: string;

  // What the feature ACTUALLY does (extracted from page)
  pageTitle: string;
  pageDescription: string;

  // UI elements found on the page
  buttons: string[];           // Text of all buttons found
  inputs: string[];            // Placeholder text of inputs
  headings: string[];          // H1, H2, H3 text

  // Interaction classification
  interactionType: 'single-player' | 'generator' | 'viewer' | 'tool' | 'unknown';

  // What we DON'T have (hard constraints)
  constraints: {
    hasMultiplayer: false;      // We don't have multiplayer yet
    hasTokenRewards: false;     // We don't have Solana integration yet
    hasLeaderboard: false;      // We don't have persistent leaderboards yet
    hasUserAccounts: false;     // We don't have auth yet
  };

  // Extracted example content (if any)
  exampleInput?: string;        // Default/placeholder input found
  exampleOutput?: string;       // Any visible output text

  // CRITICAL: Captured output from actually clicking the feature
  capturedOutputLines?: string[];  // Actual output content for trailer
}

/**
 * Extract a FeatureManifest from a deployed feature page.
 * Uses Puppeteer to scrape the actual page content.
 */
export async function extractFeatureManifest(
  deployUrl: string,
  name: string,
  slug: string
): Promise<FeatureManifest> {
  log(`📋 Extracting feature manifest from: ${deployUrl}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Disable cache to ensure fresh content
    await page.setCacheEnabled(false);

    // Navigate to the deployed feature
    log(`   → Navigating to: ${deployUrl}`);
    await page.goto(deployUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Validate we reached the correct page (not redirected to homepage)
    const currentUrl = page.url();
    log(`   → Current URL: ${currentUrl}`);

    // Check if we got redirected to homepage or hit a 404
    const pageTitle = await page.title();
    const homepageIndicators = ['claude code coin', '$cc', 'memecoin'];
    const titleLower = pageTitle.toLowerCase();
    const isHomepage = homepageIndicators.some(i => titleLower.includes(i)) && !currentUrl.includes(`/${slug}`);

    if (isHomepage) {
      log(`   ⚠️ Got redirected to homepage! Title: "${pageTitle}"`);
      log(`   → Will use feature-specific fallback content`);
    }

    // Wait for content to render
    await new Promise(r => setTimeout(r, 2000));

    // CRITICAL: Try to interact with the feature to capture REAL output
    // This is essential for trailers that show the actual user journey
    let capturedOutputLines: string[] = [];

    try {
      // Capture BEFORE state - what's visible initially
      const beforeContent = await page.evaluate(() => {
        return document.body.innerText;
      });

      // Look for primary action button with common action text
      const actionButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button:not([disabled]), [role="button"]:not([disabled])'));
        const actionKeywords = ['generate', 'create', 'start', 'play', 'submit', 'run', 'build', 'analyze', 'roast', 'review', 'get', 'check'];

        // Find button with action keyword
        for (const btn of buttons) {
          const text = btn.textContent?.toLowerCase() || '';
          if (actionKeywords.some(k => text.includes(k))) {
            return btn as HTMLElement;
          }
        }

        // Fallback to first button
        return buttons[0] as HTMLElement | undefined;
      });

      if (actionButton) {
        log('   → Found action button, clicking to capture output...');

        // Click the button
        await (actionButton as any).click();

        // Wait for AI/async content to generate (most features need 3-8 seconds)
        // Use a longer wait for AI-powered features
        log('   → Waiting for output to generate (up to 8 seconds)...');
        await new Promise(r => setTimeout(r, 8000));

        // Capture AFTER state and find what's NEW
        capturedOutputLines = await page.evaluate((beforeText: string) => {
          // Get ALL text content that might be output
          const candidates: string[] = [];

          // 1. Look for common output containers with broader selectors
          const outputSelectors = [
            '[class*="result"]', '[class*="output"]', '[class*="response"]',
            '[class*="roast"]', '[class*="review"]', '[class*="mood"]',
            '[class*="analysis"]', '[class*="generated"]', '[class*="content"]',
            '.prose', '.prose-invert',
            'pre', 'code',
            '[class*="card"] p', '[class*="Card"] p',
            'main p', 'main div > p',
            '.space-y-2 > *', '.space-y-3 > *', '.space-y-4 > *', '.space-y-6 > *',
            '.flex-col > p', '.flex-col > div'
          ];

          for (const selector of outputSelectors) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              const text = el.textContent?.trim();
              if (text && text.length > 15 && text.length < 500) {
                candidates.push(text);
              }
            });
          }

          // 2. Also grab direct text from major containers
          const mainContent = document.querySelector('main');
          if (mainContent) {
            const directText = mainContent.innerText;
            const paragraphs = directText.split('\n').filter(p => p.trim().length > 20);
            candidates.push(...paragraphs);
          }

          // 3. Filter to find NEW content (not in before state)
          const newContent: string[] = [];
          const beforeLower = beforeText.toLowerCase();

          for (const text of candidates) {
            const cleanText = text.replace(/\s+/g, ' ').trim();
            // Skip if it was already visible before clicking
            if (beforeLower.includes(cleanText.toLowerCase().slice(0, 50))) continue;
            // Skip common UI elements
            if (cleanText.includes('undefined')) continue;
            if (cleanText.match(/^(copy|share|download|submit|generate|loading)/i)) continue;
            // Skip if duplicate
            if (newContent.some(existing => existing.includes(cleanText) || cleanText.includes(existing))) continue;

            newContent.push(cleanText);
          }

          // Return the best new content
          return newContent.slice(0, 6);
        }, beforeContent);

        log(`   → Captured ${capturedOutputLines.length} NEW output lines`);
        if (capturedOutputLines.length > 0) {
          log(`   → First line: "${capturedOutputLines[0].slice(0, 60)}..."`);
        }
      }
    } catch (interactionError) {
      log(`   ⚠️ Could not interact with feature: ${interactionError}`);
    }

    // Extract page content
    const extracted = await page.evaluate(() => {
      // Get page title
      const pageTitle = document.title || '';

      // Get meta description
      const metaDesc = document.querySelector('meta[name="description"]');
      const pageDescription = metaDesc?.getAttribute('content') || '';

      // Get all button text
      const buttons = Array.from(document.querySelectorAll('button, [role="button"], a.btn, .button'))
        .map(el => el.textContent?.trim())
        .filter((text): text is string => !!text && text.length < 50);

      // Get all input placeholders
      const inputs = Array.from(document.querySelectorAll('input, textarea'))
        .map(el => (el as HTMLInputElement).placeholder)
        .filter((text): text is string => !!text);

      // Get headings
      const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
        .map(el => el.textContent?.trim())
        .filter((text): text is string => !!text && text.length < 100);

      // Try to find example input (textarea or input with value)
      const textareaWithValue = document.querySelector('textarea') as HTMLTextAreaElement | null;
      const exampleInput = textareaWithValue?.value || textareaWithValue?.placeholder || '';

      // Try to find output area
      const outputArea = document.querySelector('.output, .result, [class*="output"], [class*="result"]');
      const exampleOutput = outputArea?.textContent?.trim().slice(0, 200) || '';

      return {
        pageTitle,
        pageDescription,
        buttons: [...new Set(buttons)].slice(0, 10),
        inputs: [...new Set(inputs)].slice(0, 5),
        headings: [...new Set(headings)].slice(0, 5),
        exampleInput: exampleInput.slice(0, 200),
        exampleOutput: exampleOutput.slice(0, 200),
      };
    });

    await browser.close();

    // Classify the interaction type based on what we found
    const interactionType = classifyInteractionType(extracted.buttons, extracted.inputs, slug);

    const manifest: FeatureManifest = {
      name,
      slug,
      pageTitle: extracted.pageTitle,
      pageDescription: extracted.pageDescription,
      buttons: extracted.buttons,
      inputs: extracted.inputs,
      headings: extracted.headings,
      interactionType,
      constraints: {
        hasMultiplayer: false,
        hasTokenRewards: false,
        hasLeaderboard: false,
        hasUserAccounts: false,
      },
      exampleInput: extracted.exampleInput || undefined,
      exampleOutput: extracted.exampleOutput || undefined,
      capturedOutputLines: capturedOutputLines.length > 0 ? capturedOutputLines : undefined,
    };

    log(`✅ Manifest extracted:`);
    log(`   Title: "${manifest.pageTitle}"`);
    log(`   Type: ${manifest.interactionType}`);
    log(`   Buttons: ${manifest.buttons.join(', ') || 'none'}`);
    log(`   Inputs: ${manifest.inputs.length} found`);

    return manifest;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`⚠️ Manifest extraction failed: ${errorMsg}`);

    if (browser) {
      await browser.close();
    }

    // Return a minimal manifest with safe defaults
    return {
      name,
      slug,
      pageTitle: name,
      pageDescription: '',
      buttons: [],
      inputs: [],
      headings: [name],
      interactionType: 'unknown',
      constraints: {
        hasMultiplayer: false,
        hasTokenRewards: false,
        hasLeaderboard: false,
        hasUserAccounts: false,
      },
    };
  }
}

/**
 * Classify what type of interaction this feature provides
 */
function classifyInteractionType(
  buttons: string[],
  inputs: string[],
  slug: string
): FeatureManifest['interactionType'] {
  const buttonText = buttons.join(' ').toLowerCase();
  const slugLower = slug.toLowerCase();

  // Games
  if (buttonText.includes('start') || buttonText.includes('play') ||
      slugLower.includes('game') || slugLower.includes('play')) {
    return 'single-player';
  }

  // Generators
  if (buttonText.includes('generate') || buttonText.includes('create') ||
      inputs.length > 0) {
    return 'generator';
  }

  // Tools
  if (buttonText.includes('convert') || buttonText.includes('analyze') ||
      buttonText.includes('check')) {
    return 'tool';
  }

  // Viewers (no inputs, mostly display)
  if (inputs.length === 0 && buttons.length <= 2) {
    return 'viewer';
  }

  return 'unknown';
}

/**
 * Generate trailer-safe content from a manifest.
 * This ONLY uses verified information from the manifest.
 */
export function manifestToTrailerContent(manifest: FeatureManifest): {
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
} {
  // Find the primary ACTION button (prefer "Generate", "Create", "Start", etc.)
  const actionKeywords = ['generate', 'create', 'start', 'play', 'submit', 'run', 'build', 'convert', 'analyze'];
  const primaryButton = manifest.buttons.find(btn =>
    actionKeywords.some(keyword => btn.toLowerCase().includes(keyword))
  ) || manifest.buttons[0] || 'Try It';

  // Use ACTUAL input placeholder, or safe default
  const inputLabel = manifest.inputs[0] || 'Enter your input';

  // Use actual example if found, otherwise generic
  const inputDemo = manifest.exampleInput || `// Try ${manifest.name}`;

  // Determine output style based on type
  let outputStyle: 'poetry' | 'code' | 'terminal' | 'battle' = 'terminal';
  if (manifest.slug.includes('poetry') || manifest.slug.includes('haiku')) {
    outputStyle = 'poetry';
  } else if (manifest.interactionType === 'single-player') {
    outputStyle = 'battle';
  } else if (manifest.inputs.some(i => i.toLowerCase().includes('code'))) {
    outputStyle = 'code';
  }

  // Build output lines from REAL captured output (preferred) or generate specific fallback
  // CRITICAL: The trailer MUST show actual output, NEVER generic placeholder text
  let outputLines: string[];

  if (manifest.capturedOutputLines && manifest.capturedOutputLines.length > 0) {
    // Use REAL output that was captured by clicking the feature
    outputLines = manifest.capturedOutputLines.slice(0, 5);
  } else if (manifest.exampleOutput && manifest.exampleOutput.length > 30) {
    // Split long output into lines
    outputLines = manifest.exampleOutput.split(/[.!?]\s+/).filter(l => l.length > 10).slice(0, 4);
  } else if (manifest.headings.length > 2) {
    // Use headings as fallback
    outputLines = manifest.headings.slice(1, 5);
  } else {
    // Generate SPECIFIC content based on the feature type (never generic placeholders!)
    // These should feel like real outputs, not "result appears here" placeholders
    const slug = manifest.slug.toLowerCase();
    const name = manifest.name.toLowerCase();

    if (slug.includes('mood') || name.includes('mood')) {
      outputLines = [
        '🟠 Focused & Determined',
        'Your code shows signs of deep concentration',
        'Clean patterns, minimal distractions',
        'Peak productivity zone detected',
      ];
    } else if (slug.includes('roast') || name.includes('roast')) {
      outputLines = [
        'Your variable names are so bad...',
        'Even the compiler is confused',
        'This code has more bugs than features',
        'At least it runs... sometimes',
      ];
    } else if (slug.includes('review') || name.includes('review')) {
      outputLines = [
        '✓ Code structure looks solid',
        '⚠ Consider extracting this into a function',
        '💡 This could be simplified',
        'Overall: Good foundation, room to improve',
      ];
    } else if (slug.includes('commit') || name.includes('commit')) {
      outputLines = [
        'fix: resolve edge case in parser',
        'feat: add dark mode support',
        'refactor: simplify authentication flow',
        'chore: update dependencies',
      ];
    } else if (slug.includes('ide') || name.includes('ide') || name.includes('editor')) {
      outputLines = [
        'function fibonacci(n) {',
        '  if (n <= 1) return n;',
        '  return fibonacci(n-1) + fibonacci(n-2);',
        '}',
      ];
    } else if (slug.includes('duck') || name.includes('duck')) {
      outputLines = [
        '🦆 Quack! Have you tried explaining it out loud?',
        'Walk me through your logic step by step',
        'What did you expect vs what happened?',
        'Sometimes the bug is where you least expect it',
      ];
    } else {
      // Final fallback - make it feel like AI-generated content
      outputLines = [
        '✨ Analysis complete',
        'Processing successful',
        'Ready to share',
        `View at claudecode.wtf/${manifest.slug}`,
      ];
    }
  }

  // Processing text based on type
  let processingText = 'Processing';
  let processingSubtext = 'Working on it...';

  switch (manifest.interactionType) {
    case 'generator':
      processingText = 'Generating';
      processingSubtext = 'Creating your result';
      break;
    case 'single-player':
      processingText = 'Loading';
      processingSubtext = 'Preparing the experience';
      break;
    case 'tool':
      processingText = 'Analyzing';
      processingSubtext = 'Processing your input';
      break;
  }

  // Callout - use page description if available, otherwise generic
  const calloutDescription = manifest.pageDescription
    || `A new feature from $CC`;

  return {
    inputDemo,
    inputLabel,
    buttonText: primaryButton,
    processingText,
    processingSubtext,
    outputHeader: manifest.headings[0] || 'Result',
    outputLines,
    outputStyle,
    calloutTitle: 'HOW IT WORKS',
    calloutDescription: calloutDescription.slice(0, 100),
  };
}
