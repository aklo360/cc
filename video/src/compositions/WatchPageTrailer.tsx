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
 * WATCH PAGE TRAILER - 24/7 Livestream & Trade Reactions
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Showcases the /watch page with:
 * - 90s chatroom aesthetic with ASCII art
 * - Live dev logs scrolling
 * - Trade reactions (💚 buys, 🔻 sells) with personality
 * - Thinking session with insight discovery
 * - Real-time feel with terminal glow
 *
 * 15 seconds (450 frames @ 30fps)
 */

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS - Exact match to /watch page
// ═══════════════════════════════════════════════════════════════════════════

const colors = {
  bgPrimary: "#0d0d0d",
  bgSecondary: "#1a1a1a",
  bgTertiary: "#262626",
  textPrimary: "#e0e0e0",
  textSecondary: "#a0a0a0",
  textMuted: "#666666",
  claudeOrange: "#da7756",
  claudeOrangeDim: "#b8654a",
  green: "#4ade80",
  red: "#ef4444",
  yellow: "#fbbf24",
  purple: "#a78bfa",
  amber: "#f59e0b",
  cyan: "#22d3ee",
  trafficRed: "#ff5f57",
  trafficYellow: "#febc2e",
  trafficGreen: "#28c840",
  border: "#333333",
  terminalGlow: "rgba(218, 119, 86, 0.15)",
};

