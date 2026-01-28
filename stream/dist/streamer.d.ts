/**
 * Stream orchestrator
 * Connects CDP capture to FFmpeg pipeline with auto-restart on failure
 * Director switches between /watch and /vj based on brain state
 */
import { EventEmitter } from 'events';
import { CaptureMode } from './cdp-capture.js';
export type StreamerState = 'stopped' | 'starting' | 'streaming' | 'restarting' | 'error';
export interface StreamerConfig {
    watchUrl: string;
    vjUrl: string;
    brainUrl: string;
    youtubeAudioUrl: string;
    width: number;
    height: number;
    fps: number;
    bitrate: string;
    jpegQuality: number;
    maxRestarts: number;
    restartDelayMs: number;
    captureMode?: CaptureMode;
}
export interface StreamerStats {
    state: StreamerState;
    frameCount: number;
    uptime: number;
    restarts: number;
    destinations: string[];
    lastError: string | null;
    currentScene: 'watch' | 'vj';
    captureMode: CaptureMode;
    windowId: number | null;
}
export declare class Streamer extends EventEmitter {
    private config;
    private cdpCapture;
    private ffmpegPipeline;
    private destinationConfig;
    private director;
    private state;
    private startTime;
    private restartCount;
    private lastError;
    private isShuttingDown;
    private isHotSwapping;
    private restartResetTimer;
    private streamHealthInterval;
    private static readonly RESTART_RESET_AFTER_MS;
    private static readonly STREAM_HEALTH_CHECK_MS;
    constructor(config: StreamerConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    private handleFrame;
    private handleError;
    private handleExit;
    private handleDisconnect;
    private attemptRestart;
    /**
     * Comprehensive stream health check - runs every 3 minutes
     * Checks: FFmpeg frame progress, RTMP connection, CDP page health
     */
    private startStreamHealthCheck;
    private checkStreamHealth;
    private stopStreamHealthCheck;
    private setState;
    getStats(): StreamerStats;
    getState(): StreamerState;
    /**
     * Manually switch to a specific scene (watch or vj)
     * This is a manual override - the director will continue polling
     * but won't auto-switch until brain state changes
     */
    setScene(scene: 'watch' | 'vj'): Promise<void>;
    /**
     * Hot-swap CDP capture without dropping RTMP connection
     * FFmpeg continues running and maintains the Twitter broadcast
     * Only CDP (Chrome) is restarted with new capture mode
     */
    restartCapture(): Promise<void>;
}
//# sourceMappingURL=streamer.d.ts.map