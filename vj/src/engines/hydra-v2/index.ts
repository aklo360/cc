/**
 * Hydra Visual Engine v2 - Complete Overhaul
 *
 * MODES: SPIRAL | MORPH | DYSTOPIA | GEOMETRY | WARP | GLITCH | LIQUID
 * - Inspired by Beeple, Cyriak, and professional VJ techniques
 * - Each mode is RADICALLY different
 * - Scenes change every 10 seconds
 * - Auto mode RANDOMIZES instead of sequential
 */

import type { IVisualEngine, VisualParams, VisualStyle } from '../types';

interface HydraInstance {
  setResolution: (width: number, height: number) => void;
  synth: any;
  canvas: any;
}

// 7 distinct modes + auto
type VisualMode = 'spiral' | 'morph' | 'dystopia' | 'geometry' | 'warp' | 'glitch' | 'liquid' | 'auto';

interface Scene {
  name: string;
  code: (speed: number, feedback: number) => string;
}

export class HydraEngineV2 implements IVisualEngine {
  readonly name = 'Hydra v2';

  private hydra: HydraInstance | null = null;
  private canvas!: HTMLCanvasElement;
  private style: VisualStyle = 'branded';
  private mode: VisualMode = 'spiral';
  private currentSceneIndex = 0;
  private lastSceneChange = 0;
  private sceneChangeInterval = 10; // 10 seconds per scene (was 20)
  private params: Map<string, number> = new Map([
    ['intensity', 1],
    ['colorShift', 0],
    ['zoom', 1],
    ['speed', 1],
    ['feedback', 0.9],
    ['kaleidoscope', 6],
  ]);

  private audioValues = {
    bass: 0,
    mid: 0,
    high: 0,
    overall: 0,
    beat: 0,
    time: 0,
  };

  // ==================== SPIRAL MODE ====================
  // Hypnotic spiraling, kaleidoscopic patterns (USER APPROVED - KEEP)
  private spiralScenes: Scene[] = [
    {
      name: 'hyperSpiral',
      code: (speed, feedback) => `
        osc(() => 30 + a.bass * 20, 0.01, 0)
          .rotate(() => a.time * 0.5 * ${speed})
          .kaleid(() => 12 + Math.floor(a.bass * 8))
          .color(0.85, 0.47, 0.34)
          .modulate(osc(3, 0.1).rotate(() => -a.time * 0.3), () => 0.2 + a.bass * 0.3)
          .add(osc(50, 0.005, 0).rotate(() => a.time * 0.8).kaleid(8).color(1, 0, 1), 0.3)
          .blend(src(o0).scale(0.98).rotate(() => 0.02 + a.bass * 0.02), ${feedback})
          .layer(src(s0).scale(() => 0.22 + a.bass * 0.04).saturate(1.5).contrast(1.3))
          .out()
      `,
    },
    {
      name: 'vortexSuck',
      code: (speed, feedback) => `
        osc(() => 60 + a.mid * 40, 0.003, 0)
          .thresh(() => 0.5 + Math.sin(a.time * 0.2) * 0.2)
          .rotate(() => a.time * 1.2 * ${speed})
          .kaleid(() => 6 + Math.floor(Math.sin(a.time * 0.15) * 3))
          .color(0.85, 0.47, 0.34)
          .scale(() => 1 + Math.sin(a.time * 0.3) * 0.2)
          .modulate(noise(4, 0.3), () => a.bass * 0.2)
          .blend(src(o0).scale(0.95).rotate(0.03).hue(0.005), ${feedback})
          .layer(src(s0).scale(() => 0.2 + a.bass * 0.05).rotate(() => -a.time * 0.1).saturate(1.5).contrast(1.3))
          .out()
      `,
    },
    {
      name: 'galaxySpin',
      code: (speed, feedback) => `
        voronoi(() => 20 + a.bass * 15, () => a.mid * 2, 0.8)
          .rotate(() => a.time * 0.4 * ${speed})
          .kaleid(() => 5 + Math.floor(a.high * 4))
          .color(0.1, 0.05, 0.2)
          .add(osc(40, 0.01, 0).thresh(0.92).color(1, 1, 1).mult(0.3), 0.2)
          .add(gradient().hue(() => a.time * 0.03).rotate(() => -a.time * 0.2).saturate(2), 0.4)
          .blend(src(o0).scale(0.97).rotate(() => 0.015 + a.beat * 0.02), ${feedback})
          .layer(src(s0).scale(() => 0.24 + a.bass * 0.04).saturate(1.6).contrast(1.4))
          .out()
      `,
    },
    {
      name: 'drillDown',
      code: (speed, feedback) => `
        shape(() => 6 + Math.floor(Math.sin(a.time * 0.3) * 3), () => 0.5 + a.bass * 0.2, 0.01)
          .color(0.85, 0.47, 0.34)
          .rotate(() => a.time * 0.8 * ${speed})
          .repeat(() => 4 + Math.floor(a.mid * 3), () => 4 + Math.floor(a.high * 3))
          .kaleid(() => 8 + Math.floor(a.bass * 6))
          .modulate(osc(8, 0.1).rotate(() => a.time * 0.5), () => 0.15 + a.bass * 0.15)
          .scale(() => 0.8 + Math.sin(a.time * 0.4) * 0.3)
          .blend(src(o0).scale(0.96).rotate(-0.025), ${feedback})
          .layer(src(s0).scale(() => 0.21 + a.bass * 0.04).saturate(1.5).contrast(1.3))
          .out()
      `,
    },
  ];

