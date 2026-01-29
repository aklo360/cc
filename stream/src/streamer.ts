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
import { CdpCapture, CaptureConfig } from './cdp-capture.js';
import { FfmpegPipeline, PipelineConfig } from './ffmpeg-pipeline.js';
import { loadDestinations, getDestinationNames, DestinationConfig } from './destinations.js';
import { Director } from './director.js';
import { getYouTubeAudioUrl, isUrlExpiringSoon, clearCache as clearYouTubeCache, getUrlTtl } from './youtube-audio.js';

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
  private isHotSwapping: boolean = false;
  private restartResetTimer: NodeJS.Timeout | null = null;
  private streamHealthInterval: NodeJS.Timeout | null = null;
  private audioRefreshInterval: NodeJS.Timeout | null = null;
  private watchdogInterval: NodeJS.Timeout | null = null;
  private usingFallbackAudio: boolean = false;
  private lastFrameTime: number = 0;
  private consecutiveEmptyPages: number = 0;

  // Timing constants
  private static readonly RESTART_RESET_AFTER_MS = 5 * 60 * 1000; // Reset restart counter after 5 min stable
  private static readonly STREAM_HEALTH_CHECK_MS = 3 * 60 * 1000; // Health check every 3 min
  private static readonly AUDIO_REFRESH_CHECK_MS = 30 * 60 * 1000; // Check YouTube URL every 30 min
  private static readonly AUDIO_REFRESH_THRESHOLD_MS = 60 * 60 * 1000; // Refresh if <1hr remaining
  private static readonly WATCHDOG_INTERVAL_MS = 30 * 1000; // Watchdog every 30 sec
  private static readonly WATCHDOG_FRAME_TIMEOUT_MS = 60 * 1000; // Restart if no frames for 60 sec
  private static readonly MAX_EMPTY_PAGE_CHECKS = 5; // Restart after 5 consecutive empty checks

  constructor(config: StreamerConfig) {
    super();
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.state === 'streaming' || this.state === 'starting') {
      throw new Error(`Cannot start: already ${this.state}`);
    }

    this.isShuttingDown = false;
    this.consecutiveEmptyPages = 0;
    this.setState('starting');

    try {
      // Load RTMP destinations
      this.destinationConfig = loadDestinations();
      const destNames = getDestinationNames(this.destinationConfig);

      if (destNames.length === 0) {
        throw new Error('No RTMP destinations configured. Set RTMP_*_KEY env vars.');
      }

      console.log(`[streamer] Starting stream to: ${destNames.join(', ')}`);

      // Get audio source (YouTube or fallback)
      const audioUrl = await this.getAudioSource();

      // Create FFmpeg pipeline
      const pipelineConfig: PipelineConfig = {
        width: this.config.width,
        height: this.config.height,
        fps: this.config.fps,
        bitrate: this.config.bitrate,
        audioUrl: audioUrl,
        teeOutput: this.destinationConfig.teeOutput,
      };

      this.ffmpegPipeline = new FfmpegPipeline(pipelineConfig, {
        onError: (error) => this.handleError('ffmpeg', error),
        onExit: (code) => this.handleExit('ffmpeg', code),
        onStderr: () => {},
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

      // Start Director for scene switching
      const page = this.cdpCapture.getPage();
      if (page) {
        console.log('[streamer] Starting Director');
        this.director = new Director({
          brainUrl: this.config.brainUrl,
          watchUrl: this.config.watchUrl,
          vjUrl: this.config.vjUrl,
          pollInterval: 30000,
        });
        this.director.start(page);
      }

      this.startTime = Date.now();
      this.lastFrameTime = Date.now();
      this.setState('streaming');
      console.log('[streamer] Stream is live!');
      console.log(`[streamer] Audio source: ${this.usingFallbackAudio ? 'LOCAL FALLBACK' : 'YouTube lofi'}`);

      // Reset restart counter after stable streaming for 5 minutes
      this.restartResetTimer = setTimeout(() => {
        if (this.state === 'streaming' && this.restartCount > 0) {
          console.log(`[streamer] Stream stable for 5 min, resetting restart counter (was ${this.restartCount})`);
          this.restartCount = 0;
        }
      }, Streamer.RESTART_RESET_AFTER_MS);

      // Start all monitoring
      this.startStreamHealthCheck();
      this.startAudioRefreshCheck();
      this.startWatchdog();

    } catch (error) {
      this.lastError = (error as Error).message;
      this.setState('error');
      throw error;
    }
  }

  /**
   * Get audio source - try YouTube first, fallback to local
   */
  private async getAudioSource(): Promise<string | null> {
    try {
      const audioUrl = await getYouTubeAudioUrl();
      if (audioUrl) {
        console.log('[streamer] Using YouTube lofi stream audio');
        this.usingFallbackAudio = false;
        return audioUrl;
      }
    } catch (error) {
      console.error('[streamer] YouTube audio fetch failed:', (error as Error).message);
    }

    console.log('[streamer] Using local lofi fallback audio');
    this.usingFallbackAudio = true;
    return null; // FFmpeg pipeline will use local file
  }

  async stop(): Promise<void> {
    console.log('[streamer] Stopping stream...');
    this.isShuttingDown = true;
    this.setState('stopped');

    // Clear all timers
    if (this.restartResetTimer) {
      clearTimeout(this.restartResetTimer);
      this.restartResetTimer = null;
    }

    this.stopStreamHealthCheck();
    this.stopAudioRefreshCheck();
    this.stopWatchdog();

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
      this.lastFrameTime = Date.now();
    }
  }

  private handleError(source: string, error: Error): void {
    console.error(`[streamer] Error from ${source}:`, error.message);
    this.lastError = `${source}: ${error.message}`;

    // Special handling for audio-related errors
    if (source === 'ffmpeg' && error.message.includes('audio')) {
      console.log('[streamer] Audio error detected, will use fallback on restart');
      clearYouTubeCache();
    }

    if (!this.isShuttingDown) {
      // For CDP errors, try hot-swap first (keeps RTMP alive)
      if (source === 'cdp' && this.state === 'streaming' && !this.isHotSwapping) {
        console.log('[streamer] CDP error - attempting hot-swap (RTMP stays connected)');
        this.restartCapture().catch((err) => {
          console.error('[streamer] Hot-swap failed, doing full restart:', err.message);
          this.attemptRestart();
        });
      } else {
        this.attemptRestart();
      }
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

    if (!this.isShuttingDown && !this.isHotSwapping && this.state === 'streaming') {
      this.lastError = `${source} disconnected`;
      this.attemptRestart();
    }
  }

  private async attemptRestart(): Promise<void> {
    if (this.isShuttingDown) return;

    if (this.restartCount >= this.config.maxRestarts) {
      console.log(`[streamer] Max restarts (${this.config.maxRestarts}) reached. Waiting 60s before reset...`);
      this.emit('maxRestartsReached');
      await new Promise((resolve) => setTimeout(resolve, 60000));
      this.restartCount = 0;
      // Clear YouTube cache to force fresh URL fetch
      clearYouTubeCache();
    }

    this.restartCount++;
    console.log(`[streamer] Attempting restart ${this.restartCount}/${this.config.maxRestarts}...`);
    this.setState('restarting');

    // Cleanup
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

    await new Promise((resolve) => setTimeout(resolve, this.config.restartDelayMs));

    if (this.isShuttingDown) return;

    try {
      await this.start();
      this.emit('restarted', this.restartCount);
    } catch (error) {
      console.error('[streamer] Restart failed:', error);
      // Recursive retry
      this.attemptRestart();
    }
  }

  /**
   * Stream health check - runs every 3 minutes
   */
  private startStreamHealthCheck(): void {
    if (this.streamHealthInterval) {
      clearInterval(this.streamHealthInterval);
    }

    console.log('[streamer] Starting stream health monitor (every 3 min)');

    this.streamHealthInterval = setInterval(async () => {
      if (this.state !== 'streaming' || this.isShuttingDown) return;

      try {
        await this.checkStreamHealth();
      } catch (error) {
        console.error('[streamer] Health check failed:', (error as Error).message);
        this.lastError = `Health check: ${(error as Error).message}`;
        this.attemptRestart();
      }
    }, Streamer.STREAM_HEALTH_CHECK_MS);
  }

  private async checkStreamHealth(): Promise<void> {
    console.log('[streamer] Running 3-minute health check...');

    // Check FFmpeg
    if (this.ffmpegPipeline) {
      const frameCheck = this.ffmpegPipeline.checkFrameProgress();
      console.log(`[streamer] Frame check: +${frameCheck.framesSinceLastCheck} frames, ${frameCheck.secondsSinceLastFrame.toFixed(1)}s since last`);

      if (!frameCheck.healthy) {
        throw new Error(`FFmpeg stalled: ${frameCheck.framesSinceLastCheck} frames in last 3 min`);
      }

      if (!this.ffmpegPipeline.isRtmpConnected()) {
        console.warn('[streamer] RTMP status: may be disconnected');
      }
    } else {
      throw new Error('FFmpeg pipeline not running');
    }

    // Check CDP
    if (this.cdpCapture && !this.cdpCapture.isRunning()) {
      throw new Error('CDP capture not running');
    }

    console.log('[streamer] Health check passed');
  }

  private stopStreamHealthCheck(): void {
    if (this.streamHealthInterval) {
      clearInterval(this.streamHealthInterval);
      this.streamHealthInterval = null;
    }
  }

  /**
   * YouTube URL refresh check - runs every 30 minutes
   * Triggers full restart with fresh URL if expiring soon
   */
  private startAudioRefreshCheck(): void {
    if (this.audioRefreshInterval) {
      clearInterval(this.audioRefreshInterval);
    }

    // Only start if using YouTube audio
    if (this.usingFallbackAudio) {
      console.log('[streamer] Using fallback audio, skipping YouTube refresh check');
      return;
    }

    console.log('[streamer] Starting YouTube URL refresh check (every 30 min)');

    this.audioRefreshInterval = setInterval(async () => {
      if (this.state !== 'streaming' || this.isShuttingDown || this.usingFallbackAudio) return;

      try {
        if (isUrlExpiringSoon(Streamer.AUDIO_REFRESH_THRESHOLD_MS)) {
          console.log('[streamer] YouTube URL expiring soon, triggering restart for fresh URL...');
          // Clear cache to force fresh fetch
          clearYouTubeCache();
          this.lastError = 'Scheduled audio URL refresh';
          this.attemptRestart();
        } else {
          console.log('[streamer] YouTube URL still valid');
        }
      } catch (error) {
        console.error('[streamer] Audio refresh check error:', (error as Error).message);
      }
    }, Streamer.AUDIO_REFRESH_CHECK_MS);
  }

  private stopAudioRefreshCheck(): void {
    if (this.audioRefreshInterval) {
      clearInterval(this.audioRefreshInterval);
      this.audioRefreshInterval = null;
    }
  }

  /**
   * Watchdog timer - catches stalls that other checks miss
   * Runs every 30 seconds, restarts if no frames for 60 seconds
   */
  private startWatchdog(): void {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
    }

    console.log('[streamer] Starting watchdog (30s interval, 60s timeout)');

    this.watchdogInterval = setInterval(() => {
      if (this.state !== 'streaming' || this.isShuttingDown) return;

      const timeSinceLastFrame = Date.now() - this.lastFrameTime;

      if (timeSinceLastFrame > Streamer.WATCHDOG_FRAME_TIMEOUT_MS) {
        console.error(`[streamer] WATCHDOG: No frames for ${Math.round(timeSinceLastFrame / 1000)}s, forcing restart!`);
        this.lastError = `Watchdog timeout: no frames for ${Math.round(timeSinceLastFrame / 1000)}s`;
        this.attemptRestart();
      }
    }, Streamer.WATCHDOG_INTERVAL_MS);
  }

  private stopWatchdog(): void {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
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
    const frameCount = this.cdpCapture?.getFrameCount() ?? 0;

    return {
      state: this.state,
      frameCount,
      uptime: this.state === 'streaming' ? Date.now() - this.startTime : 0,
      restarts: this.restartCount,
      destinations: this.destinationConfig
        ? getDestinationNames(this.destinationConfig)
        : [],
      lastError: this.lastError,
      currentScene: this.director?.getScene() ?? 'watch',
      schedule: this.director?.getScheduleInfo() ?? null,
      audioSource: this.usingFallbackAudio ? 'fallback' : 'youtube',
      youtubeUrlTtl: getUrlTtl(),
    };
  }

  getState(): StreamerState {
    return this.state;
  }

  async setScene(scene: 'watch' | 'vj'): Promise<void> {
    if (this.director) {
      await this.director.forceScene(scene);
    } else {
      throw new Error('Director not available');
    }
  }

  /**
   * Refresh the page to pick up deployed changes
   */
  async refreshPage(): Promise<void> {
    if (this.cdpCapture) {
      await this.cdpCapture.refreshPage();
    } else {
      throw new Error('CDP capture not available');
    }
  }

  /**
   * Hot-swap CDP capture without dropping RTMP connection
   */
  async restartCapture(): Promise<void> {
    if (this.state !== 'streaming') {
      throw new Error('Cannot restart capture: not streaming');
    }

    this.isHotSwapping = true;

    try {
      console.log('[streamer] Hot-swapping CDP capture...');

      if (this.director) {
        this.director.stop();
        this.director = null;
      }

      if (this.cdpCapture) {
        await this.cdpCapture.stop();
        this.cdpCapture = null;
      }

      await new Promise(r => setTimeout(r, 1000));

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

      await this.cdpCapture.start();

      const page = this.cdpCapture.getPage();
      if (page) {
        console.log('[streamer] Restarting Director');
        this.director = new Director({
          brainUrl: this.config.brainUrl,
          watchUrl: this.config.watchUrl,
          vjUrl: this.config.vjUrl,
          pollInterval: 30000,
        });
        this.director.start(page);
      }

      this.lastFrameTime = Date.now();
      console.log('[streamer] Hot-swap complete!');
    } finally {
      this.isHotSwapping = false;
    }
  }
}
