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
 * NEURAL NETWORK GENESIS TRAILER - On-Chain Gacha
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Camera follows cursor action precisely - zooms into exactly what user is doing.
 * Results appear as mini pop-ups for dramatic effect.
 */

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════

const colors = {
  bgPrimary: "#0d0d0d",
  bgSecondary: "#1a1a1a",
  bgTertiary: "#262626",
  textPrimary: "#e0e0e0",
  textSecondary: "#a0a0a0",
  textMuted: "#666666",
  claudeOrange: "#da7756",
  accentGreen: "#4ade80",
  red: "#ff5f57",
  yellow: "#febc2e",
  green: "#28c840",
  border: "#333333",
  tierBasic: "#9ca3af",
  tierAdvanced: "#60a5fa",
  tierElite: "#c084fc",
  tierLegendary: "#fbbf24",
};

const fonts = {
  mono: "'JetBrains Mono', 'SF Mono', Monaco, monospace",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

type NeuronTier = "Basic" | "Advanced" | "Elite" | "Legendary";

export interface NeuralGenesisTrailerProps {
  featureName?: string;
  featureSlug?: string;
  results?: NeuronTier[];
}

const TIER_DATA: Record<NeuronTier, { prob: number; multiplier: number; color: string; emoji: string }> = {
  Basic: { prob: 75, multiplier: 0.4, color: colors.tierBasic, emoji: "⚪" },
  Advanced: { prob: 18, multiplier: 2, color: colors.tierAdvanced, emoji: "🔷" },
  Elite: { prob: 6, multiplier: 4, color: colors.tierElite, emoji: "⚡" },
  Legendary: { prob: 1, multiplier: 7, color: colors.tierLegendary, emoji: "🧠" },
};

// ═══════════════════════════════════════════════════════════════════════════
// CURSOR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const Cursor: React.FC<{ x: number; y: number; clicking?: boolean }> = ({ x, y, clicking = false }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: 24,
      height: 24,
      zIndex: 100,
      transform: "translate(-2px, -2px)",
    }}
  >
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      style={{ transform: clicking ? "scale(0.85)" : "scale(1)" }}
    >
      <path
        d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35Z"
        fill="#fff"
        stroke="#000"
        strokeWidth="1.5"
      />
    </svg>
    {clicking && (
      <div
        style={{
          position: "absolute",
          left: 4,
          top: 4,
          width: 20,
          height: 20,
          borderRadius: "50%",
          backgroundColor: colors.claudeOrange,
          opacity: 0.6,
          transform: "scale(1.8)",
        }}
      />
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// CONFETTI COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const Confetti: React.FC<{ localFrame: number }> = ({ localFrame }) => {
  const particles = Array.from({ length: 60 }, (_, i) => {
    const startX = Math.random() * 100;
    const delay = i * 0.4;
    const size = 8 + Math.random() * 8;
    const colorIndex = Math.floor(Math.random() * 4);
    const particleColors = [colors.claudeOrange, colors.accentGreen, colors.tierLegendary, colors.tierElite];

    const y = interpolate(localFrame - delay, [0, 80], [-20, 800], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const rotation = (localFrame - delay) * 15;
    const opacity = interpolate(localFrame - delay, [50, 80], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: `${startX}%`,
          top: y,
          width: size,
          height: size,
          backgroundColor: particleColors[colorIndex],
          transform: `rotate(${rotation}deg)`,
          opacity,
        }}
      />
    );
  });

  return <>{particles}</>;
};

