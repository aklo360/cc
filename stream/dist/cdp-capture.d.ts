/**
 * Browser capture using Puppeteer on Xvfb display
 * FFmpeg will capture the display directly via x11grab
 */
import { Page } from 'puppeteer-core';
export interface CaptureConfig {
    url: string;
    width: number;
    height: number;
    fps: number;
    quality: number;
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
    private isCapturing;
    private healthCheckInterval;
    private static readonly HEALTH_CHECK_INTERVAL_MS;
    constructor(config: CaptureConfig, events: CaptureEvents);
    start(): Promise<void>;
    /**
     * Periodic health check to detect Chrome crashes (Aw, Snap! pages)
     * Chrome can crash with various error codes (e.g., SIGILL, OOM)
     * When this happens, we need to trigger a restart
     */
    private startHealthCheck;
    private checkPageHealth;
    stop(): Promise<void>;
    isRunning(): boolean;
    getFrameCount(): number;
    getPage(): Page | null;
}
//# sourceMappingURL=cdp-capture.d.ts.map