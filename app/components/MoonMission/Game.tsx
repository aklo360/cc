'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Text, useTexture, Environment } from '@react-three/drei';
import * as THREE from 'three';

// Audio manager for game sounds using Web Audio API for better performance
class GameAudio {
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private musicBuffer: AudioBuffer | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicVolume = 0.4;
  private sfxVolume = 0.5;
  private initialized = false;
  private warmedUp = false;
  private musicMuted = false;
  private musicPlaying = false;

  async init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    // Create audio context
    this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    // Create gain nodes
    this.musicGain = this.audioContext.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.musicGain.connect(this.audioContext.destination);

    this.sfxGain = this.audioContext.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.audioContext.destination);

    // Preload sound effects
    const sfxFiles: Record<string, string> = {
      shoot: '/sounds/synth_laser_03.ogg',
      bomb: '/sounds/shot_01.ogg',
      explosion: '/sounds/retro_explosion_01.ogg',
      coin: '/sounds/retro_coin_01.ogg',
      death: '/sounds/retro_die_01.ogg',
      barrelRoll: '/sounds/power_up_01.ogg',
    };

    // Load all audio files in parallel
    const loadPromises = Object.entries(sfxFiles).map(async ([name, file]) => {
      try {
        const response = await fetch(file);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
        this.sounds.set(name, audioBuffer);
      } catch (e) {
        console.warn(`Failed to load sound: ${name}`, e);
      }
    });

    // Load music
    loadPromises.push((async () => {
      try {
        const response = await fetch('/sounds/bgm_level1.ogg');
        const arrayBuffer = await response.arrayBuffer();
        this.musicBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
      } catch (e) {
        console.warn('Failed to load music', e);
      }
    })());

    await Promise.all(loadPromises);
  }

  // Warm up audio context on user interaction to prevent frame drops
  warmup() {
    if (this.warmedUp || !this.audioContext) return;
    this.warmedUp = true;

    // Resume audio context (required after user gesture)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Play a silent buffer to fully initialize the audio pipeline
    const silentBuffer = this.audioContext.createBuffer(1, 1, 22050);
    const source = this.audioContext.createBufferSource();
    source.buffer = silentBuffer;
    source.connect(this.audioContext.destination);
    source.start(0);
  }

  play(name: string) {
    if (!this.audioContext || !this.sfxGain) return;
    const buffer = this.sounds.get(name);
    if (!buffer) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.sfxGain);
    source.start(0);
  }

  startMusic() {
    if (!this.audioContext || !this.musicBuffer || !this.musicGain || this.musicPlaying) return;

    this.musicSource = this.audioContext.createBufferSource();
    this.musicSource.buffer = this.musicBuffer;
    this.musicSource.loop = true;
    this.musicSource.connect(this.musicGain);
    this.musicSource.start(0);
    this.musicPlaying = true;

    // Apply mute state
    this.musicGain.gain.value = this.musicMuted ? 0 : this.musicVolume;
  }

  stopMusic() {
    if (this.musicSource) {
      try {
        this.musicSource.stop();
      } catch (e) {
        // Ignore if already stopped
      }
      this.musicSource = null;
    }
    this.musicPlaying = false;
  }

  setMusicMuted(muted: boolean) {
    this.musicMuted = muted;
    if (this.musicGain) {
      this.musicGain.gain.value = muted ? 0 : this.musicVolume;
    }
  }
}

// Singleton audio instance
const gameAudio = typeof window !== 'undefined' ? new GameAudio() : null;

interface GameProps {
  gameState: 'start' | 'playing' | 'dead';
  onDeath: (score: number, distance: number, coins: number) => void;
  onScoreUpdate: (score: number) => void;
  onDistanceUpdate: (distance: number) => void;
  onCoinsUpdate: (coins: number) => void;
  musicMuted: boolean;
  isWarmingUp: boolean;
}

interface Asteroid {
  id: number;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
  health: number;
}

interface Coin {
  id: number;
  position: THREE.Vector3;
  collected: boolean;
}

interface Bullet {
  id: number;
  startPos: THREE.Vector3;
  spawnTime: number;
  speed: number;
}

