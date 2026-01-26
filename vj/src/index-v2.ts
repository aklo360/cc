/**
 * VJ v2 - Trippy Branded Visual Generator
 *
 * Main entry point and orchestrator for the VJ v2 system.
 * Uses new Three.js v2 and Hydra v2 engines with trippy effects.
 * ALWAYS shows $CC branding - mascot, orange (#da7756), logo integration.
 */

import {
  captureSystemAudio,
  stopCapture,
  isSystemAudioSupported,
  type AudioCapture,
} from './audio/capture';
import { analyze, type AudioFeatures } from './audio/analyzer';
import { initBeatDetection, updateBeat, resetBeatState, type BeatState } from './audio/beat';
import type { IVisualEngine, VisualParams, VisualStyle } from './engines/types';
import { ThreeJSEngineV2 } from './engines/threejs-v2/index';
import { HydraEngineV2 } from './engines/hydra-v2/index';

// V2 only has Two engines (removed Remotion - doesn't work real-time)
export type EngineTypeV2 = 'threejs' | 'hydra';

// Visual modes for trippy effects
export type VisualMode = 'tunnel' | 'mandala' | 'chaos' | 'auto';

export interface VJConfigV2 {
  engine?: EngineTypeV2;
  style?: VisualStyle;
  mode?: VisualMode;
  fftSize?: number;
}

export interface VJStateV2 {
  isRunning: boolean;
  isCapturing: boolean;
  engine: EngineTypeV2;
  style: VisualStyle;
  mode: VisualMode;
  audio: AudioFeatures | null;
  beat: BeatState | null;
  fps: number;
}

/**
 * Main VJ v2 class - orchestrates audio capture and trippy visual rendering
 */
export class VJv2 {
  private container: HTMLElement | null = null;
  private capture: AudioCapture | null = null;
  private engine: IVisualEngine | null = null;
  private engineType: EngineTypeV2 = 'threejs';
  private style: VisualStyle = 'branded'; // Default to branded
  private mode: VisualMode = 'chaos';

  private animationFrameId: number | null = null;
  private isRunning = false;
  private lastFrameTime = 0;
  private lastFpsUpdate = 0;
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
    bloomStrength: 2,
    chromaticAmount: 0.008,
    feedback: 0.85,
    kaleidoscope: 6,
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
  getState(): VJStateV2 {
    return {
      isRunning: this.isRunning,
      isCapturing: this.capture !== null,
      engine: this.engineType,
      style: this.style,
      mode: this.mode,
      audio: this.currentAudio,
      beat: this.currentBeat,
      fps: this.fps,
    };
  }

  /**
   * Initialize VJ v2 with a container element
   */
  async init(container: HTMLElement, config: VJConfigV2 = {}): Promise<void> {
    this.container = container;
    this.engineType = config.engine || 'threejs';
    this.style = config.style || 'branded';
    this.mode = config.mode || 'chaos';

    // Create and initialize engine
    await this.createEngine(this.engineType);

    console.log(`VJ v2 initialized with ${this.engineType} engine, ${this.style} style, ${this.mode} mode`);
  }

  /**
   * Create a visual engine
   */
  private async createEngine(type: EngineTypeV2): Promise<void> {
    if (!this.container) throw new Error('Container not set');

    // Dispose old engine
    if (this.engine) {
      this.engine.dispose();
    }

    // Create new v2 engine (no Remotion)
    switch (type) {
      case 'threejs':
        this.engine = new ThreeJSEngineV2();
        break;
      case 'hydra':
        this.engine = new HydraEngineV2();
        break;
    }

    // Clear container and initialize
    this.container.innerHTML = '';
    await this.engine.init(this.container);
    this.engine.setStyle(this.style);

    // Set mode if engine supports it
    if ('setMode' in this.engine) {
      (this.engine as ThreeJSEngineV2 | HydraEngineV2).setMode(this.mode);
    }

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
    this.lastFpsUpdate = this.startTime;
    this.frameCount = 0;

    this.animate();
    console.log('VJ v2 started');
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
    console.log('VJ v2 stopped');
  }

  /**
   * Main animation loop
   */
  private animate = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const deltaTime = (now - this.lastFrameTime) / 1000;
    const time = (now - this.startTime) / 1000;
    this.lastFrameTime = now;

    // Calculate FPS (update every second)
    this.frameCount++;
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    // Analyze audio if capturing
    if (this.capture) {
      this.currentAudio = analyze(this.capture);
      this.currentBeat = updateBeat(this.currentAudio.bands.bass);
    } else {
      // Generate fake audio data for testing without capture
      // More dynamic fake data for trippy visuals
      this.currentAudio = {
        bands: {
          bass: Math.abs(Math.sin(time * 1.5)) * 0.6 + Math.abs(Math.sin(time * 4)) * 0.2,
          lowMid: Math.abs(Math.sin(time * 2 + 1)) * 0.5,
          mid: Math.abs(Math.sin(time * 3 + 2)) * 0.6 + Math.abs(Math.cos(time * 5)) * 0.2,
          highMid: Math.abs(Math.sin(time * 4 + 3)) * 0.4,
          high: Math.abs(Math.sin(time * 5 + 4)) * 0.5 + Math.abs(Math.sin(time * 8)) * 0.3,
        },
        overall: 0.5 + Math.sin(time * 2) * 0.3,
        peak: 0.6 + Math.sin(time * 3) * 0.3,
        spectralCentroid: 0.5 + Math.cos(time * 2) * 0.3,
        isBeat: Math.sin(time * 4) > 0.8,
      };

      // Fake beat with varying phase
      const beatInterval = 500; // 120 BPM
      const phase = (now % beatInterval) / beatInterval;
      this.currentBeat = {
        bpm: 120,
        confidence: 0.8,
        lastBeatTime: now - (now % beatInterval),
        beatInterval,
        phase,
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
  async setEngine(type: EngineTypeV2): Promise<void> {
    if (type === this.engineType) return;

    const wasRunning = this.isRunning;
    if (wasRunning) this.stop();

    await this.createEngine(type);

    if (wasRunning) this.start();

    console.log(`Switched to ${type} v2 engine`);
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
   * Set visual mode (tunnel, mandala, chaos, auto)
   */
  setMode(mode: VisualMode): void {
    this.mode = mode;
    if (this.engine && 'setMode' in this.engine) {
      (this.engine as ThreeJSEngineV2 | HydraEngineV2).setMode(mode);
    }
    console.log(`Set mode to ${mode}`);
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
    console.log('VJ v2 disposed');
  }

  /**
   * Get the current engine instance (for advanced control like Hydra code injection)
   */
  getEngine(): IVisualEngine | null {
    return this.engine;
  }

  /**
   * Execute custom Hydra code (only works with Hydra engine)
   */
  executeHydraCode(code: string): void {
    if (this.engineType === 'hydra' && this.engine) {
      (this.engine as HydraEngineV2).executeCode(code);
    }
  }
}

// Re-export types
export type { AudioFeatures } from './audio/analyzer';
export type { BeatState } from './audio/beat';
export type { VisualStyle, VisualParams, IVisualEngine } from './engines/types';
export { ThreeJSEngineV2 } from './engines/threejs-v2/index';
export { HydraEngineV2, HYDRA_V2_PRESETS } from './engines/hydra-v2/index';