const fonts = {
  mono: "'JetBrains Mono', 'SF Mono', Monaco, monospace",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// ═══════════════════════════════════════════════════════════════════════════
// ASCII ART
// ═══════════════════════════════════════════════════════════════════════════

const ASCII_THINKING = `  ┌─────────────────────────────────┐
  │  (◉_◉) THINKING SESSION ACTIVE  │
  └─────────────────────────────────┘`;

const ASCII_INSIGHT = `  ★═══════════════════════════════★
  ║   ✧ INSIGHT DISCOVERED ✧      ║
  ★═══════════════════════════════★`;

const ASCII_DIVIDER = "▀▄▀▄▀▄▀▄▀▄▀▄▀▄▀▄▀▄▀▄▀▄▀▄▀▄▀▄▀▄▀▄▀▄▀▄";

// ═══════════════════════════════════════════════════════════════════════════
// MOCK LOG DATA
// ═══════════════════════════════════════════════════════════════════════════

interface LogEntry {
  time: string;
  msg: string;
  type: "system" | "build" | "buy" | "sell" | "divider" | "thinking" | "banner" | "insight";
}

const TRAILER_LOGS: LogEntry[] = [
  { time: "12:34:56", msg: "--- Connected to Central Brain ---", type: "system" },
  { time: "12:34:57", msg: "🔧 [BUILDING] Implementing space invaders...", type: "build" },
  { time: "12:34:58", msg: "💚 someone just grabbed some $CC 👀", type: "buy" },
  { time: "12:34:59", msg: "💚 nice bag 👀 (125K $CC)", type: "buy" },
  { time: "12:35:00", msg: "💚 whale alert 🐋 (500K $CC)", type: "buy" },
  { time: "12:35:01", msg: ASCII_DIVIDER, type: "divider" },
  { time: "12:35:02", msg: "thinking: starting reasoning session", type: "thinking" },
  { time: "12:35:03", msg: "★═══════════════════════════════★", type: "banner" },
  { time: "12:35:04", msg: "║   ✧ INSIGHT DISCOVERED ✧      ║", type: "banner" },
  { time: "12:35:05", msg: "★═══════════════════════════════★", type: "banner" },
  { time: "12:35:06", msg: "insight: coordinate-based architecture prevents race conditions", type: "insight" },
  { time: "12:35:07", msg: "🔻 paper hands gonna paper hand", type: "sell" },
  { time: "12:35:08", msg: "💚 another one joins the cult", type: "buy" },
  { time: "12:35:09", msg: "💚 the conviction is strong with this one", type: "buy" },
];

// ═══════════════════════════════════════════════════════════════════════════
// CAMERA SYSTEM
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
  intro: { rotateX: 15, rotateY: -8, rotateZ: 0, translateZ: 200, translateX: 0, translateY: 0, scale: 0.75 },
  logsStart: { rotateX: 5, rotateY: 0, rotateZ: 0, translateZ: -100, translateX: 200, translateY: 50, scale: 1.3 },
  tradeReactions: { rotateX: 3, rotateY: 0, rotateZ: 0, translateZ: -150, translateX: 250, translateY: 0, scale: 1.4 },
  thinking: { rotateX: 4, rotateY: 2, rotateZ: 0, translateZ: -120, translateX: 220, translateY: -50, scale: 1.35 },
  moreTrades: { rotateX: 3, rotateY: -2, rotateZ: 0, translateZ: -130, translateX: 230, translateY: 30, scale: 1.35 },
  fullView: { rotateX: 10, rotateY: -5, rotateZ: 0, translateZ: 100, translateX: 0, translateY: 0, scale: 0.85 },
  cta: { rotateX: 0, rotateY: 0, rotateZ: 0, translateZ: 0, translateX: 0, translateY: 0, scale: 1.0 },
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
// HEADER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const Header: React.FC<{ pulseFrame: number }> = ({ pulseFrame }) => {
  const pulseOpacity = interpolate(
    Math.sin(pulseFrame * 0.15),
    [-1, 1],
    [0.5, 1]
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      {/* Traffic lights */}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: colors.trafficRed }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: colors.trafficYellow }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: colors.trafficGreen }} />
      </div>

      {/* CC Logo */}
      <Img src={staticFile("cc.png")} style={{ width: 24, height: 24 }} />

      {/* Title */}
      <span
        style={{
          fontFamily: fonts.mono,
          fontSize: 14,
          fontWeight: 600,
          color: colors.claudeOrange,
        }}
      >
        Watch Dev Cook
      </span>

      {/* LIVE badge with pulse */}
      <span
        style={{
          backgroundColor: `rgba(74, 222, 128, ${0.2 + pulseOpacity * 0.3})`,
          color: colors.green,
          fontSize: 10,
          padding: "4px 12px",
          borderRadius: 999,
          fontWeight: 600,
          textTransform: "uppercase",
          fontFamily: fonts.sans,
          boxShadow: `0 0 ${10 + pulseOpacity * 10}px rgba(74, 222, 128, ${pulseOpacity * 0.5})`,
        }}
      >
        LIVE
      </span>

      <div style={{ flex: 1 }} />

      <span
        style={{
          fontFamily: fonts.mono,
          fontSize: 11,
          color: colors.textMuted,
        }}
      >
        Real-time build logs
      </span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// STATS PANEL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const StatsPanel: React.FC<{ featuresShipped: number }> = ({ featuresShipped }) => (
  <div
    style={{
      backgroundColor: colors.bgSecondary,
      border: `1px solid ${colors.claudeOrange}33`,
      borderRadius: 8,
      padding: 16,
      width: 260,
    }}
  >
    {/* Features shipped */}
    <div style={{ marginBottom: 16 }}>
      <h2
        style={{
          fontFamily: fonts.sans,
          fontSize: 11,
          color: colors.textSecondary,
          marginBottom: 8,
          textTransform: "uppercase",
        }}
      >
        FEATURES SHIPPED
      </h2>
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 48,
          fontWeight: 700,
          color: colors.claudeOrange,
        }}
      >
        {featuresShipped}
      </div>
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 11,
          color: colors.textMuted,
        }}
      >
        autonomous builds
      </div>
    </div>

    {/* Status */}
    <div
      style={{
        borderTop: `1px solid ${colors.border}`,
        paddingTop: 16,
      }}
    >
      <h2
        style={{
          fontFamily: fonts.sans,
          fontSize: 11,
          color: colors.textSecondary,
          marginBottom: 8,
          textTransform: "uppercase",
        }}
      >
        STATUS
      </h2>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span
          style={{
            backgroundColor: `${colors.green}33`,
            color: colors.green,
            fontSize: 10,
            padding: "2px 8px",
            borderRadius: 4,
            fontWeight: 600,
          }}
        >
          BUILDING
        </span>
      </div>
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 14,
          fontWeight: 700,
          color: colors.claudeOrange,
        }}
      >
        "CC Invaders v2"
      </div>
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 11,
          color: colors.textSecondary,
        }}
      >
        /play
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// LOG ENTRY COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const LogEntry: React.FC<{
  log: LogEntry;
  localFrame: number;
  index: number;
}> = ({ log, localFrame, index }) => {
  // Fade in animation
  const opacity = interpolate(
    localFrame,
    [0, 8],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  const translateY = interpolate(
    localFrame,
    [0, 8],
    [10, 0],
    { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );

  // Color based on type
  let textColor = colors.textPrimary;
  let prefix = "";
  let fontStyle: "normal" | "italic" = "normal";

  switch (log.type) {
    case "system":
      textColor = colors.claudeOrange;
      break;
    case "build":
      textColor = colors.claudeOrange;
      break;
    case "buy":
      textColor = colors.green;
      prefix = "[trade] ";
      break;
    case "sell":
      textColor = colors.red;
      prefix = "[trade] ";
      break;
    case "divider":
      textColor = `${colors.claudeOrange}99`;
      break;
    case "thinking":
      textColor = "#fdba74"; // orange-300
      fontStyle = "italic";
      break;
    case "banner":
      textColor = colors.yellow;
      break;
    case "insight":
      textColor = "#fde047"; // yellow-300
      prefix = "★ ";
      break;
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        fontSize: 13,
        alignItems: "flex-start",
        opacity,
        transform: `translateY(${translateY}px)`,
        marginBottom: log.type === "banner" ? 2 : 6,
      }}
    >
      <span
        style={{
          fontFamily: fonts.mono,
          color: colors.textMuted,
          flexShrink: 0,
        }}
      >
        {log.time}
      </span>
      <span
        style={{
          fontFamily: fonts.mono,
          color: textColor,
          fontStyle,
        }}
      >
        {prefix && (
          <span style={{ opacity: 0.7, fontSize: 11 }}>{prefix}</span>
        )}
        {log.msg}
      </span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// LOG TERMINAL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const LogTerminal: React.FC<{
  frame: number;
  visibleLogCount: number;
}> = ({ frame, visibleLogCount }) => {
  // Calculate which logs to show based on frame
  const logsToShow = TRAILER_LOGS.slice(0, visibleLogCount);

  // Pulsing border glow
  const glowIntensity = interpolate(
    Math.sin(frame * 0.1),
    [-1, 1],
    [0.3, 0.6]
  );

  return (
    <div
      style={{
        backgroundColor: "#000",
        border: `2px solid ${colors.claudeOrange}80`,
        borderRadius: 8,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: `0 0 30px rgba(218, 119, 86, ${glowIntensity})`,
      }}
    >
      {/* Terminal header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          borderBottom: `2px solid ${colors.claudeOrange}50`,
          background: `linear-gradient(to right, rgba(154, 52, 18, 0.2), transparent, rgba(154, 52, 18, 0.2))`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              color: colors.claudeOrange,
              fontSize: 14,
            }}
          >
            ◉
          </span>
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: 12,
              color: colors.claudeOrange,
              letterSpacing: "0.05em",
            }}
          >
            dev logs
          </span>
          <span
            style={{
              color: colors.claudeOrange,
              fontSize: 14,
            }}
          >
            ◉
          </span>
        </div>
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 10,
            color: `${colors.claudeOrange}99`,
          }}
        >
          {logsToShow.length} msgs
        </span>
      </div>

      {/* Logs container */}
      <div
        style={{
          flex: 1,
          padding: 16,
          overflowY: "hidden",
        }}
      >
        {logsToShow.map((log, index) => {
          // Calculate local frame for each log entry (staggered appearance)
          const logAppearFrame = index * 25; // Each log appears 25 frames after the previous
          const localFrame = Math.max(0, frame - 45 - logAppearFrame); // Start after intro

          return (
            <LogEntry
              key={index}
              log={log}
              localFrame={localFrame}
              index={index}
            />
          );
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// WATCH PAGE SCREEN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const WatchPageScreen: React.FC<{
  frame: number;
  showStats: boolean;
  visibleLogCount: number;
}> = ({ frame, showStats, visibleLogCount }) => (
  <div
    style={{
      width: 1200,
      height: 700,
      backgroundColor: colors.bgPrimary,
      borderRadius: 12,
      border: `1px solid ${colors.claudeOrange}33`,
      boxShadow: `
        0 0 80px ${colors.claudeOrange}22,
        0 25px 50px rgba(0,0,0,0.5),
        inset 0 0 60px rgba(0,0,0,0.3)
      `,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}
  >
    {/* Header */}
    <Header pulseFrame={frame} />

    {/* Content area */}
    <div
      style={{
        flex: 1,
        display: "flex",
        gap: 24,
        padding: 24,
      }}
    >
      {/* Stats panel (left) - conditionally visible */}
      {showStats && (
        <div
          style={{
            opacity: interpolate(
              frame,
              [270, 290],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            ),
          }}
        >
          <StatsPanel featuresShipped={25} />
        </div>
      )}

      {/* Log terminal (right/main) */}
      <LogTerminal frame={frame} visibleLogCount={visibleLogCount} />
    </div>
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

  const urlOpacity = interpolate(localFrame, [15, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const taglineOpacity = interpolate(localFrame, [25, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bgPrimary,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          textAlign: "center",
          transform: `scale(${titleScale})`,
        }}
      >
        <Img src={staticFile("cc.png")} style={{ width: 80, height: 80, marginBottom: 24 }} />
        <h1
          style={{
            fontFamily: fonts.mono,
            fontSize: 48,
            color: colors.claudeOrange,
            margin: 0,
            marginBottom: 16,
          }}
        >
          Watch me cook 24/7 live
        </h1>
        <p
          style={{
            fontFamily: fonts.mono,
            fontSize: 24,
            color: colors.textPrimary,
            opacity: urlOpacity,
            marginBottom: 12,
          }}
        >
          claudecode.wtf/watch
        </p>
        <p
          style={{
            fontFamily: fonts.mono,
            fontSize: 16,
            color: colors.textMuted,
            opacity: taglineOpacity,
          }}
        >
          24/7 dev logs • live trade reactions • exposed reasoning
        </p>
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPOSITION
// ═══════════════════════════════════════════════════════════════════════════

export const WatchPageTrailer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ═══════════════════════════════════════════════════════════════════════════
  // TIMELINE (450 frames = 15 seconds @ 30fps)
  // ═══════════════════════════════════════════════════════════════════════════
  // 0-45:    INTRO - Header animates in, LIVE badge pulses (1.5s)
  // 45-120:  LOGS START - Dev logs appear one by one (2.5s)
  // 120-210: TRADE REACTIONS - Green buys flow in (3s)
  // 210-300: THINKING - ASCII banner, insight discovered (3s)
  // 300-360: MORE TRADES - Mix of buys/sells (2s)
  // 360-405: FULL VIEW - Camera pulls back, stats visible (1.5s)
  // 405-450: CTA - "watch the brain work" + URL (1.5s)

  const INTRO_END = 45;
  const LOGS_START_END = 120;
  const TRADES_END = 210;
  const THINKING_END = 300;
  const MORE_TRADES_END = 360;
  const FULL_VIEW_END = 405;

  // Calculate visible log count based on frame
  let visibleLogCount = 0;
  if (frame >= 45) {
    // Each log appears every ~25 frames
    visibleLogCount = Math.min(
      TRAILER_LOGS.length,
      Math.floor((frame - 45) / 25) + 1
    );
  }

  // Show stats panel earlier (at ~9 seconds / frame 270) so it's visible longer
  const showStats = frame >= 270;

  // Camera animation
  let camera: CameraPosition;

  if (frame < INTRO_END) {
    // Intro → logs start
    const progress = frame / INTRO_END;
    camera = interpolateCamera(CAMERA_POSITIONS.intro, CAMERA_POSITIONS.logsStart, progress);
  } else if (frame < LOGS_START_END) {
    // Logs start → trade reactions
    const progress = (frame - INTRO_END) / (LOGS_START_END - INTRO_END);
    camera = interpolateCamera(CAMERA_POSITIONS.logsStart, CAMERA_POSITIONS.tradeReactions, progress);
  } else if (frame < TRADES_END) {
    // Trade reactions → thinking
    const progress = (frame - LOGS_START_END) / (TRADES_END - LOGS_START_END);
    camera = interpolateCamera(CAMERA_POSITIONS.tradeReactions, CAMERA_POSITIONS.thinking, progress);
  } else if (frame < THINKING_END) {
    // Thinking → more trades
    const progress = (frame - TRADES_END) / (THINKING_END - TRADES_END);
    camera = interpolateCamera(CAMERA_POSITIONS.thinking, CAMERA_POSITIONS.moreTrades, progress);
  } else if (frame < MORE_TRADES_END) {
    // More trades → full view
    const progress = (frame - THINKING_END) / (MORE_TRADES_END - THINKING_END);
    camera = interpolateCamera(CAMERA_POSITIONS.moreTrades, CAMERA_POSITIONS.fullView, progress);
  } else if (frame < FULL_VIEW_END) {
    // Stay at full view
    camera = CAMERA_POSITIONS.fullView;
  } else {
    camera = CAMERA_POSITIONS.cta;
  }

  const showCTA = frame >= FULL_VIEW_END;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgPrimary }}>
      {/* 3D Camera Container */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          transform: getCameraTransform(camera),
          transformStyle: "preserve-3d",
          opacity: showCTA ? 0 : 1,
          transition: "opacity 0.3s",
        }}
      >
        <WatchPageScreen
          frame={frame}
          showStats={showStats}
          visibleLogCount={visibleLogCount}
        />
      </div>

      {/* CTA Scene */}
      {showCTA && (
        <Sequence from={FULL_VIEW_END}>
          <CTAScene localFrame={frame - FULL_VIEW_END} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

export default WatchPageTrailer;
