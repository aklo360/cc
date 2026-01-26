/**
 * Three.js Visual Engine v2 - Procedurally Evolving Branded Visuals
 *
 * ALWAYS $CC branded - orange (#da7756), cc.png, mascot-3d.png
 * NEVER repeats - uses multi-layer noise and time-drift for infinite variety
 * MODES are dramatically different visual experiences
 *
 * Key algorithm: Multiple noise layers at incommensurate frequencies
 * (using golden ratio and primes) create non-repeating evolution.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import type { IVisualEngine, VisualParams, VisualStyle } from '../types';

// Golden ratio for incommensurate frequencies
const PHI = 1.618033988749895;
const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37];

// Brand colors
const CC_ORANGE = 0xda7756;
const CC_ORANGE_HEX = '#da7756';
const CC_DARK = 0x0d0d0d;

/**
 * Simple 3D noise implementation (based on improved Perlin)
 */
function noise3D(x: number, y: number, z: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z);
  const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;
  const B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
  return lerp(w, lerp(v, lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)),
    lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))),
    lerp(v, lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)),
      lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1))));
}

function fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(t: number, a: number, b: number) { return a + t * (b - a); }
function grad(hash: number, x: number, y: number, z: number) {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

// Permutation table
const p = new Array(512);
const permutation = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
  140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0,
  26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174,
  20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231,
  83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143,
  54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135,
  130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123,
  5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189,
  28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167,
  43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
  218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145,
  235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121,
  50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195,
  78, 66, 215, 61, 156, 180];
for (let i = 0; i < 256; i++) p[256 + i] = p[i] = permutation[i];

/**
 * Multi-octave fractal noise for rich evolution
 */
function fractalNoise(x: number, y: number, z: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise3D(x * frequency, y * frequency, z * frequency);
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / maxValue;
}

/**
 * Get evolving parameter using multiple incommensurate frequencies
 * This ensures the value NEVER exactly repeats
 */
function evolvingParam(time: number, seed: number, min: number, max: number): number {
  const t = time * 0.01; // Very slow base evolution
  // Sum of sines at incommensurate frequencies (will never repeat)
  let value = 0;
  for (let i = 0; i < 5; i++) {
    const freq = PRIMES[i] * PHI * (seed + 1) * 0.1;
    const phase = seed * PRIMES[i + 5];
    value += Math.sin(t * freq + phase) / (i + 1);
  }
  // Normalize to -1..1 then map to min..max
  value = value / 2.3; // Approximate normalization
  return min + (value * 0.5 + 0.5) * (max - min);
}

// Chromatic Aberration Shader
const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    amount: { value: 0.005 },
    angle: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float amount;
    uniform float angle;
    varying vec2 vUv;
    void main() {
      vec2 offset = amount * vec2(cos(angle), sin(angle));
      vec4 cr = texture2D(tDiffuse, vUv + offset);
      vec4 cg = texture2D(tDiffuse, vUv);
      vec4 cb = texture2D(tDiffuse, vUv - offset);
      gl_FragColor = vec4(cr.r, cg.g, cb.b, 1.0);
    }
  `,
};

// Vortex Distortion Shader
const VortexShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    strength: { value: 0.1 },
    center: { value: new THREE.Vector2(0.5, 0.5) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float strength;
    uniform vec2 center;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv - center;
      float dist = length(uv);
      float angle = atan(uv.y, uv.x);
      angle += strength * (1.0 - dist) * sin(time * 0.5);
      vec2 newUv = center + dist * vec2(cos(angle), sin(angle));
      gl_FragColor = texture2D(tDiffuse, newUv);
    }
  `,
};

// Visual mode types - renamed for clarity
// showcase (was tunnel), drift (was mandala), pulse (was chaos)
type VisualMode = 'showcase' | 'drift' | 'pulse' | 'auto';

/**
 * A visual element that evolves over time
 */
interface EvolvingElement {
  mesh: THREE.Object3D;
  birthTime: number;
  lifespan: number;
  evolutionSeed: number;
  type: 'sprite' | 'geometry' | 'particles';
}

