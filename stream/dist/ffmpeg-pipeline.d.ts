/**
 * FFmpeg pipeline for encoding and streaming
 * Supports two capture modes:
 * 1. Display mode - Captures from display (x11grab on Linux, avfoundation on macOS)
 * 2. Window mode - Receives JPEG frames via stdin (for window-specific capture)
 */
export type PipelineMode = 'display' | 'window';
export interface PipelineConfig {
    width: number;
    height: number;
    fps: number;
    bitrate: string;
    audioUrl: string | null;
    teeOutput: string;
    mode?: PipelineMode;
}
export interface PipelineEvents {
    onError: (error: Error) => void;
    onExit: (code: number | null) => void;
    onStderr: (data: string) => void;
}
export declare class FfmpegPipeline {
    private config;
    private events;
    private process;
    private isRunning;
    private frameCount;
    private lastFrameCount;
    private lastFrameTime;
    private rtmpConnected;
    constructor(config: PipelineConfig, events: PipelineEvents);
    start(): void;
    /**
     * Write a frame to FFmpeg stdin (window mode only)
     * Returns true if frame was written, false if pipeline not ready
     */
    writeFrame(frameBuffer: Buffer): boolean;
    stop(): void;
    isActive(): boolean;
    getFrameCount(): number;
    isRtmpConnected(): boolean;
    /**
     * Check if frames are progressing (not stalled)
     * Returns true if frames have increased since last check
     */
    checkFrameProgress(): {
        healthy: boolean;
        framesSinceLastCheck: number;
        secondsSinceLastFrame: number;
    };
}
//# sourceMappingURL=ffmpeg-pipeline.d.ts.map