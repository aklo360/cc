/**
 * Stream orchestrator
 * Connects CDP capture to FFmpeg pipeline with auto-restart on failure
 * Director switches between /watch and /vj based on brain state
 */

import { EventEmitter } from 'events';
import { CdpCapture, CaptureConfig } from './cdp-capture.js';
import { FfmpegPipeline, PipelineConfig } from './ffmpeg-pipeline.js';
import { loadDestinations, getDestinationNames, DestinationConfig } from './destinations.js';
import { Director } from './director.js';

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

export class Streamer extends EventEmitter {
  private config: StreamerConfig;
  private cdpCapture: CdpCapture | null = null;
  private ffmpegPipeline: FfmpegPipeline | null = null;
  private destinationConfig: DestinationConfig | null = null;
  private director: Director | null = null;

  private state: StreamerState = 'stopped';
  private startTime: number = 0;
  private restartCount: number = 0;
  private lastError: string | null = null;
  private isShuttingDown: boolean = false;
  private restartResetTimer: NodeJS.Timeout | null = null;
  private static readonly RESTART_RESET_AFTER_MS = 5 * 60 * 1000; // Reset counter after 5 min stable

  constructor(config: StreamerConfig) {
    super();
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.state === 'streaming' || this.state === 'starting') {
      throw new Error(`Cannot start: already ${this.state}`);
    }

    this.isShuttingDown = false;
    this.setState('starting');

    try {
      // Load destinations
      this.destinationConfig = loadDestinations();
      const destNames = getDestinationNames(this.destinationConfig);

      if (destNames.length === 0) {
        throw new Error('No RTMP destinations configured. Set RTMP_*_KEY env vars.');
      }

      console.log(`[streamer] Starting stream to: ${destNames.join(', ')}`);

      // YouTube live streams block datacenter IPs, so we use local lofi audio
      // The lofi file is mounted at /app/lofi-fallback.mp3 and loops infinitely
      console.log('[streamer] Using lofi fallback audio (YouTube blocks datacenter IPs)');
      const audioPipePath: string | null = null;

      // Create FFmpeg pipeline
      const pipelineConfig: PipelineConfig = {
        width: this.config.width,
        height: this.config.height,
        fps: this.config.fps,
        bitrate: this.config.bitrate,
        audioUrl: audioPipePath,
        teeOutput: this.destinationConfig.teeOutput,
      };

      this.ffmpegPipeline = new FfmpegPipeline(pipelineConfig, {
        onError: (error) => this.handleError('ffmpeg', error),
        onExit: (code) => this.handleExit('ffmpeg', code),
        onStderr: () => {}, // Logged internally
      });

      // Start FFmpeg first
      this.ffmpegPipeline.start();

      // Create CDP capture
      const captureConfig: CaptureConfig = {
        url: this.config.watchUrl,
        width: this.config.width,
        height: this.config.height,
        fps: this.config.fps,
        quality: this.config.jpegQuality,
      };

      this.cdpCapture = new CdpCapture(captureConfig, {
        onFrame: (buffer) => this.handleFrame(buffer),
        onError: (error) => this.handleError('cdp', error),
        onDisconnect: () => this.handleDisconnect('cdp'),
      });

      // Start capture
      await this.cdpCapture.start();

      // Director disabled for now - VJ page doesn't work in headless Chrome
      // TODO: Create a simpler idle page that works in headless Chrome
      // const page = this.cdpCapture.getPage();
      // if (page) {
      //   this.director = new Director({
      //     brainUrl: this.config.brainUrl,
      //     watchUrl: this.config.watchUrl,
      //     vjUrl: this.config.vjUrl,
      //     pollInterval: 30000,
      //   });
      //   this.director.start(page);
      // }

      this.startTime = Date.now();
      this.setState('streaming');
      console.log('[streamer] Stream is live!');

      // Reset restart counter after stable streaming for 5 minutes
      this.restartResetTimer = setTimeout(() => {
        if (this.state === 'streaming' && this.restartCount > 0) {
          console.log(`[streamer] Stream stable for 5 min, resetting restart counter (was ${this.restartCount})`);
          this.restartCount = 0;
        }
      }, Streamer.RESTART_RESET_AFTER_MS);

    } catch (error) {
      this.lastError = (error as Error).message;
      this.setState('error');
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log('[streamer] Stopping stream...');
    this.isShuttingDown = true;
    this.setState('stopped');

    // Clear restart reset timer
    if (this.restartResetTimer) {
      clearTimeout(this.restartResetTimer);
      this.restartResetTimer = null;
    }

    if (this.director) {
      this.director.stop();
      this.director = null;
    }

    if (this.cdpCapture) {
      await this.cdpCapture.stop();
      this.cdpCapture = null;
    }

    if (this.ffmpegPipeline) {
      this.ffmpegPipeline.stop();
      this.ffmpegPipeline = null;
    }

    console.log('[streamer] Stream stopped');
  }