export class ThreeJSEngineV2 implements IVisualEngine {
  readonly name = 'Three.js v2';

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private bloomPass!: UnrealBloomPass;
  private chromaticPass!: ShaderPass;
  private vortexPass!: ShaderPass;

  // Textures
  private ccLogoTexture!: THREE.Texture;
  private mascotTexture!: THREE.Texture;
  private texturesLoaded = false;

  // Evolving element groups
  private tunnelElements: EvolvingElement[] = [];
  private mandalaElements: EvolvingElement[] = [];
  private chaosElements: EvolvingElement[] = [];
  private backgroundMesh!: THREE.Mesh;
  private centerGroup!: THREE.Group;
  private particleSystem!: THREE.Points;

  // Evolution state
  private mode: VisualMode = 'showcase';
  private time = 0;
  private absoluteTime = 0; // Never resets, for long-term evolution
  private evolutionPhase = 0; // Slowly morphing phase
  private lastModeSwitch = 0;
  private nextEventTime = 0;

  // Dynamic parameters (evolve over time)
  private params: Map<string, number> = new Map([
    ['intensity', 1],
    ['zoom', 1],
    ['speed', 1],
    ['bloomStrength', 1.5],
    ['chromaticAmount', 0.006],
    ['vortexStrength', 0.05],
  ]);

  async init(container: HTMLElement): Promise<void> {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(CC_DARK, 1);
    container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(CC_DARK, 0.008);

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 500);
    this.camera.position.z = 50;

    // Load textures
    await this.loadTextures();

    // Post-processing
    this.setupPostProcessing(width, height);

    // Create visual elements
    this.createBackground();
    this.createCenterGroup();
    this.createParticleField();

    // Initialize with some elements
    this.populateElements();

