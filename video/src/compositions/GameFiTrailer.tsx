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
 * GAMEFI TRAILER - GOLD STANDARD TEMPLATE FOR ALL GAME TRAILERS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * THIS IS THE TEMPLATE. When creating new game trailers:
 * 1. Copy this file's structure
 * 2. Recreate the actual UI components from the game
 * 3. Keep 15-second duration (450 frames @ 30fps)
 * 4. Use 8-scene timeline with camera interpolation
 * 5. Include cursor with click effects
 * 6. Match brand colors (#da7756 orange)
 *
 * KEY PATTERNS:
 * - Component-based architecture (Header, BetInput, Coin, ResultModal, etc.)
 * - Frame-based state calculation (no React state)
 * - Camera system with CAMERA_POSITIONS + interpolateCamera()
 * - Cursor targets with CURSOR_TARGETS object
 * - Confetti particles on win (50 particles, staggered fall)
 *
 * DO NOT use generic input/output boxes. Recreate the ACTUAL UI.
 *
 * Current implementation: CC Flip coin flip game with:
 * - Full wallet connection flow
 * - Coin flip selection (HEADS/TAILS)
 * - Bet input with amount typing
 * - Fee display panel
 * - Orange 3D coin spin with heads (crown) / tails (shield)
 * - Win modal with confetti
 * - 3D cinematic camera movements
 */

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS - Exact match to claudecode.wtf
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
  coinOrange: "#da7756",
  coinOrangeDark: "#b85a3a",
};

