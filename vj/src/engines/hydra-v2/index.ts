/**
 * Hydra Visual Engine v2 - Trippy Branded Visuals
 * Live coding visuals using hydra-synth with $CC branding
 * ALWAYS shows orange (#da7756), mascot integration, branded feel
 */

import type { IVisualEngine, VisualParams, VisualStyle } from '../types';
import { STYLE_PALETTES, hexToRgb } from '../types';

// Hydra types
interface HydraInstance {
  setResolution: (width: number, height: number) => void;
  synth: any;
  canvas: any;
}

// Visual mode types
type VisualMode = 'tunnel' | 'mandala' | 'chaos' | 'auto';

export class HydraEngineV2 implements IVisualEngine {
  readonly name = 'Hydra v2';

  private hydra: HydraInstance | null = null;
  private canvas!: HTMLCanvasElement;
  private style: VisualStyle = 'branded';
  private mode: VisualMode = 'chaos';
  private currentPreset = 0;
  private lastPresetChange = 0;
  private params: Map<string, number> = new Map([
    ['intensity', 1],
    ['colorShift', 0],
    ['zoom', 1],
    ['speed', 1],
    ['feedback', 0.85],
    ['kaleidoscope', 6],
  ]);

  // Audio-reactive globals
  private audioValues = {
    bass: 0,
    mid: 0,
    high: 0,
    overall: 0,
    beat: 0,
    time: 0,
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

    // Dynamic import hydra-synth
    try {
      const Hydra = (await import('hydra-synth')).default;

      this.hydra = new Hydra({
        canvas: this.canvas,
        detectAudio: false,
        enableStreamCapture: false,
        width,
        height,
      });

      // Set up audio-reactive globals
      this.setupAudioBindings();

      // Load mascot image as source
      await this.loadMascotSource();

      // Apply initial style
      this.setStyle(this.style);
    } catch (error) {
      console.error('Failed to initialize Hydra v2:', error);
      throw error;
    }
  }

  private setupAudioBindings(): void {
    if (!this.hydra) return;

    const self = this;

    // Expose audio values globally for Hydra
    // @ts-expect-error - Adding to window for Hydra access
    window.a = {
      get bass() { return self.audioValues.bass; },
      get mid() { return self.audioValues.mid; },
      get high() { return self.audioValues.high; },
      get overall() { return self.audioValues.overall; },
      get beat() { return self.audioValues.beat; },
      get time() { return self.audioValues.time; },
    };
  }

  private async loadMascotSource(): Promise<void> {
    if (!this.hydra) return;

    try {
      // Initialize s0 with mascot image
      // @ts-expect-error - Hydra global
      s0.initImage('/vj/mascot-3d.png');
      // @ts-expect-error - Hydra global
      s1.initImage('/vj/cc-logo.png');
      // @ts-expect-error - Hydra global
      s2.initImage('/vj/ccbanner.png');
    } catch (error) {
      console.warn('Failed to load mascot images for Hydra:', error);
    }
  }

  render(params: VisualParams): void {
    // Update audio values for Hydra globals
    this.audioValues.bass = params.audio.bands.bass;
    this.audioValues.mid = params.audio.bands.mid;
    this.audioValues.high = params.audio.bands.high;
    this.audioValues.overall = params.audio.overall;
    this.audioValues.beat = params.beat.phase < 0.2 ? 1 : 0;
    this.audioValues.time = params.time;

    // Auto-switch presets every ~8 seconds in auto mode
    if (this.mode === 'auto' && params.time - this.lastPresetChange > 8) {
      this.lastPresetChange = params.time;
      this.currentPreset = (this.currentPreset + 1) % 5;
      this.applyPreset(this.currentPreset);
    }

    // Hydra renders automatically via requestAnimationFrame
  }

  private applyPreset(index: number): void {
    const presets = [
      this.presetTunnel.bind(this),
      this.presetSpiral.bind(this),
      this.presetKaleidoscope.bind(this),
      this.presetVortex.bind(this),
      this.presetChaos.bind(this),
    ];

    presets[index]?.();
  }

