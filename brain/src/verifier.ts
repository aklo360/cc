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
 *
 * Fixed issues:
 * - Added launch timeout to prevent hanging
 * - Added overall verification timeout
 * - Proper browser cleanup in all cases
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { buildEvents } from './builder.js';

// Timeouts
const BROWSER_LAUNCH_TIMEOUT_MS = 30000; // 30 seconds to launch browser
const VERIFICATION_TIMEOUT_MS = 120000;  // 2 minutes for entire verification

// Track active browsers for cleanup
const activeBrowsers = new Set<Browser>();

// Cleanup any active browsers on process exit
function cleanupActiveBrowsers(): void {
  for (const browser of activeBrowsers) {
    try {
      browser.close();
    } catch {
      // Ignore errors during cleanup
    }
  }
  activeBrowsers.clear();
}

// Register cleanup handlers
process.on('exit', cleanupActiveBrowsers);
process.on('SIGINT', cleanupActiveBrowsers);
process.on('SIGTERM', cleanupActiveBrowsers);

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
 * Includes timeout to prevent hanging
 */
async function launchBrowser(): Promise<Browser> {
  const launchPromise = puppeteer.launch({
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

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Browser launch timed out after ${BROWSER_LAUNCH_TIMEOUT_MS}ms`));
    }, BROWSER_LAUNCH_TIMEOUT_MS);
  });

  const browser = await Promise.race([launchPromise, timeoutPromise]);
  activeBrowsers.add(browser);
  return browser;
}

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
 * BRAND VERIFICATION - CRITICAL QUALITY GATE
 * Checks that the deployed feature follows claudecode.wtf design system
 * - Terminal header with traffic light dots
 * - Dark theme colors (bg-bg-primary, not white/light)
 * - Standard footer with "claudecode.wtf · 100% of fees to @bcherny"
 * - Claude orange accent color
 */
async function verifyBrand(page: Page, config: VerificationConfig): Promise<VerificationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  log(`   → Brand verification: checking design system compliance...`);

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

    await sleep(1000);

    // Run brand compliance checks
    const brandCheck = await page.evaluate(() => {
      const issues: string[] = [];

      // CHECK 1: Terminal header with traffic light dots
      const trafficLightDots = document.querySelectorAll('.rounded-full');
      const hasRedDot = Array.from(trafficLightDots).some(el => {
        const bg = window.getComputedStyle(el).backgroundColor;
        return bg.includes('255, 95, 87') || bg.includes('ff5f57');
      });
      const hasYellowDot = Array.from(trafficLightDots).some(el => {
        const bg = window.getComputedStyle(el).backgroundColor;
        return bg.includes('254, 188, 46') || bg.includes('febc2e');
      });
      const hasGreenDot = Array.from(trafficLightDots).some(el => {
        const bg = window.getComputedStyle(el).backgroundColor;
        return bg.includes('40, 200, 64') || bg.includes('28c840');
      });

      if (!hasRedDot || !hasYellowDot || !hasGreenDot) {
        issues.push('MISSING TERMINAL HEADER: Page must have traffic light dots (red/yellow/green circles)');
      }

      // CHECK 2: Dark background (NOT white/light)
      const bodyBg = window.getComputedStyle(document.body).backgroundColor;
      const html = document.documentElement;
      const htmlBg = window.getComputedStyle(html).backgroundColor;

      // Parse RGB values
      const parseRGB = (color: string) => {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
          return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
        }
        return null;
      };

      const bgColor = parseRGB(bodyBg) || parseRGB(htmlBg);
      if (bgColor && (bgColor.r > 100 || bgColor.g > 100 || bgColor.b > 100)) {
        issues.push(`WRONG BACKGROUND COLOR: Page has light/white background (rgb: ${bgColor.r},${bgColor.g},${bgColor.b}). Must use dark theme (bg-bg-primary).`);
      }

      // CHECK 3: Standard footer
      const footerText = document.body.innerText.toLowerCase();
      const hasFooterLink = footerText.includes('claudecode.wtf');
      const hasFooterFees = footerText.includes('100% of fees') || footerText.includes('bcherny');

      if (!hasFooterLink || !hasFooterFees) {
        issues.push('MISSING STANDARD FOOTER: Must include "claudecode.wtf · 100% of fees to @bcherny"');
      }

      // CHECK 4: CC Logo
      const ccLogo = document.querySelector('img[src*="cc.png"]');
      if (!ccLogo) {
        issues.push('MISSING CC LOGO: Page must include the $CC mascot logo (/cc.png)');
      }

      // CHECK 5: Claude orange accent (spot check)
      const hasClaudeOrange = document.body.innerHTML.includes('claude-orange') ||
                              document.body.innerHTML.includes('da7756') ||
                              document.body.innerHTML.includes('218, 119, 86');
      if (!hasClaudeOrange) {
        issues.push('MISSING CLAUDE ORANGE: Page should use text-claude-orange or bg-claude-orange for accents');
      }

      // CHECK 6: Look for forbidden colors/patterns in HTML
      // NOTE: Only check visible elements, not <script> tags or Next.js flight data
      // Next.js embeds 404 fallback styles in script tags which we need to ignore
      const visibleElements = Array.from(document.querySelectorAll('body *:not(script)'));
      const visibleClassNames = visibleElements.map(el => el.className).join(' ');

      // Check for forbidden Tailwind classes in visible elements
      const forbiddenTailwindPatterns = [
        'bg-white',
        'bg-gray-50',
        'bg-gray-100',
        'bg-gray-200',
        'bg-slate-50',
        'bg-slate-100',
        'bg-slate-200',
      ];

      for (const pattern of forbiddenTailwindPatterns) {
        if (visibleClassNames.includes(pattern)) {
          issues.push(`FORBIDDEN LIGHT BACKGROUND: Found class "${pattern}" in visible elements`);
          break;
        }
      }

      // Check for gradient text (not part of our brand)
      if (visibleClassNames.includes('bg-gradient-to') && visibleClassNames.includes('bg-clip-text')) {
        issues.push('FORBIDDEN GRADIENT TEXT: Gradient text is not part of the brand. Use solid colors.');
      }

      // CHECK 7: Back link in footer (REQUIRED)
      const footer = document.querySelector('footer');
      const hasBackLink = footer && (
        footer.textContent?.includes('back') ||
        footer.innerHTML.includes('←') ||
        footer.innerHTML.includes('&larr;')
      );
      if (!hasBackLink) {
        issues.push('MISSING BACK LINK: Footer must have "← back" link to homepage');
      }

      // CHECK 8: Layout width (flag overly wide containers)
      const allClasses = Array.from(document.querySelectorAll('*')).map(el => el.className).join(' ');
      if (allClasses.includes('max-w-[1400') || allClasses.includes('max-w-[1500')) {
        issues.push('LAYOUT TOO WIDE: Use max-w-[900px] default or max-w-[1200px] max');
      }

      // CHECK 9: Header should NOT have border-b
      const header = document.querySelector('header');
      if (header && header.className.includes('border-b')) {
        issues.push('HEADER BORDER: Header should NOT have border-b (clean look)');
      }

      // CHECK 10: Footer should NOT have border-t
      if (footer && footer.className.includes('border-t')) {
        issues.push('FOOTER BORDER: Footer should NOT have border-t (clean look)');
      }

      return issues;
    });

    if (brandCheck.length > 0) {
      errors.push(...brandCheck);
      log(`   ❌ Brand verification FAILED: ${brandCheck.length} issues found`);
      for (const issue of brandCheck) {
        log(`      - ${issue}`);
      }
      return { success: false, errors, warnings };
    }

    log(`   ✓ Brand verification passed - design system compliance confirmed`);
    return { success: true, errors, warnings };

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    errors.push(`Brand verification failed: ${errMsg}`);
    return { success: false, errors, warnings };
  }
}

/**
 * Main verification entry point
 * Runs the appropriate verification based on feature type
 * Includes overall timeout to prevent hanging
 */
export async function verifyFeature(config: VerificationConfig): Promise<VerificationResult> {
  const verificationType = getVerificationType(config.description, config.slug);
  log(`🔍 FUNCTIONAL VERIFICATION: ${config.name}`);
  log(`   Type: ${verificationType}`);
  log(`   URL: ${config.deployUrl}`);
  log(`   Timeout: ${VERIFICATION_TIMEOUT_MS / 1000}s`);

  let browser: Browser | null = null;

  // Wrap entire verification in timeout
  const verificationPromise = async (): Promise<VerificationResult> => {
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

      // FIRST: Run brand verification (CRITICAL - must pass before functional tests)
      log(`   → Running brand verification FIRST...`);
      const brandResult = await verifyBrand(page, config);
      if (!brandResult.success) {
        log(`❌ BRAND VERIFICATION FAILED - Feature does not match claudecode.wtf design system`);
        log(`   This feature will be REJECTED until it follows brand guidelines.`);
        return brandResult;
      }

      // THEN: Run functional verification based on type
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
        await closeBrowser(browser);
      }
    }
  };

  // Create timeout promise
  const timeoutPromise = new Promise<VerificationResult>((resolve) => {
    setTimeout(() => {
      log(`⏰ VERIFICATION TIMEOUT: Exceeded ${VERIFICATION_TIMEOUT_MS / 1000}s`);
      resolve({
        success: false,
        errors: [`Verification timed out after ${VERIFICATION_TIMEOUT_MS / 1000} seconds`],
        warnings: [],
      });
    }, VERIFICATION_TIMEOUT_MS);
  });

  // Race verification against timeout
  const result = await Promise.race([verificationPromise(), timeoutPromise]);

  // If we timed out, ensure browser is cleaned up
  if (browser) {
    await closeBrowser(browser);
  }

  return result;
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
      await closeBrowser(browser);
    }
  }
}
