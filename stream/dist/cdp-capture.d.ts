/**
 * Browser capture using Puppeteer
 * Supports two modes:
 * 1. Display mode (Linux) - FFmpeg captures via x11grab
 * 2. Window mode (macOS) - CDP screencast captures specific Chrome window
 */
import { Page } from 'puppeteer-core';
export type CaptureMode = 'display' | 'window';
export interface CaptureConfig {
    url: string;
    width: number;
    height: number;
    fps: number;
    quality: number;
    mode?: CaptureMode;
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
    private screencastInterval;
    private windowId;
    private frameCount;
    private static readonly HEALTH_CHECK_INTERVAL_MS;
    constructor(config: CaptureConfig, events: CaptureEvents);
    /**
     * Get Chrome window ID using AppleScript (macOS only)
     * Returns the window ID of the most recently created Chrome window
     */
    private getWindowIdMacOS;
    /**
     * Get the Chrome window ID (macOS only)
     * Call this after start() to get the window ID
     */
    getWindowId(): number | null;
    /**
     * Get the capture mode
     */
    getMode(): CaptureMode;
    start(): Promise<void>;
    /**
     * Start CDP screencast for window-specific capture
     * Uses Chrome's native Page.startScreencast API for efficient real-time streaming
     * This captures only the Chrome window, regardless of macOS Space switches
     */
    private startScreencast;
    /**
     * Stop the screencast
     */
    private stopScreencast;
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