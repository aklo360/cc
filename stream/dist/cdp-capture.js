/**
 * Browser capture using Chrome's native CDP screencast API
 *
 * Architecture (Native Mac Mini):
 * - Launches Chrome with Metal GPU acceleration
 * - Uses Page.startScreencast CDP API for real-time frame capture
 * - Injects requestAnimationFrame loop to force continuous repaints
 * - Outputs JPEG frames to FFmpeg pipeline via callback
 *
 * This captures ONLY the Chrome window content, making it safe for
 * macOS Space switches and background operation.
 */
import puppeteer from 'puppeteer-core';
export class CdpCapture {
    config;
    events;
    browser = null;
    page = null;
    cdpSession = null;
    isCapturing = false;
    healthCheckInterval = null;
    autoRefreshInterval = null;
    frameCount = 0;
    emptyPageCount = 0;
    static HEALTH_CHECK_INTERVAL_MS = 60000; // Check every 60s (was 30s)
    static DEFAULT_AUTO_REFRESH_MS = 30 * 60 * 1000; // 30 minutes (was 2 min)
    static MAX_EMPTY_PAGES = 10; // Refresh after 10 consecutive empty checks
    constructor(config, events) {
        this.config = config;
        this.events = events;
    }
    async start() {
        if (this.isCapturing) {
            throw new Error('Capture already running');
        }
        const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        console.log('[cdp] Launching Chrome with Metal GPU acceleration');
        // Launch browser with GPU enabled for WebGL/VJ visuals
        this.browser = await puppeteer.launch({
            executablePath: chromePath,
            headless: false, // Must be non-headless for proper rendering
            ignoreDefaultArgs: ['--enable-automation'],
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                // Metal GPU acceleration
                '--enable-gpu',
                '--enable-webgl',
                '--use-gl=angle',
                '--use-angle=metal',
                '--enable-features=Metal',
                // Prevent throttling
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-infobars',
                '--autoplay-policy=no-user-gesture-required',
                // Window settings
                `--window-size=${this.config.width},${this.config.height}`,
                '--window-position=0,0',
                '--start-fullscreen',
                '--kiosk',
            ],
            defaultViewport: null,
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
        // Navigate to the target URL
        console.log(`[cdp] Navigating to ${this.config.url}`);
        await this.page.goto(this.config.url, {
            waitUntil: 'networkidle2',
            timeout: 60000, // 60s for cold starts after launchd restart
        });
        // Hide scrollbars
        await this.page.evaluate(() => {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        });
        this.isCapturing = true;
        // Start CDP screencast
        await this.startScreencast();
        console.log('[cdp] Browser ready - CDP screencast active');
        // Start health check interval
        this.startHealthCheck();
        // Start auto-refresh interval to pick up deployed changes
        this.startAutoRefresh();
    }
    /**
     * Start CDP screencast with continuous frame delivery
     *
     * Chrome's screencast only sends frames when there are visual changes.
     * We inject a requestAnimationFrame loop that toggles a tiny pixel's
     * color every frame, forcing Chrome to continuously repaint.
     */
    async startScreencast() {
        if (!this.page)
            return;
        // Create CDP session
        this.cdpSession = await this.page.createCDPSession();
        // Listen for screencast frames
        this.cdpSession.on('Page.screencastFrame', async (event) => {
            if (!this.isCapturing || !this.cdpSession)
                return;
            try {
                // Acknowledge frame to receive the next one
                await this.cdpSession.send('Page.screencastFrameAck', {
                    sessionId: event.sessionId,
                });
                // Convert base64 to buffer and emit
                const frameBuffer = Buffer.from(event.data, 'base64');
                this.frameCount++;
                this.events.onFrame(frameBuffer);
            }
            catch (error) {
                if (this.isCapturing) {
                    console.warn('[cdp] Frame ack error:', error.message);
                }
            }
        });
        // Inject requestAnimationFrame loop to force continuous repaints
        // This ensures Chrome always has visual changes to report via screencast
        await this.page.evaluate(() => {
            const trigger = document.createElement('div');
            trigger.id = 'screencast-trigger';
            trigger.style.cssText = `
        position: fixed;
        bottom: 0;
        right: 0;
        width: 1px;
        height: 1px;
        pointer-events: none;
        z-index: 999999;
      `;
            document.body.appendChild(trigger);
            let frame = 0;
            function animate() {
                frame++;
                trigger.style.backgroundColor = frame % 2 === 0
                    ? 'rgba(0,0,0,0.001)'
                    : 'rgba(0,0,0,0.002)';
                requestAnimationFrame(animate);
            }
            animate();
        });
        // Start the screencast
        await this.cdpSession.send('Page.startScreencast', {
            format: 'jpeg',
            quality: this.config.quality,
            maxWidth: this.config.width,
            maxHeight: this.config.height,
            everyNthFrame: 1,
        });
        console.log(`[cdp] Screencast started (${this.config.width}x${this.config.height}, ${this.config.quality}% quality)`);
    }
    /**
     * Stop the screencast
     */
    async stopScreencast() {
        if (this.cdpSession) {
            try {
                await this.cdpSession.send('Page.stopScreencast');
            }
            catch {
                // Ignore errors when stopping
            }
            this.cdpSession.detach().catch(() => { });
            this.cdpSession = null;
        }
    }
    /**
     * Periodic health check to detect Chrome crashes
     * IMPORTANT: This should NOT trigger stream restart for transient errors
     */
    startHealthCheck() {
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.checkPageHealth();
            }
            catch (error) {
                const msg = error.message;
                // Don't trigger restart for transient navigation errors
                if (msg.includes('Execution context was destroyed') ||
                    msg.includes('Navigating frame was detached') ||
                    msg.includes('Target closed') ||
                    msg.includes('Session closed')) {
                    console.warn('[cdp] Transient health check error (ignoring):', msg);
                    // Don't call onError - just log and continue
                    return;
                }
                console.error('[cdp] Health check failed:', msg);
                this.events.onError(new Error(`Health check failed: ${msg}`));
            }
        }, CdpCapture.HEALTH_CHECK_INTERVAL_MS);
    }
    async checkPageHealth() {
        if (!this.page || !this.isCapturing)
            return;
        try {
            if (this.page.isClosed()) {
                throw new Error('Page is closed');
            }
            const healthCheck = await this.page.evaluate(() => {
                const title = document.title || '';
                const crashIndicators = [
                    'Aw, Snap!',
                    'ERR_',
                    'This page isn\'t working',
                    'This site can\'t be reached',
                    'No internet',
                ];
                return {
                    title,
                    isCrashed: crashIndicators.some(i => title.includes(i)),
                    hasContent: (document.body?.innerText?.length || 0) > 100,
                    url: window.location.href,
                };
            });
            if (healthCheck.isCrashed) {
                throw new Error(`Chrome crashed - page shows: "${healthCheck.title}"`);
            }
            if (!healthCheck.hasContent) {
                this.emptyPageCount++;
                console.warn(`[cdp] Page appears empty, may be loading or crashed (${this.emptyPageCount}/${CdpCapture.MAX_EMPTY_PAGES})`);
                // After too many empty checks, try a refresh
                if (this.emptyPageCount >= CdpCapture.MAX_EMPTY_PAGES) {
                    console.log('[cdp] Too many empty page checks, forcing refresh...');
                    this.emptyPageCount = 0;
                    await this.refreshPage();
                }
            }
            else {
                // Reset counter on healthy page
                this.emptyPageCount = 0;
            }
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Start auto-refresh interval to pick up deployed changes
     */
    startAutoRefresh() {
        const interval = this.config.autoRefreshMs || CdpCapture.DEFAULT_AUTO_REFRESH_MS;
        console.log(`[cdp] Auto-refresh enabled every ${interval / 1000}s`);
        this.autoRefreshInterval = setInterval(async () => {
            try {
                await this.refreshPage();
            }
            catch (error) {
                console.error('[cdp] Auto-refresh failed:', error.message);
            }
        }, interval);
    }
    /**
     * Refresh the page to pick up deployed changes
     */
    async refreshPage() {
        if (!this.page || !this.isCapturing)
            return;
        console.log('[cdp] Refreshing page to pick up changes...');
        try {
            // Stop screencast during reload
            await this.stopScreencast();
            // Hard reload (bypass cache)
            await this.page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
            // Hide scrollbars again
            await this.page.evaluate(() => {
                document.body.style.overflow = 'hidden';
                document.documentElement.style.overflow = 'hidden';
            });
            // Restart screencast
            await this.startScreencast();
            console.log('[cdp] Page refreshed successfully');
        }
        catch (error) {
            console.error('[cdp] Refresh error:', error.message);
            // Don't throw - let it continue with the old page
        }
    }
    async stop() {
        console.log('[cdp] Stopping browser...');
        this.isCapturing = false;
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
        await this.stopScreencast();
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
    getFrameCount() {
        return this.frameCount;
    }
    getPage() {
        return this.page;
    }
}
//# sourceMappingURL=cdp-capture.js.map