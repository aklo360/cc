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
import { Page } from 'puppeteer-core';
export interface CaptureConfig {
    url: string;
    width: number;
    height: number;
    fps: number;
    quality: number;
    autoRefreshMs?: number;
}
export interface CaptureEvents {
    onFrame: (frameBuffer: Buffer) => void;
    onError: (error: Error) => void;
    onDisconnect: () => void;
}
export declare class CdpCapture {
    private config;
    private events;
    private browser;
    private page;
    private cdpSession;
    private isCapturing;
    private healthCheckInterval;
    private autoRefreshInterval;
    private frameCount;
    private emptyPageCount;
    private static readonly HEALTH_CHECK_INTERVAL_MS;
    private static readonly DEFAULT_AUTO_REFRESH_MS;
    private static readonly MAX_EMPTY_PAGES;
    constructor(config: CaptureConfig, events: CaptureEvents);
    start(): Promise<void>;
    /**
     * Start CDP screencast with continuous frame delivery
     *
     * Chrome's screencast only sends frames when there are visual changes.
     * We inject a requestAnimationFrame loop that toggles a tiny pixel's
     * color every frame, forcing Chrome to continuously repaint.
     */
    private startScreencast;
    /**
     * Stop the screencast
     */
    private stopScreencast;
    /**
     * Periodic health check to detect Chrome crashes
     * IMPORTANT: This should NOT trigger stream restart for transient errors
     */
    private startHealthCheck;
    private checkPageHealth;
    /**
     * Start auto-refresh interval to pick up deployed changes
     */
    private startAutoRefresh;
    /**
     * Refresh the page to pick up deployed changes
     */
    refreshPage(): Promise<void>;
    stop(): Promise<void>;
    isRunning(): boolean;
    getFrameCount(): number;
    getPage(): Page | null;
}
//# sourceMappingURL=cdp-capture.d.ts.map