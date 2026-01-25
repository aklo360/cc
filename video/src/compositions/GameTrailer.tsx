import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  interpolate,
  Easing,
  Img,
  staticFile,
  spring,
  useVideoConfig,
} from "remotion";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GAME TRAILER - CC Invaders (Space Invaders style)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Recreates the actual game UI with:
 * - Black canvas background
 * - CC mascot as player ship
 * - 5x11 grid of green pixel aliens
 * - Animated bullets and explosions
 * - Score and lives display
 * - 3D cinematic camera movements
 */

const colors = {
  bgPrimary: "#0d0d0d",
  bgSecondary: "#1a1a1a",
  textPrimary: "#e0e0e0",
  textMuted: "#666666",
  claudeOrange: "#da7756",
  alienGreen: "#4ade80",
  bulletGreen: "#4ade80",
  bulletRed: "#ef4444",
  red: "#ff5f57",
  yellow: "#febc2e",
  green: "#28c840",
};

const fonts = {
  mono: "'JetBrains Mono', 'SF Mono', Monaco, monospace",
};

// ═══════════════════════════════════════════════════════════════════════════
// CAMERA SYSTEM - Same as WebappTrailer
// ═══════════════════════════════════════════════════════════════════════════

interface CameraPosition {
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  translateZ: number;
  translateX: number;
  translateY: number;
  scale: number;
}

const CAMERA_POSITIONS: Record<string, CameraPosition> = {
  intro: { rotateX: 18, rotateY: -12, rotateZ: 0, translateZ: 300, translateX: 0, translateY: 0, scale: 0.7 },
  gameplay: { rotateX: 5, rotateY: 0, rotateZ: 0, translateZ: -200, translateX: 0, translateY: 0, scale: 1.3 },
  action: { rotateX: 3, rotateY: 5, rotateZ: 0, translateZ: -350, translateX: 0, translateY: 100, scale: 2.0 },
  playerFocus: { rotateX: 2, rotateY: 0, rotateZ: 0, translateZ: -400, translateX: 0, translateY: -150, scale: 2.5 },
  aliensFocus: { rotateX: 2, rotateY: -3, rotateZ: 0, translateZ: -350, translateX: 0, translateY: 200, scale: 2.2 },
  explosion: { rotateX: 8, rotateY: 3, rotateZ: 0, translateZ: -100, translateX: 0, translateY: 0, scale: 1.1 },
  cta: { rotateX: 0, rotateY: 0, rotateZ: 0, translateZ: 100, translateX: 0, translateY: 0, scale: 1.0 },
};

function getCameraTransform(position: CameraPosition): string {
  return `
    perspective(1200px)
    rotateX(${position.rotateX}deg)
    rotateY(${position.rotateY}deg)
    rotateZ(${position.rotateZ}deg)
    translateZ(${position.translateZ}px)
    translateX(${position.translateX}px)
    translateY(${position.translateY}px)
    scale(${position.scale})
  `;
}

