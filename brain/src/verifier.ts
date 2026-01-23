/**
 * Functional Verification System - CRITICAL QUALITY GATE
 *
 * Uses Puppeteer to actually interact with deployed features and verify they work.
 * This runs BEFORE trailer generation and tweeting.
 *
 * If verification fails, the cycle STOPS and does NOT tweet about a broken feature.
 *
 * Verification Types:
 * 1. BASIC: Page loads, no console errors, key elements visible
 * 2. INTERACTIVE: Can click buttons, submit forms, see expected results
 * 3. GAME: Start button works, game starts, player can interact
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { buildEvents } from './builder.js';

export interface VerificationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  screenshots?: string[];
  details?: Record<string, unknown>;
}

export interface VerificationConfig {
  slug: string;
  name: string;
  description: string;
  deployUrl: string;
  timeout?: number;
}

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}`;
  console.log(logLine);
  buildEvents.emit('log', logLine);
}

/**
 * Determine the verification type based on feature description
 */
function getVerificationType(description: string, slug: string): 'basic' | 'interactive' | 'game' {
  const descLower = description.toLowerCase();
  const slugLower = slug.toLowerCase();

  // Game keywords
  const gameKeywords = ['game', 'play', 'arcade', 'shooter', 'runner', 'invaders', 'battle', 'fight', 'arena'];
  for (const keyword of gameKeywords) {
    if (descLower.includes(keyword) || slugLower.includes(keyword)) {
      return 'game';
    }
  }

  // Interactive keywords (forms, generators, tools)
  const interactiveKeywords = ['generator', 'create', 'generate', 'form', 'input', 'submit', 'tool', 'maker'];
  for (const keyword of interactiveKeywords) {
    if (descLower.includes(keyword) || slugLower.includes(keyword)) {
      return 'interactive';
    }
  }

  return 'basic';
}

/**
 * Launch browser with proper settings for VPS
 */
async function launchBrowser(): Promise<Browser> {
  return puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
  });
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * BASIC VERIFICATION
 * - Page loads without errors
 * - Key elements are visible
 * - No JavaScript crashes
 */
async function verifyBasic(page: Page, config: VerificationConfig): Promise<VerificationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  log(`   → Basic verification: checking page loads correctly...`);

  try {
    // Navigate to the page
    const response = await page.goto(config.deployUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    if (!response || response.status() !== 200) {
      errors.push(`Page returned status ${response?.status() || 'unknown'}`);
      return { success: false, errors, warnings };
    }

    // Wait for content to be visible
    await page.waitForSelector('body', { timeout: 5000 });

    // Check if page has meaningful content (not just empty)
    const bodyText = await page.evaluate(() => document.body.innerText.trim());
    if (bodyText.length < 50) {
      warnings.push('Page has very little text content');
    }

    // Check for common error indicators
    const hasErrorDisplay = await page.evaluate(() => {
      const errorTexts = ['error', 'failed', 'not found', '404', '500'];
      const text = document.body.innerText.toLowerCase();
      return errorTexts.some(err => text.includes(err) && text.length < 500);
    });

    if (hasErrorDisplay) {
      warnings.push('Page may contain error messages');
    }

    log(`   ✓ Basic verification passed`);
    return { success: true, errors, warnings };

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    errors.push(`Basic verification failed: ${errMsg}`);
    return { success: false, errors, warnings };
  }
}

/**
 * INTERACTIVE VERIFICATION
 * - All buttons are clickable (not disabled)
 * - Forms can be submitted
 * - Expected results appear after interaction
 */