  // ==================== MORPH MODE (Cyriak-Inspired) ====================
  // Single mascot that distorts and transforms - droste, melt, fracture, breathe
  private morphScenes: Scene[] = [
    {
      name: 'drosteZoom',
      code: (speed, feedback) => `
        // Droste effect - mascot contains smaller mascot, infinite zoom
        src(s0)
          .scale(() => 0.6 + a.bass * 0.1)
          .saturate(1.4)
          .layer(
            src(o0)
              .scale(() => 0.85 + a.bass * 0.05)
              .rotate(() => 0.02 * Math.sin(a.time * 0.3))
              .blend(src(s0).scale(() => 0.25 + a.bass * 0.03), 0.7)
          )
          .modulate(noise(2, 0.05), () => a.bass * 0.03)
          .contrast(1.3)
          .out()
      `,
    },
    {
      name: 'melt',
      code: (speed, feedback) => `
        // Mascot melts downward, reforms upward
        src(s0)
          .scale(() => 0.55 + a.bass * 0.08)
          .scrollY(() => Math.sin(a.time * 0.5) * 0.05)
          .modulate(
            gradient().scrollY(() => a.time * 0.2),
            () => 0.15 + a.bass * 0.1 + Math.sin(a.time * 0.8) * 0.05
          )
          .saturate(1.5)
          .layer(
            noise(3, () => 0.3 + a.bass * 0.2)
              .color(0.85, 0.47, 0.34)
              .mult(0.2)
          )
          .contrast(1.4)
          .out()
      `,
    },
    {
      name: 'fracture',
      code: (speed, feedback) => `
        // Mascot splits into pieces that orbit
        src(s0)
          .scale(() => 0.45 + a.bass * 0.1)
          .rotate(() => Math.sin(a.time * 0.2) * 0.1)
          .add(
            src(s0)
              .scale(() => 0.25 + a.bass * 0.05)
              .scrollX(() => 0.25 + Math.sin(a.time * 0.7) * 0.1)
              .scrollY(() => Math.cos(a.time * 0.7) * 0.15)
              .rotate(() => a.time * 0.3),
            0.8
          )
          .add(
            src(s0)
              .scale(() => 0.2 + a.bass * 0.04)
              .scrollX(() => -0.2 + Math.cos(a.time * 0.5) * 0.12)
              .scrollY(() => Math.sin(a.time * 0.5) * 0.12)
              .rotate(() => -a.time * 0.4),
            0.6
          )
          .add(
            src(s0)
              .scale(() => 0.15)
              .scrollX(() => Math.sin(a.time * 0.9) * 0.2)
              .scrollY(() => -0.2 + Math.cos(a.time * 0.9) * 0.1)
              .rotate(() => a.time * 0.5),
            0.5
          )
          .saturate(1.5)
          .contrast(1.3)
          .out()
      `,
    },
    {
      name: 'breathe',
      code: (speed, feedback) => `
        // Single LARGE mascot with extreme scale pulsing
        solid(0.02, 0.02, 0.06)
          .add(
            shape(100, () => 0.3 + a.bass * 0.2, 0.02)
              .color(0.85, 0.47, 0.34)
              .scale(() => 1 + Math.sin(a.time * 0.5) * 0.3),
            0.15
          )
          .layer(
            src(s0)
              .scale(() => 0.5 + Math.sin(a.time * 0.6) * 0.15 + a.bass * 0.1)
              .modulate(osc(2, 0.05), () => 0.02 + a.bass * 0.02)
              .saturate(1.6)
              .contrast(1.4)
          )
          .out()
      `,
    },
  ];