function interpolateCamera(from: CameraPosition, to: CameraPosition, progress: number): CameraPosition {
  return {
    rotateX: interpolate(progress, [0, 1], [from.rotateX, to.rotateX], { easing: Easing.inOut(Easing.cubic) }),
    rotateY: interpolate(progress, [0, 1], [from.rotateY, to.rotateY], { easing: Easing.inOut(Easing.cubic) }),
    rotateZ: interpolate(progress, [0, 1], [from.rotateZ, to.rotateZ], { easing: Easing.inOut(Easing.cubic) }),
    translateZ: interpolate(progress, [0, 1], [from.translateZ, to.translateZ], { easing: Easing.inOut(Easing.cubic) }),
    translateX: interpolate(progress, [0, 1], [from.translateX, to.translateX], { easing: Easing.inOut(Easing.cubic) }),
    translateY: interpolate(progress, [0, 1], [from.translateY, to.translateY], { easing: Easing.inOut(Easing.cubic) }),
    scale: interpolate(progress, [0, 1], [from.scale, to.scale], { easing: Easing.inOut(Easing.cubic) }),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ALIEN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const Alien: React.FC<{ x: number; y: number; alive: boolean; frame: number }> = ({ x, y, alive, frame }) => {
  if (!alive) return null;

  // Slight wobble animation
  const wobble = Math.sin(frame * 0.1 + x * 0.1) * 2;

  return (
    <div style={{
      position: "absolute",
      left: x,
      top: y + wobble,
      width: 30,
      height: 30,
      display: "grid",
      gridTemplateColumns: "repeat(5, 1fr)",
      gridTemplateRows: "repeat(4, 1fr)",
      gap: 1,
    }}>
      {/* Simple pixel alien shape */}
      {[
        0,1,0,1,0,
        1,1,1,1,1,
        1,0,1,0,1,
        0,1,0,1,0,
      ].map((pixel, i) => (
        <div key={i} style={{
          backgroundColor: pixel ? colors.alienGreen : "transparent",
          borderRadius: 1,
        }} />
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// BULLET COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const Bullet: React.FC<{ x: number; y: number; isPlayer: boolean }> = ({ x, y, isPlayer }) => (
  <div style={{
    position: "absolute",
    left: x,
    top: y,
    width: 6,
    height: 15,
    backgroundColor: isPlayer ? colors.bulletGreen : colors.bulletRed,
    borderRadius: 3,
    boxShadow: `0 0 10px ${isPlayer ? colors.bulletGreen : colors.bulletRed}`,
  }} />
);

// ═══════════════════════════════════════════════════════════════════════════
// EXPLOSION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const Explosion: React.FC<{ x: number; y: number; progress: number }> = ({ x, y, progress }) => {
  const scale = interpolate(progress, [0, 1], [0.5, 2]);
  const opacity = interpolate(progress, [0, 0.5, 1], [1, 1, 0]);

  return (
    <div style={{
      position: "absolute",
      left: x - 20,
      top: y - 20,
      width: 40,
      height: 40,
      borderRadius: "50%",
      background: `radial-gradient(circle, ${colors.claudeOrange} 0%, ${colors.bulletRed} 50%, transparent 70%)`,
      transform: `scale(${scale})`,
      opacity,
    }} />
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// GAME SCREEN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface GameState {
  playerX: number;
  aliens: { x: number; y: number; alive: boolean }[];
  bullets: { x: number; y: number; isPlayer: boolean }[];
  explosions: { x: number; y: number; startFrame: number }[];
  score: number;
  lives: number;
}

const GameScreen: React.FC<{ localFrame: number }> = ({ localFrame }) => {
  const { fps } = useVideoConfig();

  // Generate initial alien grid
  const initialAliens: { x: number; y: number; alive: boolean }[] = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 11; c++) {
      initialAliens.push({
        x: 50 + c * 35,
        y: 60 + r * 35,
        alive: true,
      });
    }
  }

  // Animate game state based on frame
  const playerX = 200 + Math.sin(localFrame * 0.05) * 80;

  // Aliens move left-right
  const alienOffset = Math.sin(localFrame * 0.03) * 30;

  // Kill some aliens over time
  const killSchedule = [
    { frame: 60, index: 49 },
    { frame: 90, index: 48 },
    { frame: 120, index: 47 },
    { frame: 150, index: 38 },
    { frame: 180, index: 37 },
    { frame: 210, index: 36 },
    { frame: 240, index: 27 },
    { frame: 270, index: 26 },
  ];

  const aliens = initialAliens.map((alien, i) => ({
    ...alien,
    x: alien.x + alienOffset,
    alive: !killSchedule.some(k => k.frame <= localFrame && k.index === i),
  }));

  // Player bullets
  const bullets: { x: number; y: number; isPlayer: boolean }[] = [];

  // Add player bullets periodically
  for (let i = 0; i < 10; i++) {
    const bulletFrame = i * 30 + 30;
    if (localFrame >= bulletFrame && localFrame < bulletFrame + 60) {
      const bulletY = 480 - (localFrame - bulletFrame) * 8;
      if (bulletY > 50) {
        bullets.push({
          x: playerX + 17,
          y: bulletY,
          isPlayer: true,
        });
      }
    }
  }

  // Add alien bullets
  for (let i = 0; i < 5; i++) {
    const bulletFrame = i * 50 + 80;
    if (localFrame >= bulletFrame && localFrame < bulletFrame + 80) {
      const bulletY = 200 + (localFrame - bulletFrame) * 5;
      if (bulletY < 520) {
        bullets.push({
          x: 100 + i * 80 + alienOffset,
          y: bulletY,
          isPlayer: false,
        });
      }
    }
  }

  // Explosions when aliens die
  const explosions = killSchedule
    .filter(k => localFrame >= k.frame && localFrame < k.frame + 20)
    .map(k => ({
      x: initialAliens[k.index].x + alienOffset,
      y: initialAliens[k.index].y,
      progress: (localFrame - k.frame) / 20,
    }));

  // Score increases with kills
  const score = killSchedule.filter(k => k.frame <= localFrame).length * 25;

  return (
    <div style={{
      width: 480,
      height: 600,
      backgroundColor: "#000",
      border: `2px solid ${colors.claudeOrange}`,
      borderRadius: 8,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* HUD - Score and Lives */}
      <div style={{
        position: "absolute",
        top: 10,
        left: 15,
        right: 15,
        display: "flex",
        justifyContent: "space-between",
        fontFamily: fonts.mono,
        fontSize: 14,
        color: colors.textPrimary,
        zIndex: 10,
      }}>
        <span>SCORE: <span style={{ color: colors.claudeOrange }}>{score}</span></span>
        <span>LIVES: <span style={{ color: colors.alienGreen }}>♥♥♥</span></span>
      </div>

      {/* Aliens */}
      {aliens.map((alien, i) => (
        <Alien key={i} x={alien.x} y={alien.y} alive={alien.alive} frame={localFrame} />
      ))}

      {/* Bullets */}
      {bullets.map((bullet, i) => (
        <Bullet key={`b${i}`} x={bullet.x} y={bullet.y} isPlayer={bullet.isPlayer} />
      ))}

      {/* Explosions */}
      {explosions.map((exp, i) => (
        <Explosion key={`e${i}`} x={exp.x} y={exp.y} progress={exp.progress} />
      ))}

      {/* Player (CC mascot) */}
      <div style={{
        position: "absolute",
        left: playerX,
        bottom: 60,
        width: 40,
        height: 40,
      }}>
        <Img src={staticFile("cc.png")} style={{ width: 40, height: 40 }} />
      </div>

      {/* "PRESS ANY KEY" blinking text at start */}
      {localFrame < 60 && (
        <div style={{
          position: "absolute",
          bottom: 20,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: fonts.mono,
          fontSize: 12,
          color: colors.textMuted,
          opacity: Math.sin(localFrame * 0.2) > 0 ? 1 : 0,
        }}>
          PRESS ANY KEY TO START
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// HEADER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const TerminalHeader: React.FC<{ title: string; tagline?: string }> = ({ title, tagline }) => (
  <div style={{
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 0",
    marginBottom: 24,
  }}>
    <div style={{ display: "flex", gap: 8 }}>
      <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: colors.red }} />
      <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: colors.yellow }} />
      <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: colors.green }} />
    </div>
    <Img src={staticFile("cc.png")} style={{ width: 24, height: 24 }} />
    <span style={{
      fontFamily: fonts.mono,
      fontSize: 14,
      fontWeight: 600,
      color: colors.claudeOrange,
    }}>
      {title}
    </span>
    {tagline && (
      <span style={{
        fontFamily: fonts.mono,
        fontSize: 11,
        color: colors.textMuted,
        marginLeft: "auto",
      }}>
        {tagline}
      </span>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// FOOTER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const Footer: React.FC = () => (
  <div style={{
    padding: "16px 0",
    marginTop: 24,
    textAlign: "center",
  }}>
    <span style={{
      fontFamily: fonts.mono,
      fontSize: 13,
      color: colors.claudeOrange,
    }}>
      ← back
    </span>
    <p style={{
      fontFamily: fonts.mono,
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 8,
    }}>
      claudecode.wtf · Defend the $CC realm
    </p>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// CTA SCENE
// ═══════════════════════════════════════════════════════════════════════════

const CTAScene: React.FC<{ localFrame: number }> = ({ localFrame }) => {
  const { fps } = useVideoConfig();

  const titleScale = spring({
    frame: localFrame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const urlOpacity = interpolate(localFrame, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{
      backgroundColor: colors.bgPrimary,
      justifyContent: "center",
      alignItems: "center",
    }}>
      <div style={{
        textAlign: "center",
        transform: `scale(${titleScale})`,
      }}>
        <Img src={staticFile("cc.png")} style={{ width: 80, height: 80, marginBottom: 24 }} />
        <h1 style={{
          fontFamily: fonts.mono,
          fontSize: 48,
          color: colors.claudeOrange,
          margin: 0,
          marginBottom: 16,
        }}>
          PLAY NOW
        </h1>
        <p style={{
          fontFamily: fonts.mono,
          fontSize: 24,
          color: colors.textPrimary,
          opacity: urlOpacity,
        }}>
          claudecode.wtf/play
        </p>
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPOSITION
// ═══════════════════════════════════════════════════════════════════════════

export const GameTrailer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Timeline (20 seconds = 600 frames at 30fps):
  // 0-60: Intro (tilted view)
  // 60-180: Gameplay wide shot
  // 180-270: Action zoom on player
  // 270-360: Zoom on aliens getting destroyed
  // 360-450: Intense action
  // 450-510: Pull back
  // 510-600: CTA

  // Determine current scene and camera
  let camera: CameraPosition;

  if (frame < 60) {
    // Intro
    const progress = frame / 60;
    camera = interpolateCamera(CAMERA_POSITIONS.intro, CAMERA_POSITIONS.gameplay, progress);
  } else if (frame < 180) {
    // Gameplay
    const progress = (frame - 60) / 120;
    camera = interpolateCamera(CAMERA_POSITIONS.gameplay, CAMERA_POSITIONS.action, progress);
  } else if (frame < 270) {
    // Player focus
    const progress = (frame - 180) / 90;
    camera = interpolateCamera(CAMERA_POSITIONS.action, CAMERA_POSITIONS.playerFocus, progress);
  } else if (frame < 360) {
    // Aliens focus
    const progress = (frame - 270) / 90;
    camera = interpolateCamera(CAMERA_POSITIONS.playerFocus, CAMERA_POSITIONS.aliensFocus, progress);
  } else if (frame < 450) {
    // Explosions
    const progress = (frame - 360) / 90;
    camera = interpolateCamera(CAMERA_POSITIONS.aliensFocus, CAMERA_POSITIONS.explosion, progress);
  } else if (frame < 510) {
    // Pull back
    const progress = (frame - 450) / 60;
    camera = interpolateCamera(CAMERA_POSITIONS.explosion, CAMERA_POSITIONS.cta, progress);
  } else {
    camera = CAMERA_POSITIONS.cta;
  }

  const showCTA = frame >= 510;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgPrimary }}>
      {/* 3D Camera Container */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        transform: getCameraTransform(camera),
        transformStyle: "preserve-3d",
        opacity: showCTA ? 0 : 1,
        transition: "opacity 0.3s",
      }}>
        {/* Terminal Window */}
        <div style={{
          width: 520,
          padding: 20,
          backgroundColor: colors.bgSecondary,
          borderRadius: 12,
          border: `1px solid ${colors.claudeOrange}33`,
          boxShadow: `
            0 0 60px ${colors.claudeOrange}22,
            0 25px 50px rgba(0,0,0,0.5),
            inset 0 0 60px rgba(0,0,0,0.3)
          `,
        }}>
          <TerminalHeader title="$CC Invaders" tagline="Classic Arcade Style" />

          {/* Game Screen */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <GameScreen localFrame={frame} />
          </div>

          <Footer />
        </div>
      </div>

      {/* CTA Scene */}
      {showCTA && (
        <Sequence from={510}>
          <CTAScene localFrame={frame - 510} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
