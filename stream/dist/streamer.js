/**
 * Stream orchestrator
 * Connects CDP capture to FFmpeg pipeline with auto-restart on failure
 * Director switches between /watch and /vj based on brain state
 */
import { EventEmitter } from 'events';
import { CdpCapture } from './cdp-capture.js';
import { FfmpegPipeline } from './ffmpeg-pipeline.js';
import { loadDestinations, getDestinationNames } from './destinations.js';
import { Director } from './director.js';
import { getYouTubeAudioUrl } from './youtube-audio.js';
export class Streamer extends EventEmitter {
    config;
    cdpCapture = null;
    ffmpegPipeline = null;
    destinationConfig = null;
    director = null;
    state = 'stopped';
    startTime = 0;
    restartCount = 0;
    lastError = null;
    isShuttingDown = false;
    restartResetTimer = null;
    streamHealthInterval = null;
    static RESTART_RESET_AFTER_MS = 5 * 60 * 1000; // Reset counter after 5 min stable
    static STREAM_HEALTH_CHECK_MS = 3 * 60 * 1000; // Check stream health every 3 minutes
    constructor(config) {
        super();
        this.config = config;
    }
    async start() {
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
            // Try YouTube lofi stream first, fall back to local file
            let audioUrl = null;
            try {
                audioUrl = await getYouTubeAudioUrl();
                if (audioUrl) {
                    console.log('[streamer] Using YouTube lofi stream audio');
                }
            }
            catch (error) {
                console.error('[streamer] YouTube audio fetch failed:', error.message);
            }
            if (!audioUrl) {
                console.log('[streamer] Falling back to local lofi audio file');
            }
            // Create FFmpeg pipeline
            const pipelineConfig = {
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
                onStderr: () => { }, // Logged internally
            });
            // Start FFmpeg first
            this.ffmpegPipeline.start();
            // Create CDP capture
            const captureConfig = {
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
            // Director: switches between /watch and /vj based on brain state
            // Enabled on macOS (GPU/WebGL works), disabled on Linux Docker
            const isMacOS = process.platform === 'darwin';
            const page = this.cdpCapture.getPage();
            if (page && isMacOS) {
                console.log('[streamer] Starting Director (macOS GPU mode)');
                this.director = new Director({
                    brainUrl: this.config.brainUrl,
                    watchUrl: this.config.watchUrl,
                    vjUrl: this.config.vjUrl,
                    pollInterval: 30000, // Check brain status every 30 seconds
                });
                this.director.start(page);
            }
            else if (page) {
                console.log('[streamer] Director disabled (Linux/Docker mode - no GPU)');
            }
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
            // Start comprehensive stream health monitoring (every 3 minutes)
            this.startStreamHealthCheck();
        }
        catch (error) {
            this.lastError = error.message;
            this.setState('error');
            throw error;
        }
    }
    async stop() {
        console.log('[streamer] Stopping stream...');
        this.isShuttingDown = true;
        this.setState('stopped');
        // Clear restart reset timer
        if (this.restartResetTimer) {
            clearTimeout(this.restartResetTimer);
            this.restartResetTimer = null;
        }
        // Clear stream health check interval
        this.stopStreamHealthCheck();
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
    handleFrame(buffer) {
        if (this.ffmpegPipeline?.isActive()) {
            this.ffmpegPipeline.writeFrame(buffer);
        }
    }
    handleError(source, error) {
        console.error(`[streamer] Error from ${source}:`, error.message);
        this.lastError = `${source}: ${error.message}`;
        if (!this.isShuttingDown) {
            this.attemptRestart();
        }
    }
    handleExit(source, code) {
        console.log(`[streamer] ${source} exited with code ${code}`);
        if (!this.isShuttingDown && this.state === 'streaming') {
            this.lastError = `${source} exited with code ${code}`;
            this.attemptRestart();
        }
    }
    handleDisconnect(source) {
        console.log(`[streamer] ${source} disconnected`);
        if (!this.isShuttingDown && this.state === 'streaming') {
            this.lastError = `${source} disconnected`;
            this.attemptRestart();
        }
    }
    async attemptRestart() {
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
            await this.cdpCapture.stop().catch(() => { });
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
        }
        catch (error) {
            console.error('[streamer] Restart failed:', error);
            this.attemptRestart();
        }
    }
    /**
     * Comprehensive stream health check - runs every 3 minutes
     * Checks: FFmpeg frame progress, RTMP connection, CDP page health
     */
    startStreamHealthCheck() {
        // Clear any existing interval
        if (this.streamHealthInterval) {
            clearInterval(this.streamHealthInterval);
        }
        console.log('[streamer] Starting stream health monitor (every 3 min)');
        this.streamHealthInterval = setInterval(async () => {
            if (this.state !== 'streaming' || this.isShuttingDown) {
                return;
            }
            try {
                await this.checkStreamHealth();
            }
            catch (error) {
                console.error('[streamer] Health check failed:', error.message);
                this.lastError = `Health check: ${error.message}`;
                this.attemptRestart();
            }
        }, Streamer.STREAM_HEALTH_CHECK_MS);
    }
    async checkStreamHealth() {
        console.log('[streamer] Running 3-minute health check...');
        // Check 1: FFmpeg frame progress
        if (this.ffmpegPipeline) {
            const frameCheck = this.ffmpegPipeline.checkFrameProgress();
            console.log(`[streamer] Frame check: +${frameCheck.framesSinceLastCheck} frames, ${frameCheck.secondsSinceLastFrame.toFixed(1)}s since last`);
            if (!frameCheck.healthy) {
                throw new Error(`FFmpeg stalled: ${frameCheck.framesSinceLastCheck} frames in last 3 min, ${frameCheck.secondsSinceLastFrame.toFixed(1)}s since last frame`);
            }
            // Check RTMP connection status
            if (!this.ffmpegPipeline.isRtmpConnected()) {
                console.warn('[streamer] RTMP connection status: disconnected (may be normal during startup)');
            }
        }
        else {
            throw new Error('FFmpeg pipeline not running');
        }
        // Check 2: CDP/Chrome page health (already checked every 30s, but verify here too)
        if (this.cdpCapture && !this.cdpCapture.isRunning()) {
            throw new Error('CDP capture not running');
        }
        console.log('[streamer] Health check passed ✓');
    }
    stopStreamHealthCheck() {
        if (this.streamHealthInterval) {
            clearInterval(this.streamHealthInterval);
            this.streamHealthInterval = null;
        }
    }
    setState(state) {
        const oldState = this.state;
        this.state = state;
        if (oldState !== state) {
            this.emit('stateChange', state, oldState);
        }
    }
    getStats() {
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
    getState() {
        return this.state;
    }
}
//# sourceMappingURL=streamer.js.map