interface Bomb {
  id: number;
  startPos: THREE.Vector3;
  spawnTime: number;
  speed: number;
}

interface Explosion {
  id: number;
  position: THREE.Vector3;
  scale: number;
  opacity: number;
}

// CC Character - 3D extruded version of the $CC mascot using actual SVG path
function CCCharacter({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  const groupRef = useRef<THREE.Group>(null);

  // Load optimized WebP PBR textures for copper look
  const [copperColor, copperNormal, copperRough] = useTexture([
    '/textures/copper_color.webp',
    '/textures/copper_normal.webp',
    '/textures/copper_rough.webp',
  ]);

  // Configure textures for tiling
  useMemo(() => {
    [copperColor, copperNormal, copperRough].forEach(tex => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(3, 3);
    });
  }, [copperColor, copperNormal, copperRough]);

  // Create the CC character shape from the actual SVG path data
  const geometry = useMemo(() => {
    // SVG viewBox: 0 0 908.7 611.6
    // We'll scale it down and center it
    const scale = 0.0038; // Bigger body
    const offsetX = -908.7 / 2; // Center horizontally
    const offsetY = -611.6 / 2; // Center vertically

    // Helper to transform SVG coords to our coordinate system
    const tx = (x: number) => (x + offsetX) * scale;
    const ty = (y: number) => -(y + offsetY) * scale; // Flip Y axis

    // Main body shape - traced from the SVG path
    const shape = new THREE.Shape();

    // Starting point and main outline (from SVG path data)
    shape.moveTo(tx(623.2), ty(611.4));
    shape.lineTo(tx(561.5), ty(611.4));
    shape.lineTo(tx(561.5), ty(489.5));
    shape.lineTo(tx(346.3), ty(489.5));
    shape.lineTo(tx(346.3), ty(611.6));
    shape.lineTo(tx(285.6), ty(611.6));
    shape.lineTo(tx(285.6), ty(489.4));
    shape.lineTo(tx(233.2), ty(489.4));
    shape.lineTo(tx(233.2), ty(611.5));
    shape.lineTo(tx(172.5), ty(611.5));
    shape.lineTo(tx(172.5), ty(489.5));
    shape.lineTo(tx(111.5), ty(489.5));
    shape.lineTo(tx(111.5), ty(366.7));
    shape.lineTo(tx(0), ty(366.7));
    shape.lineTo(tx(0), ty(245.3));
    shape.lineTo(tx(112.1), ty(245.3));
    shape.lineTo(tx(112.1), ty(1.6));
    shape.lineTo(tx(118.3), ty(0.6));
    shape.lineTo(tx(789.9), ty(0.6));
    shape.lineTo(tx(797.1), ty(0.6));
    shape.lineTo(tx(797.1), ty(245.4));
    shape.lineTo(tx(908.2), ty(245.4));
    shape.lineTo(tx(908.2), ty(252.3));
    shape.lineTo(tx(908.2), ty(360.9));
    shape.lineTo(tx(907.3), ty(366.8));
    shape.lineTo(tx(797.1), ty(366.8));
    shape.lineTo(tx(797.1), ty(489.5));
    shape.lineTo(tx(735.1), ty(489.5));
    shape.lineTo(tx(735.1), ty(611.5));
    shape.lineTo(tx(674.4), ty(611.5));
    shape.lineTo(tx(674.4), ty(489.4));
    shape.lineTo(tx(623), ty(489.4));
    shape.lineTo(tx(623), ty(611.4));
    shape.closePath();

    // Left eye hole - BIGGER (expanded by ~20px on each side)
    const leftEye = new THREE.Path();
    leftEye.moveTo(tx(295), ty(255));
    leftEye.lineTo(tx(295), ty(100));
    leftEye.lineTo(tx(220), ty(100));
    leftEye.lineTo(tx(220), ty(255));
    leftEye.closePath();
    shape.holes.push(leftEye);

    // Right eye hole - BIGGER (expanded by ~20px on each side)
    const rightEye = new THREE.Path();
    rightEye.moveTo(tx(688), ty(255));
    rightEye.lineTo(tx(688), ty(100));
    rightEye.lineTo(tx(613), ty(100));
    rightEye.lineTo(tx(613), ty(255));
    rightEye.closePath();
    shape.holes.push(rightEye);

    // Extrude settings
    const extrudeSettings = {
      depth: 0.25,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 2,
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  return (
    <group ref={groupRef} position={position} rotation={[0, rotation, 0]}>
      {/* CC Character body - realistic copper PBR material */}
      <mesh geometry={geometry} rotation={[0, Math.PI, 0]} position={[0, 0, 0.15]}>
        <meshStandardMaterial
          map={copperColor}
          normalMap={copperNormal}
          normalScale={new THREE.Vector2(1, 1)}
          roughnessMap={copperRough}
          color="#da7756"
          emissive="#b85a3a"
          emissiveIntensity={0.3}
          metalness={1}
          roughness={0.9}
          envMapIntensity={1.2}
        />
      </mesh>

      </group>
  );
}

function BulletMesh({ bullet, time }: { bullet: Bullet; time: number }) {
  const elapsed = time - bullet.spawnTime;
  const z = bullet.startPos.z - elapsed * bullet.speed;

  return (
    <mesh position={[bullet.startPos.x, bullet.startPos.y, z]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.03, 0.03, 0.8, 8]} />
      <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} />
    </mesh>
  );
}

function BombMesh({ bomb, time }: { bomb: Bomb; time: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const elapsed = time - bomb.spawnTime;
  const z = bomb.startPos.z - elapsed * bomb.speed;

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.x += delta * 2;
      ref.current.rotation.y += delta * 3;
    }
  });

  return (
    <mesh ref={ref} position={[bomb.startPos.x, bomb.startPos.y, z]}>
      <octahedronGeometry args={[0.25]} />
      <meshStandardMaterial color="#ff4444" emissive="#ff0000" emissiveIntensity={1} />
    </mesh>
  );
}