  // ==================== DYSTOPIA MODE (Beeple-Inspired) ====================
  // Dark atmospheric with mascot as monolith - ominous, cinematic
  private dystopiaScenes: Scene[] = [
    {
      name: 'monolith',
      code: (speed, feedback) => `
        // Giant mascot in void with particles
        solid(0.02, 0.01, 0.04)
          .add(noise(200, 0.02).thresh(0.95).color(1, 1, 1), 0.1) // Stars
          .add(
            gradient(0.5)
              .scrollY(() => a.time * 0.01)
              .color(0.1, 0, 0.15)
              .mult(0.3),
            0.3
          )
          .layer(
            src(s0)
              .scale(() => 0.65 + a.bass * 0.05)
              .contrast(1.6)
              .saturate(1.3)
          )
          .add(
            shape(100, () => 0.01 + a.beat * 0.02, 0.001)
              .color(0.85, 0.47, 0.34)
              .repeat(20, 20)
              .scrollY(() => a.time * 0.05),
            () => 0.05 + a.beat * 0.1
          )
          .out()
      `,
    },
    {
      name: 'corruption',
      code: (speed, feedback) => `
        // Mascot being consumed by noise/digital decay
        noise(() => 40 + a.bass * 30, 0.08)
          .thresh(() => 0.6 + Math.sin(a.time * 0.3) * 0.1)
          .color(0.1, 0.05, 0.12)
          .add(
            noise(100, 0.02)
              .thresh(0.92)
              .color(0.85, 0.47, 0.34),
            0.15
          )
          .layer(
            src(s0)
              .scale(() => 0.5 + a.bass * 0.06)
              .modulate(noise(8, 0.2), () => 0.05 + a.bass * 0.05)
              .saturate(1.4)
              .contrast(1.5)
              .blend(
                noise(30, 0.3).thresh(() => 0.7 - a.bass * 0.2).color(0, 0, 0),
                () => 0.1 + a.bass * 0.15
              )
          )
          .out()
      `,
    },
    {
      name: 'emergence',
      code: (speed, feedback) => `
        // Mascot rising from digital chaos
        voronoi(() => 25 + a.bass * 15, 0.5, 0.3)
          .color(0.05, 0.02, 0.08)
          .add(
            noise(80, 0.03)
              .thresh(0.88)
              .scrollY(() => -a.time * 0.1)
              .color(0.85, 0.47, 0.34),
            0.2
          )
          .layer(
            src(s0)
              .scale(() => 0.45 + a.bass * 0.08 + Math.max(0, Math.sin(a.time * 0.3)) * 0.1)
              .scrollY(() => 0.1 - Math.max(0, Math.sin(a.time * 0.3)) * 0.1)
              .saturate(1.5)
              .contrast(1.5)
          )
          .blend(
            gradient(0.3)
              .scrollY(-0.5)
              .color(0.02, 0, 0.05),
            0.3
          )
          .out()
      `,
    },
    {
      name: 'eclipse',
      code: (speed, feedback) => `
        // Mascot silhouette with glow behind
        solid(0.01, 0.01, 0.02)
          .add(
            shape(100, () => 0.5 + a.bass * 0.1, 0.1)
              .color(0.85, 0.47, 0.34)
              .scale(() => 0.8 + Math.sin(a.time * 0.2) * 0.1),
            0.4
          )
          .add(
            shape(100, () => 0.35 + a.bass * 0.08, 0.05)
              .color(1, 0.6, 0.2)
              .scale(() => 0.9 + Math.sin(a.time * 0.25) * 0.08),
            0.3
          )
          .layer(
            src(s0)
              .scale(() => 0.52 + a.bass * 0.04)
              .contrast(2)
              .saturate(0.3) // Silhouette effect
              .brightness(-0.3)
          )
          .add(noise(150, 0.01).thresh(0.96).color(1, 0.8, 0.5), 0.05) // Stars
          .out()
      `,
    },
  ];

