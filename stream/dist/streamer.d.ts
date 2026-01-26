/**
 * Stream orchestrator
 * Connects CDP capture to FFmpeg pipeline with auto-restart on failure
 * Director switches between /watch and /vj based on brain state
 */
import { EventEmitter } from 'events';
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
}
export interface StreamerStats {
    state: StreamerState;
    frameCount: number;
    uptime: number;
    restarts: number;
    destinations: string[];
    lastError: string | null;
    currentScene: 'watch' | 'vj';
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
}
//# sourceMappingURL=streamer.d.ts.map