const fonts = {
  mono: "'JetBrains Mono', 'SF Mono', Monaco, monospace",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// ═══════════════════════════════════════════════════════════════════════════
// PROPS INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

export interface GameFiTrailerProps {
  featureName?: string;
  featureSlug?: string;
  network?: "mainnet" | "devnet";
  initialBalance?: number;
  betAmount?: number;
  multiplier?: number;
  coinChoice?: "heads" | "tails";
  flipResult?: "heads" | "tails";
  potentialPayout?: number;
  newBalance?: number;
}

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
  intro: { rotateX: 18, rotateY: -12, rotateZ: 0, translateZ: 300, translateX: 0, translateY: 0, scale: 0.7 },
  connectWallet: { rotateX: 5, rotateY: 3, rotateZ: 0, translateZ: -100, translateX: 80, translateY: 150, scale: 1.6 },
  selectChoice: { rotateX: 3, rotateY: 0, rotateZ: 0, translateZ: -150, translateX: 0, translateY: 50, scale: 1.7 },
  enterBet: { rotateX: 2, rotateY: 0, rotateZ: 0, translateZ: -180, translateX: 0, translateY: -80, scale: 1.8 },
  flipCoin: { rotateX: 5, rotateY: 0, rotateZ: 0, translateZ: -100, translateX: 0, translateY: -120, scale: 1.5 },
  result: { rotateX: 8, rotateY: 0, rotateZ: 0, translateZ: 50, translateX: 0, translateY: 0, scale: 0.9 },
  balanceUpdate: { rotateX: 3, rotateY: 3, rotateZ: 0, translateZ: -100, translateX: 60, translateY: 130, scale: 1.6 },
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
// CURSOR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const Cursor: React.FC<{ x: number; y: number; clicking?: boolean }> = ({ x, y, clicking = false }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: 20,
      height: 20,
      zIndex: 100,
      transform: "translate(-2px, -2px)",
      transition: "transform 0.1s",
    }}
  >
    <svg
      width="20"
      height="20"
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
          left: 2,
          top: 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          backgroundColor: colors.claudeOrange,
          opacity: 0.5,
          transform: "scale(1.5)",
        }}
      />
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// CONFETTI COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const Confetti: React.FC<{ localFrame: number }> = ({ localFrame }) => {
  const particles = Array.from({ length: 50 }, (_, i) => {
    const startX = Math.random() * 100;
    const delay = i * 0.5;
    const speed = 8 + Math.random() * 4;
    const size = 6 + Math.random() * 6;
    const colorIndex = Math.floor(Math.random() * 4);
    const particleColors = [colors.claudeOrange, colors.accentGreen, "#fbbf24", "#f472b6"];

    const y = interpolate(
      localFrame - delay,
      [0, 90],
      [-10, 700],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    const rotation = (localFrame - delay) * 12;
    const opacity = interpolate(
      localFrame - delay,
      [60, 90],
      [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

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
// COIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const Coin: React.FC<{
  result: "heads" | "tails" | null;
  spinning: boolean;
  spinProgress: number;
  finalResult: "heads" | "tails";
}> = ({ result, spinning, spinProgress, finalResult }) => {
  const rotation = spinning
    ? interpolate(spinProgress, [0, 1], [0, 360 * 5], { easing: Easing.out(Easing.cubic) })
    : (result === "tails" ? 180 : 0); // Show correct side when stopped

  // Determine which face is showing based on rotation
  const normalizedRotation = rotation % 360;
  const showingHeads = normalizedRotation < 90 || normalizedRotation >= 270;

  return (
    <div
      style={{
        width: 128,
        height: 128,
        position: "relative",
        transformStyle: "preserve-3d",
        transform: `rotateY(${rotation}deg)`,
      }}
    >
      {/* Heads side (front) */}
      <div
        style={{
          position: "absolute",
          width: 128,
          height: 128,
          borderRadius: "50%",
          background: `linear-gradient(180deg, ${colors.coinOrange} 0%, ${colors.coinOrangeDark} 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 48,
          boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.3)",
          backfaceVisibility: "hidden",
        }}
      >
        👑
      </div>
      {/* Tails side (back) */}
      <div
        style={{
          position: "absolute",
          width: 128,
          height: 128,
          borderRadius: "50%",
          background: `linear-gradient(180deg, ${colors.coinOrange} 0%, ${colors.coinOrangeDark} 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 48,
          boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.3)",
          backfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
        }}
      >
        🛡️
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// HEADER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const Header: React.FC<{
  walletConnected: boolean;
  solBalance: number;
  ccBalance: number;
  network: "mainnet" | "devnet";
}> = ({ walletConnected, solBalance, ccBalance, network }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 0",
      marginBottom: 24,
    }}
  >
    {/* Traffic lights */}
    <div style={{ display: "flex", gap: 8 }}>
      <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: colors.red }} />
      <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: colors.yellow }} />
      <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: colors.green }} />
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
      CC Flip
    </span>

    {/* Network badge */}
    <span
      style={{
        backgroundColor: network === "mainnet" ? colors.accentGreen : "#9333ea",
        color: network === "mainnet" ? "#000" : "#fff",
        fontSize: 10,
        padding: "2px 8px",
        borderRadius: 999,
        fontWeight: 600,
        textTransform: "uppercase",
        fontFamily: fonts.sans,
      }}
    >
      {network}
    </span>

    {/* Spacer */}
    <div style={{ flex: 1 }} />

    {/* Wallet button */}
    {walletConnected ? (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 13,
            color: colors.textSecondary,
          }}
        >
          {solBalance.toFixed(3)} SOL
        </span>
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 13,
            color: colors.claudeOrange,
            fontWeight: 600,
          }}
        >
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
// CHOICE BUTTONS COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const ChoiceButtons: React.FC<{ selected: "heads" | "tails" | null }> = ({ selected }) => (
  <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
    <div
      style={{
        flex: 1,
        padding: "12px 16px",
        borderRadius: 6,
        fontFamily: fonts.sans,
        fontSize: 18,
        fontWeight: 600,
        textAlign: "center",
        backgroundColor: selected === "heads" ? colors.claudeOrange : colors.bgTertiary,
        color: selected === "heads" ? "#fff" : colors.textSecondary,
        border: selected === "heads" ? "none" : `1px solid ${colors.border}`,
      }}
    >
      👑 HEADS
    </div>
    <div
      style={{
        flex: 1,
        padding: "12px 16px",
        borderRadius: 6,
        fontFamily: fonts.sans,
        fontSize: 18,
        fontWeight: 600,
        textAlign: "center",
        backgroundColor: selected === "tails" ? colors.claudeOrange : colors.bgTertiary,
        color: selected === "tails" ? "#fff" : colors.textSecondary,
        border: selected === "tails" ? "none" : `1px solid ${colors.border}`,
      }}
    >
      🛡️ TAILS
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// BET INPUT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const BetInputComponent: React.FC<{ value: string; typing: boolean }> = ({ value, typing }) => (
  <div style={{ marginBottom: 16 }}>
    <label
      style={{
        fontFamily: fonts.sans,
        fontSize: 11,
        color: colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: 8,
        display: "block",
      }}
    >
      Bet Amount
    </label>
    <div style={{ position: "relative" }}>
      <div
        style={{
          width: "100%",
          backgroundColor: colors.bgPrimary,
          border: `1px solid ${typing ? colors.claudeOrange : colors.border}`,
          borderRadius: 6,
          padding: "12px 60px 12px 12px",
          fontFamily: fonts.mono,
          fontSize: 18,
          color: colors.textPrimary,
        }}
      >
        {value}
        {typing && (
          <span
            style={{
              display: "inline-block",
              width: 2,
              height: 20,
              backgroundColor: colors.claudeOrange,
              marginLeft: 2,
              animation: "blink 1s infinite",
            }}
          />
        )}
      </div>
      <span
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          fontFamily: fonts.mono,
          fontSize: 14,
          fontWeight: 600,
          color: colors.claudeOrange,
        }}
      >
        $CC
      </span>
    </div>
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
      {["1/4", "1/2", "MAX"].map((label) => (
        <div
          key={label}
          style={{
            flex: 1,
            backgroundColor: colors.bgTertiary,
            border: `1px solid ${colors.border}`,
            padding: "4px 8px",
            borderRadius: 4,
            fontFamily: fonts.sans,
            fontSize: 11,
            color: colors.textSecondary,
            textAlign: "center",
          }}
        >
          {label}
        </div>
      ))}
    </div>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginTop: 8,
        fontFamily: fonts.sans,
        fontSize: 11,
        color: colors.textMuted,
      }}
    >
      <span>Min: 1 $CC</span>
      <span>Max: 1,000,000 $CC</span>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// FEE DISPLAY COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const FeeDisplayComponent: React.FC<{ betAmount: number; multiplier: number }> = ({
  betAmount,
  multiplier,
}) => {
  const potentialPayout = betAmount * multiplier;
  const netPayout = potentialPayout - betAmount;

  return (
    <div
      style={{
        backgroundColor: colors.bgTertiary,
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        padding: 12,
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.textSecondary }}>
          Platform Fee
        </span>
        <span style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.textPrimary }}>
          0 SOL
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.textSecondary }}>
          House Edge
        </span>
        <span style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.textPrimary }}>
          2%
        </span>
      </div>
      <div
        style={{
          borderTop: `1px solid ${colors.border}`,
          marginTop: 8,
          marginBottom: 8,
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.textSecondary }}>
          Potential Payout
        </span>
        <span style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.accentGreen, fontWeight: 600 }}>
          {potentialPayout.toLocaleString()} $CC
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.textSecondary }}>
          Net Profit
        </span>
        <span style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.accentGreen, fontWeight: 600 }}>
          +{netPayout.toLocaleString()} $CC
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.textMuted }}>
          Multiplier
        </span>
        <span style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.claudeOrange }}>
          {multiplier}x
        </span>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// FLIP BUTTON COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const FlipButton: React.FC<{ text: string; disabled?: boolean }> = ({ text, disabled = false }) => (
  <div
    style={{
      width: "100%",
      backgroundColor: disabled ? colors.bgTertiary : colors.accentGreen,
      color: disabled ? colors.textMuted : "#000",
      fontFamily: fonts.sans,
      fontSize: 18,
      fontWeight: 700,
      padding: "16px 24px",
      borderRadius: 6,
      textAlign: "center",
      opacity: disabled ? 0.5 : 1,
    }}
  >
    {text}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// RESULT MODAL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const ResultModal: React.FC<{
  result: "win" | "lose";
  payout: number;
  betAmount: number;
  flipResult: "heads" | "tails";
  localFrame: number;
}> = ({ result, payout, betAmount, flipResult, localFrame }) => {
  const { fps } = useVideoConfig();

  const scale = spring({
    frame: localFrame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const iconBounce = result === "win"
    ? Math.sin(localFrame * 0.3) * 5
    : 0;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      {/* Confetti on win */}
      {result === "win" && <Confetti localFrame={localFrame} />}

      <div
        style={{
          backgroundColor: colors.bgSecondary,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          padding: 32,
          maxWidth: 400,
          width: "90%",
          textAlign: "center",
          transform: `scale(${scale})`,
        }}
      >
        {/* Result icon */}
        <div
          style={{
            fontSize: 64,
            marginBottom: 16,
            transform: `translateY(${iconBounce}px)`,
          }}
        >
          {result === "win" ? "🎉" : "💀"}
        </div>

        {/* Result text */}
        <h2
          style={{
            fontFamily: fonts.sans,
            fontSize: 32,
            fontWeight: 700,
            color: result === "win" ? colors.accentGreen : "#f87171",
            marginBottom: 8,
          }}
        >
          {result === "win" ? "YOU WON!" : "YOU LOST"}
        </h2>

        {/* Flip result message */}
        <p
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            color: colors.textSecondary,
            marginBottom: 16,
          }}
        >
          The coin landed on {flipResult.toUpperCase()}!
        </p>

        {/* Payout info */}
        <div
          style={{
            backgroundColor: colors.bgPrimary,
            borderRadius: 6,
            padding: 16,
            marginBottom: 24,
          }}
        >
          {result === "win" ? (
            <>
              <p style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>
                Payout
              </p>
              <p
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 28,
                  fontWeight: 700,
                  color: colors.accentGreen,
                  marginBottom: 4,
                }}
              >
                +{payout.toLocaleString()} $CC
              </p>
              <p style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.textMuted }}>
                Net profit: +{(payout - betAmount).toLocaleString()} $CC
              </p>
            </>
          ) : (
            <>
              <p style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>
                Lost
              </p>
              <p
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#f87171",
                }}
              >
                -{betAmount.toLocaleString()} $CC
              </p>
            </>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12 }}>
          <div
            style={{
              flex: 1,
              backgroundColor: colors.bgTertiary,
              border: `1px solid ${colors.border}`,
              padding: "10px 16px",
              borderRadius: 6,
              fontFamily: fonts.sans,
              fontSize: 13,
              color: colors.textPrimary,
            }}
          >
            Close
          </div>
          <div
            style={{
              flex: 1,
              backgroundColor: colors.claudeOrange,
              padding: "10px 16px",
              borderRadius: 6,
              fontFamily: fonts.sans,
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
            }}
          >
            Play Again
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// FOOTER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const Footer: React.FC = () => (
  <div
    style={{
      padding: "16px 0",
      marginTop: 24,
      textAlign: "center",
    }}
  >
    <span
      style={{
        fontFamily: fonts.mono,
        fontSize: 13,
        color: colors.claudeOrange,
      }}
    >
      ← back
    </span>
    <p
      style={{
        fontFamily: fonts.mono,
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 8,
      }}
    >
      claudecode.wtf · secure escrow coin flip
    </p>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// GAME SCREEN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface GameScreenProps {
  walletConnected: boolean;
  solBalance: number;
  ccBalance: number;
  network: "mainnet" | "devnet";
  choice: "heads" | "tails" | null;
  betValue: string;
  betAmount: number;
  multiplier: number;
  isTyping: boolean;
  coinResult: "heads" | "tails" | null;
  finalResult: "heads" | "tails";
  isSpinning: boolean;
  spinProgress: number;
  buttonText: string;
  buttonDisabled: boolean;
  showResult: boolean;
  gameResult: "win" | "lose" | null;
  payout: number;
  resultLocalFrame: number;
}