  // ==================== GEOMETRY MODE (Mathematical Abstract) ====================
  // Mascot fragmented into geometric patterns - Voronoi, shatter, tessellation
  private geometryScenes: Scene[] = [
    {
      name: 'voronoi',
      code: (speed, feedback) => `
        // Mascot in voronoi cell pattern
        src(s0)
          .scale(() => 0.5 + a.bass * 0.08)
          .modulate(
            voronoi(() => 15 + a.bass * 10, () => a.mid * 1.5, 0.5),
            () => 0.08 + a.bass * 0.05
          )
          .add(
            voronoi(() => 20 + a.bass * 10, 0.3, 0.7)
              .color(0.85, 0.47, 0.34)
              .mult(0.25),
            0.3
          )
          .saturate(1.5)
          .contrast(1.4)
          .out()
      `,
    },
    {
      name: 'shatter',
      code: (speed, feedback) => `
        // Mascot as glass shards
        src(s0)
          .scale(() => 0.55 + a.bass * 0.06)
          .saturate(1.4)
          .modulate(
            shape(3, 0.5, 0.01)
              .repeat(() => 6 + Math.floor(a.bass * 4), () => 6 + Math.floor(a.mid * 4))
              .rotate(() => a.time * 0.1),
            () => 0.06 + a.bass * 0.04
          )
          .add(
            shape(3, 0.4, 0.008)
              .repeat(8, 8)
              .rotate(() => -a.time * 0.15)
              .color(0.85, 0.47, 0.34)
              .mult(0.2),
            0.25
          )
          .contrast(1.5)
          .out()
      `,
    },
    {
      name: 'wireframe',
      code: (speed, feedback) => `
        // Mascot outline with geometric fills
        src(s0)
          .scale(() => 0.5 + a.bass * 0.07)
          .thresh(() => 0.4 + Math.sin(a.time * 0.5) * 0.15)
          .color(0.85, 0.47, 0.34)
          .add(
            shape(() => 4 + Math.floor(a.time * 0.3) % 4, 0.6, 0.01)
              .repeat(4, 4)
              .rotate(() => a.time * 0.2)
              .color(0.2, 0.1, 0.3)
              .mult(0.3),
            0.4
          )
          .add(
            osc(40, 0.01, 0)
              .thresh(0.9)
              .color(0.5, 0.3, 0.6)
              .mult(0.15),
            0.2
          )
          .saturate(1.3)
          .contrast(1.4)
          .out()
      `,
    },
    {
      name: 'tessellation',
      code: (speed, feedback) => `
        // Mascot repeated in Escher-like pattern
        src(s0)
          .scale(() => 0.25 + a.bass * 0.03)
          .repeat(() => 3 + Math.floor(a.mid * 2), () => 3 + Math.floor(a.mid * 2))
          .rotate(() => Math.sin(a.time * 0.15) * 0.2)
          .modulate(
            osc(4, 0.05).rotate(() => a.time * 0.1),
            () => 0.03 + a.bass * 0.02
          )
          .add(
            src(s0)
              .scale(() => 0.45 + a.bass * 0.05)
              .saturate(1.6)
              .contrast(1.4),
            0.6
          )
          .saturate(1.3)
          .out()
      `,
    },
  ];

