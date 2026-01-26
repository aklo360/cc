/**
 * Browser capture using Puppeteer on Xvfb display
 * FFmpeg will capture the display directly via x11grab
 */

import puppeteer, { Browser, Page } from 'puppeteer-core';

export interface CaptureConfig {
  url: string;
  width: number;
  height: number;
  fps: number;
  quality: number; // unused in x11grab mode
}

export interface CaptureEvents {
  onFrame: (frameBuffer: Buffer) => void; // unused in x11grab mode
  onError: (error: Error) => void;
  onDisconnect: () => void;
}

export class CdpCapture {
  private config: CaptureConfig;
  private events: CaptureEvents;
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isCapturing = false;

  constructor(config: CaptureConfig, events: CaptureEvents) {
    this.config = config;
    this.events = events;
  }

  async start(): Promise<void> {
    if (this.isCapturing) {
      throw new Error('Capture already running');
    }

    const display = process.env.DISPLAY || ':99';
    console.log(`[cdp] Launching browser on display ${display}`);

    // Launch browser on Xvfb display (non-headless so it renders to X11)
    this.browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      headless: false, // Must be non-headless to render to Xvfb
      ignoreDefaultArgs: ['--enable-automation'], // Hide "controlled by automation" banner
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-infobars', // Hide infobars
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
    console.log('[cdp] Browser ready on Xvfb display');
  }

  async stop(): Promise<void> {
    console.log('[cdp] Stopping browser...');
    this.isCapturing = false;

    if (this.page) {
      await this.page.close().catch(() => {});
      this.page = null;
    }

    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }

    console.log('[cdp] Browser stopped');
  }

  isRunning(): boolean {
    return this.isCapturing;
  }

  // Frame count not applicable for x11grab mode
  getFrameCount(): number {
    return -1;
  }

  // Get the page instance for the Director to control
  getPage(): Page | null {
    return this.page;
  }
}