function ExplosionMesh({ explosion }: { explosion: Explosion }) {
  return (
    <group position={explosion.position}>
      {/* Bright core */}
      <mesh scale={explosion.scale}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={explosion.opacity}
        />
      </mesh>
      {/* Yellow fire */}
      <mesh scale={explosion.scale * 1.3}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color="#ffff00"
          transparent
          opacity={explosion.opacity * 0.8}
        />
      </mesh>
      {/* Orange outer */}
      <mesh scale={explosion.scale * 1.8}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color="#ff6600"
          transparent
          opacity={explosion.opacity * 0.6}
        />
      </mesh>
      {/* Red outermost */}
      <mesh scale={explosion.scale * 2.5}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color="#ff0000"
          transparent
          opacity={explosion.opacity * 0.3}
        />
      </mesh>
    </group>
  );
}

function AsteroidMesh({ asteroid, speed }: { asteroid: Asteroid; speed: number }) {
  const ref = useRef<THREE.Mesh>(null);

  // Load optimized WebP rock PBR textures
  const [rockColor, rockNormal, rockRough] = useTexture([
    '/textures/rock_color.webp',
    '/textures/rock_normal.webp',
    '/textures/rock_rough.webp',
  ]);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.position.z += speed * delta;
      ref.current.rotation.x += delta * 0.5;
      ref.current.rotation.y += delta * 0.3;
    }
  });

  // Tint based on health - normal or red when damaged
  const tint = asteroid.health > 1 ? '#ffffff' : '#ff6644';
  const emissive = asteroid.health > 1 ? '#222222' : '#ff4422';

  return (
    <mesh ref={ref} position={asteroid.position} scale={asteroid.scale}>
      <sphereGeometry args={[0.8, 32, 32]} />
      <meshStandardMaterial
        map={rockColor}
        normalMap={rockNormal}
        normalScale={new THREE.Vector2(2, 2)}
        roughnessMap={rockRough}
        color={tint}
        emissive={emissive}
        emissiveIntensity={0.15}
        roughness={0.85}
        metalness={0.05}
        envMapIntensity={0.8}
      />
    </mesh>
  );
}