  // ==================== WARP MODE (Hyperdrive/Speed) ====================
  // Flying through space toward/away from mascot - speed lines, motion blur
  private warpScenes: Scene[] = [
    {
      name: 'starfield',
      code: (speed, feedback) => `
        // Zooming through stars toward mascot
        solid(0.01, 0.01, 0.03)
          .add(
            noise(200, 0.01)
              .thresh(0.94)
              .color(1, 1, 1)
              .scale(() => 0.5 + (a.time * 0.3) % 2)
              .scrollY(() => a.time * 0.05),
            0.4
          )
          .add(
            noise(150, 0.015)
              .thresh(0.92)
              .color(0.85, 0.47, 0.34)
              .scale(() => 0.3 + (a.time * 0.4) % 2),
            0.3
          )
          .layer(
            src(s0)
              .scale(() => 0.35 + a.bass * 0.08)
              .saturate(1.5)
              .contrast(1.4)
          )
          .out()
      `,
    },
    {
      name: 'streak',
      code: (speed, feedback) => `
        // Mascot with speed lines radiating
        osc(100, 0.001, 0)
          .thresh(0.92)
          .color(0.85, 0.47, 0.34)
          .kaleid(2)
          .scrollY(() => a.time * 1.5 * ${speed})
          .add(
            osc(80, 0.002, 0)
              .thresh(0.9)
              .color(0, 0.8, 1)
              .kaleid(2)
              .scrollY(() => a.time * 1.2),
            0.4
          )
          .blend(
            solid(0.02, 0.01, 0.05),
            0.3
          )
          .layer(
            src(s0)
              .scale(() => 0.4 + a.bass * 0.06)
              .saturate(1.5)
              .contrast(1.4)
          )
          .out()
      `,
    },
    {
      name: 'vortex',
      code: (speed, feedback) => `
        // Being sucked into mascot-shaped void
        osc(() => 50 + a.bass * 30, 0.003, 0)
          .color(0.1, 0.05, 0.15)
          .rotate(() => a.time * 0.8 * ${speed})
          .modulate(
            osc(10, 0.1).rotate(() => -a.time * 0.5),
            () => 0.3 + a.bass * 0.2
          )
          .add(
            shape(100, () => 0.4 + a.bass * 0.15, 0.03)
              .color(0.85, 0.47, 0.34)
              .scale(() => 1 + a.bass * 0.3),
            0.3
          )
          .blend(src(o0).scale(0.95).rotate(() => 0.03 + a.bass * 0.02), ${feedback})
          .layer(
            src(s0)
              .scale(() => 0.3 + a.bass * 0.08)
              .saturate(1.5)
              .contrast(1.4)
          )
          .out()
      `,
    },
    {
      name: 'hyperspace',
      code: (speed, feedback) => `
        // Mascot fragmented into light trails
        noise(150, 0.01)
          .thresh(() => 0.88 - a.bass * 0.1)
          .scrollY(() => a.time * 2 * ${speed})
          .color(0.85, 0.47, 0.34)
          .add(
            noise(120, 0.015)
              .thresh(0.9)
              .scrollY(() => a.time * 1.5)
              .color(0, 1, 1),
            0.5
          )
          .add(
            noise(100, 0.02)
              .thresh(0.92)
              .scrollY(() => a.time * 1.8)
              .color(1, 0, 1),
            0.4
          )
          .kaleid(2)
          .blend(solid(0.02, 0.01, 0.05), 0.2)
          .layer(
            src(s0)
              .scale(() => 0.38 + a.bass * 0.06)
              .modulate(noise(5, 0.1), () => a.bass * 0.02)
              .saturate(1.5)
              .contrast(1.4)
          )
          .out()
      `,
    },
  ];