  private presetTunnel(): void {
    const speed = this.params.get('speed') || 1;
    const feedback = this.params.get('feedback') || 0.85;

    const code = `
      // Tunnel zoom with mascot
      src(s0)
        .scale(() => 1 + a.bass * 0.5)
        .rotate(() => a.time * 0.1 * ${speed})
        .kaleid(() => 4 + Math.floor(a.mid * 4))
        .modulate(noise(3, 0.1), () => a.high * 0.15)
        .color(0.85, 0.47, 0.34)
        .saturate(1.5)
        .contrast(1.2)
        .add(
          src(o0)
            .scale(0.98)
            .rotate(0.01)
            .hue(() => a.high * 0.1),
          ${feedback}
        )
        .out()
    `;
    this.executeCode(code);
  }

  private presetSpiral(): void {
    const speed = this.params.get('speed') || 1;
    const feedback = this.params.get('feedback') || 0.85;

    const code = `
      // Fractal spiral
      src(s0)
        .scale(() => 0.8 + a.bass * 0.4)
        .repeat(() => 2 + Math.floor(a.mid * 3), () => 2 + Math.floor(a.mid * 3))
        .rotate(() => a.time * 0.2 * ${speed})
        .modulate(
          osc(10, 0.1, 0)
            .rotate(() => a.time * 0.1),
          () => a.bass * 0.2
        )
        .color(0.85, 0.47, 0.34)
        .saturate(2)
        .hue(() => a.high * 0.2)
        .blend(src(o0), ${feedback})
        .out()
    `;
    this.executeCode(code);
  }

  private presetKaleidoscope(): void {
    const kaleidoscope = this.params.get('kaleidoscope') || 6;
    const speed = this.params.get('speed') || 1;
    const feedback = this.params.get('feedback') || 0.85;

    const code = `
      // Kaleidoscope with pulsing center
      src(s0)
        .scale(() => 1.2 + a.bass * 0.6)
        .kaleid(${kaleidoscope})
        .rotate(() => a.time * 0.05 * ${speed})
        .modulate(noise(2), () => a.mid * 0.1)
        .add(
          shape(50, () => 0.1 + a.bass * 0.15, 0.01)
            .color(0.85, 0.47, 0.34)
            .scale(() => 1 + a.bass * 0.5)
        )
        .saturate(1.8)
        .contrast(1.3)
        .blend(src(o0), ${feedback})
        .out()
    `;
    this.executeCode(code);
  }

  private presetVortex(): void {
    const speed = this.params.get('speed') || 1;
    const feedback = this.params.get('feedback') || 0.85;

    const code = `
      // Vortex background with chromatic aberration
      gradient(${speed})
        .hue(() => a.time * 0.1)
        .rotate(() => a.time * 0.2)
        .add(
          src(s0)
            .scale(() => 0.5 + a.bass * 0.3)
            .modulate(noise(5), 0.1)
            .color(1, 0, 0)
            .scrollX(() => a.high * 0.02),
          0.5
        )
        .add(
          src(s0)
            .scale(() => 0.5 + a.bass * 0.3)
            .modulate(noise(5), 0.1)
            .color(0, 0, 1)
            .scrollX(() => -a.high * 0.02),
          0.5
        )
        .add(
          src(s0)
            .scale(() => 0.5 + a.bass * 0.3)
            .modulate(noise(5), 0.1)
            .color(0, 1, 0),
          0.5
        )
        .kaleid(4)
        .blend(src(o0), ${feedback})
        .out()
    `;
    this.executeCode(code);
  }

