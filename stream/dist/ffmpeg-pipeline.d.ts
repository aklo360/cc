/**
 * FFmpeg pipeline for encoding and streaming
 * Captures from X11 display (Xvfb), adds audio, outputs to RTMP destinations
 */
export interface PipelineConfig {
    width: number;
    height: number;
    fps: number;
    bitrate: string;
    audioUrl: string | null;
    teeOutput: string;
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
    writeFrame(_frameBuffer: Buffer): boolean;
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