const GameScreen: React.FC<GameScreenProps> = ({
  walletConnected,
  solBalance,
  ccBalance,
  network,
  choice,
  betValue,
  betAmount,
  multiplier,
  isTyping,
  coinResult,
  finalResult,
  isSpinning,
  spinProgress,
  buttonText,
  buttonDisabled,
  showResult,
  gameResult,
  payout,
  resultLocalFrame,
}) => (
  <div
    style={{
      width: 500,
      padding: 20,
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      border: `1px solid ${colors.claudeOrange}33`,
      boxShadow: `
        0 0 60px ${colors.claudeOrange}22,
        0 25px 50px rgba(0,0,0,0.5),
        inset 0 0 60px rgba(0,0,0,0.3)
      `,
      position: "relative",
      overflow: "hidden",
    }}
  >
    <Header
      walletConnected={walletConnected}
      solBalance={solBalance}
      ccBalance={ccBalance}
      network={network}
    />

    {/* Main game area */}
    <div
      style={{
        backgroundColor: colors.bgSecondary,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: 24,
      }}
    >
      {/* Coin display */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        <Coin result={coinResult} spinning={isSpinning} spinProgress={spinProgress} finalResult={finalResult} />
      </div>

      {/* Choice buttons */}
      <ChoiceButtons selected={choice} />

      {/* Bet input */}
      <BetInputComponent value={betValue} typing={isTyping} />

      {/* Fee display */}
      <FeeDisplayComponent betAmount={betAmount} multiplier={multiplier} />

      {/* Flip button */}
      <FlipButton text={buttonText} disabled={buttonDisabled} />

      {/* Security badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginTop: 16,
          fontFamily: fonts.sans,
          fontSize: 11,
          color: colors.textMuted,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth="2">
          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span>Secure escrow • You sign deposits • Provably fair</span>
      </div>
    </div>

    <Footer />

    {/* Result modal overlay */}
    {showResult && gameResult && (
      <ResultModal
        result={gameResult}
        payout={payout}
        betAmount={betAmount}
        flipResult={coinResult || "heads"}
        localFrame={resultLocalFrame}
      />
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// CTA SCENE
// ═══════════════════════════════════════════════════════════════════════════

const CTAScene: React.FC<{ localFrame: number; featureSlug: string }> = ({ localFrame, featureSlug }) => {
  const { fps } = useVideoConfig();

  const titleScale = spring({
    frame: localFrame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const urlOpacity = interpolate(localFrame, [20, 40], [0, 1], {
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
          TRY IT NOW
        </h1>
        <p
          style={{
            fontFamily: fonts.mono,
            fontSize: 24,
            color: colors.textPrimary,
            opacity: urlOpacity,
          }}
        >
          claudecode.wtf/{featureSlug}
        </p>
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPOSITION
// ═══════════════════════════════════════════════════════════════════════════

export const GameFiTrailer: React.FC<GameFiTrailerProps> = ({
  featureName = "CC Flip",
  featureSlug = "ccflip",
  network = "mainnet",
  initialBalance = 10000,
  betAmount = 1000,
  multiplier = 1.96,
  coinChoice = "heads",
  flipResult = "heads",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Calculate game state values
  const potentialPayout = Math.floor(betAmount * multiplier);
  const newBalance = coinChoice === flipResult ? initialBalance + (potentialPayout - betAmount) : initialBalance - betAmount;
  const gameWon = coinChoice === flipResult;

  // ═══════════════════════════════════════════════════════════════════════════
  // TIMELINE (450 frames = 15 seconds @ 30fps) - SNAPPY VERSION
  // ═══════════════════════════════════════════════════════════════════════════
  // 0-44:    INTRO - Wide shot, wallet disconnected (1.5s)
  // 45-89:   CONNECT - Cursor clicks wallet → connected (1.5s)
  // 90-134:  CHOICE - Cursor clicks HEADS → orange (1.5s)
  // 135-194: BET - Type "1000", fees update (2s)
  // 195-239: FLIP - Click FLIP → coin spins (1.5s)
  // 240-329: RESULT - Modal, confetti, celebration (3s)
  // 330-374: BALANCE - Modal fades, balance update (1.5s)
  // 375-449: CTA - "Try it now" + URL (2.5s)

  // Scene boundaries
  const INTRO_END = 45;
  const CONNECT_END = 90;
  const CHOICE_END = 135;
  const BET_END = 195;
  const FLIP_END = 240;
  const RESULT_END = 330;
  const BALANCE_END = 375;

  // Determine current state based on frame
  const walletConnected = frame >= INTRO_END;
  const choiceMade = frame >= CONNECT_END;
  const betTyped = frame >= CHOICE_END;
  const flipStarted = frame >= BET_END;
  const showResult = frame >= FLIP_END && frame < BALANCE_END;

  // Bet typing animation
  const betChars = betAmount.toString();
  const typingProgress = interpolate(
    frame,
    [CHOICE_END, CHOICE_END + betChars.length * 8],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const charsToShow = Math.floor(typingProgress * betChars.length);
  const displayBetValue = betTyped ? betChars.slice(0, charsToShow) : "";
  const isTyping = frame >= CHOICE_END && frame < CHOICE_END + betChars.length * 8 + 10;

  // Coin spinning
  const isSpinning = frame >= BET_END && frame < FLIP_END;
  const spinProgress = interpolate(
    frame,
    [BET_END, FLIP_END],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Coin result (shows after spin)
  const coinResult: "heads" | "tails" | null = frame >= FLIP_END ? flipResult : null;

  // Button text state
  let buttonText = "FLIP COIN";
  let buttonDisabled = !walletConnected;
  if (flipStarted && frame < FLIP_END) {
    buttonText = "FLIPPING...";
    buttonDisabled = true;
  }

  // Balance animation
  const displayBalance = frame >= BALANCE_END
    ? newBalance
    : initialBalance;

  // Result modal frame
  const resultLocalFrame = Math.max(0, frame - FLIP_END);

  // ═══════════════════════════════════════════════════════════════════════════
  // CURSOR POSITIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // Cursor targets relative to the 500px wide game screen
  // Layout: Header(64) → Coin(152) → Choice(74) → BetInput(96) → FeeDisplay(136) → FlipButton
  const CURSOR_TARGETS = {
    offscreen: { x: -50, y: 200 },
    walletButton: { x: 430, y: 35 },
    headsButton: { x: 130, y: 305 },      // Center of HEADS button
    betInput: { x: 200, y: 390 },          // Center of bet input field
    flipButton: { x: 250, y: 695 },        // Center of FLIP COIN button (was 595, too high)
    playAgain: { x: 350, y: 480 },
  };

  // Calculate cursor position based on frame (snappier timing for 15s version)
  let cursorX: number, cursorY: number;
  let clicking = false;

  if (frame < 30) {
    // Off screen
    cursorX = CURSOR_TARGETS.offscreen.x;
    cursorY = CURSOR_TARGETS.offscreen.y;
  } else if (frame < INTRO_END) {
    // Move to wallet button
    const progress = (frame - 30) / 15;
    cursorX = interpolate(progress, [0, 1], [CURSOR_TARGETS.offscreen.x, CURSOR_TARGETS.walletButton.x], { easing: Easing.inOut(Easing.cubic) });
    cursorY = interpolate(progress, [0, 1], [CURSOR_TARGETS.offscreen.y, CURSOR_TARGETS.walletButton.y], { easing: Easing.inOut(Easing.cubic) });
  } else if (frame < INTRO_END + 8) {
    // Click wallet
    cursorX = CURSOR_TARGETS.walletButton.x;
    cursorY = CURSOR_TARGETS.walletButton.y;
    clicking = frame < INTRO_END + 4;
  } else if (frame < CONNECT_END - 12) {
    // Stay at wallet
    cursorX = CURSOR_TARGETS.walletButton.x;
    cursorY = CURSOR_TARGETS.walletButton.y;
  } else if (frame < CONNECT_END) {
    // Move to heads button
    const progress = (frame - (CONNECT_END - 12)) / 12;
    cursorX = interpolate(progress, [0, 1], [CURSOR_TARGETS.walletButton.x, CURSOR_TARGETS.headsButton.x], { easing: Easing.inOut(Easing.cubic) });
    cursorY = interpolate(progress, [0, 1], [CURSOR_TARGETS.walletButton.y, CURSOR_TARGETS.headsButton.y], { easing: Easing.inOut(Easing.cubic) });
  } else if (frame < CONNECT_END + 8) {
    // Click heads
    cursorX = CURSOR_TARGETS.headsButton.x;
    cursorY = CURSOR_TARGETS.headsButton.y;
    clicking = frame < CONNECT_END + 4;
  } else if (frame < CHOICE_END - 12) {
    // Stay at heads
    cursorX = CURSOR_TARGETS.headsButton.x;
    cursorY = CURSOR_TARGETS.headsButton.y;
  } else if (frame < CHOICE_END) {
    // Move to bet input
    const progress = (frame - (CHOICE_END - 12)) / 12;
    cursorX = interpolate(progress, [0, 1], [CURSOR_TARGETS.headsButton.x, CURSOR_TARGETS.betInput.x], { easing: Easing.inOut(Easing.cubic) });
    cursorY = interpolate(progress, [0, 1], [CURSOR_TARGETS.headsButton.y, CURSOR_TARGETS.betInput.y], { easing: Easing.inOut(Easing.cubic) });
  } else if (frame < BET_END - 25) {
    // Stay at bet input while typing
    cursorX = CURSOR_TARGETS.betInput.x;
    cursorY = CURSOR_TARGETS.betInput.y;
  } else if (frame < BET_END - 12) {
    // Move to flip button
    const progress = (frame - (BET_END - 25)) / 13;
    cursorX = interpolate(progress, [0, 1], [CURSOR_TARGETS.betInput.x, CURSOR_TARGETS.flipButton.x], { easing: Easing.inOut(Easing.cubic) });
    cursorY = interpolate(progress, [0, 1], [CURSOR_TARGETS.betInput.y, CURSOR_TARGETS.flipButton.y], { easing: Easing.inOut(Easing.cubic) });
  } else if (frame < BET_END) {
    // Click flip button
    cursorX = CURSOR_TARGETS.flipButton.x;
    cursorY = CURSOR_TARGETS.flipButton.y;
    clicking = frame < BET_END - 6;
  } else if (frame < FLIP_END) {
    // Stay at flip button during spin
    cursorX = CURSOR_TARGETS.flipButton.x;
    cursorY = CURSOR_TARGETS.flipButton.y;
  } else if (frame < RESULT_END) {
    // Move to play again button in modal
    const progress = interpolate(frame, [FLIP_END, FLIP_END + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    cursorX = interpolate(progress, [0, 1], [CURSOR_TARGETS.flipButton.x, CURSOR_TARGETS.playAgain.x], { easing: Easing.inOut(Easing.cubic) });
    cursorY = interpolate(progress, [0, 1], [CURSOR_TARGETS.flipButton.y, CURSOR_TARGETS.playAgain.y], { easing: Easing.inOut(Easing.cubic) });
  } else {
    // Hide cursor
    cursorX = -100;
    cursorY = -100;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMERA ANIMATION
  // ═══════════════════════════════════════════════════════════════════════════

  let camera: CameraPosition;

  if (frame < INTRO_END) {
    // Intro → connect wallet zoom
    const progress = frame / INTRO_END;
    camera = interpolateCamera(CAMERA_POSITIONS.intro, CAMERA_POSITIONS.connectWallet, progress);
  } else if (frame < CONNECT_END) {
    // Connect → choice zoom
    const progress = (frame - INTRO_END) / (CONNECT_END - INTRO_END);
    camera = interpolateCamera(CAMERA_POSITIONS.connectWallet, CAMERA_POSITIONS.selectChoice, progress);
  } else if (frame < CHOICE_END) {
    // Choice → bet input zoom
    const progress = (frame - CONNECT_END) / (CHOICE_END - CONNECT_END);
    camera = interpolateCamera(CAMERA_POSITIONS.selectChoice, CAMERA_POSITIONS.enterBet, progress);
  } else if (frame < BET_END) {
    // Bet → flip zoom
    const progress = (frame - CHOICE_END) / (BET_END - CHOICE_END);
    camera = interpolateCamera(CAMERA_POSITIONS.enterBet, CAMERA_POSITIONS.flipCoin, progress);
  } else if (frame < FLIP_END) {
    // Flip → result zoom out
    const progress = (frame - BET_END) / (FLIP_END - BET_END);
    camera = interpolateCamera(CAMERA_POSITIONS.flipCoin, CAMERA_POSITIONS.result, progress);
  } else if (frame < RESULT_END) {
    // Stay at result
    camera = CAMERA_POSITIONS.result;
  } else if (frame < BALANCE_END) {
    // Result → balance zoom
    const progress = (frame - RESULT_END) / (BALANCE_END - RESULT_END);
    camera = interpolateCamera(CAMERA_POSITIONS.result, CAMERA_POSITIONS.cta, progress);
  } else {
    camera = CAMERA_POSITIONS.cta;
  }

  const showCTA = frame >= BALANCE_END;

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
        {/* Game Screen */}
        <div style={{ position: "relative" }}>
          <GameScreen
            walletConnected={walletConnected}
            solBalance={0.5}
            ccBalance={displayBalance}
            network={network}
            choice={choiceMade ? coinChoice : null}
            betValue={displayBetValue || "0"}
            betAmount={betTyped ? betAmount : 0}
            multiplier={multiplier}
            isTyping={isTyping}
            coinResult={coinResult}
            finalResult={flipResult}
            isSpinning={isSpinning}
            spinProgress={spinProgress}
            buttonText={buttonText}
            buttonDisabled={buttonDisabled}
            showResult={showResult}
            gameResult={showResult ? (gameWon ? "win" : "lose") : null}
            payout={potentialPayout}
            resultLocalFrame={resultLocalFrame}
          />

          {/* Cursor */}
          {!showCTA && frame < BALANCE_END && (
            <Cursor x={cursorX} y={cursorY} clicking={clicking} />
          )}
        </div>
      </div>

      {/* CTA Scene */}
      {showCTA && (
        <Sequence from={BALANCE_END}>
          <CTAScene localFrame={frame - BALANCE_END} featureSlug={featureSlug} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

export default GameFiTrailer;