function CoinMesh({ coin, speed }: { coin: Coin; speed: number }) {
  const ref = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (ref.current && !coin.collected) {
      ref.current.position.z += speed * delta;
      ref.current.rotation.y += delta * 3;
    }
  });

  if (coin.collected) return null;

  return (
    <group ref={ref} position={coin.position}>
      {/* Coin disc - realistic gold material */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.1, 32]} />
        <meshStandardMaterial
          color="#ffd700"
          emissive="#ff9900"
          emissiveIntensity={0.3}
          metalness={1}
          roughness={0.2}
          envMapIntensity={2}
        />
      </mesh>
      {/* CC text front */}
      <Text
        position={[0, 0, 0.06]}
        fontSize={0.35}
        color="#996515"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        CC
      </Text>
      {/* CC text back */}
      <Text
        position={[0, 0, -0.06]}
        rotation={[0, Math.PI, 0]}
        fontSize={0.35}
        color="#996515"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        CC
      </Text>
    </group>
  );
}

function SpaceSkybox() {
  const texture = useTexture('/textures/space_bg.webp');
  const meshRef = useRef<THREE.Mesh>(null);

  // Slow rotation for immersion
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.01;
    }
  });

  return (
    <mesh ref={meshRef} scale={[-1, 1, 1]}>
      <sphereGeometry args={[500, 64, 32]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        color="#ffffff"
        toneMapped={false}
      />
    </mesh>
  );
}

