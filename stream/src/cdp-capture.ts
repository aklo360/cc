/**
 * Browser capture using Puppeteer
 * Supports two modes:
 * 1. Display mode (Linux) - FFmpeg captures via x11grab
 * 2. Window mode (macOS) - CDP screencast captures specific Chrome window
 */

import puppeteer, { Browser, Page, CDPSession } from 'puppeteer-core';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export type CaptureMode = 'display' | 'window';

export interface CaptureConfig {
  url: string;
  width: number;
  height: number;
  fps: number;
  quality: number; // JPEG quality for window mode (0-100)
  mode?: CaptureMode; // 'display' for screen capture, 'window' for CDP screencast
}

export interface CaptureEvents {
  onFrame: (frameBuffer: Buffer) => void; // Used in window mode
  onError: (error: Error) => void;
  onDisconnect: () => void;
}

export class CdpCapture {
  private config: CaptureConfig;
  private events: CaptureEvents;
  private browser: Browser | null = null;
  private page: Page | null = null;
  private cdpSession: CDPSession | null = null;
  private isCapturing = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private screencastInterval: NodeJS.Timeout | null = null;
  private windowId: number | null = null;
  private frameCount = 0;
  private static readonly HEALTH_CHECK_INTERVAL_MS = 30000; // Check every 30 seconds

  constructor(config: CaptureConfig, events: CaptureEvents) {
    this.config = config;
    this.events = events;
  }

  /**
   * Get Chrome window ID using AppleScript (macOS only)
   * Returns the window ID of the most recently created Chrome window
   */
  private async getWindowIdMacOS(): Promise<number | null> {
    if (process.platform !== 'darwin') return null;

    try {
      // AppleScript to get the window ID of the frontmost Chrome window
      const script = `
        tell application "System Events"
          tell process "Google Chrome"
            set frontWindow to front window
            return id of frontWindow
          end tell
        end tell
      `;
      const { stdout } = await execAsync(`osascript -e '${script}'`);
      const windowId = parseInt(stdout.trim(), 10);
      if (!isNaN(windowId)) {
        return windowId;
      }
    } catch (error) {
      console.warn('[cdp] Could not get window ID:', (error as Error).message);
    }
    return null;
  }

  /**
   * Get the Chrome window ID (macOS only)
   * Call this after start() to get the window ID
   */
  getWindowId(): number | null {
    return this.windowId;
  }

  /**
   * Get the capture mode
   */
  getMode(): CaptureMode {
    return this.config.mode || 'display';
  }

  async start(): Promise<void> {
    if (this.isCapturing) {
      throw new Error('Capture already running');
    }

    const isMacOS = process.platform === 'darwin';
    const chromePathMac = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const chromePathLinux = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';

    console.log(`[cdp] Platform: ${process.platform}, launching Chrome with ${isMacOS ? 'GPU enabled' : 'Xvfb'}`);

    // Launch browser - GPU enabled on macOS, Xvfb on Linux
    this.browser = await puppeteer.launch({
      executablePath: isMacOS ? chromePathMac : chromePathLinux,
      headless: false, // Must be non-headless to render properly
      ignoreDefaultArgs: ['--enable-automation'], // Hide "controlled by automation" banner
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        // GPU flags - enabled on macOS, disabled on Linux
        ...(isMacOS ? [
          '--enable-gpu',
          '--enable-webgl',
          '--use-gl=angle',
          '--use-angle=metal', // Use Apple Metal for best performance
          '--enable-features=Metal',
        ] : [
          '--disable-gpu',
          '--disable-software-rasterizer',
        ]),
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-infobars', // Hide infobars
        '--autoplay-policy=no-user-gesture-required', // Allow audio autoplay for VJ
        `--window-size=${this.config.width},${this.config.height}`,
        '--window-position=0,0',
        '--start-fullscreen',
        '--kiosk',
      ],
      defaultViewport: null, // Use window size
    });

    // Handle browser disconnect
    this.browser.on('disconnected', () => {
      console.log('[cdp] Browser disconnected');
      this.isCapturing = false;
      this.events.onDisconnect();
    });

    // Create page
    const pages = await this.browser.pages();
    this.page = pages[0] || await this.browser.newPage();

    // Navigate to the watch page
    console.log(`[cdp] Navigating to ${this.config.url}`);
    await this.page.goto(this.config.url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Hide scrollbars and ensure full viewport
    await this.page.evaluate(() => {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    });

    this.isCapturing = true;

    // Get window ID on macOS (for reference/debugging)
    if (isMacOS) {
      // Small delay to let window fully initialize
      await new Promise(resolve => setTimeout(resolve, 500));
      this.windowId = await this.getWindowIdMacOS();
      if (this.windowId) {
        console.log(`[cdp] Chrome window ID: ${this.windowId}`);
      }
    }

    // Start screencast in window mode
    const mode = this.config.mode || 'display';
    if (mode === 'window') {
      await this.startScreencast();
      console.log('[cdp] Browser ready in window capture mode (CDP screencast)');
    } else {
      console.log('[cdp] Browser ready in display capture mode');
    }

    // Start health check interval to detect Chrome crashes
    this.startHealthCheck();
  }