  private handleFrame(buffer: Buffer): void {
    if (this.ffmpegPipeline?.isActive()) {
      this.ffmpegPipeline.writeFrame(buffer);
    }
  }

  private handleError(source: string, error: Error): void {
    console.error(`[streamer] Error from ${source}:`, error.message);
    this.lastError = `${source}: ${error.message}`;

    if (!this.isShuttingDown) {
      this.attemptRestart();
    }
  }

  private handleExit(source: string, code: number | null): void {
    console.log(`[streamer] ${source} exited with code ${code}`);

    if (!this.isShuttingDown && this.state === 'streaming') {
      this.lastError = `${source} exited with code ${code}`;
      this.attemptRestart();
    }
  }

  private handleDisconnect(source: string): void {
    console.log(`[streamer] ${source} disconnected`);

    if (!this.isShuttingDown && this.state === 'streaming') {
      this.lastError = `${source} disconnected`;
      this.attemptRestart();
    }
  }

  private async attemptRestart(): Promise<void> {
    // Never give up permanently - reset counter and use longer delay after max restarts
    if (this.restartCount >= this.config.maxRestarts) {
      console.log(`[streamer] Max restarts (${this.config.maxRestarts}) reached. Waiting 60s before resetting counter and trying again...`);
      this.emit('maxRestartsReached');
      await new Promise((resolve) => setTimeout(resolve, 60000)); // Wait 60 seconds
      this.restartCount = 0; // Reset counter
    }

    this.restartCount++;
    console.log(`[streamer] Attempting restart ${this.restartCount}/${this.config.maxRestarts}...`);
    this.setState('restarting');

    // Clean up existing resources
    if (this.director) {
      this.director.stop();
      this.director = null;
    }
    if (this.cdpCapture) {
      await this.cdpCapture.stop().catch(() => {});
      this.cdpCapture = null;
    }
    if (this.ffmpegPipeline) {
      this.ffmpegPipeline.stop();
      this.ffmpegPipeline = null;
    }

    // Wait before restarting
    await new Promise((resolve) => setTimeout(resolve, this.config.restartDelayMs));

    if (this.isShuttingDown) {
      return;
    }

    // Try to start again
    try {
      await this.start();
      this.emit('restarted', this.restartCount);
    } catch (error) {
      console.error('[streamer] Restart failed:', error);
      this.attemptRestart();
    }
  }

  private setState(state: StreamerState): void {
    const oldState = this.state;
    this.state = state;
    if (oldState !== state) {
      this.emit('stateChange', state, oldState);
    }
  }

  getStats(): StreamerStats {
    return {
      state: this.state,
      frameCount: this.ffmpegPipeline?.getFrameCount() ?? 0,
      uptime: this.state === 'streaming' ? Date.now() - this.startTime : 0,
      restarts: this.restartCount,
      destinations: this.destinationConfig
        ? getDestinationNames(this.destinationConfig)
        : [],
      lastError: this.lastError,
      currentScene: this.director?.getScene() ?? 'watch',
    };
  }

  getState(): StreamerState {
    return this.state;
  }
}
