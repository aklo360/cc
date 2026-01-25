/**
 * VJ - Claude-Powered Live Visual Generator
 *
 * Main entry point and orchestrator for the VJ system.
 * Coordinates audio capture, analysis, and visual rendering.
 */

import {
  captureSystemAudio,
  stopCapture,
  isSystemAudioSupported,
  type AudioCapture,
} from './audio/capture';
import { analyze, type AudioFeatures } from './audio/analyzer';
import { initBeatDetection, updateBeat, resetBeatState, type BeatState } from './audio/beat';
import {
  type IVisualEngine,
  type VisualParams,
  type VisualStyle,
  ThreeJSEngine,
  HydraEngine,
  RemotionEngine,
} from './engines/index';

export type EngineType = 'threejs' | 'hydra' | 'remotion';

export interface VJConfig {
  engine?: EngineType;
  style?: VisualStyle;
  fftSize?: number;
}

export interface VJState {
  isRunning: boolean;
  isCapturing: boolean;
  engine: EngineType;
  style: VisualStyle;
  audio: AudioFeatures | null;
  beat: BeatState | null;
  fps: number;
}

/**
 * Main VJ class - orchestrates audio capture and visual rendering
 */
export class VJ {
  private container: HTMLElement | null = null;
  private capture: AudioCapture | null = null;
  private engine: IVisualEngine | null = null;
  private engineType: EngineType = 'threejs';
  private style: VisualStyle = 'synthwave';

  private animationFrameId: number | null = null;
  private isRunning = false;
  private lastFrameTime = 0;
  private frameCount = 0;
  private fps = 0;
  private startTime = 0;

  // Current audio state
  private currentAudio: AudioFeatures | null = null;
  private currentBeat: BeatState | null = null;

  // Parameters
  private params = {
    intensity: 1,
    colorShift: 0,
    zoom: 1,
    speed: 1,
  };

  /**
   * Check if browser supports system audio capture
   */
  static isSupported(): boolean {
    return isSystemAudioSupported();
  }

  /**
   * Get current state
   */
  getState(): VJState {
    return {
      isRunning: this.isRunning,
      isCapturing: this.capture !== null,
      engine: this.engineType,
      style: this.style,
      audio: this.currentAudio,
      beat: this.currentBeat,
      fps: this.fps,
    };
  }

  /**
   * Initialize VJ with a container element
   */
  async init(container: HTMLElement, config: VJConfig = {}): Promise<void> {
    this.container = container;
    this.engineType = config.engine || 'threejs';
    this.style = config.style || 'synthwave';

    // Create and initialize engine
    await this.createEngine(this.engineType);

    console.log(`VJ initialized with ${this.engineType} engine, ${this.style} style`);
  }

  /**
   * Create a visual engine
   */
  private async createEngine(type: EngineType): Promise<void> {
    if (!this.container) throw new Error('Container not set');

    // Dispose old engine
    if (this.engine) {
      this.engine.dispose();
    }

    // Create new engine
    switch (type) {
      case 'threejs':
        this.engine = new ThreeJSEngine();
        break;
      case 'hydra':
        this.engine = new HydraEngine();
        break;
      case 'remotion':
        this.engine = new RemotionEngine();
        break;
    }

    // Clear container and initialize
    this.container.innerHTML = '';
    await this.engine.init(this.container);
    this.engine.setStyle(this.style);

    // Copy parameters to engine
    for (const [key, value] of Object.entries(this.params)) {
      this.engine.setParameter(key, value);
    }

    this.engineType = type;
  }

  /**
   * Start capturing system audio
   */
  async startCapture(): Promise<void> {
    if (this.capture) {
      console.warn('Already capturing audio');
      return;
    }

    this.capture = await captureSystemAudio();
    await initBeatDetection(this.capture);
    console.log('Audio capture started');
  }

  /**
   * Stop capturing audio
   */
  stopCapture(): void {
    if (this.capture) {
      stopCapture(this.capture);
      this.capture = null;
      resetBeatState();
      console.log('Audio capture stopped');
    }
  }

  /**
   * Start the animation loop
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.frameCount = 0;

    this.animate();
    console.log('VJ started');
  }

  /**
   * Stop the animation loop
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    console.log('VJ stopped');
  }

  /**
   * Main animation loop
   */
  private animate = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const deltaTime = (now - this.lastFrameTime) / 1000;
    const time = (now - this.startTime) / 1000;

    // Calculate FPS
    this.frameCount++;
    if (now - this.lastFrameTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFrameTime = now;
    }

    // Analyze audio if capturing
    if (this.capture) {
      this.currentAudio = analyze(this.capture);
      this.currentBeat = updateBeat(this.currentAudio.bands.bass);
    } else {
      // Generate fake audio data for testing without capture
      this.currentAudio = {
        bands: {
          bass: Math.abs(Math.sin(time * 2)) * 0.5,
          lowMid: Math.abs(Math.sin(time * 3 + 1)) * 0.4,
          mid: Math.abs(Math.sin(time * 4 + 2)) * 0.5,
          highMid: Math.abs(Math.sin(time * 5 + 3)) * 0.3,
          high: Math.abs(Math.sin(time * 6 + 4)) * 0.4,
        },
        overall: 0.4 + Math.sin(time) * 0.2,
        peak: 0.5,
        spectralCentroid: 0.5,
        isBeat: Math.random() < 0.1,
      };
      this.currentBeat = {
        bpm: 120,
        confidence: 0.5,
        lastBeatTime: now - (now % 500),
        beatInterval: 500,
        phase: (now % 500) / 500,
      };
    }

    // Render
    if (this.engine && this.currentAudio && this.currentBeat) {
      const params: VisualParams = {
        audio: this.currentAudio,
        beat: this.currentBeat,
        style: this.style,
        intensity: this.params.intensity,
        colorShift: this.params.colorShift,
        zoom: this.params.zoom,
        speed: this.params.speed,
        time,
        deltaTime,
      };

      this.engine.render(params);
    }

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  /**
   * Switch visual engine
   */
  async setEngine(type: EngineType): Promise<void> {
    if (type === this.engineType) return;

    const wasRunning = this.isRunning;
    if (wasRunning) this.stop();

    await this.createEngine(type);

    if (wasRunning) this.start();

    console.log(`Switched to ${type} engine`);
  }

  /**
   * Set visual style
   */
  setStyle(style: VisualStyle): void {
    this.style = style;
    if (this.engine) {
      this.engine.setStyle(style);
    }
    console.log(`Set style to ${style}`);
  }

  /**
   * Set a parameter
   */
  setParameter(name: string, value: number): void {
    if (name in this.params) {
      (this.params as Record<string, number>)[name] = value;
    }
    if (this.engine) {
      this.engine.setParameter(name, value);
    }
  }

  /**
   * Get a parameter
   */
  getParameter(name: string): number | undefined {
    return (this.params as Record<string, number>)[name];
  }

  /**
   * Handle window resize
   */
  resize(width: number, height: number): void {
    if (this.engine) {
      this.engine.resize(width, height);
    }
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.stop();
    this.stopCapture();
    if (this.engine) {
      this.engine.dispose();
      this.engine = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }
    console.log('VJ disposed');
  }

  /**
   * Get the current engine instance (for advanced control like Hydra code injection)
   */
  getEngine(): IVisualEngine | null {
    return this.engine;
  }
}

// Export all modules
export * from './audio/index';
export * from './engines/index';