  /**
   * Start CDP screencast for window-specific capture
   * Uses Chrome's native Page.startScreencast API for efficient real-time streaming
   * This captures only the Chrome window, regardless of macOS Space switches
   */
  private async startScreencast(): Promise<void> {
    if (!this.page) return;

    // Create CDP session for screencast
    this.cdpSession = await this.page.createCDPSession();

    // Listen for screencast frames
    this.cdpSession.on('Page.screencastFrame', async (event) => {
      if (!this.isCapturing || !this.cdpSession) return;

      try {
        // Acknowledge frame to receive the next one
        await this.cdpSession.send('Page.screencastFrameAck', {
          sessionId: event.sessionId,
        });

        // Convert base64 to buffer and emit
        const frameBuffer = Buffer.from(event.data, 'base64');
        this.frameCount++;
        this.events.onFrame(frameBuffer);
      } catch (error) {
        // Ignore errors during page transitions
        if (this.isCapturing) {
          console.warn('[cdp] Frame ack error:', (error as Error).message);
        }
      }
    });

    // Start the screencast with target settings
    // Chrome will deliver frames as fast as possible up to maxWidth/maxHeight
    await this.cdpSession.send('Page.startScreencast', {
      format: 'jpeg',
      quality: this.config.quality,
      maxWidth: this.config.width,
      maxHeight: this.config.height,
      everyNthFrame: 1, // Capture every frame
    });

    console.log(`[cdp] Native screencast started (${this.config.width}x${this.config.height}, ${this.config.quality}% quality)`);
  }

  /**
   * Stop the screencast
   */
  private async stopScreencast(): Promise<void> {
    if (this.cdpSession) {
      try {
        await this.cdpSession.send('Page.stopScreencast');
      } catch {
        // Ignore errors when stopping
      }
      this.cdpSession.detach().catch(() => {});
      this.cdpSession = null;
    }
    // Legacy: clear interval if it exists (shouldn't with new implementation)
    if (this.screencastInterval) {
      clearInterval(this.screencastInterval);
      this.screencastInterval = null;
    }
  }

  /**
   * Periodic health check to detect Chrome crashes (Aw, Snap! pages)
   * Chrome can crash with various error codes (e.g., SIGILL, OOM)
   * When this happens, we need to trigger a restart
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkPageHealth();
      } catch (error) {
        console.error('[cdp] Health check failed:', (error as Error).message);
        this.events.onError(new Error(`Health check failed: ${(error as Error).message}`));
      }
    }, CdpCapture.HEALTH_CHECK_INTERVAL_MS);
  }

  private async checkPageHealth(): Promise<void> {
    if (!this.page || !this.isCapturing) {
      return;
    }

    try {
      // Check if page is still connected
      if (this.page.isClosed()) {
        throw new Error('Page is closed');
      }

      // Check page title and content for crash indicators
      const healthCheck = await this.page.evaluate(() => {
        const title = document.title || '';
        const bodyText = document.body?.innerText || '';

        // Chrome crash page indicators
        const crashIndicators = [
          'Aw, Snap!',
          'something went wrong',
          'ERR_',
          'This page isn\'t working',
          'crashed',
        ];

        const isCrashed = crashIndicators.some(indicator =>
          title.toLowerCase().includes(indicator.toLowerCase()) ||
          bodyText.toLowerCase().includes(indicator.toLowerCase())
        );

        return {
          title,
          isCrashed,
          hasContent: bodyText.length > 100,
        };
      });

      if (healthCheck.isCrashed) {
        console.error(`[cdp] Chrome crash detected! Title: "${healthCheck.title}"`);
        throw new Error('Chrome crashed - page shows error');
      }

      if (!healthCheck.hasContent) {
        console.warn('[cdp] Page appears empty, may be loading or crashed');
      }

    } catch (error) {
      // If evaluate fails, the page is likely crashed or disconnected
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log('[cdp] Stopping browser...');
    this.isCapturing = false;

    // Clear health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Stop screencast if running
    await this.stopScreencast();

    if (this.page) {
      await this.page.close().catch(() => {});
      this.page = null;
    }

    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }

    this.windowId = null;
    console.log('[cdp] Browser stopped');
  }

  isRunning(): boolean {
    return this.isCapturing;
  }

  // Frame count for window mode, -1 for display mode
  getFrameCount(): number {
    return this.config.mode === 'window' ? this.frameCount : -1;
  }

  // Get the page instance for the Director to control
  getPage(): Page | null {
    return this.page;
  }
}