  // ==================== GLITCH MODE (Digital Corruption) ====================
  // VHS/digital corruption aesthetic - pixelation, scan lines, RGB split
  private glitchScenes: Scene[] = [
    {
      name: 'vhs',
      code: (speed, feedback) => `
        // Mascot with VHS tracking errors, noise
        src(s0)
          .scale(() => 0.5 + a.bass * 0.06)
          .scrollX(() => (Math.random() > 0.95 ? (Math.random() - 0.5) * 0.1 : 0))
          .scrollY(() => (Math.random() > 0.98 ? (Math.random() - 0.5) * 0.05 : 0))
          .add(
            noise(200, 0.1)
              .thresh(0.9)
              .scrollY(() => a.time * 0.5)
              .color(1, 1, 1),
            () => 0.05 + a.beat * 0.1
          )
          .add(
            osc(300, 0, 0)
              .thresh(0.97)
              .scrollY(() => a.time * 2)
              .color(1, 1, 1)
              .mult(0.1),
            0.15
          )
          .saturate(1.3)
          .contrast(1.4)
          .pixelate(() => 300 - a.beat * 200, () => 300 - a.beat * 200)
          .out()
      `,
    },
    {
      name: 'rgbSplit',
      code: (speed, feedback) => `
        // Triple mascot offset in R/G/B
        src(s0)
          .scale(() => 0.5 + a.bass * 0.06)
          .scrollX(() => 0.015 + a.beat * 0.01)
          .color(1, 0, 0)
          .blend(
            src(s0)
              .scale(() => 0.5 + a.bass * 0.06)
              .color(0, 1, 0),
            0.5
          )
          .blend(
            src(s0)
              .scale(() => 0.5 + a.bass * 0.06)
              .scrollX(() => -0.015 - a.beat * 0.01)
              .color(0, 0, 1),
            0.5
          )
          .saturate(1.5)
          .contrast(1.3)
          .add(
            noise(100, 0.05)
              .thresh(0.95)
              .color(1, 1, 1),
            () => a.beat * 0.1
          )
          .out()
      `,
    },
    {
      name: 'tear',
      code: (speed, feedback) => `
        // Horizontal tears revealing offset copies
        src(s0)
          .scale(() => 0.5 + a.bass * 0.06)
          .modulate(
            osc(1, 0).thresh(0.5).scrollY(() => a.time * 0.3),
            () => 0.1 + a.beat * 0.15
          )
          .add(
            src(s0)
              .scale(() => 0.5 + a.bass * 0.06)
              .scrollX(() => 0.1 + a.beat * 0.1)
              .mult(
                osc(2, 0).thresh(0.6).scrollY(() => -a.time * 0.4)
              ),
            0.7
          )
          .saturate(1.4)
          .contrast(1.4)
          .add(
            osc(200, 0, 0)
              .thresh(0.95)
              .scrollY(() => a.time)
              .color(0.85, 0.47, 0.34),
            0.08
          )
          .out()
      `,
    },
    {
      name: 'corrupt',
      code: (speed, feedback) => `
        // Random pixel displacement, block artifacts
        src(s0)
          .scale(() => 0.5 + a.bass * 0.06)
          .modulate(
            noise(() => 5 + a.beat * 20, () => 0.5 + a.beat * 0.5),
            () => 0.02 + a.beat * 0.08
          )
          .pixelate(() => 100 - a.beat * 80, () => 100 - a.beat * 80)
          .add(
            voronoi(15, 0.5, 0.3)
              .thresh(0.7)
              .color(0.85, 0.47, 0.34),
            () => a.beat * 0.2
          )
          .saturate(1.4)
          .contrast(1.5)
          .add(
            noise(300, 0.02)
              .thresh(0.97)
              .color(1, 1, 1),
            () => 0.02 + a.beat * 0.08
          )
          .out()
      `,
    },
  ];

