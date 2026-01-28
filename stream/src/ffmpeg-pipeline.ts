/**
 * FFmpeg pipeline for encoding and streaming
 * Supports two capture modes:
 * 1. Display mode - Captures from display (x11grab on Linux, avfoundation on macOS)
 * 2. Window mode - Receives JPEG frames via stdin (for window-specific capture)
 */

import { spawn, ChildProcess } from 'child_process';

export type PipelineMode = 'display' | 'window';

export interface PipelineConfig {
  width: number;
  height: number;
  fps: number;
  bitrate: string;
  audioUrl: string | null; // null = silent audio
  teeOutput: string; // FFmpeg tee muxer output string
  mode?: PipelineMode; // 'display' or 'window'
}

export interface PipelineEvents {
  onError: (error: Error) => void;
  onExit: (code: number | null) => void;
  onStderr: (data: string) => void;
}

export class FfmpegPipeline {
  private config: PipelineConfig;
  private events: PipelineEvents;
  private process: ChildProcess | null = null;
  private isRunning = false;
  private frameCount = 0;
  private lastFrameCount = 0;
  private lastFrameTime = 0;
  private rtmpConnected = false;

  constructor(config: PipelineConfig, events: PipelineEvents) {
    this.config = config;
    this.events = events;
  }

  start(): void {
    if (this.isRunning) {
      throw new Error('Pipeline already running');
    }

    const isMacOS = process.platform === 'darwin';
    const hasAudio = this.config.audioUrl !== null;
    const mode = this.config.mode || 'display';

    const args: string[] = [];

    if (mode === 'window') {
      // Window mode: Receive JPEG frames via stdin
      // This allows window-specific capture regardless of macOS Space switches
      args.push(
        '-f', 'mjpeg', // Motion JPEG input
        '-framerate', String(this.config.fps),
        '-i', 'pipe:0', // Read from stdin
      );
    } else if (isMacOS) {
      // Display mode on macOS: Use avfoundation for screen capture
      // Capture the main display (index 0)
      // Note: You may need to grant Screen Recording permission in System Preferences
      args.push(
        '-f', 'avfoundation',
        '-framerate', String(this.config.fps),
        '-capture_cursor', '0', // Don't capture cursor
        '-i', '0:none', // Screen 0 (main display), no audio from system
      );
    } else {
      // Display mode on Linux: Use x11grab
      const display = process.env.DISPLAY || ':99';
      args.push(
        '-f', 'x11grab',
        '-video_size', `${this.config.width}x${this.config.height}`,
        '-framerate', String(this.config.fps),
        '-i', display,
      );
    }

    // Add audio input
    if (hasAudio) {
      // YouTube live stream - add reconnect options for reliability
      args.push(
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '5',
        '-i', this.config.audioUrl!
      );
    } else {
      // Use local lofi file on infinite loop as fallback
      const lofiPath = isMacOS
        ? `${process.cwd()}/lofi-fallback.mp3`
        : '/app/lofi-fallback.mp3';
      args.push(
        '-stream_loop', '-1', // Infinite loop
        '-i', lofiPath
      );
      console.log('[ffmpeg] Using lofi fallback audio (looped)');
    }

    if (mode === 'window') {
      // Window mode: MJPEG input, use VideoToolbox hardware encoding
      // Scale to ensure consistent output size
      args.push(
        '-vf', `scale=${this.config.width}:${this.config.height}`,
        '-c:v', 'h264_videotoolbox',
        '-b:v', this.config.bitrate,
        '-maxrate', '3000k',
        '-bufsize', '6000k',
        '-pix_fmt', 'yuv420p',
        '-g', String(this.config.fps * 2), // Keyframe every 2 seconds
        '-profile:v', 'high',
        '-level', '4.1',
      );
    } else if (isMacOS) {
      // macOS display mode: Scale to target resolution and use hardware encoding
      args.push(
        // Scale to target size
        '-vf', `scale=${this.config.width}:${this.config.height}`,
        // Video encoding - try VideoToolbox (hardware), fall back to libx264
        '-c:v', 'h264_videotoolbox',
        '-b:v', this.config.bitrate,
        '-maxrate', '3000k',
        '-bufsize', '6000k',
        '-pix_fmt', 'yuv420p',
        '-g', String(this.config.fps * 2), // Keyframe every 2 seconds
        '-profile:v', 'high',
        '-level', '4.1',
      );
    } else {
      // Linux display mode: Software encoding
      args.push(
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-b:v', this.config.bitrate,
        '-maxrate', '3000k',
        '-bufsize', '6000k',
        '-pix_fmt', 'yuv420p',
        '-g', String(this.config.fps * 2), // Keyframe every 2 seconds
      );
    }

    args.push(
      // Audio encoding
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',

      // Output: direct RTMP or tee muxer for multiple destinations
      '-map', '0:v',
      '-map', '1:a',
    );

    // If only one destination, output directly to RTMP (more reliable)
    // If multiple, use tee muxer
    if (this.config.teeOutput.includes('|')) {
      args.push('-f', 'tee', this.config.teeOutput);
    } else {
      // Extract URL from tee format: [f=flv]rtmp://... -> rtmp://...
      const rtmpUrl = this.config.teeOutput.replace(/^\[f=flv\]/, '');
      args.push('-f', 'flv', rtmpUrl);
    }

    console.log('[ffmpeg] Starting pipeline...');
    if (mode === 'window') {
      console.log('[ffmpeg] Mode: window (MJPEG stdin + VideoToolbox)');
    } else {
      console.log(`[ffmpeg] Mode: display (${isMacOS ? 'avfoundation + VideoToolbox' : 'x11grab + libx264'})`);
    }
    console.log(`[ffmpeg] Resolution: ${this.config.width}x${this.config.height}@${this.config.fps}fps`);
    console.log(`[ffmpeg] Audio: ${hasAudio ? 'YouTube stream' : 'lofi fallback (looped)'}`);
    console.log(`[ffmpeg] Output: ${this.config.teeOutput}`);

    this.process = spawn('ffmpeg', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

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
   * Write a frame to FFmpeg stdin (window mode only)
   * Returns true if frame was written, false if pipeline not ready
   */
  writeFrame(frameBuffer: Buffer): boolean {
    if (!this.isRunning || !this.process?.stdin || this.config.mode !== 'window') {
      return false;
    }

    try {
      // Write JPEG frame to stdin
      const written = this.process.stdin.write(frameBuffer);
      if (!written) {
        // Buffer is full, frame will be dropped
        // This is expected under high load
      }
      return true;
    } catch (error) {
      // Stdin closed or process crashed
      return false;
    }
  }

  stop(): void {
    console.log('[ffmpeg] Stopping pipeline...');
    this.isRunning = false;

    if (this.process) {
      // Send quit signal
      this.process.kill('SIGTERM');

      // Force kill after timeout
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    }
  }

  isActive(): boolean {
    return this.isRunning;
  }

  getFrameCount(): number {
    return this.frameCount;
  }

  isRtmpConnected(): boolean {
    return this.rtmpConnected;
  }

  /**
   * Check if frames are progressing (not stalled)
   * Returns true if frames have increased since last check
   */
  checkFrameProgress(): { healthy: boolean; framesSinceLastCheck: number; secondsSinceLastFrame: number } {
    const now = Date.now();
    const framesSinceLastCheck = this.frameCount - this.lastFrameCount;
    const secondsSinceLastFrame = this.lastFrameTime > 0 ? (now - this.lastFrameTime) / 1000 : 0;

    // Update last check values
    this.lastFrameCount = this.frameCount;

    // Healthy if frames are progressing and last frame was recent
    const healthy = framesSinceLastCheck > 0 && secondsSinceLastFrame < 60;

    return { healthy, framesSinceLastCheck, secondsSinceLastFrame };
  }
}
