/**
 * Hydra Visual Engine
 * Live coding visuals using hydra-synth
 * https://github.com/hydra-synth/hydra
 */

import type { IVisualEngine, VisualParams, VisualStyle } from '../types';
import { STYLE_PALETTES, hexToRgb } from '../types';

// Hydra types (hydra-synth doesn't have proper types)
interface HydraInstance {
  setResolution: (width: number, height: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  synth: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canvas: any;
}

export class HydraEngine implements IVisualEngine {
  readonly name = 'Hydra';

  private hydra: HydraInstance | null = null;
  private canvas!: HTMLCanvasElement;
  private style: VisualStyle = 'synthwave';
  private params: Map<string, number> = new Map([
    ['intensity', 1],
    ['colorShift', 0],
    ['zoom', 1],
    ['speed', 1],
    ['feedback', 0.9],
    ['kaleidoscope', 4],
  ]);

  // Audio-reactive globals
  private audioValues = {
    bass: 0,
    mid: 0,
    high: 0,
    overall: 0,
    beat: 0,
  };

  async init(container: HTMLElement): Promise<void> {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    container.appendChild(this.canvas);

    // Dynamic import hydra-synth (browser only)
    try {
      const Hydra = (await import('hydra-synth')).default;

      this.hydra = new Hydra({
        canvas: this.canvas,
        detectAudio: false, // We handle audio ourselves
        enableStreamCapture: false,
        width,
        height,
      });

      // Set up audio-reactive globals
      this.setupAudioBindings();

      // Apply initial style
      this.setStyle(this.style);
    } catch (error) {
      console.error('Failed to initialize Hydra:', error);
      throw error;
    }
  }

  private setupAudioBindings(): void {
    if (!this.hydra) return;

    // Create global functions that return audio values
    // These can be used in Hydra code like: osc(() => a.bass)
    const self = this;

    // Expose audio values globally for Hydra
    // @ts-expect-error - Adding to window for Hydra access
    window.a = {
      get bass() {
        return self.audioValues.bass;
      },
      get mid() {
        return self.audioValues.mid;
      },
      get high() {
        return self.audioValues.high;
      },
      get overall() {
        return self.audioValues.overall;
      },
      get beat() {
        return self.audioValues.beat;
      },
    };
  }

  render(params: VisualParams): void {
    // Update audio values for Hydra globals
    this.audioValues.bass = params.audio.bands.bass;
    this.audioValues.mid = params.audio.bands.mid;
    this.audioValues.high = params.audio.bands.high;
    this.audioValues.overall = params.audio.overall;
    this.audioValues.beat = params.beat.phase < 0.2 ? 1 : 0;

    // Hydra renders automatically via requestAnimationFrame
    // We just update the audio values
  }