  // ==================== LIQUID MODE (Organic Flow) ====================
  // Smooth, flowing, water-like movement - ripples, waves, trance-inducing
  private liquidScenes: Scene[] = [
    {
      name: 'ripple',
      code: (speed, feedback) => `
        // Mascot causing ripples outward
        solid(0.02, 0.03, 0.08)
          .add(
            shape(100, () => 0.3 + a.beat * 0.4, 0.02)
              .color(0.85, 0.47, 0.34)
              .scale(() => 1 + a.beat * 2),
            () => 0.15 - a.beat * 0.1
          )
          .add(
            shape(100, () => 0.25 + a.beat * 0.3, 0.015)
              .color(0.5, 0.3, 0.6)
              .scale(() => 1.5 + a.beat * 1.5),
            () => 0.1 - a.beat * 0.08
          )
          .layer(
            src(s0)
              .scale(() => 0.45 + a.bass * 0.06)
              .modulate(
                osc(3, 0.1).rotate(() => a.time * 0.1),
                () => 0.03 + a.bass * 0.02
              )
              .saturate(1.5)
              .contrast(1.4)
          )
          .out()
      `,
    },
    {
      name: 'underwater',
      code: (speed, feedback) => `
        // Mascot with caustic light patterns
        gradient(() => 0.5 + Math.sin(a.time * 0.1) * 0.2)
          .color(0.05, 0.15, 0.25)
          .add(
            noise(() => 3 + Math.sin(a.time * 0.2) * 1.5, () => 0.3 + a.bass * 0.2)
              .scrollY(() => a.time * 0.03)
              .color(0.1, 0.4, 0.5)
              .mult(0.4),
            0.4
          )
          .add(
            voronoi(8, 0.3, 0.5)
              .scrollY(() => -a.time * 0.02)
              .color(0.2, 0.6, 0.8)
              .mult(0.2),
            0.3
          )
          .layer(
            src(s0)
              .scale(() => 0.48 + a.bass * 0.05 + Math.sin(a.time * 0.4) * 0.02)
              .modulate(
                osc(2, 0.08).rotate(() => a.time * 0.05),
                () => 0.04 + a.bass * 0.03
              )
              .saturate(1.4)
              .contrast(1.3)
          )
          .out()
      `,
    },
    {
      name: 'flow',
      code: (speed, feedback) => `
        // Liquid trails following mascot movement
        osc(() => 4 + Math.sin(a.time * 0.15) * 2, () => 0.2 * ${speed}, () => a.mid)
          .color(0.85, 0.47, 0.34)
          .modulate(
            osc(2, 0.15).rotate(() => a.time * 0.08),
            () => 0.3 + a.bass * 0.2
          )
          .modulate(
            osc(3, 0.1).rotate(() => -a.time * 0.06),
            () => 0.2 + a.mid * 0.15
          )
          .hue(() => Math.sin(a.time * 0.03) * 0.05)
          .saturate(1.4)
          .blend(src(o0).scale(0.99).hue(0.001), ${feedback})
          .layer(
            src(s0)
              .scale(() => 0.42 + a.bass * 0.05)
              .saturate(1.5)
              .contrast(1.35)
          )
          .out()
      `,
    },
    {
      name: 'mercury',
      code: (speed, feedback) => `
        // Metallic liquid mascot morphing
        src(s0)
          .scale(() => 0.5 + a.bass * 0.08)
          .modulate(
            noise(() => 2 + a.bass * 2, () => 0.4 + Math.sin(a.time * 0.3) * 0.2),
            () => 0.06 + a.bass * 0.04
          )
          .saturate(0.4) // Desaturate for metallic look
          .brightness(() => 0.1 + a.bass * 0.1)
          .contrast(1.6)
          .add(
            shape(100, () => 0.35 + a.bass * 0.1, 0.02)
              .color(0.85, 0.47, 0.34)
              .mult(0.3),
            0.25
          )
          .add(
            noise(4, () => 0.3 + a.bass * 0.2)
              .color(0.7, 0.7, 0.8)
              .mult(0.15),
            0.3
          )
          .out()
      `,
    },
  ];

  async init(container: HTMLElement): Promise<void> {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    container.appendChild(this.canvas);

    try {
      const Hydra = (await import('hydra-synth')).default;

      this.hydra = new Hydra({
        canvas: this.canvas,
        detectAudio: false,
        enableStreamCapture: false,
        width,
        height,
      });

      this.setupAudioBindings();
      await this.loadMascotSource();
      this.setStyle(this.style);

      // FIX: Apply first scene immediately (no blank start)
      this.applyCurrentScene();
    } catch (error) {
      console.error('Failed to initialize Hydra v2:', error);
      throw error;
    }
  }

