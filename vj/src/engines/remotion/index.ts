/**
 * Remotion Visual Engine (Hacked for Live)
 * Uses Remotion's Player component with live audio props
 *
 * Note: This is experimental - Remotion is designed for video rendering,
 * not live real-time visuals. We're "hacking" it by updating inputProps each frame.
 */

import type { IVisualEngine, VisualParams, VisualStyle } from '../types.js';

// This engine is designed to work with React
// The actual rendering happens in the React component (see VJPage)
// This class manages the state that gets passed to the Remotion Player

export interface RemotionEngineState {
  audio: VisualParams['audio'];
  beat: VisualParams['beat'];
  style: VisualStyle;
  intensity: number;
  colorShift: number;
  frame: number;
}

export class RemotionEngine implements IVisualEngine {
  readonly name = 'Remotion';

  private style: VisualStyle = 'synthwave';
  private params: Map<string, number> = new Map([
    ['intensity', 1],
    ['colorShift', 0],
    ['zoom', 1],
    ['speed', 1],
  ]);

  private state: RemotionEngineState = {
    audio: {
      bands: { bass: 0, lowMid: 0, mid: 0, highMid: 0, high: 0 },
      overall: 0,
      peak: 0,
      spectralCentroid: 0,
      isBeat: false,
    },
    beat: {
      bpm: null,
      confidence: 0,
      lastBeatTime: 0,
      beatInterval: 500,
      phase: 0,
    },
    style: 'synthwave',
    intensity: 1,
    colorShift: 0,
    frame: 0,
  };

  private frameCounter = 0;
  private stateCallback: ((state: RemotionEngineState) => void) | null = null;

  async init(_container: HTMLElement): Promise<void> {
    // Remotion rendering is handled by React component
    // This is a no-op for the engine wrapper
    console.log('Remotion engine initialized - rendering handled by React');
  }

  /**
   * Register a callback to receive state updates
   * This is called by the React component to get the current state
   */
  onStateChange(callback: (state: RemotionEngineState) => void): void {
    this.stateCallback = callback;
  }

  render(params: VisualParams): void {
    this.frameCounter++;

    // Update internal state
    this.state = {
      audio: params.audio,
      beat: params.beat,
      style: this.style,
      intensity: this.params.get('intensity') || 1,
      colorShift: this.params.get('colorShift') || 0,
      frame: this.frameCounter,
    };

    // Notify React component
    if (this.stateCallback) {
      this.stateCallback(this.state);
    }
  }

  /**
   * Get current state for React component
   */
  getState(): RemotionEngineState {
    return this.state;
  }

  setStyle(style: VisualStyle): void {
    this.style = style;
    this.state.style = style;
  }

  setParameter(name: string, value: number): void {
    this.params.set(name, value);
  }

  getParameter(name: string): number | undefined {
    return this.params.get(name);
  }

  resize(_width: number, _height: number): void {
    // Handled by React component
  }

  dispose(): void {
    this.stateCallback = null;
  }
}

/**
 * Helper to create Remotion composition config for live use
 */
export function createLiveCompositionConfig(fps = 60, durationInFrames = 300) {
  return {
    id: 'LiveVJ',
    fps,
    durationInFrames,
    width: 1920,
    height: 1080,
    defaultProps: {
      audio: {
        bands: { bass: 0, lowMid: 0, mid: 0, highMid: 0, high: 0 },
        overall: 0,
        peak: 0,
        spectralCentroid: 0,
        isBeat: false,
      },
      beat: {
        bpm: null,
        confidence: 0,
        lastBeatTime: 0,
        beatInterval: 500,
        phase: 0,
      },
      style: 'synthwave' as VisualStyle,
      intensity: 1,
      colorShift: 0,
    },
  };
}
