'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';

interface GameProps {
  gameState: 'start' | 'playing' | 'dead';
  onDeath: (score: number, distance: number, coins: number) => void;
  onScoreUpdate: (score: number) => void;
  onDistanceUpdate: (distance: number) => void;
  onCoinsUpdate: (coins: number) => void;
}

interface Asteroid {
  id: number;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
}

interface Coin {
  id: number;
  position: THREE.Vector3;
  collected: boolean;
}

function Rocket({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  const flameRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (flameRef.current) {
      flameRef.current.scale.y = 0.8 + Math.sin(Date.now() * 0.02) * 0.3;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={[0, 0, Math.PI]}>
      {/* Rocket body */}
      <mesh position={[0, 0, 0]}>
        <coneGeometry args={[0.3, 1, 8]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={0.5} />
      </mesh>
      {/* Rocket fins */}
      <mesh position={[-0.3, 0.3, 0]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.2, 0.3, 0.05]} />
        <meshStandardMaterial color="#ff00ff" emissive="#ff00ff" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0.3, 0.3, 0]} rotation={[0, 0, 0.5]}>
        <boxGeometry args={[0.2, 0.3, 0.05]} />
        <meshStandardMaterial color="#ff00ff" emissive="#ff00ff" emissiveIntensity={0.3} />
      </mesh>
      {/* Flame */}
      <mesh ref={flameRef} position={[0, 0.7, 0]}>
        <coneGeometry args={[0.15, 0.5, 8]} />
        <meshStandardMaterial color="#ffa500" emissive="#ff4500" emissiveIntensity={1} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

function AsteroidMesh({ asteroid, speed }: { asteroid: Asteroid; speed: number }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.position.z += speed * delta;
      ref.current.rotation.x += delta * 0.5;
      ref.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <mesh ref={ref} position={asteroid.position} scale={asteroid.scale}>
      <dodecahedronGeometry args={[0.5]} />
      <meshStandardMaterial color="#555" roughness={0.8} />
    </mesh>
  );
}

function CoinMesh({ coin, speed, onCollect }: { coin: Coin; speed: number; onCollect: () => void }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ref.current && !coin.collected) {
      ref.current.position.z += speed * delta;
      ref.current.rotation.y += delta * 3;
    }
  });

  if (coin.collected) return null;

  return (
    <mesh ref={ref} position={coin.position}>
      <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
      <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.5} />
    </mesh>
  );
}

function Starfield() {
  const starsRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(2000 * 3);
    for (let i = 0; i < 2000; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200 - 50;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame((_, delta) => {
    if (starsRef.current) {
      starsRef.current.rotation.z += delta * 0.01;
    }
  });

  return (
    <points ref={starsRef} geometry={geometry}>
      <pointsMaterial size={0.15} color="#ffffff" transparent opacity={0.8} />
    </points>
  );
}

export default function Game({ gameState, onDeath, onScoreUpdate, onDistanceUpdate, onCoinsUpdate }: GameProps) {
  const [rocketPos, setRocketPos] = useState<[number, number, number]>([0, 0, 0]);
  const [asteroids, setAsteroids] = useState<Asteroid[]>([]);
  const [coins, setCoins] = useState<Coin[]>([]);
  const { viewport } = useThree();

  const gameDataRef = useRef({
    targetX: 0,
    targetY: 0,
    score: 0,
    distance: 0,
    coinsCollected: 0,
    speed: 8,
    startTime: 0,
    asteroidId: 0,
    coinId: 0,
    lastAsteroidSpawn: 0,
    lastCoinSpawn: 0,
  });

  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const g = gameDataRef.current;
      g.targetX = ((e.clientX / window.innerWidth) * 2 - 1) * (viewport.width / 2) * 0.85;
      g.targetY = -((e.clientY / window.innerHeight) * 2 - 1) * (viewport.height / 2) * 0.85;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const g = gameDataRef.current;
      g.targetX = ((touch.clientX / window.innerWidth) * 2 - 1) * (viewport.width / 2) * 0.85;
      g.targetY = -((touch.clientY / window.innerHeight) * 2 - 1) * (viewport.height / 2) * 0.85;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [viewport]);

  // Reset game on start
  useEffect(() => {
    if (gameState === 'playing') {
      const g = gameDataRef.current;
      g.score = 0;
      g.distance = 0;
      g.coinsCollected = 0;
      g.speed = 8;
      g.startTime = Date.now();
      g.asteroidId = 0;
      g.coinId = 0;
      g.lastAsteroidSpawn = 0;
      g.lastCoinSpawn = 0;
      setAsteroids([]);
      setCoins([]);
      setRocketPos([0, 0, 0]);
    }
  }, [gameState]);

  useFrame((state, delta) => {
    if (gameState !== 'playing') return;

    const g = gameDataRef.current;
    const time = state.clock.getElapsedTime();

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

    // Smooth rocket follow
    setRocketPos(prev => [
      THREE.MathUtils.lerp(prev[0], g.targetX, 0.1),
      THREE.MathUtils.lerp(prev[1], g.targetY, 0.1),
      0
    ]);

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
        scale: 0.5 + Math.random() * 1,
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

    // Check collisions
    const rocketBounds = { x: rocketPos[0], y: rocketPos[1], radius: 0.4 };

    // Asteroid collision
    for (const asteroid of asteroids) {
      const dist = Math.sqrt(
        Math.pow(asteroid.position.x - rocketBounds.x, 2) +
        Math.pow(asteroid.position.y - rocketBounds.y, 2) +
        Math.pow(asteroid.position.z - 0, 2)
      );
      if (dist < 0.8 * asteroid.scale && asteroid.position.z > -5 && asteroid.position.z < 5) {
        onDeath(g.score, g.distance, g.coinsCollected);
        return;
      }
    }

    // Coin collection
    setCoins(prev => prev.map(coin => {
      if (coin.collected) return coin;
      const dist = Math.sqrt(
        Math.pow(coin.position.x - rocketBounds.x, 2) +
        Math.pow(coin.position.y - rocketBounds.y, 2) +
        Math.pow(coin.position.z - 0, 2)
      );
      if (dist < 1 && coin.position.z > -3 && coin.position.z < 3) {
        g.coinsCollected++;
        onCoinsUpdate(g.coinsCollected);
        return { ...coin, collected: true };
      }
      return coin;
    }));

    // Update asteroid positions and remove off-screen
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
      <color attach="background" args={['#0a0015']} />
      <fog attach="fog" args={['#0a0015', 20, 60]} />
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#ff00ff" />
      <pointLight position={[-10, -10, 10]} intensity={0.5} color="#00ffff" />

      <Starfield />
      <Rocket position={rocketPos} />

      {asteroids.map(asteroid => (
        <AsteroidMesh key={asteroid.id} asteroid={asteroid} speed={gameDataRef.current.speed} />
      ))}

      {coins.map(coin => (
        <CoinMesh
          key={coin.id}
          coin={coin}
          speed={gameDataRef.current.speed}
          onCollect={() => {}}
        />
      ))}
    </>
  );
}