  private setupAudioBindings(): void {
    if (!this.hydra) return;
    const self = this;
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
      // @ts-expect-error - Hydra global
      s0.initImage('/vj/mascot-3d.png');
      // @ts-expect-error - Hydra global
      s1.initImage('/vj/cc-logo.png');
      // @ts-expect-error - Hydra global
      s2.initImage('/cc.png');
    } catch (error) {
      console.warn('Failed to load mascot images for Hydra:', error);
    }
  }

  render(params: VisualParams): void {
    this.audioValues.bass = params.audio.bands.bass;
    this.audioValues.mid = params.audio.bands.mid;
    this.audioValues.high = params.audio.bands.high;
    this.audioValues.overall = params.audio.overall;
    this.audioValues.beat = params.beat.phase < 0.2 ? 1 : 0;
    this.audioValues.time = params.time;

    // Change scenes every 10 seconds (was 20)
    const timeSinceLastChange = params.time - this.lastSceneChange;
    if (timeSinceLastChange > this.sceneChangeInterval) {
      this.lastSceneChange = params.time;
      this.advanceScene();
    }
  }

  private advanceScene(): void {
    const scenes = this.getScenesForMode();

    if (this.mode === 'auto') {
      // FIX: Auto mode RANDOMIZES instead of sequential
      const allScenes = this.getAllScenes();
      this.currentSceneIndex = Math.floor(Math.random() * allScenes.length);
      const scene = allScenes[this.currentSceneIndex];
      console.log(`[HYDRA] Random scene: ${scene.name}`);
      const speed = this.params.get('speed') || 1;
      const feedback = this.params.get('feedback') || 0.9;
      this.executeCode(scene.code(speed, feedback));
    } else {
      // Sequential within specific mode
      this.currentSceneIndex = (this.currentSceneIndex + 1) % scenes.length;
      console.log(`[HYDRA] Scene ${this.currentSceneIndex + 1}/${scenes.length}: ${scenes[this.currentSceneIndex].name}`);
      this.applyCurrentScene();
    }
  }

  private getAllScenes(): Scene[] {
    return [
      ...this.spiralScenes,
      ...this.morphScenes,
      ...this.dystopiaScenes,
      ...this.geometryScenes,
      ...this.warpScenes,
      ...this.glitchScenes,
      ...this.liquidScenes,
    ];
  }

  private getScenesForMode(): Scene[] {
    switch (this.mode) {
      case 'spiral': return this.spiralScenes;
      case 'morph': return this.morphScenes;
      case 'dystopia': return this.dystopiaScenes;
      case 'geometry': return this.geometryScenes;
      case 'warp': return this.warpScenes;
      case 'glitch': return this.glitchScenes;
      case 'liquid': return this.liquidScenes;
      case 'auto':
      default:
        return this.getAllScenes();
    }
  }

  private applyCurrentScene(): void {
    const scenes = this.mode === 'auto' ? this.getAllScenes() : this.getScenesForMode();
    const scene = scenes[this.currentSceneIndex % scenes.length];
    if (scene) {
      const speed = this.params.get('speed') || 1;
      const feedback = this.params.get('feedback') || 0.9;
      this.executeCode(scene.code(speed, feedback));
    }
  }

  setStyle(style: VisualStyle): void {
    this.style = style;
    if (!this.hydra) return;
    this.currentSceneIndex = 0;
    this.lastSceneChange = 0;
    this.applyCurrentScene();
  }

  executeCode(code: string): void {
    try {
      // eslint-disable-next-line no-eval
      eval(code);
    } catch (error) {
      console.error('Hydra v2 code error:', error);
    }
  }

  setMode(mode: VisualMode | string): void {
    // Map legacy names + new names
    const modeMap: Record<string, VisualMode> = {
      // Legacy mappings
      clean: 'spiral',
      tunnel: 'warp',
      mandala: 'spiral',
      chaos: 'glitch',
      showcase: 'morph',
      drift: 'liquid',
      pulse: 'dystopia',
      wavey: 'liquid',
      '3d': 'geometry',
      // New modes
      spiral: 'spiral',
      morph: 'morph',
      dystopia: 'dystopia',
      geometry: 'geometry',
      warp: 'warp',
      glitch: 'glitch',
      liquid: 'liquid',
      auto: 'auto',
    };

    this.mode = modeMap[mode] || 'spiral';
    this.currentSceneIndex = 0;
    this.lastSceneChange = this.audioValues.time; // Use current time to prevent immediate scene advance
    this.applyCurrentScene();
  }

  setParameter(name: string, value: number): void {
    this.params.set(name, value);
    this.applyCurrentScene();
  }

  getParameter(name: string): number | undefined {
    return this.params.get(name);
  }

  resize(width: number, height: number): void {
    if (this.hydra) this.hydra.setResolution(width, height);
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  dispose(): void {
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    // @ts-expect-error - Clean up global
    delete window.a;
  }
}

export const HYDRA_V2_PRESETS = {
  modes: ['spiral', 'morph', 'dystopia', 'geometry', 'warp', 'glitch', 'liquid', 'auto'],
  sceneChangeInterval: 10,
  totalScenes: 28, // 4 per mode x 7 modes
};