  private presetChaos(): void {
    const speed = this.params.get('speed') || 1;
    const feedback = this.params.get('feedback') || 0.85;
    const kaleidoscope = this.params.get('kaleidoscope') || 6;

    const code = `
      // Full chaos mode - all effects combined
      src(s0)
        .scale(() => 1 + a.bass * 0.8)
        .kaleid(() => ${kaleidoscope} + Math.floor(a.mid * 4))
        .rotate(() => a.time * 0.15 * ${speed})
        .modulate(
          osc(10, 0.05, () => a.high * 2)
            .rotate(() => a.time * -0.1),
          () => a.bass * 0.15
        )
        .add(
          src(s1)
            .scale(() => 0.3 + a.mid * 0.2)
            .rotate(() => a.time * 0.3)
            .modulate(noise(3), 0.05),
          0.3
        )
        .color(0.85, 0.47, 0.34)
        .saturate(() => 1.5 + a.overall)
        .hue(() => a.high * 0.15)
        .add(
          noise(100, () => a.high * 0.3)
            .thresh(0.95)
            .color(1, 0.6, 0.4),
          0.2
        )
        .blend(src(o0), ${feedback})
        .out()
    `;
    this.executeCode(code);
  }

  setStyle(style: VisualStyle): void {
    this.style = style;
    if (!this.hydra) return;

    // Apply style-specific preset
    switch (style) {
      case 'abstract':
        this.applyAbstractStyle();
        break;
      case 'branded':
        this.applyBrandedStyle();
        break;
      case 'synthwave':
        this.applySynthwaveStyle();
        break;
      case 'auto':
      default:
        this.applyAutoStyle();
        break;
    }
  }

  private applyAbstractStyle(): void {
    const speed = this.params.get('speed') || 1;
    const feedback = this.params.get('feedback') || 0.85;

    const code = `
      // Abstract geometric with $CC accent
      voronoi(8, () => a.bass * 2, () => a.mid * 0.5)
        .color(0.85, 0.47, 0.34)
        .add(
          src(s0)
            .scale(() => 0.4 + a.bass * 0.2)
            .modulate(noise(3), 0.1)
            .thresh(() => 0.5 + a.high * 0.3),
          0.4
        )
        .rotate(() => a.time * 0.1 * ${speed})
        .kaleid(() => 4 + Math.floor(a.mid * 4))
        .saturate(1.5)
        .blend(src(o0), ${feedback})
        .out()
    `;
    this.executeCode(code);
  }

  private applyBrandedStyle(): void {
    const speed = this.params.get('speed') || 1;
    const feedback = this.params.get('feedback') || 0.85;

    // $CC branded - orange dominant with mascot
    const code = `
      // $CC Branded - Orange dominant with mascot
      src(s0)
        .scale(() => 1 + a.bass * 0.5)
        .rotate(() => a.time * 0.05 * ${speed})
        .modulate(noise(2), () => a.mid * 0.1)
        .color(0.85, 0.47, 0.34)
        .saturate(2)
        .add(
          shape(4, () => 0.2 + a.bass * 0.3, 0.01)
            .color(0.85, 0.47, 0.34)
            .repeat(3, 3)
            .rotate(() => a.mid * Math.PI),
          0.3
        )
        .add(
          src(s1)
            .scale(() => 0.2 + a.high * 0.1)
            .modulate(osc(5, 0.1), 0.05),
          0.2
        )
        .contrast(1.3)
        .blend(src(o0), ${feedback})
        .out()
    `;
    this.executeCode(code);
  }

  private applySynthwaveStyle(): void {
    const speed = this.params.get('speed') || 1;
    const feedback = this.params.get('feedback') || 0.85;
    const kaleidoscope = this.params.get('kaleidoscope') || 6;

    // Neon 80s with $CC integration
    const code = `
      // Synthwave with $CC
      gradient(${speed})
        .hue(() => a.high * 0.2)
        .saturate(2)
        .add(
          osc(30, 0.01 * ${speed}, 1)
            .thresh(0.9)
            .color(1, 0, 1)
            .scrollY(() => a.bass * 0.5),
          0.4
        )
        .add(
          osc(50, 0.02 * ${speed}, 0)
            .thresh(0.95)
            .color(0, 1, 1)
            .scrollX(() => a.mid * 0.3),
          0.4
        )
        .add(
          src(s0)
            .scale(() => 0.5 + a.bass * 0.3)
            .modulate(noise(3), 0.1)
            .color(0.85, 0.47, 0.34),
          0.5
        )
        .kaleid(${kaleidoscope})
        .scale(() => 1 + a.bass * 0.2)
        .blend(src(o0), ${feedback})
        .out()
    `;
    this.executeCode(code);
  }

