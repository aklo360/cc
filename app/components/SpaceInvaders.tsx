'use client';

import { useRef, useEffect, useCallback } from 'react';

interface SpaceInvadersProps {
  width?: number;
  height?: number;
}

export default function SpaceInvaders({ width = 480, height = 640 }: SpaceInvadersProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerImgRef = useRef<HTMLImageElement | null>(null);
  const gameRef = useRef({
    player: { x: 220, y: 580, w: 40, h: 40, lives: 3 },
    playerBullet: null as { x: number; y: number; w: number; h: number } | null,
    alienBullets: [] as { x: number; y: number; w: number; h: number }[],
    aliens: [] as { x: number; y: number; w: number; h: number; alive: boolean }[],
    alienDir: 1,
    alienSpeed: 1,
    score: 0,
    highScore: 0,
    gameOver: false,
    won: false,
    started: false,
    keys: {} as Record<string, boolean>,
  });

  const initAliens = useCallback(() => {
    const g = gameRef.current;
    g.aliens = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 11; c++) {
        g.aliens.push({
          x: 30 + c * 40,
          y: 60 + r * 40,
          w: 30,
          h: 30,
          alive: true,
        });
      }
    }
  }, []);

  const resetGame = useCallback(() => {
    const g = gameRef.current;
    g.player = { x: 220, y: 580, w: 40, h: 40, lives: 3 };
    g.playerBullet = null;
    g.alienBullets = [];
    g.alienDir = 1;
    g.alienSpeed = 1;
    g.score = 0;
    g.gameOver = false;
    g.won = false;
    initAliens();
  }, [initAliens]);

  const collides = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load player image (CC mascot)
    const playerImg = new Image();
    playerImg.src = '/cc.png';
    playerImgRef.current = playerImg;

    const g = gameRef.current;

    // Load high score from localStorage
    const savedHighScore = localStorage.getItem('cc-space-invaders-highscore');
    if (savedHighScore) g.highScore = parseInt(savedHighScore, 10);

    initAliens();

    const handleKeyDown = (e: KeyboardEvent) => {
      g.keys[e.code] = true;

      // Start game on any key
      if (!g.started && !g.gameOver) {
        g.started = true;
      }

      // Restart on Enter when game over
      if (g.gameOver && e.code === 'Enter') {
        resetGame();
        g.started = true;
      }

      // Shoot
      if (e.code === 'Space' && !g.playerBullet && !g.gameOver && g.started) {
        e.preventDefault();
        g.playerBullet = { x: g.player.x + g.player.w / 2 - 3, y: g.player.y, w: 6, h: 15 };
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      g.keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let animationId: number;
    let lastAlienShot = 0;

    const update = (time: number) => {
      if (g.gameOver || !g.started) return;

      // Player movement
      if ((g.keys['ArrowLeft'] || g.keys['KeyA']) && g.player.x > 0) {
        g.player.x -= 6;
      }
      if ((g.keys['ArrowRight'] || g.keys['KeyD']) && g.player.x < width - g.player.w) {
        g.player.x += 6;
      }

      // Player bullet movement
      if (g.playerBullet) {
        g.playerBullet.y -= 10;
        if (g.playerBullet.y < 0) g.playerBullet = null;
      }

      // Alien bullets movement
      g.alienBullets = g.alienBullets.filter(b => {
        b.y += 5;
        if (collides(b, g.player)) {
          g.player.lives--;
          if (g.player.lives <= 0) {
            g.gameOver = true;
            g.won = false;
            // Save high score
            if (g.score > g.highScore) {
              g.highScore = g.score;
              localStorage.setItem('cc-space-invaders-highscore', g.highScore.toString());
            }
          }
          return false;
        }
        return b.y < height;
      });

      // Alien movement
      let edgeHit = false;
      g.aliens.forEach(a => {
        if (!a.alive) return;
        a.x += g.alienSpeed * g.alienDir;
        if (a.x <= 0 || a.x + a.w >= width) edgeHit = true;
        if (a.y + a.h >= g.player.y) {
          g.gameOver = true;
          g.won = false;
        }
      });

      if (edgeHit) {
        g.alienDir *= -1;
        g.aliens.forEach(a => { a.y += 15; });
      }

      // Alien shooting (every ~1.5 seconds)
      if (time - lastAlienShot > 1500) {
        const alive = g.aliens.filter(a => a.alive);
        if (alive.length) {
          const shooter = alive[Math.floor(Math.random() * alive.length)];
          g.alienBullets.push({
            x: shooter.x + shooter.w / 2 - 3,
            y: shooter.y + shooter.h,
            w: 6,
            h: 15
          });
          lastAlienShot = time;
        }
      }

      // Bullet-alien collision
      if (g.playerBullet) {
        for (const a of g.aliens) {
          if (a.alive && collides(g.playerBullet, a)) {
            a.alive = false;
            g.playerBullet = null;
            g.score += 10;
            // Speed up aliens as fewer remain
            const remaining = g.aliens.filter(x => x.alive).length;
            g.alienSpeed = 1 + (55 - remaining) * 0.06;
            break;
          }
        }
      }

      // Win check
      if (g.aliens.every(a => !a.alive)) {
        g.gameOver = true;
        g.won = true;
        // Save high score
        if (g.score > g.highScore) {
          g.highScore = g.score;
          localStorage.setItem('cc-space-invaders-highscore', g.highScore.toString());
        }
      }
    };

    const render = () => {
      // Background
      ctx.fillStyle = '#0d0d0d';
      ctx.fillRect(0, 0, width, height);

      // Stars background
      ctx.fillStyle = '#333';
      for (let i = 0; i < 50; i++) {
        const x = (i * 97) % width;
        const y = (i * 53) % height;
        ctx.fillRect(x, y, 2, 2);
      }

      // Player (CC mascot)
      if (playerImgRef.current?.complete) {
        ctx.drawImage(playerImgRef.current, g.player.x, g.player.y, g.player.w, g.player.h);
      } else {
        ctx.fillStyle = '#da7756';
        ctx.fillRect(g.player.x, g.player.y, g.player.w, g.player.h);
      }

      // Aliens (inverted CC mascots - draw as orange squares for enemies)
      g.aliens.forEach(a => {
        if (a.alive) {
          // Draw alien as pixelated invader shape
          ctx.fillStyle = '#da7756';
          const s = a.w / 6; // scale unit
          // Simple invader pattern
          ctx.fillRect(a.x + s, a.y, s * 4, s);
          ctx.fillRect(a.x, a.y + s, s * 6, s);
          ctx.fillRect(a.x, a.y + s * 2, s * 6, s * 2);
          ctx.fillRect(a.x + s, a.y + s * 4, s, s * 2);
          ctx.fillRect(a.x + s * 4, a.y + s * 4, s, s * 2);
        }
      });

      // Player bullet (orange)
      if (g.playerBullet) {
        ctx.fillStyle = '#da7756';
        ctx.fillRect(g.playerBullet.x, g.playerBullet.y, g.playerBullet.w, g.playerBullet.h);
      }

      // Alien bullets (red)
      ctx.fillStyle = '#ff4444';
      g.alienBullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));

      // HUD
      ctx.fillStyle = '#da7756';
      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.fillText(`SCORE: ${g.score}`, 10, 25);
      ctx.fillText(`HIGH: ${g.highScore}`, width - 120, 25);

      // Lives
      ctx.fillStyle = '#e0e0e0';
      ctx.fillText('LIVES:', 10, height - 15);
      for (let i = 0; i < g.player.lives; i++) {
        if (playerImgRef.current?.complete) {
          ctx.drawImage(playerImgRef.current, 70 + i * 25, height - 30, 20, 20);
        } else {
          ctx.fillStyle = '#da7756';
          ctx.fillRect(70 + i * 25, height - 28, 20, 15);
        }
      }

      // Start screen
      if (!g.started && !g.gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#da7756';
        ctx.font = 'bold 28px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('$CC INVADERS', width / 2, height / 2 - 60);

        ctx.fillStyle = '#e0e0e0';
        ctx.font = '14px "JetBrains Mono", monospace';
        ctx.fillText('← → or A D to move', width / 2, height / 2);
        ctx.fillText('SPACE to shoot', width / 2, height / 2 + 25);

        ctx.fillStyle = '#da7756';
        ctx.font = 'bold 16px "JetBrains Mono", monospace';
        ctx.fillText('Press any key to start', width / 2, height / 2 + 70);
        ctx.textAlign = 'left';
      }

      // Game over screen
      if (g.gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, width, height);

        ctx.textAlign = 'center';
        ctx.fillStyle = g.won ? '#4ade80' : '#ff4444';
        ctx.font = 'bold 32px "JetBrains Mono", monospace';
        ctx.fillText(g.won ? 'YOU WIN!' : 'GAME OVER', width / 2, height / 2 - 40);

        ctx.fillStyle = '#da7756';
        ctx.font = 'bold 20px "JetBrains Mono", monospace';
        ctx.fillText(`SCORE: ${g.score}`, width / 2, height / 2 + 10);

        if (g.score >= g.highScore && g.score > 0) {
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 16px "JetBrains Mono", monospace';
          ctx.fillText('NEW HIGH SCORE!', width / 2, height / 2 + 40);
        }

        ctx.fillStyle = '#e0e0e0';
        ctx.font = '14px "JetBrains Mono", monospace';
        ctx.fillText('Press ENTER to play again', width / 2, height / 2 + 80);
        ctx.textAlign = 'left';
      }
    };

    const loop = (time: number) => {
      update(time);
      render();
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationId);
    };
  }, [width, height, initAliens, resetGame]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border-2 border-claude-orange rounded-lg"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
