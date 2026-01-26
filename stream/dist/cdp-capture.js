/**
 * Browser capture using Puppeteer on Xvfb display
 * FFmpeg will capture the display directly via x11grab
 */
import puppeteer from 'puppeteer-core';
export class CdpCapture {
    config;
    events;
    browser = null;
    page = null;
    isCapturing = false;
    healthCheckInterval = null;
    static HEALTH_CHECK_INTERVAL_MS = 30000; // Check every 30 seconds
    constructor(config, events) {
        this.config = config;
        this.events = events;
    }
    async start() {
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
        console.log('[cdp] Browser ready on Xvfb display');
        // Start health check interval to detect Chrome crashes
        this.startHealthCheck();
    }
    /**
     * Periodic health check to detect Chrome crashes (Aw, Snap! pages)
     * Chrome can crash with various error codes (e.g., SIGILL, OOM)
     * When this happens, we need to trigger a restart
     */
    startHealthCheck() {
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.checkPageHealth();
            }
            catch (error) {
                console.error('[cdp] Health check failed:', error.message);
                this.events.onError(new Error(`Health check failed: ${error.message}`));
            }
        }, CdpCapture.HEALTH_CHECK_INTERVAL_MS);
    }
    async checkPageHealth() {
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
                const isCrashed = crashIndicators.some(indicator => title.toLowerCase().includes(indicator.toLowerCase()) ||
                    bodyText.toLowerCase().includes(indicator.toLowerCase()));
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
        }
        catch (error) {
            // If evaluate fails, the page is likely crashed or disconnected
            throw error;
        }
    }
    async stop() {
        console.log('[cdp] Stopping browser...');
        this.isCapturing = false;
        // Clear health check interval
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        if (this.page) {
            await this.page.close().catch(() => { });
            this.page = null;
        }
        if (this.browser) {
            await this.browser.close().catch(() => { });
            this.browser = null;
        }
        console.log('[cdp] Browser stopped');
    }
    isRunning() {
        return this.isCapturing;
    }
    // Frame count not applicable for x11grab mode
    getFrameCount() {
        return -1;
    }
    // Get the page instance for the Director to control
    getPage() {
        return this.page;
    }
}
//# sourceMappingURL=cdp-capture.js.map