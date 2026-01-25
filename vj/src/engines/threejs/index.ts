/**
 * Three.js Visual Engine
 * Audio-reactive 3D visuals using Three.js
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { IVisualEngine, VisualParams, VisualStyle } from '../types';
import { STYLE_PALETTES, hexToRgb } from '../types';

export class ThreeJSEngine implements IVisualEngine {
  readonly name = 'Three.js';

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private bloomPass!: UnrealBloomPass;

  // Visual elements
  private particles!: THREE.Points;
  private geometry!: THREE.Mesh;
  private rings: THREE.Mesh[] = [];
  private tunnel!: THREE.Mesh;

  // State
  private style: VisualStyle = 'synthwave';
  private params: Map<string, number> = new Map([
    ['intensity', 1],
    ['colorShift', 0],
    ['zoom', 1],
    ['speed', 1],
    ['particleCount', 5000],
    ['bloomStrength', 1.5],
  ]);

  async init(container: HTMLElement): Promise<void> {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 1);
    container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.02);

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 30;

    // Post-processing
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      1.5, // strength
      0.4, // radius
      0.85 // threshold
    );
    this.composer.addPass(this.bloomPass);

    // Create visual elements
    this.createParticles();
    this.createGeometry();
    this.createRings();
    this.createTunnel();

    // Apply initial style
    this.setStyle(this.style);
  }

  private createParticles(): void {
    const count = this.params.get('particleCount') || 5000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Spherical distribution
      const radius = Math.random() * 50 + 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      colors[i3] = 1;
      colors[i3 + 1] = 1;
      colors[i3 + 2] = 1;

      sizes[i] = Math.random() * 2 + 0.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  private createGeometry(): void {
    const geometry = new THREE.IcosahedronGeometry(5, 2);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });

    this.geometry = new THREE.Mesh(geometry, material);
    this.scene.add(this.geometry);
  }

  private createRings(): void {
    for (let i = 0; i < 5; i++) {
      const geometry = new THREE.TorusGeometry(8 + i * 3, 0.1, 16, 100);
      const material = new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        transparent: true,
        opacity: 0.5,
      });
      const ring = new THREE.Mesh(geometry, material);
      ring.rotation.x = Math.PI / 2;
      ring.position.z = -i * 10;
      this.rings.push(ring);
      this.scene.add(ring);
    }
  }

  private createTunnel(): void {
    const geometry = new THREE.CylinderGeometry(20, 20, 100, 32, 1, true);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide,
    });

    this.tunnel = new THREE.Mesh(geometry, material);
    this.tunnel.rotation.x = Math.PI / 2;
    this.tunnel.position.z = -30;
    this.scene.add(this.tunnel);
  }

  render(params: VisualParams): void {
    const { audio, beat, time } = params;
    const intensity = this.params.get('intensity') || 1;
    const speed = this.params.get('speed') || 1;
    const zoom = this.params.get('zoom') || 1;

    // Update camera
    this.camera.position.z = 30 / zoom;
    this.camera.position.x = Math.sin(time * 0.1 * speed) * 2;
    this.camera.position.y = Math.cos(time * 0.15 * speed) * 2;
    this.camera.lookAt(0, 0, 0);

    // Update particles
    const positions = this.particles.geometry.attributes.position
      .array as Float32Array;
    const colors = this.particles.geometry.attributes.color
      .array as Float32Array;
    const count = positions.length / 3;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Pulse particles outward on bass
      const baseRadius = Math.sqrt(
        positions[i3] ** 2 + positions[i3 + 1] ** 2 + positions[i3 + 2] ** 2
      );
      const targetRadius = baseRadius * (1 + audio.bands.bass * 0.3 * intensity);
      const scale = targetRadius / Math.max(baseRadius, 0.001);

      positions[i3] *= 0.99 + scale * 0.01;
      positions[i3 + 1] *= 0.99 + scale * 0.01;
      positions[i3 + 2] *= 0.99 + scale * 0.01;

      // Color based on frequency bands
      const palette = STYLE_PALETTES[this.style];
      const [pr, pg, pb] = hexToRgb(palette.primary);
      const [sr, sg, sb] = hexToRgb(palette.secondary);
      const [ar, ag, ab] = hexToRgb(palette.accent);

      const mix = audio.bands.mid;
      colors[i3] = pr * (1 - mix) + ar * mix;
      colors[i3 + 1] = pg * (1 - mix) + ag * mix;
      colors[i3 + 2] = pb * (1 - mix) + ab * mix;
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.color.needsUpdate = true;
    this.particles.rotation.y += 0.002 * speed;

    // Update central geometry
    const geoScale = 1 + audio.bands.bass * 0.5 * intensity;
    this.geometry.scale.setScalar(geoScale);
    this.geometry.rotation.x += 0.01 * speed * (1 + audio.bands.mid);
    this.geometry.rotation.y += 0.015 * speed * (1 + audio.bands.high);

    // Update rings
    this.rings.forEach((ring, i) => {
      const ringScale = 1 + audio.bands.bass * 0.2 * intensity;
      ring.scale.setScalar(ringScale);
      ring.rotation.z += (0.01 + i * 0.005) * speed;
      ring.position.z = -i * 10 + Math.sin(time * speed + i) * 2;

      // Pulse opacity on beat
      const material = ring.material as THREE.MeshBasicMaterial;
      material.opacity = 0.3 + (beat.phase < 0.2 ? 0.5 : 0) * intensity;
    });

    // Update tunnel
    this.tunnel.rotation.z += 0.005 * speed;
    const tunnelMaterial = this.tunnel.material as THREE.MeshBasicMaterial;
    tunnelMaterial.opacity = 0.1 + audio.bands.high * 0.2 * intensity;

    // Update bloom
    this.bloomPass.strength = (this.params.get('bloomStrength') || 1.5) * intensity;

    // Render
    this.composer.render();
  }

  setStyle(style: VisualStyle): void {
    this.style = style;
    const palette = STYLE_PALETTES[style];

    // Update background
    this.renderer.setClearColor(palette.background);
    (this.scene.fog as THREE.FogExp2).color.set(palette.background);

    // Update geometry
    (this.geometry.material as THREE.MeshBasicMaterial).color.set(palette.primary);

    // Update rings
    this.rings.forEach((ring, i) => {
      const color = i % 2 === 0 ? palette.primary : palette.secondary;
      (ring.material as THREE.MeshBasicMaterial).color.set(color);
    });

    // Update tunnel
    (this.tunnel.material as THREE.MeshBasicMaterial).color.set(palette.secondary);
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
    this.particles.geometry.dispose();
    (this.particles.material as THREE.Material).dispose();
    this.geometry.geometry.dispose();
    (this.geometry.material as THREE.Material).dispose();
    this.rings.forEach((ring) => {
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
    });
    this.tunnel.geometry.dispose();
    (this.tunnel.material as THREE.Material).dispose();
    this.renderer.dispose();
  }
}