  setStyle(style: VisualStyle): void {
    this.style = style;
    if (!this.hydra) return;

    const palette = STYLE_PALETTES[style];
    const [pr, pg, pb] = hexToRgb(palette.primary);
    const [sr, sg, sb] = hexToRgb(palette.secondary);
    const [ar, ag, ab] = hexToRgb(palette.accent);

    const intensity = this.params.get('intensity') || 1;
    const speed = this.params.get('speed') || 1;
    const feedback = this.params.get('feedback') || 0.9;
    const kaleidoscope = this.params.get('kaleidoscope') || 4;

    // Generate Hydra code based on style
    let code: string;

    switch (style) {
      case 'abstract':
        code = `
          osc(10, 0.1 * ${speed}, () => a.bass * 2)
            .color(${pr}, ${pg}, ${pb})
            .rotate(() => a.mid * 0.5)
            .modulate(noise(3), () => a.high * 0.3 * ${intensity})
            .mult(osc(20, 0.05).thresh(0.5).color(${ar}, ${ag}, ${ab}))
            .blend(src(o0), ${feedback})
            .out()
        `;
        break;

      case 'branded':
        // $CC themed - orange dominant
        code = `
          shape(4, () => 0.2 + a.bass * 0.3 * ${intensity}, 0.01)
            .color(${pr}, ${pg}, ${pb})
            .repeat(3, 3)
            .rotate(() => a.mid * Math.PI * 2)
            .scale(() => 1 + a.overall * 0.5)
            .modulate(osc(5, 0.1 * ${speed}), 0.1)
            .add(
              shape(6, () => a.high * 0.2, 0.02)
                .color(${ar}, ${ag}, ${ab})
                .rotate(() => -a.mid)
            )
            .blend(src(o0), ${feedback})
            .out()
        `;
        break;

      case 'synthwave':
        // Neon 80s vibes
        code = `
          gradient(${speed})
            .hue(() => a.high * 0.2)
            .add(
              osc(30, 0.01 * ${speed}, 1)
                .thresh(0.9)
                .color(${pr}, ${pg}, ${pb})
                .scrollY(() => a.bass * 0.5)
            )
            .add(
              osc(50, 0.02 * ${speed}, 0)
                .thresh(0.95)
                .color(${sr}, ${sg}, ${sb})
                .scrollX(() => a.mid * 0.3)
            )
            .kaleid(${kaleidoscope})
            .scale(() => 1 + a.bass * 0.2 * ${intensity})
            .modulate(noise(2, 0.1), () => a.overall * 0.1)
            .blend(src(o0), ${feedback})
            .out()
        `;
        break;

      case 'auto':
      default:
        // Dynamic based on overall energy
        code = `
          voronoi(8, () => a.bass * 2 * ${intensity}, () => a.mid * 0.5)
            .color(${pr}, ${pg}, ${pb})
            .modulateScale(noise(3).color(${sr}, ${sg}, ${sb}), () => a.high * 0.5)
            .rotate(() => a.overall * ${speed})
            .kaleid(() => 2 + Math.floor(a.bass * 6))
            .blend(src(o0), ${feedback})
            .out()
        `;
        break;
    }

    // Execute the Hydra code
    try {
      // eslint-disable-next-line no-eval
      eval(code);
    } catch (error) {
      console.error('Hydra code error:', error);
    }
  }

  /**
   * Execute custom Hydra code
   * This allows Claude to write custom visuals
   */
  executeCode(code: string): void {
    try {
      // eslint-disable-next-line no-eval
      eval(code);
    } catch (error) {
      console.error('Hydra code error:', error);
    }
  }

  setParameter(name: string, value: number): void {
    this.params.set(name, value);
    // Re-apply style to update Hydra with new params
    this.setStyle(this.style);
  }

  getParameter(name: string): number | undefined {
    return this.params.get(name);
  }

  resize(width: number, height: number): void {
    if (this.hydra) {
      this.hydra.setResolution(width, height);
    }
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  dispose(): void {
    // Hydra doesn't have a clean dispose method
    // Remove canvas from DOM
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    // @ts-expect-error - Clean up global
    delete window.a;
  }
}

/**
 * Hydra preset library for Claude to use
 */
export const HYDRA_PRESETS = {
  // Bass-reactive circle
  bassCircle: `
    shape(50, () => 0.1 + a.bass * 0.4, 0.01)
      .color(1, 0.4, 0)
      .scale(() => 1 + a.bass * 0.5)
      .blend(src(o0), 0.8)
      .out()
  `,

  // Mid-frequency waveform
  midWave: `
    osc(20, 0.1, () => a.mid * 2)
      .thresh(() => 0.5 + a.mid * 0.3)
      .color(0, 1, 1)
      .rotate(() => a.overall)
      .blend(src(o0), 0.85)
      .out()
  `,

  // High-frequency sparkle
  highSparkle: `
    noise(100, () => a.high * 0.5)
      .thresh(() => 0.9 - a.high * 0.3)
      .color(1, 0, 1)
      .blend(src(o0), 0.7)
      .out()
  `,

  // Full spectrum
  spectrum: `
    gradient(0.5)
      .hue(() => a.overall)
      .mult(
        osc(30, 0.01, 0)
          .thresh(() => 0.8 - a.bass * 0.3)
      )
      .add(
        noise(50)
          .thresh(() => 0.95 - a.high * 0.2)
          .color(1, 1, 1)
      )
      .kaleid(4)
      .blend(src(o0), 0.9)
      .out()
  `,

  // Feedback tunnel
  tunnel: `
    src(o0)
      .scale(1.01)
      .rotate(() => a.mid * 0.01)
      .hue(() => a.high * 0.01)
      .add(
        shape(4, () => a.bass * 0.1, 0.01)
          .color(1, 0.5, 0)
      )
      .out()
  `,
};