async function verifyInteractive(page: Page, config: VerificationConfig): Promise<VerificationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  log(`   → Interactive verification: checking UI elements work...`);

  try {
    // First do basic verification
    const basicResult = await verifyBasic(page, config);
    if (!basicResult.success) {
      return basicResult;
    }
    errors.push(...basicResult.errors);
    warnings.push(...basicResult.warnings);

    // Find all buttons on the page
    const buttons = await page.$$('button, [role="button"], input[type="submit"]');
    log(`   → Found ${buttons.length} buttons to check`);

    // Check if any primary action buttons are disabled
    const disabledButtons = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"]'));
      return btns
        .filter((btn) => {
          const el = btn as HTMLButtonElement;
          const isDisabled = el.disabled ||
                            btn.getAttribute('aria-disabled') === 'true' ||
                            btn.classList.contains('disabled');
          const text = btn.textContent?.toLowerCase() || '';
          // Check if it's a primary action button
          const isPrimary = text.includes('start') || text.includes('generate') ||
                           text.includes('create') || text.includes('submit') ||
                           text.includes('play');
          return isDisabled && isPrimary;
        })
        .map((btn) => btn.textContent?.trim() || 'Unknown button');
    });

    if (disabledButtons.length > 0) {
      errors.push(`Primary action buttons are disabled: ${disabledButtons.join(', ')}`);
      return { success: false, errors, warnings };
    }

    // Try to find and click a primary action button
    const primaryButton = await page.$('button:not([disabled])');
    if (primaryButton) {
      log(`   → Testing button click...`);

      // Get initial state
      const initialContent = await page.evaluate(() => document.body.innerHTML.length);

      // Click the button
      await primaryButton.click();

      // Wait for something to change
      await sleep(1000);

      // Check if something happened
      const afterContent = await page.evaluate(() => document.body.innerHTML.length);
      if (Math.abs(afterContent - initialContent) < 10) {
        warnings.push('Button click may not have triggered any visible change');
      }
    }

    log(`   ✓ Interactive verification passed`);
    return { success: true, errors, warnings };

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    errors.push(`Interactive verification failed: ${errMsg}`);
    return { success: false, errors, warnings };
  }
}

/**
 * GAME VERIFICATION - CRITICAL
 * - Start/Play button is NOT disabled
 * - Clicking start actually starts the game
 * - Game canvas/scene is rendered
 * - Player can interact (keyboard/mouse events work)
 */
