/**
 * Stream orchestrator for Native Mac Mini - ROBUST 24/7 VERSION
 *
 * Architecture:
 * - CDP capture: Chrome's native screencast API with Metal GPU
 * - FFmpeg: VideoToolbox hardware H.264 encoding
 * - Audio: YouTube lofi stream with auto-refresh + local fallback
 * - Director: Switches between /watch and /vj on schedule
 * - RTMP: Streams to Twitter/Kick/YouTube
 *
 * Failsafes:
 * - YouTube URL auto-refresh every 3.5 hours (before 6hr expiry)
 * - Automatic fallback to local audio on YouTube failures
 * - Aggressive health monitoring with auto-recovery
 * - CDP page auto-refresh every 2 minutes
 * - Auto-restart on any component failure
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
export interface ScheduleInfo {
    currentPhase: 'build' | 'break';
    minutesIntoPhase: number;
    minutesRemaining: number;
    nextSwitch: string;
}
export interface StreamerStats {
    state: StreamerState;
    frameCount: number;
    uptime: number;
    restarts: number;
    destinations: string[];
    lastError: string | null;
    currentScene: 'watch' | 'vj';
    schedule: ScheduleInfo | null;
    audioSource: 'youtube' | 'fallback';
    youtubeUrlTtl: number;
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
    private audioRefreshInterval;
    private watchdogInterval;
    private usingFallbackAudio;
    private lastFrameTime;
    private consecutiveEmptyPages;
    private static readonly RESTART_RESET_AFTER_MS;
    private static readonly STREAM_HEALTH_CHECK_MS;
    private static readonly AUDIO_REFRESH_CHECK_MS;
    private static readonly AUDIO_REFRESH_THRESHOLD_MS;
    private static readonly WATCHDOG_INTERVAL_MS;
    private static readonly WATCHDOG_FRAME_TIMEOUT_MS;
    private static readonly MAX_EMPTY_PAGE_CHECKS;
    constructor(config: StreamerConfig);
    start(): Promise<void>;
    /**
     * Get audio source - try YouTube first, fallback to local
     */
    private getAudioSource;
    stop(): Promise<void>;
    private handleFrame;
    private handleError;
    private handleExit;
    private handleDisconnect;
    private attemptRestart;
    /**
     * Stream health check - runs every 3 minutes
     */
    private startStreamHealthCheck;
    private checkStreamHealth;
    private stopStreamHealthCheck;
    /**
     * YouTube URL refresh check - runs every 30 minutes
     * Triggers full restart with fresh URL if expiring soon
     */
    private startAudioRefreshCheck;
    private stopAudioRefreshCheck;
    /**
     * Watchdog timer - catches stalls that other checks miss
     * Runs every 30 seconds, restarts if no frames for 60 seconds
     */
    private startWatchdog;
    private stopWatchdog;
    private setState;
    getStats(): StreamerStats;
    getState(): StreamerState;
    setScene(scene: 'watch' | 'vj'): Promise<void>;
    /**
     * Refresh the page to pick up deployed changes
     */
    refreshPage(): Promise<void>;
    /**
     * Hot-swap CDP capture without dropping RTMP connection
     */
    restartCapture(): Promise<void>;
}
//# sourceMappingURL=streamer.d.ts.map