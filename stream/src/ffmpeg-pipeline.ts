/**
 * FFmpeg pipeline for encoding and streaming
 * Captures from X11 display (Xvfb), adds audio, outputs to RTMP destinations
 */

import { spawn, ChildProcess } from 'child_process';

export interface PipelineConfig {
  width: number;
  height: number;
  fps: number;
  bitrate: string;
  audioUrl: string | null; // null = silent audio
  teeOutput: string; // FFmpeg tee muxer output string
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

  constructor(config: PipelineConfig, events: PipelineEvents) {
    this.config = config;
    this.events = events;
  }

  start(): void {
    if (this.isRunning) {
      throw new Error('Pipeline already running');
    }

    const display = process.env.DISPLAY || ':99';
    const hasAudio = this.config.audioUrl !== null;

    const args: string[] = [
      // Input: X11 display capture
      '-f', 'x11grab',
      '-video_size', `${this.config.width}x${this.config.height}`,
      '-framerate', String(this.config.fps),
      '-i', display,
    ];

    // Add audio input
    if (hasAudio) {
      args.push('-i', this.config.audioUrl!);
    } else {
      // Use local lofi file on infinite loop as fallback
      const lofiPath = '/app/lofi-fallback.mp3';
      args.push(
        '-stream_loop', '-1', // Infinite loop
        '-i', lofiPath
      );
      console.log('[ffmpeg] Using lofi fallback audio (looped)');
    }

    args.push(
      // Video encoding
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-b:v', this.config.bitrate,
      '-maxrate', '3000k',
      '-bufsize', '6000k',
      '-pix_fmt', 'yuv420p',
      '-g', String(this.config.fps * 2), // Keyframe every 2 seconds

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
    console.log(`[ffmpeg] Capture: ${display} at ${this.config.width}x${this.config.height}@${this.config.fps}fps`);
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

        // Log important lines always
        if (str.includes('Error') || str.includes('error') ||
            str.includes('Opening') || str.includes('Output') ||
            str.includes('Connection') || str.includes('failed') ||
            str.includes('Stream mapping')) {
          console.log(`[ffmpeg] ${str.trim()}`);
        }
        // Log frame stats every 10 seconds
        else if (str.includes('frame=') && (now - lastLogTime) > 10000) {
          const match = str.match(/frame=\s*(\d+).*fps=\s*([\d.]+).*size=\s*(\S+)/);
          if (match) {
            this.frameCount = parseInt(match[1], 10);
            console.log(`[ffmpeg] frame=${match[1]} fps=${match[2]} size=${match[3]}`);
            lastLogTime = now;
          }
        }
        this.events.onStderr(str);
      });
    }

    this.isRunning = true;
    console.log('[ffmpeg] Pipeline started');
  }

  // Not used in x11grab mode
  writeFrame(_frameBuffer: Buffer): boolean {
    return false;
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
}