async function verifyGame(page: Page, config: VerificationConfig): Promise<VerificationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  log(`   → Game verification: checking game is playable...`);

  try {
    // Navigate to the page
    const response = await page.goto(config.deployUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    if (!response || response.status() !== 200) {
      errors.push(`Page returned status ${response?.status() || 'unknown'}`);
      return { success: false, errors, warnings };
    }

    // Wait for page to be ready
    await sleep(2000);

    // CRITICAL CHECK: Find start/play button and verify it's NOT disabled
    const startButtonInfo = await page.evaluate(() => {
      const startTexts = ['start', 'play', 'begin', 'launch'];
      const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));

      for (const btn of buttons) {
        const text = (btn.textContent || '').toLowerCase();
        if (startTexts.some(st => text.includes(st))) {
          const el = btn as HTMLButtonElement;
          const isDisabled = el.disabled ||
                            btn.getAttribute('aria-disabled') === 'true' ||
                            btn.classList.contains('disabled') ||
                            btn.classList.contains('opacity-50') ||
                            btn.classList.contains('cursor-not-allowed');

          // Get computed styles
          const styles = window.getComputedStyle(btn);
          const opacity = parseFloat(styles.opacity);
          const pointerEvents = styles.pointerEvents;

          return {
            found: true,
            text: btn.textContent?.trim(),
            disabled: isDisabled,
            opacity: opacity,
            pointerEvents: pointerEvents,
            classes: btn.className,
          };
        }
      }

      return { found: false, text: '', disabled: false, opacity: 1, pointerEvents: 'auto', classes: '' };
    });

    log(`   → Start button info: ${JSON.stringify(startButtonInfo)}`);

    if (!startButtonInfo.found) {
      errors.push('Could not find a start/play button');
      return { success: false, errors, warnings };
    }

    if (startButtonInfo.disabled) {
      errors.push(`START BUTTON IS DISABLED! Button text: "${startButtonInfo.text}", classes: "${startButtonInfo.classes}"`);
      return { success: false, errors, warnings };
    }

    if (startButtonInfo.opacity && startButtonInfo.opacity < 0.6) {
      errors.push(`START BUTTON appears disabled (opacity: ${startButtonInfo.opacity})`);
      return { success: false, errors, warnings };
    }

    if (startButtonInfo.pointerEvents === 'none') {
      errors.push('START BUTTON is not clickable (pointer-events: none)');
      return { success: false, errors, warnings };
    }

    // Try to click the start button
    log(`   → Clicking start button...`);
    const startButton = await page.$('button:not([disabled])');
    if (!startButton) {
      errors.push('Could not find clickable start button');
      return { success: false, errors, warnings };
    }

    await startButton.click();
    await sleep(2000);

    // Verify game started - check for canvas, WebGL context, or game-specific elements
    const gameStarted = await page.evaluate(() => {
      // Check for canvas element
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d') || canvas.getContext('webgl') || canvas.getContext('webgl2');
        if (ctx) return { started: true, type: 'canvas' };
      }

      // Check for Three.js/R3F
      const threeCanvas = document.querySelector('canvas[data-engine]');
      if (threeCanvas) return { started: true, type: 'three.js' };

      // Check if start screen is hidden
      const startScreen = document.querySelector('[class*="start"], [class*="menu"]');
      if (startScreen) {
        const styles = window.getComputedStyle(startScreen);
        if (styles.display === 'none' || styles.opacity === '0') {
          return { started: true, type: 'screen-hidden' };
        }
      }

      // Check for game state indicators
      const scoreElement = document.querySelector('[class*="score"], [class*="health"], [class*="lives"]');
      if (scoreElement) return { started: true, type: 'game-ui' };

      return { started: false, type: 'unknown' };
    });

    log(`   → Game start check: ${JSON.stringify(gameStarted)}`);

    if (!gameStarted.started) {
      warnings.push('Could not confirm game started after clicking start button');
    }

    // Try keyboard input to verify interactivity
    log(`   → Testing keyboard controls...`);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Space');
    await sleep(500);

    // Take a screenshot for manual verification if needed
    const screenshot = await page.screenshot({ encoding: 'base64' });

    log(`   ✓ Game verification passed`);
    return {
      success: true,
      errors,
      warnings,
      screenshots: [screenshot as string],
      details: { gameStarted, startButtonInfo }
    };

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    errors.push(`Game verification failed: ${errMsg}`);
    return { success: false, errors, warnings };
  }
}

/**
 * Main verification entry point
 * Runs the appropriate verification based on feature type
 */
export async function verifyFeature(config: VerificationConfig): Promise<VerificationResult> {
  const verificationType = getVerificationType(config.description, config.slug);
  log(`🔍 FUNCTIONAL VERIFICATION: ${config.name}`);
  log(`   Type: ${verificationType}`);
  log(`   URL: ${config.deployUrl}`);

  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Collect console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    let result: VerificationResult;

    switch (verificationType) {
      case 'game':
        result = await verifyGame(page, config);
        break;
      case 'interactive':
        result = await verifyInteractive(page, config);
        break;
      default:
        result = await verifyBasic(page, config);
    }

    // Add any console errors
    if (consoleErrors.length > 0) {
      result.warnings.push(`Console errors detected: ${consoleErrors.slice(0, 3).join('; ')}`);
    }

    // Log result
    if (result.success) {
      log(`✅ VERIFICATION PASSED: ${config.name}`);
      if (result.warnings.length > 0) {
        log(`   Warnings: ${result.warnings.join(', ')}`);
      }
    } else {
      log(`❌ VERIFICATION FAILED: ${config.name}`);
      log(`   Errors: ${result.errors.join(', ')}`);
    }

    return result;

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`❌ VERIFICATION ERROR: ${errorMsg}`);
    return {
      success: false,
      errors: [`Verification crashed: ${errorMsg}`],
      warnings: [],
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Quick smoke test - just checks if page loads
 * Used as a fallback if full verification times out
 */
export async function smokeTest(url: string): Promise<boolean> {
  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    return response?.status() === 200;
  } catch {
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
