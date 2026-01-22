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

function Rocket({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const flameRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (flameRef.current) {
      flameRef.current.scale.y = 0.8 + Math.sin(Date.now() * 0.02) * 0.3;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={[0, 0, Math.PI + rotation]}>
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
      {/* Core explosion */}
      <mesh scale={explosion.scale}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color="#ffff00"
          emissive="#ff8800"
          emissiveIntensity={3}
          transparent
          opacity={explosion.opacity}
        />
      </mesh>
      {/* Outer glow */}
      <mesh scale={explosion.scale * 1.5}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color="#ff4400"
          emissive="#ff2200"
          emissiveIntensity={2}
          transparent
          opacity={explosion.opacity * 0.5}
        />
      </mesh>
      {/* Shockwave ring */}
      <mesh scale={explosion.scale * 2} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.1, 8, 32]} />
        <meshStandardMaterial
          color="#ffaa00"
          emissive="#ff6600"
          emissiveIntensity={2}
          transparent
          opacity={explosion.opacity * 0.7}
        />
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

  // Color based on health - light grey moon, red tint when damaged
  const color = asteroid.health > 1 ? '#cccccc' : '#ff8866';
  const emissive = asteroid.health > 1 ? '#444444' : '#ff4422';

  return (
    <mesh ref={ref} position={asteroid.position} scale={asteroid.scale}>
      <sphereGeometry args={[0.8, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={0.3}
        roughness={0.7}
      />
    </mesh>
  );
}

function CoinMesh({ coin, speed }: { coin: Coin; speed: number }) {
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

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      gameDataRef.current.keys[e.code] = true;

      // Barrel roll on left/right arrows (only if not already rolling)
      if (!gameDataRef.current.isBarrelRolling) {
        if (e.code === 'ArrowLeft') {
          gameDataRef.current.isBarrelRolling = true;
          gameDataRef.current.barrelRollDirection = 1;
          gameDataRef.current.barrelRollAngle = 0;
        } else if (e.code === 'ArrowRight') {
          gameDataRef.current.isBarrelRolling = true;
          gameDataRef.current.barrelRollDirection = -1;
          gameDataRef.current.barrelRollAngle = 0;
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
  }, []);

  // Reset game on start
  useEffect(() => {
    if (gameState === 'playing') {
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
        scale: 1.0 + Math.random() * 1.5,
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
        scale: e.scale + delta * 5,
        opacity: e.opacity - delta * 1.2,
      })).filter(e => e.opacity > 0);
    });

    // Bullet-asteroid collisions
    let newExplosions: Explosion[] = [];
    const bulletsToRemove = new Set<number>();
    const bombsToRemove = new Set<number>();

    setAsteroids(prev => {
      return prev.map(asteroid => {
        // Check bullet hits
        for (const bullet of bullets) {
          if (bulletsToRemove.has(bullet.id)) continue;
          const bulletZ = bullet.startPos.z - (time - bullet.spawnTime) * bullet.speed;
          const bulletPos = new THREE.Vector3(bullet.startPos.x, bullet.startPos.y, bulletZ);
          const dist = asteroid.position.distanceTo(bulletPos);
          if (dist < asteroid.scale * 0.7) {
            asteroid.health--;
            bulletsToRemove.add(bullet.id);
            if (asteroid.health <= 0) {
              g.score += 25;
              newExplosions.push({
                id: g.explosionId++,
                position: asteroid.position.clone(),
                scale: 0.8,
                opacity: 1,
              });
              return { ...asteroid, health: -1 }; // Mark for removal
            }
          }
        }

        // Check bomb hits (bigger radius, instant kill)
        for (const bomb of bombs) {
          if (bombsToRemove.has(bomb.id)) continue;
          const bombZ = bomb.startPos.z - (time - bomb.spawnTime) * bomb.speed;
          const bombPos = new THREE.Vector3(bomb.startPos.x, bomb.startPos.y, bombZ);
          const dist = asteroid.position.distanceTo(bombPos);
          if (dist < asteroid.scale * 1.5) {
            g.score += 50;
            newExplosions.push({
              id: g.explosionId++,
              position: asteroid.position.clone(),
              scale: 1.2,
              opacity: 1,
            });
            bombsToRemove.add(bomb.id);
            return { ...asteroid, health: -1 }; // Mark for removal
          }
        }

        return asteroid;
      }).filter(a => a.health > 0);
    });

    // Remove hit bullets and bombs
    if (bulletsToRemove.size > 0) {
      setBullets(prev => prev.filter(b => !bulletsToRemove.has(b.id)));
    }
    if (bombsToRemove.size > 0) {
      setBombs(prev => prev.filter(b => !bombsToRemove.has(b.id)));
    }

    if (newExplosions.length > 0) {
      setExplosions(prev => [...prev, ...newExplosions]);
    }

    // Rocket collision with asteroids (only if not barrel rolling - invincibility frames!)
    if (!g.isBarrelRolling) {
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
      <color attach="background" args={['#0a0015']} />
      <fog attach="fog" args={['#0a0015', 20, 60]} />
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#ff00ff" />
      <pointLight position={[-10, -10, 10]} intensity={0.5} color="#00ffff" />

      <Starfield />
      <Rocket position={rocketPos} rotation={rocketRotation} />

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