export default function Game({ gameState, onDeath, onScoreUpdate, onDistanceUpdate, onCoinsUpdate, musicMuted, isWarmingUp }: GameProps) {
  const [rocketPos, setRocketPos] = useState<[number, number, number]>([0, 0, 0]);
  const [rocketRotation, setRocketRotation] = useState(0);
  const [asteroids, setAsteroids] = useState<Asteroid[]>([]);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [bombs, setBombs] = useState<Bomb[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [gameTime, setGameTime] = useState(0);
  const { viewport } = useThree();

  const gameDataRef = useRef({
    keys: {} as Record<string, boolean>,
    posX: 0,
    posY: 0,
    posZ: 0,
    rotation: 0,
    targetRotation: 0,
    barrelRollAngle: 0,
    isBarrelRolling: false,
    barrelRollDirection: 0,
    score: 0,
    distance: 0,
    coinsCollected: 0,
    speed: 8,
    startTime: 0,
    asteroidId: 0,
    coinId: 0,
    bulletId: 0,
    bombId: 0,
    explosionId: 0,
    lastAsteroidSpawn: 0,
    lastCoinSpawn: 0,
    lastBulletTime: 0,
    lastBombTime: 0,
  });

  // Initialize audio on mount
  useEffect(() => {
    gameAudio?.init();
  }, []);

  // Handle music mute toggle
  useEffect(() => {
    gameAudio?.setMusicMuted(musicMuted);
  }, [musicMuted]);

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      gameDataRef.current.keys[e.code] = true;

      // Barrel roll on left/right arrows (only if not already rolling)
      if (!gameDataRef.current.isBarrelRolling && gameState === 'playing') {
        if (e.code === 'ArrowLeft') {
          gameDataRef.current.isBarrelRolling = true;
          gameDataRef.current.barrelRollDirection = 1;
          gameDataRef.current.barrelRollAngle = 0;
          gameAudio?.play('barrelRoll');
        } else if (e.code === 'ArrowRight') {
          gameDataRef.current.isBarrelRolling = true;
          gameDataRef.current.barrelRollDirection = -1;
          gameDataRef.current.barrelRollAngle = 0;
          gameAudio?.play('barrelRoll');
        }
      }

      // Prevent default for game keys
      if (['Space', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      gameDataRef.current.keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Reset game on start
  useEffect(() => {
    if (gameState === 'playing') {
      // Warm up audio on first play to prevent frame drops
      gameAudio?.warmup();

      const g = gameDataRef.current;
      g.posX = 0;
      g.posY = 0;
      g.posZ = 0;
      g.rotation = 0;
      g.targetRotation = 0;
      g.barrelRollAngle = 0;
      g.isBarrelRolling = false;
      g.score = 0;
      g.distance = 0;
      g.coinsCollected = 0;
      g.speed = 8;
      g.startTime = Date.now();
      g.asteroidId = 0;
      g.coinId = 0;
      g.bulletId = 0;
      g.bombId = 0;
      g.explosionId = 0;
      g.lastAsteroidSpawn = 0;
      g.lastCoinSpawn = 0;
      g.lastBulletTime = 0;
      g.lastBombTime = 0;
      g.keys = {};
      setAsteroids([]);
      setCoins([]);
      setBullets([]);
      setBombs([]);
      setExplosions([]);
      setRocketPos([0, 0, 0]);
      setRocketRotation(0);

      // Small delay to let audio warm up, then start music
      setTimeout(() => {
        gameAudio?.startMusic();
      }, 50);
    } else if (gameState === 'dead') {
      // Stop music on death
      gameAudio?.stopMusic();
      gameAudio?.play('death');
    } else if (gameState === 'start') {
      // Stop music on start screen
      gameAudio?.stopMusic();
    }
  }, [gameState]);

  useFrame((state, delta) => {
    if (gameState !== 'playing') return;

    const g = gameDataRef.current;
    const time = state.clock.getElapsedTime();
    setGameTime(time);
    const keys = g.keys;

    // Movement speed
    const moveSpeed = 8;
    const zMoveSpeed = 5;

    // WASD movement (left/right/up/down)
    if (keys['KeyA'] || keys['KeyLeft']) g.posX -= moveSpeed * delta;
    if (keys['KeyD'] || keys['KeyRight']) g.posX += moveSpeed * delta;
    if (keys['KeyW'] || keys['KeyUp']) g.posY += moveSpeed * delta;
    if (keys['KeyS'] || keys['KeyDown']) g.posY -= moveSpeed * delta;

    // Arrow up/down for forward/back (z-axis)
    if (keys['ArrowUp']) g.posZ -= zMoveSpeed * delta;
    if (keys['ArrowDown']) g.posZ += zMoveSpeed * delta;

    // Clamp position
    const maxX = (viewport.width / 2) * 0.85;
    const maxY = (viewport.height / 2) * 0.85;
    const maxZ = 5;
    g.posX = THREE.MathUtils.clamp(g.posX, -maxX, maxX);
    g.posY = THREE.MathUtils.clamp(g.posY, -maxY, maxY);
    g.posZ = THREE.MathUtils.clamp(g.posZ, -maxZ, maxZ);

    // Barrel roll animation
    if (g.isBarrelRolling) {
      g.barrelRollAngle += delta * 12; // Speed of roll
      if (g.barrelRollAngle >= Math.PI * 2) {
        g.isBarrelRolling = false;
        g.barrelRollAngle = 0;
        g.rotation = 0;
      } else {
        g.rotation = g.barrelRollAngle * g.barrelRollDirection;
      }
    }

    // Shooting bullets (Space) - rapid fire
    if (keys['Space'] && time - g.lastBulletTime > 0.1) {
      const newBullet: Bullet = {
        id: g.bulletId++,
        startPos: new THREE.Vector3(g.posX, g.posY, g.posZ),
        spawnTime: time,
        speed: 60,
      };
      setBullets(prev => [...prev.slice(-50), newBullet]);
      g.lastBulletTime = time;
      gameAudio?.play('shoot');
    }

    // Shooting bombs (Shift) - slower, bigger damage
    if ((keys['ShiftLeft'] || keys['ShiftRight']) && time - g.lastBombTime > 0.5) {
      const newBomb: Bomb = {
        id: g.bombId++,
        startPos: new THREE.Vector3(g.posX, g.posY, g.posZ),
        spawnTime: time,
        speed: 35,
      };
      setBombs(prev => [...prev.slice(-10), newBomb]);
      g.lastBombTime = time;
      gameAudio?.play('bomb');
    }

    // Update speed based on time
    const elapsedSeconds = (Date.now() - g.startTime) / 1000;
    if (elapsedSeconds < 10) {
      g.speed = 8;
    } else if (elapsedSeconds < 30) {
      g.speed = 10;
    } else if (elapsedSeconds < 60) {
      g.speed = 14;
    } else {
      g.speed = 20;
    }

    // Update distance and score
    g.distance += g.speed * delta;
    g.score = Math.floor(g.distance) + g.coinsCollected * 10;
    onDistanceUpdate(g.distance);
    onScoreUpdate(g.score);

    // Update rocket position
    setRocketPos([g.posX, g.posY, g.posZ]);
    setRocketRotation(g.rotation);

    // Spawn asteroids
    const asteroidInterval = elapsedSeconds < 10 ? 1.5 : elapsedSeconds < 30 ? 1.0 : elapsedSeconds < 60 ? 0.6 : 0.3;
    if (time - g.lastAsteroidSpawn > asteroidInterval) {
      const newAsteroid: Asteroid = {
        id: g.asteroidId++,
        position: new THREE.Vector3(
          (Math.random() - 0.5) * viewport.width * 0.9,
          (Math.random() - 0.5) * viewport.height * 0.9,
          -50
        ),
        rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
        scale: 2 + Math.random() * 6,
        health: 2,
      };
      setAsteroids(prev => [...prev.slice(-30), newAsteroid]);
      g.lastAsteroidSpawn = time;
    }

    // Spawn coins
    if (time - g.lastCoinSpawn > 2) {
      const newCoin: Coin = {
        id: g.coinId++,
        position: new THREE.Vector3(
          (Math.random() - 0.5) * viewport.width * 0.7,
          (Math.random() - 0.5) * viewport.height * 0.7,
          -40
        ),
        collected: false,
      };
      setCoins(prev => [...prev.slice(-20), newCoin]);
      g.lastCoinSpawn = time;
    }

    // Remove bullets that are too far
    setBullets(prev => prev.filter(b => {
      const z = b.startPos.z - (time - b.spawnTime) * b.speed;
      return z > -60;
    }));

    // Remove bombs that are too far
    setBombs(prev => prev.filter(b => {
      const z = b.startPos.z - (time - b.spawnTime) * b.speed;
      return z > -60;
    }));

    // Update explosions (fade out)
    setExplosions(prev => {
      return prev.map(e => ({
        ...e,
        scale: e.scale + delta * 8,
        opacity: e.opacity - delta * 0.8,
      })).filter(e => e.opacity > 0);
    });

    // Bullet-asteroid collisions
    const bulletsToRemove = new Set<number>();
    const bombsToRemove = new Set<number>();
    const explosionsToAdd: Explosion[] = [];
    const asteroidsToDestroy = new Set<number>();

    // Check all collisions first
    for (const asteroid of asteroids) {
      // Check bullet hits
      for (const bullet of bullets) {
        if (bulletsToRemove.has(bullet.id)) continue;
        const bulletZ = bullet.startPos.z - (time - bullet.spawnTime) * bullet.speed;
        const bulletPos = new THREE.Vector3(bullet.startPos.x, bullet.startPos.y, bulletZ);
        const dist = asteroid.position.distanceTo(bulletPos);
        if (dist < asteroid.scale * 1.2) {
          bulletsToRemove.add(bullet.id);
          asteroid.health--;
          if (asteroid.health <= 0) {
            g.score += 25;
            asteroidsToDestroy.add(asteroid.id);
            explosionsToAdd.push({
              id: g.explosionId++,
              position: asteroid.position.clone(),
              scale: asteroid.scale * 1.5,
              opacity: 1,
            });
          }
          break;
        }
      }

      // Check bomb hits (bigger radius, instant kill)
      if (!asteroidsToDestroy.has(asteroid.id)) {
        for (const bomb of bombs) {
          if (bombsToRemove.has(bomb.id)) continue;
          const bombZ = bomb.startPos.z - (time - bomb.spawnTime) * bomb.speed;
          const bombPos = new THREE.Vector3(bomb.startPos.x, bomb.startPos.y, bombZ);
          const dist = asteroid.position.distanceTo(bombPos);
          if (dist < asteroid.scale * 2) {
            g.score += 50;
            asteroidsToDestroy.add(asteroid.id);
            bombsToRemove.add(bomb.id);
            explosionsToAdd.push({
              id: g.explosionId++,
              position: asteroid.position.clone(),
              scale: asteroid.scale * 2,
              opacity: 1,
            });
            break;
          }
        }
      }
    }

    // Apply all state updates
    if (asteroidsToDestroy.size > 0) {
      setAsteroids(prev => prev.filter(a => !asteroidsToDestroy.has(a.id)));
      // Play explosion sound for each destroyed asteroid
      gameAudio?.play('explosion');
    }
    if (bulletsToRemove.size > 0) {
      setBullets(prev => prev.filter(b => !bulletsToRemove.has(b.id)));
    }
    if (bombsToRemove.size > 0) {
      setBombs(prev => prev.filter(b => !bombsToRemove.has(b.id)));
    }
    if (explosionsToAdd.length > 0) {
      setExplosions(prev => [...prev, ...explosionsToAdd]);
    }

    // Rocket collision with asteroids (only if not barrel rolling or warming up - invincibility!)
    if (!g.isBarrelRolling && !isWarmingUp) {
      for (const asteroid of asteroids) {
        const dist = Math.sqrt(
          Math.pow(asteroid.position.x - g.posX, 2) +
          Math.pow(asteroid.position.y - g.posY, 2) +
          Math.pow(asteroid.position.z - g.posZ, 2)
        );
        if (dist < 0.8 * asteroid.scale && asteroid.position.z > -5 && asteroid.position.z < 5) {
          onDeath(g.score, g.distance, g.coinsCollected);
          return;
        }
      }
    }

    // Coin collection
    setCoins(prev => prev.map(coin => {
      if (coin.collected) return coin;
      const dist = Math.sqrt(
        Math.pow(coin.position.x - g.posX, 2) +
        Math.pow(coin.position.y - g.posY, 2) +
        Math.pow(coin.position.z - g.posZ, 2)
      );
      if (dist < 1.2) {
        g.coinsCollected++;
        onCoinsUpdate(g.coinsCollected);
        gameAudio?.play('coin');
        return { ...coin, collected: true };
      }
      return coin;
    }));

    // Update asteroid positions
    setAsteroids(prev => prev.filter(a => a.position.z < 20).map(a => {
      a.position.z += g.speed * delta;
      return a;
    }));

    // Update coin positions
    setCoins(prev => prev.filter(c => c.position.z < 20 && !c.collected).map(c => {
      c.position.z += g.speed * delta;
      return c;
    }));
  });

  return (
    <>
      {/* No fog - let the space skybox shine through */}

      {/* Enhanced lighting for PBR materials */}
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} color="#ffffff" castShadow />
      <pointLight position={[10, 10, 10]} intensity={2} color="#ff00ff" distance={50} />
      <pointLight position={[-10, -10, 10]} intensity={1} color="#00ffff" distance={50} />
      <pointLight position={[0, 0, 15]} intensity={0.8} color="#ffffff" distance={30} />


      {/* Environment map for reflections */}
      <Environment preset="night" background={false} />

      <SpaceSkybox />
      <CCCharacter position={rocketPos} rotation={rocketRotation} />

      {bullets.map(bullet => (
        <BulletMesh key={bullet.id} bullet={bullet} time={gameTime} />
      ))}

      {bombs.map(bomb => (
        <BombMesh key={bomb.id} bomb={bomb} time={gameTime} />
      ))}

      {explosions.map(explosion => (
        <ExplosionMesh key={explosion.id} explosion={explosion} />
      ))}

      {asteroids.map(asteroid => (
        <AsteroidMesh key={asteroid.id} asteroid={asteroid} speed={gameDataRef.current.speed} />
      ))}

      {coins.map(coin => (
        <CoinMesh key={coin.id} coin={coin} speed={gameDataRef.current.speed} />
      ))}
    </>
  );
}