  private applyAutoStyle(): void {
    // Start with chaos preset in auto mode
    this.presetChaos();
  }

  /**
   * Execute custom Hydra code
   */
  executeCode(code: string): void {
    try {
      // eslint-disable-next-line no-eval
      eval(code);
    } catch (error) {
      console.error('Hydra v2 code error:', error);
    }
  }

  /**
   * Set visual mode
   */
  setMode(mode: VisualMode): void {
    this.mode = mode;
    this.lastPresetChange = 0;

    // Apply mode-specific preset
    switch (mode) {
      case 'tunnel':
        this.presetTunnel();
        break;
      case 'mandala':
        this.presetKaleidoscope();
        break;
      case 'chaos':
        this.presetChaos();
        break;
      case 'auto':
        this.currentPreset = 0;
        this.applyPreset(0);
        break;
    }
  }

  setParameter(name: string, value: number): void {
    this.params.set(name, value);
    // Re-apply current style/mode with new params
    if (this.mode === 'auto') {
      this.applyPreset(this.currentPreset);
    } else {
      this.setMode(this.mode);
    }
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
    // Remove canvas from DOM
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    // Clean up global
    // @ts-expect-error - Clean up global
    delete window.a;
  }
}

/**
 * Hydra v2 preset library for Claude to use
 */
export const HYDRA_V2_PRESETS = {
  // Bass-reactive mascot pulse
  mascotPulse: `
    src(s0)
      .scale(() => 1 + a.bass * 0.6)
      .color(0.85, 0.47, 0.34)
      .modulate(noise(3), () => a.mid * 0.1)
      .blend(src(o0), 0.85)
      .out()
  `,

  // Kaleidoscope tunnel
  kaleidoTunnel: `
    src(s0)
      .kaleid(() => 4 + Math.floor(a.bass * 8))
      .rotate(() => a.time * 0.1)
      .scale(() => 1 + a.mid * 0.3)
      .color(0.85, 0.47, 0.34)
      .blend(src(o0), 0.9)
      .out()
  `,

  // Chromatic split
  chromaticSplit: `
    src(s0)
      .add(src(s0).color(1, 0, 0).scrollX(() => a.high * 0.03))
      .add(src(s0).color(0, 0, 1).scrollX(() => -a.high * 0.03))
      .scale(() => 1 + a.bass * 0.4)
      .modulate(noise(2), 0.05)
      .blend(src(o0), 0.85)
      .out()
  `,

  // Vortex with logo
  logoVortex: `
    gradient(1)
      .hue(() => a.time * 0.1)
      .rotate(() => a.time * 0.2)
      .add(
        src(s1)
          .scale(() => 0.5 + a.bass * 0.3)
          .rotate(() => a.time * -0.3),
        0.6
      )
      .kaleid(6)
      .saturate(1.5)
      .blend(src(o0), 0.9)
      .out()
  `,

  // Feedback tunnel
  feedbackTunnel: `
    src(o0)
      .scale(0.99)
      .rotate(() => a.mid * 0.01)
      .hue(() => a.high * 0.01)
      .add(
        src(s0)
          .scale(() => 0.3 + a.bass * 0.2)
          .color(0.85, 0.47, 0.34),
        0.15
      )
      .out()
  `,

  // Sparkle overlay
  sparkleOverlay: `
    src(s0)
      .scale(() => 1 + a.bass * 0.5)
      .modulate(noise(2), 0.1)
      .add(
        noise(100, () => a.high * 0.5)
          .thresh(() => 0.9 - a.high * 0.2)
          .color(1, 0.6, 0.4),
        0.3
      )
      .color(0.85, 0.47, 0.34)
      .blend(src(o0), 0.85)
      .out()
  `,
};