    // Set first event
    this.nextEventTime = 5 + Math.random() * 10;
  }

  private async loadTextures(): Promise<void> {
    const loader = new THREE.TextureLoader();

    try {
      // Load CC 2D logo (primary asset)
      this.ccLogoTexture = await loader.loadAsync('/vj/cc.png');
      this.ccLogoTexture.colorSpace = THREE.SRGBColorSpace;

      // Load 3D mascot render (secondary asset)
      this.mascotTexture = await loader.loadAsync('/vj/mascot-3d.png');
      this.mascotTexture.colorSpace = THREE.SRGBColorSpace;

      this.texturesLoaded = true;
    } catch (error) {
      console.warn('Failed to load VJ textures, using fallback');
      this.createFallbackTextures();
    }
  }

  private createFallbackTextures(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Draw CC-like shape
    ctx.fillStyle = CC_ORANGE_HEX;
    ctx.beginPath();
    ctx.roundRect(16, 24, 96, 80, 12);
    ctx.fill();

    // Eyes (holes)
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(36, 48, 16, 32);
    ctx.fillRect(76, 48, 16, 32);

    this.ccLogoTexture = new THREE.CanvasTexture(canvas);
    this.mascotTexture = new THREE.CanvasTexture(canvas);
  }

  private setupPostProcessing(width: number, height: number): void {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      1.5, 0.6, 0.5
    );
    this.composer.addPass(this.bloomPass);

    this.chromaticPass = new ShaderPass(ChromaticAberrationShader);
    this.composer.addPass(this.chromaticPass);

    this.vortexPass = new ShaderPass(VortexShader);
    this.composer.addPass(this.vortexPass);
  }

  private createBackground(): void {
    // Evolving organic background
    const geometry = new THREE.PlaneGeometry(300, 300, 64, 64);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        phase: { value: 0 },
        color1: { value: new THREE.Color(CC_ORANGE).multiplyScalar(0.15) },
        color2: { value: new THREE.Color(0x1a0a08) },
        color3: { value: new THREE.Color(0x2d1510) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        void main() {
          vUv = uv;
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float phase;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 color3;
        varying vec2 vUv;
        varying vec3 vPos;

        // Simplex-like noise
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
        }

        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 5; i++) {
            v += a * noise(p);
            p *= 2.0;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec2 uv = vUv - 0.5;

          // Evolving organic patterns
          float n1 = fbm(uv * 3.0 + time * 0.1 + phase);
          float n2 = fbm(uv * 5.0 - time * 0.07 + phase * 1.618);
          float n3 = fbm(uv * 8.0 + vec2(time * 0.05, -time * 0.03) + phase * 2.718);

          // Blend colors based on noise
          vec3 col = mix(color2, color1, n1 * 0.8);
          col = mix(col, color3, n2 * 0.5);
          col += color1 * n3 * 0.3;

          // Radial fade
          float dist = length(uv) * 1.5;
          col *= 1.0 - dist * 0.5;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    });

    this.backgroundMesh = new THREE.Mesh(geometry, material);
    this.backgroundMesh.position.z = -100;
    this.scene.add(this.backgroundMesh);
  }

  private createCenterGroup(): void {
    this.centerGroup = new THREE.Group();
    this.scene.add(this.centerGroup);

    // Create multiple center sprites with different behaviors
    for (let i = 0; i < 5; i++) {
      const material = new THREE.SpriteMaterial({
        map: i % 2 === 0 ? this.ccLogoTexture : this.mascotTexture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.8 - i * 0.15,
        color: new THREE.Color(CC_ORANGE),
      });
      const sprite = new THREE.Sprite(material);
      sprite.userData = { layer: i, seed: Math.random() * 1000 };
      this.centerGroup.add(sprite);
    }
  }

  private createParticleField(): void {
    const count = 500;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const seeds = new Float32Array(count);

    const color = new THREE.Color(CC_ORANGE);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Spherical distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 30 + Math.random() * 70;

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi) - 30;

      // Vary colors slightly around orange
      const hueShift = (Math.random() - 0.5) * 0.1;
      const particleColor = new THREE.Color().setHSL(0.07 + hueShift, 0.85, 0.55);
      colors[i3] = particleColor.r;
      colors[i3 + 1] = particleColor.g;
      colors[i3 + 2] = particleColor.b;

      sizes[i] = 1 + Math.random() * 3;
      seeds[i] = Math.random() * 1000;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));

    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);
  }

  private populateElements(): void {
    // Create initial elements based on mode
    for (let i = 0; i < 15; i++) {
      this.spawnTunnelElement();
    }
    for (let i = 0; i < 12; i++) {
      this.spawnMandalaElement(i);
    }
    for (let i = 0; i < 20; i++) {
      this.spawnChaosElement();
    }
  }

  private spawnTunnelElement(): void {
    const material = new THREE.SpriteMaterial({
      map: Math.random() > 0.5 ? this.ccLogoTexture : this.mascotTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: new THREE.Color(CC_ORANGE),
    });
    const sprite = new THREE.Sprite(material);
    sprite.userData = {
      speed: 0.3 + Math.random() * 0.5,
      rotSpeed: (Math.random() - 0.5) * 2,
      startZ: -80 - Math.random() * 40,
    };
    sprite.position.z = sprite.userData.startZ;
    this.scene.add(sprite);

    this.tunnelElements.push({
      mesh: sprite,
      birthTime: this.absoluteTime,
      lifespan: 10 + Math.random() * 20,
      evolutionSeed: Math.random() * 1000,
      type: 'sprite',
    });
  }

  private spawnMandalaElement(index: number): void {
    const material = new THREE.SpriteMaterial({
      map: this.ccLogoTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: new THREE.Color(CC_ORANGE),
    });
    const sprite = new THREE.Sprite(material);
    sprite.userData = {
      baseAngle: (index / 12) * Math.PI * 2,
      orbitRadius: 20 + (index % 3) * 10,
      orbitSpeed: 0.5 + (index % 4) * 0.1,
      pulseOffset: index * 0.5,
    };
    this.scene.add(sprite);

    this.mandalaElements.push({
      mesh: sprite,
      birthTime: this.absoluteTime,
      lifespan: 30 + Math.random() * 30,
      evolutionSeed: Math.random() * 1000,
      type: 'sprite',
    });
  }

  private spawnChaosElement(): void {
    const useMascot = Math.random() > 0.6;
    const material = new THREE.SpriteMaterial({
      map: useMascot ? this.mascotTexture : this.ccLogoTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: new THREE.Color(CC_ORANGE),
    });
    const sprite = new THREE.Sprite(material);

    // Random 3D position
    const range = 60;
    sprite.position.set(
      (Math.random() - 0.5) * range * 2,
      (Math.random() - 0.5) * range * 2,
      (Math.random() - 0.5) * range - 20
    );

    sprite.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.1
      ),
      rotSpeed: (Math.random() - 0.5) * 3,
      pulsePhase: Math.random() * Math.PI * 2,
    };

    this.scene.add(sprite);

    this.chaosElements.push({
      mesh: sprite,
      birthTime: this.absoluteTime,
      lifespan: 15 + Math.random() * 25,
      evolutionSeed: Math.random() * 1000,
      type: 'sprite',
    });
  }

  render(params: VisualParams): void {
    const { audio, beat, deltaTime } = params;
    const intensity = this.params.get('intensity') || 1;
    const speed = this.params.get('speed') || 1;

    this.time += deltaTime * speed;
    this.absoluteTime += deltaTime;

    // Slowly evolving phase (very slow - hours of unique visuals)
    this.evolutionPhase += deltaTime * 0.001 * PHI;

    // Check for random events that trigger morphs
    if (this.absoluteTime > this.nextEventTime) {
      this.triggerEvolutionEvent(audio);
      this.nextEventTime = this.absoluteTime + 10 + Math.random() * 30;
    }

    // Auto mode switches
    if (this.mode === 'auto' && this.absoluteTime - this.lastModeSwitch > 8) {
      const modes: VisualMode[] = ['showcase', 'drift', 'pulse'];
      const newMode = modes[Math.floor(Math.random() * modes.length)];
      this.setMode(newMode);
      this.lastModeSwitch = this.absoluteTime;
    }

    // Update camera with evolving motion
    this.updateCamera(audio, intensity);

    // Update all elements based on mode
    this.updateBackground();
    this.updateCenterGroup(audio, beat, intensity);
    this.updateTunnelElements(audio, intensity);
    this.updateMandalaElements(audio, intensity);
    this.updateChaosElements(audio, intensity);
    this.updateParticles(audio, intensity);

    // Manage element lifecycle
    this.manageElements();

    // Update post-processing with evolving params
    this.updatePostProcessing(audio, intensity);

    // Render
    this.composer.render();
  }

  private updateCamera(audio: VisualParams['audio'], intensity: number): void {
    const zoom = this.params.get('zoom') || 1;

    // Evolving camera motion
    const camX = evolvingParam(this.absoluteTime, 1, -5, 5) +
                 Math.sin(this.time * 0.3) * 2 * (1 + audio.bands.mid * 0.3);
    const camY = evolvingParam(this.absoluteTime, 2, -4, 4) +
                 Math.cos(this.time * 0.25) * 2 * (1 + audio.bands.bass * 0.2);
    const camZ = (50 / zoom) + evolvingParam(this.absoluteTime, 3, -10, 10);

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(0, 0, -10);

    // Subtle camera roll
    this.camera.rotation.z = Math.sin(this.time * 0.1 + this.evolutionPhase) * 0.05;
  }

  private updateBackground(): void {
    const mat = this.backgroundMesh.material as THREE.ShaderMaterial;
    mat.uniforms.time.value = this.time;
    mat.uniforms.phase.value = this.evolutionPhase;
  }

  private updateCenterGroup(
    audio: VisualParams['audio'],
    beat: VisualParams['beat'],
    intensity: number
  ): void {
    // Mode visibility
    const visibility = this.mode === 'drift' ? 1 : this.mode === 'pulse' ? 0.7 : 0.3;

    // Beat pulse
    const beatPulse = beat.phase < 0.15 ? 1.3 : 1;

    // Evolving scale
    const baseScale = 8 + evolvingParam(this.absoluteTime, 10, -3, 3);
    const breathe = Math.sin(this.time * 0.4 + this.evolutionPhase) * 0.2 + 1;

    const children = this.centerGroup.children as THREE.Sprite[];
    for (const sprite of children) {
      const layer = sprite.userData.layer;
      const seed = sprite.userData.seed;

      const layerScale = baseScale * (1 + layer * 0.25) * breathe * beatPulse;
      const layerRotation = this.time * 0.15 * (layer % 2 === 0 ? 1 : -1) +
                           evolvingParam(this.absoluteTime, seed, 0, Math.PI * 2);

      sprite.scale.set(layerScale, layerScale, 1);
      sprite.material.rotation = layerRotation;
      sprite.material.opacity = (0.9 - layer * 0.15) * visibility *
                                (1 + audio.bands.bass * 0.2 * intensity);
    }
  }

  private updateTunnelElements(audio: VisualParams['audio'], intensity: number): void {
    const visibility = this.mode === 'showcase' ? 1 : this.mode === 'pulse' ? 0.5 : 0.1;

    for (const el of this.tunnelElements) {
      const sprite = el.mesh as THREE.Sprite;
      const age = this.absoluteTime - el.birthTime;
      const lifeProgress = age / el.lifespan;

      // Move toward camera
      const speed = sprite.userData.speed * (1 + audio.bands.bass * 0.5);
      sprite.position.z += speed;

      // Reset when past camera
      if (sprite.position.z > 30) {
        sprite.position.z = sprite.userData.startZ;
        // Randomize position on reset with evolution
        const offset = evolvingParam(this.absoluteTime + el.evolutionSeed, el.evolutionSeed, -1, 1);
        sprite.position.x = offset * 3;
        sprite.position.y = evolvingParam(this.absoluteTime + el.evolutionSeed, el.evolutionSeed + 1, -1, 1) * 3;
      }

      // Evolving scale based on z position
      const zProgress = (sprite.position.z + 80) / 110;
      const scale = (1 + zProgress * 8) * (1 + evolvingParam(age, el.evolutionSeed, -0.3, 0.3));

      sprite.scale.set(scale, scale, 1);
      sprite.material.rotation += sprite.userData.rotSpeed * 0.02 +
                                  evolvingParam(age, el.evolutionSeed, -0.01, 0.01);

      // Opacity fades based on z and mode
      const zOpacity = Math.sin(zProgress * Math.PI);
      sprite.material.opacity = zOpacity * 0.8 * visibility * intensity;
    }
  }

  private updateMandalaElements(audio: VisualParams['audio'], intensity: number): void {
    const visibility = this.mode === 'drift' ? 1 : this.mode === 'pulse' ? 0.4 : 0.1;

    for (const el of this.mandalaElements) {
      const sprite = el.mesh as THREE.Sprite;
      const age = this.absoluteTime - el.birthTime;
      const data = sprite.userData;

      // Evolving orbit
      const evolvedRadius = data.orbitRadius + evolvingParam(age, el.evolutionSeed, -5, 5);
      const evolvedSpeed = data.orbitSpeed + evolvingParam(age, el.evolutionSeed + 1, -0.2, 0.2);
      const angle = data.baseAngle + this.time * evolvedSpeed + this.evolutionPhase;

      sprite.position.x = Math.cos(angle) * evolvedRadius;
      sprite.position.y = Math.sin(angle) * evolvedRadius;
      sprite.position.z = -10 + Math.sin(this.time * 0.5 + data.pulseOffset) * 5;

      // Evolving scale
      const pulse = Math.sin(this.time * 0.6 + data.pulseOffset + this.evolutionPhase) * 0.3 + 1;
      const baseScale = 4 + evolvingParam(age, el.evolutionSeed, -1, 1);
      sprite.scale.set(baseScale * pulse, baseScale * pulse, 1);

      // Rotation
      sprite.material.rotation = angle + this.time * 0.3;
      sprite.material.opacity = 0.85 * visibility * (1 + audio.bands.mid * 0.3 * intensity);
    }
  }

  private updateChaosElements(audio: VisualParams['audio'], intensity: number): void {
    const visibility = this.mode === 'pulse' ? 1 : 0.3;

    for (const el of this.chaosElements) {
      const sprite = el.mesh as THREE.Sprite;
      const age = this.absoluteTime - el.birthTime;
      const data = sprite.userData;

      // Apply velocity with audio influence
      const vel = data.velocity as THREE.Vector3;
      sprite.position.x += vel.x * (1 + audio.bands.high * 0.5);
      sprite.position.y += vel.y * (1 + audio.bands.mid * 0.5);
      sprite.position.z += vel.z;

      // Add evolving noise to position
      const noiseScale = 0.02;
      sprite.position.x += fractalNoise(age * 0.1, el.evolutionSeed, 0) * noiseScale * 10;
      sprite.position.y += fractalNoise(age * 0.1, el.evolutionSeed + 100, 0) * noiseScale * 10;

      // Wrap around bounds
      const bound = 70;
      if (sprite.position.x > bound) sprite.position.x = -bound;
      if (sprite.position.x < -bound) sprite.position.x = bound;
      if (sprite.position.y > bound) sprite.position.y = -bound;
      if (sprite.position.y < -bound) sprite.position.y = bound;
      if (sprite.position.z > 30) sprite.position.z = -60;
      if (sprite.position.z < -80) sprite.position.z = 20;

      // Evolving scale
      const basePulse = Math.sin(this.time * 0.8 + data.pulsePhase + this.evolutionPhase);
      const scale = (3 + basePulse * 1.5) * (1 + evolvingParam(age, el.evolutionSeed, -0.3, 0.3));
      sprite.scale.set(scale, scale, 1);

      // Rotation
      sprite.material.rotation += data.rotSpeed * 0.02;
      sprite.material.opacity = 0.7 * visibility * (1 + audio.bands.bass * 0.2 * intensity);
    }
  }

  private updateParticles(audio: VisualParams['audio'], intensity: number): void {
    const positions = this.particleSystem.geometry.attributes.position.array as Float32Array;
    const seeds = this.particleSystem.geometry.attributes.seed.array as Float32Array;
    const count = positions.length / 3;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const seed = seeds[i];

      // Evolving motion using noise
      const noiseX = fractalNoise(seed * 0.1, this.evolutionPhase * 0.5, this.time * 0.05);
      const noiseY = fractalNoise(seed * 0.1 + 100, this.evolutionPhase * 0.5, this.time * 0.05);
      const noiseZ = fractalNoise(seed * 0.1 + 200, this.evolutionPhase * 0.5, this.time * 0.03);

      positions[i3] += noiseX * 0.3 * (1 + audio.bands.high * intensity);
      positions[i3 + 1] += noiseY * 0.3 * (1 + audio.bands.mid * intensity);
      positions[i3 + 2] += noiseZ * 0.2;

      // Soft bounds
      const bound = 80;
      if (Math.abs(positions[i3]) > bound) positions[i3] *= 0.99;
      if (Math.abs(positions[i3 + 1]) > bound) positions[i3 + 1] *= 0.99;
      if (positions[i3 + 2] > 40 || positions[i3 + 2] < -100) positions[i3 + 2] *= 0.98;
    }

    this.particleSystem.geometry.attributes.position.needsUpdate = true;
    this.particleSystem.rotation.y += 0.001;
    this.particleSystem.rotation.x = Math.sin(this.evolutionPhase * 0.5) * 0.1;
  }

  private manageElements(): void {
    // Remove old elements and spawn new ones for continuous evolution
    const cullAndSpawn = (elements: EvolvingElement[], spawnFn: () => void) => {
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        const age = this.absoluteTime - el.birthTime;
        if (age > el.lifespan) {
          this.scene.remove(el.mesh);
          if (el.mesh instanceof THREE.Sprite) {
            el.mesh.material.dispose();
          }
          elements.splice(i, 1);
          spawnFn();
        }
      }
    };

    cullAndSpawn(this.tunnelElements, () => this.spawnTunnelElement());
    cullAndSpawn(this.mandalaElements, () => this.spawnMandalaElement(this.mandalaElements.length));
    cullAndSpawn(this.chaosElements, () => this.spawnChaosElement());
  }

  private triggerEvolutionEvent(audio: VisualParams['audio']): void {
    // Random events that cause visual morphing
    const eventType = Math.floor(Math.random() * 5);

    switch (eventType) {
      case 0:
        // Burst of new chaos elements
        for (let i = 0; i < 5; i++) this.spawnChaosElement();
        break;
      case 1:
        // Shift bloom strength
        this.params.set('bloomStrength', 1 + Math.random() * 2);
        break;
      case 2:
        // Shift chromatic aberration
        this.params.set('chromaticAmount', 0.003 + Math.random() * 0.012);
        break;
      case 3:
        // Shift vortex
        this.params.set('vortexStrength', 0.02 + Math.random() * 0.1);
        break;
      case 4:
        // Add tunnel burst
        for (let i = 0; i < 3; i++) this.spawnTunnelElement();
        break;
    }
  }

  private updatePostProcessing(audio: VisualParams['audio'], intensity: number): void {
    // Evolving bloom
    const baseBloom = this.params.get('bloomStrength') || 1.5;
    this.bloomPass.strength = baseBloom * (1 + audio.bands.bass * 0.5 * intensity) +
                              evolvingParam(this.absoluteTime, 20, -0.3, 0.3);

    // Evolving chromatic aberration
    const baseChromatic = this.params.get('chromaticAmount') || 0.006;
    this.chromaticPass.uniforms.amount.value = baseChromatic *
      (1 + audio.bands.high * 0.8 * intensity) +
      evolvingParam(this.absoluteTime, 21, -0.002, 0.002);
    this.chromaticPass.uniforms.angle.value = this.time * 0.5 + this.evolutionPhase;

    // Evolving vortex
    const baseVortex = this.params.get('vortexStrength') || 0.05;
    this.vortexPass.uniforms.time.value = this.time;
    this.vortexPass.uniforms.strength.value = baseVortex * (1 + audio.bands.mid * 0.3 * intensity);

    // Shift vortex center slowly
    const cx = 0.5 + Math.sin(this.evolutionPhase * PHI) * 0.1;
    const cy = 0.5 + Math.cos(this.evolutionPhase * PHI * 0.7) * 0.1;
    this.vortexPass.uniforms.center.value.set(cx, cy);
  }

  setStyle(_style: VisualStyle): void {
    // ALWAYS BRANDED - ignore style parameter
    // This ensures consistent $CC branding
  }

  setMode(mode: VisualMode | string): void {
    // Handle legacy mode names + new Hydra v2 mode names
    const modeMap: Record<string, VisualMode> = {
      // Legacy Three.js v2 modes
      tunnel: 'showcase',
      mandala: 'drift',
      chaos: 'pulse',
      showcase: 'showcase',
      drift: 'drift',
      pulse: 'pulse',
      // New Hydra v2 modes mapped to Three.js equivalents
      spiral: 'drift',      // Mandala-like
      morph: 'showcase',    // Single focal point
      dystopia: 'showcase', // Monolithic center
      geometry: 'drift',    // Fragmented/mandala
      warp: 'showcase',     // Tunnel/zoom
      glitch: 'pulse',      // Chaotic
      liquid: 'drift',      // Flowing
      clean: 'showcase',
      wavey: 'drift',
      '3d': 'showcase',
      auto: 'auto',
    };

    this.mode = modeMap[mode] || 'showcase';
    this.lastModeSwitch = this.absoluteTime;
  }

  setParameter(name: string, value: number): void {
    this.params.set(name, value);
  }

  getParameter(name: string): number | undefined {
    return this.params.get(name);
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  }

  dispose(): void {
    // Dispose textures
    this.ccLogoTexture?.dispose();
    this.mascotTexture?.dispose();

    // Dispose all elements
    const disposeElements = (elements: EvolvingElement[]) => {
      for (const el of elements) {
        this.scene.remove(el.mesh);
        if (el.mesh instanceof THREE.Sprite) {
          el.mesh.material.dispose();
        }
      }
    };

    disposeElements(this.tunnelElements);
    disposeElements(this.mandalaElements);
    disposeElements(this.chaosElements);

    // Dispose center group
    for (const child of this.centerGroup.children) {
      (child as THREE.Sprite).material.dispose();
    }

    // Dispose particles
    this.particleSystem?.geometry.dispose();
    (this.particleSystem?.material as THREE.Material)?.dispose();

    // Dispose background
    this.backgroundMesh?.geometry.dispose();
    (this.backgroundMesh?.material as THREE.Material)?.dispose();

    this.renderer.dispose();
  }
}
