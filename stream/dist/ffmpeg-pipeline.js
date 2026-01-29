/**
 * FFmpeg pipeline for encoding and streaming
 *
 * Uses window mode capture: receives JPEG frames via stdin from Chrome's
 * native CDP screencast API, encodes with VideoToolbox hardware acceleration,
 * and streams to RTMP destinations.
 *
 * Architecture (Native Mac Mini):
 * - CDP screencast sends JPEG frames → FFmpeg stdin (MJPEG)
 * - VideoToolbox hardware H.264 encoding
 * - YouTube lofi audio mixed in
 * - Output to Twitter/Kick/YouTube via RTMP
 */
import { spawn } from 'child_process';
export class FfmpegPipeline {
    config;
    events;
    process = null;
    isRunning = false;
    frameCount = 0;
    lastFrameCount = 0;
    lastFrameTime = 0;
    rtmpConnected = false;
    constructor(config, events) {
        this.config = config;
        this.events = events;
    }
    start() {
        if (this.isRunning) {
            throw new Error('Pipeline already running');
        }
        const hasAudio = this.config.audioUrl !== null;
        const args = [];
        // Input: MJPEG frames from Chrome CDP screencast via stdin
        args.push('-f', 'mjpeg', '-framerate', String(this.config.fps), '-i', 'pipe:0');
        // Audio input
        if (hasAudio) {
            // YouTube live stream with reconnect options for reliability
            args.push('-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5', '-i', this.config.audioUrl);
        }
        else {
            // Use local lofi file on infinite loop as fallback
            const lofiPath = `${process.cwd()}/lofi-fallback.mp3`;
            args.push('-stream_loop', '-1', '-i', lofiPath);
            console.log('[ffmpeg] Using lofi fallback audio (looped)');
        }
        // Video encoding: libx264 software encoder (YouTube compatible)
        args.push('-vf', `scale=${this.config.width}:${this.config.height}`, '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency', '-b:v', this.config.bitrate, '-maxrate', '6000k', '-bufsize', '12000k', '-pix_fmt', 'yuv420p', '-g', String(this.config.fps * 2), // Keyframe every 2 seconds
        '-profile:v', 'high', '-level', '4.1');
        // Audio encoding
        args.push('-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-map', '0:v', '-map', '1:a');
        // Global header flag - REQUIRED for tee muxer with FLV/RTMP
        args.push('-flags', '+global_header');
        // Output: direct RTMP or tee muxer for multiple destinations
        if (this.config.teeOutput.includes('|')) {
            args.push('-f', 'tee', this.config.teeOutput);
        }
        else {
            // Extract URL from tee format: [f=flv]rtmp://... -> rtmp://...
            const rtmpUrl = this.config.teeOutput.replace(/^\[f=flv\]/, '');
            args.push('-f', 'flv', rtmpUrl);
        }
        console.log('[ffmpeg] Starting pipeline...');
        console.log('[ffmpeg] Mode: CDP screencast → MJPEG stdin → libx264 H.264');
        console.log(`[ffmpeg] Resolution: ${this.config.width}x${this.config.height}@${this.config.fps}fps`);
        console.log(`[ffmpeg] Audio: ${hasAudio ? 'YouTube stream' : 'lofi fallback (looped)'}`);
        console.log(`[ffmpeg] Output: ${this.config.teeOutput}`);
        this.process = spawn('ffmpeg', args, {
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        // Handle stdin errors (EPIPE when FFmpeg exits while writing)
        if (this.process.stdin) {
            this.process.stdin.on('error', (error) => {
                // EPIPE is expected when FFmpeg dies - don't crash
                if (error.code === 'EPIPE') {
                    console.log('[ffmpeg] stdin EPIPE - pipeline closed');
                }
                else {
                    console.error('[ffmpeg] stdin error:', error);
                }
                this.isRunning = false;
            });
        }
        this.process.on('error', (error) => {
            console.error('[ffmpeg] Process error:', error);
            this.isRunning = false;
            this.events.onError(error);
        });
        this.process.on('exit', (code) => {
            console.log(`[ffmpeg] Process exited with code ${code}`);
            this.isRunning = false;
            this.events.onExit(code);
        });
        // Log stderr (FFmpeg outputs stats here)
        if (this.process.stderr) {
            let lastLogTime = 0;
            this.process.stderr.on('data', (data) => {
                const str = data.toString();
                const now = Date.now();
                // Detect RTMP connection errors
                if (str.includes('Connection refused') ||
                    str.includes('Connection reset') ||
                    str.includes('Broken pipe') ||
                    str.includes('Connection timed out') ||
                    str.includes('Failed to connect') ||
                    str.includes('I/O error') ||
                    str.includes('RTMP_Connect') ||
                    str.includes('Server error')) {
                    console.error(`[ffmpeg] RTMP ERROR: ${str.trim()}`);
                    this.rtmpConnected = false;
                    this.events.onError(new Error(`RTMP connection failed: ${str.trim()}`));
                    return;
                }
                // Log important lines always
                if (str.includes('Error') || str.includes('error') ||
                    str.includes('Opening') || str.includes('Output') ||
                    str.includes('Connection') || str.includes('failed') ||
                    str.includes('Stream mapping')) {
                    console.log(`[ffmpeg] ${str.trim()}`);
                    // Mark connected when we see successful output
                    if (str.includes('Output #0') || str.includes('Stream mapping')) {
                        this.rtmpConnected = true;
                    }
                }
                // Log frame stats every 10 seconds
                else if (str.includes('frame=') && (now - lastLogTime) > 10000) {
                    const match = str.match(/frame=\s*(\d+).*fps=\s*([\d.]+).*size=\s*(\S+)/);
                    if (match) {
                        this.frameCount = parseInt(match[1], 10);
                        this.lastFrameTime = now;
                        console.log(`[ffmpeg] frame=${match[1]} fps=${match[2]} size=${match[3]}`);
                        lastLogTime = now;
                    }
                }
                // Update frame count even if not logging
                else if (str.includes('frame=')) {
                    const match = str.match(/frame=\s*(\d+)/);
                    if (match) {
                        this.frameCount = parseInt(match[1], 10);
                        this.lastFrameTime = now;
                    }
                }
                this.events.onStderr(str);
            });
        }
        this.isRunning = true;
        console.log('[ffmpeg] Pipeline started');
    }
    /**
     * Write a JPEG frame to FFmpeg stdin
     * Returns true if frame was written, false if pipeline not ready
     */
    writeFrame(frameBuffer) {
        if (!this.isRunning || !this.process?.stdin) {
            return false;
        }
        try {
            this.process.stdin.write(frameBuffer);
            return true;
        }
        catch {
            return false;
        }
    }
    stop() {
        console.log('[ffmpeg] Stopping pipeline...');
        this.isRunning = false;
        if (this.process) {
            this.process.kill('SIGTERM');
            // Force kill after timeout
            setTimeout(() => {
                if (this.process && !this.process.killed) {
                    this.process.kill('SIGKILL');
                }
            }, 5000);
        }
    }
    isActive() {
        return this.isRunning;
    }
    getFrameCount() {
        return this.frameCount;
    }
    isRtmpConnected() {
        return this.rtmpConnected;
    }
    /**
     * Check if frames are progressing (not stalled)
     * Returns true if frames have increased since last check
     */
    checkFrameProgress() {
        const now = Date.now();
        const framesSinceLastCheck = this.frameCount - this.lastFrameCount;
        const secondsSinceLastFrame = this.lastFrameTime > 0 ? (now - this.lastFrameTime) / 1000 : 0;
        this.lastFrameCount = this.frameCount;
        const healthy = framesSinceLastCheck > 0 && secondsSinceLastFrame < 60;
        return { healthy, framesSinceLastCheck, secondsSinceLastFrame };
    }
}
//# sourceMappingURL=ffmpeg-pipeline.js.map