// ═══════════════════════════════════════════════════════════════════════════
// RESULT POP-UP COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const ResultPopup: React.FC<{
  tier: NeuronTier;
  index: number;
  localFrame: number;
  totalResults: number;
}> = ({ tier, index, localFrame, totalResults }) => {
  const { fps } = useVideoConfig();
  const tierData = TIER_DATA[tier];
  const payout = Math.floor(5000 * tierData.multiplier);
  const netProfit = payout - 5000;

  // Stagger appearance
  const appearFrame = index * 8;
  const framesSinceAppear = localFrame - appearFrame;

  if (framesSinceAppear < 0) return null;

  const scale = spring({
    frame: framesSinceAppear,
    fps,
    config: { damping: 10, stiffness: 150 },
  });

  // Position in a grid pattern around center
  const cols = 5;
  const row = Math.floor(index / cols);
  const col = index % cols;
  const centerX = 960;
  const centerY = 540;
  const spacing = 180;
  const x = centerX + (col - 2) * spacing;
  const y = centerY + (row - 0.5) * spacing;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${scale})`,
        backgroundColor: colors.bgSecondary,
        border: `2px solid ${tierData.color}`,
        borderRadius: 12,
        padding: "16px 24px",
        textAlign: "center",
        boxShadow: `0 0 30px ${tierData.color}44, 0 10px 40px rgba(0,0,0,0.5)`,
        zIndex: 50 + index,
      }}
    >
      <div style={{ fontSize: 36, marginBottom: 8 }}>{tierData.emoji}</div>
      <div
        style={{
          fontFamily: fonts.sans,
          fontSize: 18,
          fontWeight: 700,
          color: tierData.color,
          marginBottom: 4,
        }}
      >
        {tier}
      </div>
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 14,
          fontWeight: 600,
          color: netProfit >= 0 ? colors.accentGreen : "#f87171",
        }}
      >
        {netProfit >= 0 ? "+" : ""}{netProfit.toLocaleString()} $CC
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// HEADER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const Header: React.FC<{ walletConnected: boolean; ccBalance: number }> = ({ walletConnected, ccBalance }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", marginBottom: 16 }}>
    <div style={{ display: "flex", gap: 8 }}>
      <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: colors.red }} />
      <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: colors.yellow }} />
      <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: colors.green }} />
    </div>
    <Img src={staticFile("cc.png")} style={{ width: 24, height: 24 }} />
    <span style={{ fontFamily: fonts.mono, fontSize: 14, fontWeight: 600, color: colors.claudeOrange }}>
      Neural Network Genesis
    </span>
    <div style={{ flex: 1 }} />
    {walletConnected ? (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.claudeOrange, fontWeight: 600 }}>
          {ccBalance.toLocaleString()} $CC
        </span>
        <div
          style={{
            backgroundColor: colors.bgSecondary,
            border: `1px solid ${colors.border}`,
            padding: "8px 16px",
            borderRadius: 6,
            fontFamily: fonts.mono,
            fontSize: 13,
            color: colors.textPrimary,
          }}
        >
          9xK2...fG7h
        </div>
      </div>
    ) : (
      <div
        style={{
          backgroundColor: colors.claudeOrange,
          padding: "8px 24px",
          borderRadius: 6,
          fontFamily: fonts.sans,
          fontSize: 13,
          fontWeight: 600,
          color: "#fff",
        }}
      >
        Connect Wallet
      </div>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// TIER GRID
// ═══════════════════════════════════════════════════════════════════════════

const TierGrid: React.FC = () => (
  <div
    style={{
      backgroundColor: colors.bgSecondary,
      border: `1px solid ${colors.border}`,
      borderRadius: 8,
      padding: 16,
      marginBottom: 16,
    }}
  >
    <h2 style={{ fontFamily: fonts.sans, fontSize: 16, fontWeight: 600, color: colors.textPrimary, marginBottom: 12 }}>
      Cryptographic Neural Evolution
    </h2>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
      {(["Basic", "Advanced", "Elite", "Legendary"] as NeuronTier[]).map((tier) => (
        <div
          key={tier}
          style={{
            backgroundColor: colors.bgPrimary,
            border: `1px solid ${colors.border}`,
            borderRadius: 6,
            padding: 12,
            textAlign: "center",
          }}
        >
          <div style={{ fontFamily: fonts.sans, fontSize: 10, color: colors.textMuted, marginBottom: 4, textTransform: "uppercase" }}>
            {tier} ({TIER_DATA[tier].prob}%)
          </div>
          <div style={{ fontFamily: fonts.mono, fontSize: 18, fontWeight: 700, color: TIER_DATA[tier].color }}>
            {TIER_DATA[tier].multiplier}x
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// SAMPLE SIZE SELECTOR
// ═══════════════════════════════════════════════════════════════════════════

const SampleSizeSelector: React.FC<{ selected: 1 | 10 }> = ({ selected }) => (
  <div
    style={{
      backgroundColor: colors.bgSecondary,
      border: `1px solid ${colors.border}`,
      borderRadius: 8,
      padding: 16,
      marginBottom: 16,
    }}
  >
    <label style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12, display: "block" }}>
      Select Sample Size
    </label>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <div
        style={{
          padding: "20px 16px",
          borderRadius: 8,
          border: `2px solid ${selected === 1 ? colors.claudeOrange : colors.border}`,
          backgroundColor: selected === 1 ? `${colors.claudeOrange}15` : colors.bgPrimary,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 6 }}>🔬</div>
        <div style={{ fontFamily: fonts.sans, fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>Single Sample</div>
        <div style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted }}>5,000 $CC</div>
      </div>
      <div
        style={{
          padding: "20px 16px",
          borderRadius: 8,
          border: `2px solid ${selected === 10 ? colors.claudeOrange : colors.border}`,
          backgroundColor: selected === 10 ? `${colors.claudeOrange}15` : colors.bgPrimary,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 6 }}>🧬</div>
        <div style={{ fontFamily: fonts.sans, fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>10-Sample Batch</div>
        <div style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted }}>50,000 $CC total</div>
        <div style={{ fontFamily: fonts.sans, fontSize: 10, color: colors.accentGreen, fontWeight: 600, marginTop: 6 }}>✓ Guaranteed Advanced+</div>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// EVOLUTION ANIMATION
// ═══════════════════════════════════════════════════════════════════════════

const EvolutionAnimation: React.FC<{ progress: number; message: string }> = ({ progress, message }) => (
  <div
    style={{
      backgroundColor: colors.bgSecondary,
      border: `2px solid ${colors.claudeOrange}`,
      borderRadius: 8,
      padding: 32,
      marginBottom: 16,
      boxShadow: `0 0 40px ${colors.claudeOrange}33`,
    }}
  >
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.textSecondary, marginBottom: 12 }}>{message}</div>
      <div style={{ fontFamily: fonts.mono, fontSize: 56, fontWeight: 700, color: colors.claudeOrange, marginBottom: 16 }}>
        {Math.floor(progress)}%
      </div>
      <div style={{ width: "100%", height: 10, backgroundColor: colors.bgPrimary, borderRadius: 5, overflow: "hidden" }}>
        <div style={{ width: `${progress}%`, height: "100%", backgroundColor: colors.claudeOrange, borderRadius: 5 }} />
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// INITIATE BUTTON
// ═══════════════════════════════════════════════════════════════════════════

const InitiateButton: React.FC<{ text: string; disabled?: boolean }> = ({ text, disabled = false }) => (
  <div
    style={{
      width: "100%",
      backgroundColor: disabled ? colors.bgTertiary : colors.claudeOrange,
      color: disabled ? colors.textMuted : "#fff",
      fontFamily: fonts.sans,
      fontSize: 16,
      fontWeight: 700,
      padding: "18px 24px",
      borderRadius: 6,
      textAlign: "center",
      opacity: disabled ? 0.5 : 1,
      marginBottom: 16,
    }}
  >
    {text}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// TOTAL GAINED DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

const TotalGainedDisplay: React.FC<{ totalProfit: number; localFrame: number }> = ({ totalProfit, localFrame }) => {
  const { fps } = useVideoConfig();

  const scale = spring({ frame: localFrame, fps, config: { damping: 10, stiffness: 120 } });
  const isProfit = totalProfit >= 0;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: 80,
        transform: `translateX(-50%) scale(${scale})`,
        backgroundColor: colors.bgSecondary,
        border: `3px solid ${isProfit ? colors.accentGreen : "#f87171"}`,
        borderRadius: 16,
        padding: "24px 48px",
        textAlign: "center",
        boxShadow: `0 0 60px ${isProfit ? colors.accentGreen : "#f87171"}44, 0 20px 60px rgba(0,0,0,0.6)`,
        zIndex: 200,
      }}
    >
      <div style={{ fontFamily: fonts.sans, fontSize: 16, color: colors.textSecondary, marginBottom: 8 }}>
        {isProfit ? "TOTAL PROFIT" : "NET LOSS"}
      </div>
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 48,
          fontWeight: 700,
          color: isProfit ? colors.accentGreen : "#f87171",
        }}
      >
        {isProfit ? "+" : ""}{totalProfit.toLocaleString()} $CC
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// CTA SCENE
// ═══════════════════════════════════════════════════════════════════════════

const CTAScene: React.FC<{ localFrame: number; featureSlug: string }> = ({ localFrame, featureSlug }) => {
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame: localFrame, fps, config: { damping: 12, stiffness: 100 } });
  const urlOpacity = interpolate(localFrame, [15, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgPrimary, justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center", transform: `scale(${titleScale})` }}>
        <Img src={staticFile("cc.png")} style={{ width: 100, height: 100, marginBottom: 32 }} />
        <h1 style={{ fontFamily: fonts.mono, fontSize: 56, color: colors.claudeOrange, margin: 0, marginBottom: 20 }}>
          TRAIN YOUR NEURAL NETWORK
        </h1>
        <p style={{ fontFamily: fonts.mono, fontSize: 28, color: colors.textPrimary, opacity: urlOpacity }}>
          claudecode.wtf/{featureSlug}
        </p>
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPOSITION
// ═══════════════════════════════════════════════════════════════════════════

export const NeuralGenesisTrailer: React.FC<NeuralGenesisTrailerProps> = ({
  featureName = "Neural Network Genesis",
  featureSlug = "neural",
  results = ["Basic", "Advanced", "Basic", "Basic", "Elite", "Basic", "Basic", "Advanced", "Basic", "Legendary"],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ═══════════════════════════════════════════════════════════════════════════
  // TIMELINE (450 frames = 15 seconds @ 30fps)
  // ═══════════════════════════════════════════════════════════════════════════
  // 0-50:    INTRO - Wide shot, zoom to wallet button
  // 50-80:   CONNECT - Click wallet, connected
  // 80-130:  SELECT - Zoom to batch button, click it
  // 130-170: INITIATE - Zoom to button, click it
  // 170-230: EVOLVE - Show progress animation (shorter!)
  // 230-360: RESULTS - Pop-ups appear one by one
  // 360-390: CELEBRATE - Legendary confetti burst + total
  // 390-450: CTA

  const CONNECT_START = 50;
  const SELECT_START = 80;
  const INITIATE_START = 130;
  const EVOLVE_START = 170;
  const RESULTS_START = 230;
  const CELEBRATE_START = 360;
  const CTA_START = 390;

  // State
  const walletConnected = frame >= CONNECT_START + 15;
  const batchSelected = frame >= SELECT_START + 25;
  const showEvolution = frame >= EVOLVE_START && frame < RESULTS_START;
  const showResults = frame >= RESULTS_START && frame < CTA_START;
  const showCTA = frame >= CTA_START;

  // Evolution progress
  const evolutionProgress = interpolate(frame, [EVOLVE_START, RESULTS_START - 10], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Evolution messages
  let evolutionMessage = "NEURAL EVOLUTION IN PROGRESS";
  if (frame >= EVOLVE_START && frame < EVOLVE_START + 25) evolutionMessage = "Getting commitment from server...";
  else if (frame >= EVOLVE_START + 25 && frame < EVOLVE_START + 50) evolutionMessage = "Please approve transaction...";
  else if (frame >= EVOLVE_START + 50) evolutionMessage = "Synthesizing neural pathways...";

  // Balance
  const totalPayout = results.reduce((sum, tier) => sum + Math.floor(5000 * TIER_DATA[tier as NeuronTier].multiplier), 0);
  const initialBalance = 100000;
  const finalBalance = initialBalance - 50000 + totalPayout;
  const displayBalance = frame >= RESULTS_START ? finalBalance : initialBalance;

  // Button text
  let buttonText = "Connect Wallet to Begin";
  if (walletConnected) buttonText = batchSelected ? "Initiate 10-Sample Batch (50,000 $CC)" : "Select sample size";

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMERA - Follows cursor action PRECISELY
  // ═══════════════════════════════════════════════════════════════════════════

  // Screen center is (960, 540) for 1920x1080
  // Game panel is 520px wide, centered
  // Panel left edge: 700, right edge: 1220

  let cameraX = 0;
  let cameraY = 0;
  let cameraScale = 1;

  if (frame < CONNECT_START) {
    // Intro: zoom in towards wallet button (top right of panel)
    const progress = frame / CONNECT_START;
    cameraX = interpolate(progress, [0, 1], [0, -300], { easing: Easing.inOut(Easing.cubic) });
    cameraY = interpolate(progress, [0, 1], [0, 100], { easing: Easing.inOut(Easing.cubic) });
    cameraScale = interpolate(progress, [0, 1], [0.7, 1.8], { easing: Easing.inOut(Easing.cubic) });
  } else if (frame < SELECT_START) {
    // At wallet button
    cameraX = -300;
    cameraY = 100;
    cameraScale = 1.8;
  } else if (frame < INITIATE_START) {
    // Move to batch button (right side of selector)
    const progress = (frame - SELECT_START) / (INITIATE_START - SELECT_START);
    cameraX = interpolate(progress, [0, 1], [-300, -150], { easing: Easing.inOut(Easing.cubic) });
    cameraY = interpolate(progress, [0, 1], [100, -50], { easing: Easing.inOut(Easing.cubic) });
    cameraScale = interpolate(progress, [0, 1], [1.8, 1.6], { easing: Easing.inOut(Easing.cubic) });
  } else if (frame < EVOLVE_START) {
    // Move to initiate button (bottom center)
    const progress = (frame - INITIATE_START) / (EVOLVE_START - INITIATE_START);
    cameraX = interpolate(progress, [0, 1], [-150, 0], { easing: Easing.inOut(Easing.cubic) });
    cameraY = interpolate(progress, [0, 1], [-50, -150], { easing: Easing.inOut(Easing.cubic) });
    cameraScale = interpolate(progress, [0, 1], [1.6, 1.5], { easing: Easing.inOut(Easing.cubic) });
  } else if (frame < RESULTS_START) {
    // Stay on evolution animation
    cameraX = 0;
    cameraY = -100;
    cameraScale = 1.4;
  } else if (frame < CTA_START) {
    // Zoom out to see all results
    const progress = (frame - RESULTS_START) / (CTA_START - RESULTS_START);
    cameraX = 0;
    cameraY = interpolate(progress, [0, 0.3, 1], [-100, 0, 0], { easing: Easing.inOut(Easing.cubic) });
    cameraScale = interpolate(progress, [0, 0.3, 1], [1.4, 0.85, 0.85], { easing: Easing.inOut(Easing.cubic) });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CURSOR POSITIONS - matches camera focus
  // ═══════════════════════════════════════════════════════════════════════════

  // Positions relative to game panel (520x700 approx, centered at 960,540)
  // Fixed: cursor was 20% too high, increased Y values
  const PANEL_LEFT = 700;
  const PANEL_TOP = 190;

  const CURSOR_TARGETS = {
    offscreen: { x: 600, y: 400 },
    walletButton: { x: PANEL_LEFT + 480, y: PANEL_TOP + 105 },     // +9 more
    batchButton: { x: PANEL_LEFT + 390, y: PANEL_TOP + 390 },      // +50 more
    initiateButton: { x: PANEL_LEFT + 260, y: PANEL_TOP + 560 },   // +60 more
  };

  let cursorX = CURSOR_TARGETS.offscreen.x;
  let cursorY = CURSOR_TARGETS.offscreen.y;
  let clicking = false;

  if (frame < 30) {
    cursorX = CURSOR_TARGETS.offscreen.x;
    cursorY = CURSOR_TARGETS.offscreen.y;
  } else if (frame < CONNECT_START) {
    const progress = (frame - 30) / (CONNECT_START - 30);
    cursorX = interpolate(progress, [0, 1], [CURSOR_TARGETS.offscreen.x, CURSOR_TARGETS.walletButton.x], { easing: Easing.inOut(Easing.cubic) });
    cursorY = interpolate(progress, [0, 1], [CURSOR_TARGETS.offscreen.y, CURSOR_TARGETS.walletButton.y], { easing: Easing.inOut(Easing.cubic) });
  } else if (frame < CONNECT_START + 10) {
    cursorX = CURSOR_TARGETS.walletButton.x;
    cursorY = CURSOR_TARGETS.walletButton.y;
    clicking = frame < CONNECT_START + 5;
  } else if (frame < SELECT_START) {
    cursorX = CURSOR_TARGETS.walletButton.x;
    cursorY = CURSOR_TARGETS.walletButton.y;
  } else if (frame < SELECT_START + 20) {
    const progress = (frame - SELECT_START) / 20;
    cursorX = interpolate(progress, [0, 1], [CURSOR_TARGETS.walletButton.x, CURSOR_TARGETS.batchButton.x], { easing: Easing.inOut(Easing.cubic) });
    cursorY = interpolate(progress, [0, 1], [CURSOR_TARGETS.walletButton.y, CURSOR_TARGETS.batchButton.y], { easing: Easing.inOut(Easing.cubic) });
  } else if (frame < SELECT_START + 30) {
    cursorX = CURSOR_TARGETS.batchButton.x;
    cursorY = CURSOR_TARGETS.batchButton.y;
    clicking = frame < SELECT_START + 25;
  } else if (frame < INITIATE_START) {
    cursorX = CURSOR_TARGETS.batchButton.x;
    cursorY = CURSOR_TARGETS.batchButton.y;
  } else if (frame < INITIATE_START + 20) {
    const progress = (frame - INITIATE_START) / 20;
    cursorX = interpolate(progress, [0, 1], [CURSOR_TARGETS.batchButton.x, CURSOR_TARGETS.initiateButton.x], { easing: Easing.inOut(Easing.cubic) });
    cursorY = interpolate(progress, [0, 1], [CURSOR_TARGETS.batchButton.y, CURSOR_TARGETS.initiateButton.y], { easing: Easing.inOut(Easing.cubic) });
  } else if (frame < INITIATE_START + 30) {
    cursorX = CURSOR_TARGETS.initiateButton.x;
    cursorY = CURSOR_TARGETS.initiateButton.y;
    clicking = frame < INITIATE_START + 25;
  } else if (frame < EVOLVE_START + 30) {
    cursorX = CURSOR_TARGETS.initiateButton.x;
    cursorY = CURSOR_TARGETS.initiateButton.y;
  } else {
    // Hide cursor during results and CTA
    cursorX = -100;
    cursorY = -100;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const hasLegendary = results.includes("Legendary");
  const showConfetti = hasLegendary && frame >= CELEBRATE_START && frame < CTA_START;
  const confettiFrame = frame - CELEBRATE_START;
  const resultsLocalFrame = frame - RESULTS_START;

  // Calculate total profit for display
  const totalStake = 50000;
  const totalProfit = totalPayout - totalStake;
  const showTotalGained = frame >= CELEBRATE_START - 20 && frame < CTA_START;
  const totalGainedFrame = frame - (CELEBRATE_START - 20);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgPrimary }}>
      {/* Camera Container */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          transform: `translateX(${cameraX}px) translateY(${cameraY}px) scale(${cameraScale})`,
          opacity: showCTA ? 0 : 1,
          transition: "opacity 0.2s",
        }}
      >
        {/* Game Panel */}
        <div
          style={{
            width: 520,
            padding: 20,
            backgroundColor: colors.bgSecondary,
            borderRadius: 12,
            border: `1px solid ${colors.claudeOrange}33`,
            boxShadow: `0 0 60px ${colors.claudeOrange}22, 0 25px 50px rgba(0,0,0,0.5)`,
            position: "relative",
          }}
        >
          <Header walletConnected={walletConnected} ccBalance={displayBalance} />
          <TierGrid />
          <SampleSizeSelector selected={batchSelected ? 10 : 1} />

          {showEvolution ? (
            <EvolutionAnimation progress={evolutionProgress} message={evolutionMessage} />
          ) : (
            <InitiateButton text={buttonText} disabled={!walletConnected || !batchSelected} />
          )}
        </div>

        {/* Cursor */}
        {!showResults && !showCTA && <Cursor x={cursorX} y={cursorY} clicking={clicking} />}
      </div>

      {/* Result Pop-ups - appear on top of everything */}
      {showResults && !showCTA && (
        <AbsoluteFill>
          {showConfetti && <Confetti localFrame={confettiFrame} />}
          {results.map((tier, idx) => (
            <ResultPopup
              key={idx}
              tier={tier as NeuronTier}
              index={idx}
              localFrame={resultsLocalFrame}
              totalResults={results.length}
            />
          ))}
          {showTotalGained && (
            <TotalGainedDisplay totalProfit={totalProfit} localFrame={totalGainedFrame} />
          )}
        </AbsoluteFill>
      )}

      {/* CTA Scene */}
      {showCTA && (
        <Sequence from={CTA_START}>
          <CTAScene localFrame={frame - CTA_START} featureSlug={featureSlug} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

export default NeuralGenesisTrailer;
