/**
 * Stream orchestrator
 * Connects CDP capture to FFmpeg pipeline with auto-restart on failure
 * Director switches between /watch and /vj based on brain state
 */
import { EventEmitter } from 'events';
import { CdpCapture } from './cdp-capture.js';
import { FfmpegPipeline } from './ffmpeg-pipeline.js';
import { loadDestinations, getDestinationNames } from './destinations.js';
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
            // YouTube live streams block datacenter IPs, so we use local lofi audio
            // The lofi file is mounted at /app/lofi-fallback.mp3 and loops infinitely
            console.log('[streamer] Using lofi fallback audio (YouTube blocks datacenter IPs)');
            const audioPipePath = null;
            // Create FFmpeg pipeline
            const pipelineConfig = {
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
        if (this.restartCount >= this.config.maxRestarts) {
            console.error(`[streamer] Max restarts (${this.config.maxRestarts}) reached. Giving up.`);
            this.setState('error');
            this.emit('maxRestartsReached');
            return;
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