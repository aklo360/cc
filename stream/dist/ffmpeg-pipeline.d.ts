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
    constructor(config: PipelineConfig, events: PipelineEvents);
    start(): void;
    writeFrame(_frameBuffer: Buffer): boolean;
    stop(): void;
    isActive(): boolean;
    getFrameCount(): number;
}
//# sourceMappingURL=ffmpeg-pipeline.d.ts.map