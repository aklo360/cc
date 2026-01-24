/**
 * Visual Engine Interface
 * Common interface for all visual engines (Three.js, Hydra, Remotion)
 */

import type { AudioFeatures, FrequencyBands } from '../audio/analyzer.js';
import type { BeatState } from '../audio/beat.js';

export type VisualStyle = 'abstract' | 'branded' | 'synthwave' | 'auto';

export interface VisualParams {
  // Audio data
  audio: AudioFeatures;
  beat: BeatState;
  rawFrequency?: Float32Array;

  // Style
  style: VisualStyle;

  // User-controllable parameters
  intensity: number; // 0-1, overall visual intensity
  colorShift: number; // 0-1, hue rotation
  zoom: number; // 0.5-2, camera/scale
  speed: number; // 0.5-2, animation speed multiplier

  // Time
  time: number; // Total elapsed time in seconds
  deltaTime: number; // Time since last frame in seconds
}

export interface IVisualEngine {
  /**
   * Engine name for display
   */
  readonly name: string;

  /**
   * Initialize the engine
   * @param container - DOM element to render into
   */
  init(container: HTMLElement): Promise<void>;

  /**
   * Update and render a frame
   * @param params - Visual parameters including audio data
   */
  render(params: VisualParams): void;

  /**
   * Set the visual style
   */
  setStyle(style: VisualStyle): void;

  /**
   * Set a specific parameter
   */
  setParameter(name: string, value: number): void;

  /**
   * Get current parameter value
   */
  getParameter(name: string): number | undefined;

  /**
   * Resize the renderer
   */
  resize(width: number, height: number): void;

  /**
   * Clean up resources
   */
  dispose(): void;
}

/**
 * Style color palettes
 */
export const STYLE_PALETTES = {
  abstract: {
    primary: '#ffffff',
    secondary: '#888888',
    accent: '#ff4444',
    background: '#000000',
  },
  branded: {
    primary: '#da7756', // Claude orange
    secondary: '#e0e0e0',
    accent: '#4ade80', // Green
    background: '#0d0d0d',
  },
  synthwave: {
    primary: '#ff00ff', // Magenta
    secondary: '#00ffff', // Cyan
    accent: '#ffff00', // Yellow
    background: '#0a0a1a',
  },
  auto: {
    // Will be determined dynamically
    primary: '#ffffff',
    secondary: '#888888',
    accent: '#ff4444',
    background: '#000000',
  },
} as const;

/**
 * Get hex color as RGB values 0-1
 */
export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  ];
}
