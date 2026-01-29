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
 * TRADING TERMINAL TRAILER - CC Trading Terminal with DVD Bouncing Sell Button
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Timeline (20 seconds @ 30fps = 600 frames):
 * 0-59:     INTRO - Wide shot, show terminal
 * 60-119:   CONNECT - Connect wallet
 * 120-209:  BUY - Enter amount, click buy
 * 210-269:  SUCCESS - Buy success toast animation
 * 270-329:  SWITCH - Click sell tab, enter amount
 * 330-509:  CHASE - DVD bouncing button (bounces off 2-3 walls), cursor chases
 * 510-554:  CATCH - Finally catch and click, sell executes
 * 555-599:  CTA - "Trade at claudecode.wtf/swap"
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
  sellRed: "#ef4444",
  border: "#333333",
  candleGreen: "#22c55e",
  candleRed: "#ef4444",
};

const fonts = {
  mono: "'JetBrains Mono', 'SF Mono', Monaco, monospace",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// ═══════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════

export interface TradingTerminalTrailerProps {
  buyAmount?: number;
  sellAmount?: number;
  solBalance?: number;
  ccBalance?: number;
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
  intro: { rotateX: 15, rotateY: -8, rotateZ: 0, translateZ: 200, translateX: 0, translateY: 0, scale: 0.75 },
  overview: { rotateX: 5, rotateY: 0, rotateZ: 0, translateZ: 0, translateX: 0, translateY: 0, scale: 1.0 },
  buyPanel: { rotateX: 3, rotateY: 5, rotateZ: 0, translateZ: -150, translateX: 200, translateY: 50, scale: 1.5 },
  sellTab: { rotateX: 3, rotateY: 5, rotateZ: 0, translateZ: -150, translateX: 200, translateY: -50, scale: 1.5 },
  wideChase: { rotateX: 0, rotateY: 0, rotateZ: 0, translateZ: 100, translateX: 0, translateY: 0, scale: 0.85 },
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

const Cursor: React.FC<{ x: number; y: number; clicking?: boolean; frustrated?: boolean }> = ({
  x, y, clicking = false, frustrated = false
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: 24,
      height: 24,
      zIndex: 1000,
      transform: `translate(-2px, -2px) ${frustrated ? 'rotate(-10deg)' : ''}`,
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
          left: 2,
          top: 2,
          width: 20,
          height: 20,
          borderRadius: "50%",
          backgroundColor: colors.claudeOrange,
          opacity: 0.6,
          transform: "scale(1.5)",
        }}
      />
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// SUCCESS TOAST COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const SuccessToast: React.FC<{ localFrame: number; amount: string; type: "buy" | "sell" }> = ({
  localFrame, amount, type
}) => {
  const { fps } = useVideoConfig();

  const slideIn = spring({
    frame: localFrame,
    fps,
    config: { damping: 15, stiffness: 120 },
  });

  const opacity = interpolate(localFrame, [0, 10, 50, 60], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 80,
        right: 20,
        transform: `translateX(${(1 - slideIn) * 100}px)`,
        opacity,
        zIndex: 100,
      }}
    >
      <div
        style={{
          backgroundColor: type === "buy" ? colors.accentGreen : colors.sellRed,
          borderRadius: 8,
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
      >
        <span style={{ fontSize: 24 }}>{type === "buy" ? "✓" : "✓"}</span>
        <div>
          <div style={{ fontFamily: fonts.sans, fontSize: 14, fontWeight: 600, color: "#fff" }}>
            {type === "buy" ? "Purchase" : "Sale"} Successful!
          </div>
          <div style={{ fontFamily: fonts.mono, fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
            {type === "buy" ? `+${amount} $CC` : `+${amount} SOL`}
          </div>
        </div>
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
}> = ({ walletConnected, solBalance, ccBalance }) => (
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
      <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: colors.red }} />
      <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: colors.yellow }} />
      <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: colors.green }} />
    </div>

    {/* CC Logo */}
    <Img src={staticFile("cc.png")} style={{ width: 24, height: 24 }} />

    <span style={{ fontFamily: fonts.mono, fontSize: 14, fontWeight: 600, color: colors.claudeOrange }}>
      Trading Terminal
    </span>
    <span style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted }}>
      SOL / $CC
    </span>

    <div style={{ flex: 1 }} />

    {walletConnected ? (
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.textSecondary }}>
          {solBalance.toFixed(3)} SOL
        </span>
        <span style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.claudeOrange, fontWeight: 600 }}>
          {ccBalance.toLocaleString()} $CC
        </span>
        <div
          style={{
            backgroundColor: colors.bgSecondary,
            border: `1px solid ${colors.border}`,
            padding: "6px 12px",
            borderRadius: 6,
            fontFamily: fonts.mono,
            fontSize: 12,
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
          padding: "8px 20px",
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
// REALISTIC CHART COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

// Pre-generated realistic OHLC data (simulating real price movement)
const CANDLE_DATA = [
  { o: 145, h: 158, l: 140, c: 152 },
  { o: 152, h: 165, l: 148, c: 160 },
  { o: 160, h: 172, l: 155, c: 168 },
  { o: 168, h: 175, l: 160, c: 162 },
  { o: 162, h: 170, l: 150, c: 155 },
  { o: 155, h: 162, l: 145, c: 148 },
  { o: 148, h: 160, l: 142, c: 158 },
  { o: 158, h: 175, l: 155, c: 172 },
  { o: 172, h: 185, l: 168, c: 180 },
  { o: 180, h: 195, l: 175, c: 188 },
  { o: 188, h: 198, l: 180, c: 185 },
  { o: 185, h: 192, l: 170, c: 175 },
  { o: 175, h: 182, l: 165, c: 170 },
  { o: 170, h: 180, l: 162, c: 178 },
  { o: 178, h: 195, l: 175, c: 192 },
  { o: 192, h: 210, l: 188, c: 205 },
  { o: 205, h: 218, l: 198, c: 212 },
  { o: 212, h: 225, l: 205, c: 220 },
  { o: 220, h: 230, l: 210, c: 215 },
  { o: 215, h: 228, l: 208, c: 225 },
  { o: 225, h: 240, l: 220, c: 235 },
  { o: 235, h: 245, l: 228, c: 238 },
];

const ChartArea: React.FC<{ frame: number }> = ({ frame }) => {
  const chartHeight = 280;
  const chartWidth = 600;
  const candleWidth = 18;
  const candleGap = 6;
  const marginLeft = 40;
  const marginTop = 50;

  // Find min/max for scaling
  const allValues = CANDLE_DATA.flatMap(c => [c.o, c.h, c.l, c.c]);
  const minPrice = Math.min(...allValues);
  const maxPrice = Math.max(...allValues);
  const priceRange = maxPrice - minPrice;

  const scaleY = (price: number) => {
    return marginTop + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
  };

  // Animate candles appearing
  const visibleCandles = Math.min(CANDLE_DATA.length, Math.floor(frame / 3) + 10);

  // Current price (last visible candle's close)
  const currentCandle = CANDLE_DATA[Math.min(visibleCandles - 1, CANDLE_DATA.length - 1)];
  const currentPrice = currentCandle.c;
  const priceY = scaleY(currentPrice);

  // Price movement animation
  const priceOffset = Math.sin(frame * 0.1) * 3;

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: colors.bgTertiary,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Chart intervals */}
      <div style={{ display: "flex", gap: 8, padding: "8px 12px", borderBottom: `1px solid ${colors.border}` }}>
        {["1m", "5m", "15m", "1h", "4h", "1D"].map((interval, i) => (
          <span
            key={interval}
            style={{
              padding: "4px 8px",
              borderRadius: 4,
              fontSize: 11,
              fontFamily: fonts.mono,
              backgroundColor: i === 2 ? colors.claudeOrange : colors.bgSecondary,
              color: i === 2 ? "#fff" : colors.textSecondary,
            }}
          >
            {interval}
          </span>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 11, color: colors.textMuted, fontFamily: fonts.mono }}>
          Open in GMGN
        </span>
      </div>

      {/* Chart area */}
      <div style={{ position: "relative", height: chartHeight + marginTop + 20 }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = marginTop + pct * chartHeight;
          const price = maxPrice - pct * priceRange;
          return (
            <div key={i}>
              <div
                style={{
                  position: "absolute",
                  left: marginLeft,
                  right: 60,
                  top: y,
                  height: 1,
                  backgroundColor: colors.border,
                  opacity: 0.3,
                }}
              />
              <span
                style={{
                  position: "absolute",
                  right: 8,
                  top: y - 8,
                  fontSize: 10,
                  fontFamily: fonts.mono,
                  color: colors.textMuted,
                }}
              >
                ${(price / 100000).toFixed(5)}
              </span>
            </div>
          );
        })}

        {/* Candlesticks */}
        {CANDLE_DATA.slice(0, visibleCandles).map((candle, i) => {
          const x = marginLeft + i * (candleWidth + candleGap);
          const isGreen = candle.c >= candle.o;
          const bodyTop = scaleY(Math.max(candle.o, candle.c));
          const bodyBottom = scaleY(Math.min(candle.o, candle.c));
          const bodyHeight = Math.max(2, bodyBottom - bodyTop);
          const wickTop = scaleY(candle.h);
          const wickBottom = scaleY(candle.l);

          const appearProgress = interpolate(
            frame,
            [i * 3, i * 3 + 10],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          return (
            <div key={i} style={{ opacity: appearProgress }}>
              {/* Wick */}
              <div
                style={{
                  position: "absolute",
                  left: x + candleWidth / 2 - 1,
                  top: wickTop,
                  width: 2,
                  height: wickBottom - wickTop,
                  backgroundColor: isGreen ? colors.candleGreen : colors.candleRed,
                }}
              />
              {/* Body */}
              <div
                style={{
                  position: "absolute",
                  left: x,
                  top: bodyTop,
                  width: candleWidth,
                  height: bodyHeight,
                  backgroundColor: isGreen ? colors.candleGreen : colors.candleRed,
                  borderRadius: 2,
                }}
              />
            </div>
          );
        })}

        {/* Current price line */}
        <div
          style={{
            position: "absolute",
            left: marginLeft,
            right: 60,
            top: priceY + priceOffset,
            height: 1,
            backgroundColor: colors.claudeOrange,
            opacity: 0.8,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: marginLeft,
            right: 60,
            top: priceY + priceOffset,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${colors.claudeOrange}44, transparent)`,
            filter: "blur(2px)",
          }}
        />

        {/* Price label */}
        <div
          style={{
            position: "absolute",
            right: 4,
            top: priceY + priceOffset - 10,
            backgroundColor: colors.claudeOrange,
            padding: "3px 8px",
            borderRadius: 4,
            fontSize: 11,
            fontFamily: fonts.mono,
            color: "#fff",
            fontWeight: 600,
          }}
        >
          ${(currentPrice / 100000).toFixed(5)}
        </div>

        {/* Volume bars at bottom */}
        <div style={{ position: "absolute", bottom: 0, left: marginLeft, right: 60, height: 30 }}>
          {CANDLE_DATA.slice(0, visibleCandles).map((candle, i) => {
            const x = i * (candleWidth + candleGap);
            const isGreen = candle.c >= candle.o;
            const volume = Math.abs(candle.c - candle.o) * 0.8 + 5;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x,
                  bottom: 0,
                  width: candleWidth,
                  height: volume,
                  backgroundColor: isGreen ? colors.candleGreen : colors.candleRed,
                  opacity: 0.3,
                  borderRadius: "2px 2px 0 0",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TRADING PANEL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const TradingPanel: React.FC<{
  mode: "buy" | "sell";
  inputValue: string;
  outputValue: string;
  solBalance: number;
  ccBalance: number;
  isTyping: boolean;
  showPlaceholder: boolean;
  buttonState: "normal" | "loading" | "hidden";
}> = ({ mode, inputValue, outputValue, solBalance, ccBalance, isTyping, showPlaceholder, buttonState }) => (
  <div
    style={{
      width: 340,
      backgroundColor: colors.bgSecondary,
      borderLeft: `1px solid ${colors.border}`,
      display: "flex",
      flexDirection: "column",
    }}
  >
    {/* Buy/Sell Tabs */}
    <div style={{ display: "flex", borderBottom: `1px solid ${colors.border}` }}>
      <div
        style={{
          flex: 1,
          padding: "14px 0",
          textAlign: "center",
          fontFamily: fonts.sans,
          fontSize: 14,
          fontWeight: 600,
          backgroundColor: mode === "buy" ? `${colors.accentGreen}22` : "transparent",
          color: mode === "buy" ? colors.accentGreen : colors.textMuted,
          borderBottom: mode === "buy" ? `2px solid ${colors.accentGreen}` : "none",
        }}
      >
        Buy $CC
      </div>
      <div
        style={{
          flex: 1,
          padding: "14px 0",
          textAlign: "center",
          fontFamily: fonts.sans,
          fontSize: 14,
          fontWeight: 600,
          backgroundColor: mode === "sell" ? `${colors.sellRed}22` : "transparent",
          color: mode === "sell" ? colors.sellRed : colors.textMuted,
          borderBottom: mode === "sell" ? `2px solid ${colors.sellRed}` : "none",
        }}
      >
        Sell $CC
      </div>
    </div>

    {/* Trading Form */}
    <div style={{ padding: 16, flex: 1 }}>
      {/* Balance Display */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 13 }}>
        <span>
          <span style={{ color: colors.textMuted }}>SOL: </span>
          <span style={{ color: colors.textPrimary }}>{solBalance.toFixed(4)}</span>
        </span>
        <span>
          <span style={{ color: colors.textMuted }}>$CC: </span>
          <span style={{ color: colors.textPrimary }}>{ccBalance.toLocaleString()}</span>
        </span>
      </div>

      {/* Input */}
      <div
        style={{
          backgroundColor: colors.bgTertiary,
          border: `1px solid ${isTyping ? colors.claudeOrange : colors.border}`,
          borderRadius: 8,
          padding: 16,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: colors.textMuted, textTransform: "uppercase" }}>
            {mode === "buy" ? "Pay with SOL" : "Sell $CC"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: colors.bgSecondary,
              padding: "8px 12px",
              borderRadius: 6,
            }}
          >
            {/* Use actual logos */}
            <Img
              src={staticFile(mode === "buy" ? "sol.png" : "cc.png")}
              style={{ width: 24, height: 24, borderRadius: "50%" }}
            />
            <span style={{ fontFamily: fonts.mono, fontSize: 14, color: colors.textPrimary }}>
              {mode === "buy" ? "SOL" : "$CC"}
            </span>
          </div>
          <span
            style={{
              flex: 1,
              textAlign: "right",
              fontFamily: fonts.mono,
              fontSize: 20,
              fontWeight: 600,
              color: colors.textPrimary,
            }}
          >
            {inputValue || "0"}
            {isTyping && (
              <span
                style={{
                  display: "inline-block",
                  width: 2,
                  height: 20,
                  backgroundColor: colors.claudeOrange,
                  marginLeft: 2,
                  verticalAlign: "middle",
                }}
              />
            )}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {["25%", "50%", "75%", "MAX"].map((pct) => (
            <div
              key={pct}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "6px 0",
                backgroundColor: colors.bgSecondary,
                borderRadius: 4,
                fontSize: 11,
                fontFamily: fonts.sans,
                color: colors.textSecondary,
              }}
            >
              {pct}
            </div>
          ))}
        </div>
      </div>

      {/* Output */}
      <div
        style={{
          backgroundColor: colors.bgTertiary,
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: colors.textMuted, textTransform: "uppercase" }}>
            {mode === "buy" ? "Receive $CC" : "Receive SOL"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: colors.bgSecondary,
              padding: "8px 12px",
              borderRadius: 6,
            }}
          >
            {/* Use actual logos */}
            <Img
              src={staticFile(mode === "buy" ? "cc.png" : "sol.png")}
              style={{ width: 24, height: 24, borderRadius: "50%" }}
            />
            <span style={{ fontFamily: fonts.mono, fontSize: 14, color: colors.textPrimary }}>
              {mode === "buy" ? "$CC" : "SOL"}
            </span>
          </div>
          <span
            style={{
              flex: 1,
              textAlign: "right",
              fontFamily: fonts.mono,
              fontSize: 20,
              fontWeight: 600,
              color: colors.textPrimary,
            }}
          >
            {outputValue || "—"}
          </span>
        </div>
      </div>

      {/* Quote info */}
      {outputValue && (
        <div
          style={{
            backgroundColor: colors.bgTertiary,
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            fontSize: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: colors.textMuted }}>Rate</span>
            <span style={{ color: colors.textPrimary, fontFamily: fonts.mono }}>534,759 $CC / SOL</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: colors.textMuted }}>Price Impact</span>
            <span style={{ color: colors.textMuted, fontFamily: fonts.mono }}>0.12%</span>
          </div>
        </div>
      )}
    </div>

    {/* Action Button Area */}
    <div style={{ padding: 16, borderTop: `1px solid ${colors.border}` }}>
      {showPlaceholder ? (
        <div
          style={{
            width: "100%",
            padding: "16px 0",
            borderRadius: 8,
            textAlign: "center",
            fontSize: 16,
            fontFamily: fonts.sans,
            backgroundColor: colors.bgTertiary,
            border: `1px dashed ${colors.sellRed}44`,
            color: colors.textMuted,
          }}
        >
          ← Catch the button!
        </div>
      ) : buttonState === "loading" ? (
        <div
          style={{
            width: "100%",
            padding: "16px 0",
            borderRadius: 8,
            textAlign: "center",
            fontSize: 16,
            fontWeight: 700,
            fontFamily: fonts.sans,
            backgroundColor: mode === "buy" ? colors.accentGreen : colors.sellRed,
            color: "#fff",
            opacity: 0.7,
          }}
        >
          {mode === "buy" ? "Swapping..." : "Selling..."}
        </div>
      ) : buttonState === "hidden" ? null : (
        <div
          style={{
            width: "100%",
            padding: "16px 0",
            borderRadius: 8,
            textAlign: "center",
            fontSize: 16,
            fontWeight: 700,
            fontFamily: fonts.sans,
            backgroundColor: mode === "buy" ? colors.accentGreen : colors.sellRed,
            color: "#fff",
          }}
        >
          {mode === "buy" ? "Buy $CC" : "Sell $CC"}
        </div>
      )}

      {/* Fee notice */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          marginTop: 12,
          fontSize: 11,
          color: colors.textMuted,
        }}
      >
        <span>1% fee → $CC buyback & burn</span>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// DVD BOUNCING BUTTON COMPONENT - FASTER WITH WALL BOUNCE TRACKING
// ═══════════════════════════════════════════════════════════════════════════

interface DVDBounceState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  bounces: number;
}

function getDVDPosition(localFrame: number): DVDBounceState {
  // Start position (escapes from button area)
  let x = 800;
  let y = 450;
  let vx = 8; // Faster!
  let vy = -6;
  let bounces = 0;

  const WIDTH = 1100;
  const HEIGHT = 650;
  const BTN_W = 140;
  const BTN_H = 52;

  // Simulate physics frame by frame
  for (let f = 0; f < localFrame; f++) {
    x += vx;
    y += vy;

    // Bounce off walls
    if (x <= 50) {
      x = 50;
      vx = Math.abs(vx);
      bounces++;
    }
    if (x + BTN_W >= WIDTH) {
      x = WIDTH - BTN_W;
      vx = -Math.abs(vx);
      bounces++;
    }
    if (y <= 50) {
      y = 50;
      vy = Math.abs(vy);
      bounces++;
    }
    if (y + BTN_H >= HEIGHT) {
      y = HEIGHT - BTN_H;
      vy = -Math.abs(vy);
      bounces++;
    }
  }

  return { x, y, vx, vy, bounces };
}

const DVDBouncingButton: React.FC<{ frame: number; startFrame: number }> = ({ frame, startFrame }) => {
  const localFrame = frame - startFrame;
  const state = getDVDPosition(localFrame);

  // Pulse animation
  const pulse = 1 + Math.sin(localFrame * 0.3) * 0.08;

  // Glow intensifies with each bounce
  const glowIntensity = Math.min(1, state.bounces * 0.3);

  return (
    <div
      style={{
        position: "absolute",
        left: state.x,
        top: state.y,
        zIndex: 999,
        transform: `scale(${pulse})`,
      }}
    >
      <div
        style={{
          padding: "14px 32px",
          borderRadius: 8,
          backgroundColor: colors.sellRed,
          color: "#fff",
          fontFamily: fonts.sans,
          fontSize: 16,
          fontWeight: 700,
          boxShadow: `
            0 0 ${20 + glowIntensity * 30}px ${colors.sellRed}${Math.floor(136 + glowIntensity * 119).toString(16)},
            0 8px 20px rgba(0,0,0,0.4)
          `,
        }}
      >
        Sell $CC
      </div>
    </div>
  );
};

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

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bgPrimary,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={{ textAlign: "center", transform: `scale(${titleScale})` }}>
        <Img src={staticFile("cc.png")} style={{ width: 80, height: 80, marginBottom: 24 }} />
        <h1
          style={{
            fontFamily: fonts.mono,
            fontSize: 42,
            color: colors.claudeOrange,
            margin: 0,
            marginBottom: 12,
          }}
        >
          TRADE $CC NOW
        </h1>
        <p
          style={{
            fontFamily: fonts.mono,
            fontSize: 20,
            color: colors.textSecondary,
            marginBottom: 24,
            opacity: urlOpacity,
          }}
        >
          claudecode.wtf/swap
        </p>
        <p
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            color: colors.textMuted,
            opacity: urlOpacity,
          }}
        >
          1% fees → buyback & burn
        </p>
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPOSITION
// ═══════════════════════════════════════════════════════════════════════════

export const TradingTerminalTrailer: React.FC<TradingTerminalTrailerProps> = ({
  buyAmount = 0.5,
  sellAmount = 10000,
  solBalance = 2.5,
  ccBalance = 50000,
}) => {
  const frame = useCurrentFrame();

  // ═══════════════════════════════════════════════════════════════════════════
  // TIMELINE (20 seconds @ 30fps = 600 frames)
  // ═══════════════════════════════════════════════════════════════════════════
  const CONNECT_START = 60;
  const BUY_START = 120;
  const BUY_CLICK = 180;
  const BUY_SUCCESS_START = 210;
  const SWITCH_TO_SELL = 270;
  const SELL_INPUT_DONE = 310;
  const CHASE_START = 330;
  const CATCH_FRAME = 510;
  const SELL_SUCCESS_START = 520;
  const CTA_START = 555;

  // Calculate bounces at catch frame
  const catchState = getDVDPosition(CATCH_FRAME - CHASE_START);

  // State
  const walletConnected = frame >= CONNECT_START;
  const mode: "buy" | "sell" = frame >= SWITCH_TO_SELL ? "sell" : "buy";
  const showBouncingButton = frame >= CHASE_START && frame < CATCH_FRAME;
  const showSellPlaceholder = frame >= CHASE_START && frame < CTA_START;
  const showBuySuccess = frame >= BUY_SUCCESS_START && frame < SWITCH_TO_SELL;
  const showSellSuccess = frame >= SELL_SUCCESS_START && frame < CTA_START;

  // Buy amount typing
  const buyTypingProgress = interpolate(
    frame,
    [BUY_START + 20, BUY_START + 50],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const buyValueStr = buyAmount.toString();
  const buyCharsToShow = Math.floor(buyTypingProgress * buyValueStr.length);
  const displayBuyValue = frame >= BUY_START ? buyValueStr.slice(0, buyCharsToShow) : "";
  const isBuyTyping = frame >= BUY_START + 20 && frame < BUY_START + 60;

  // Sell amount (instant)
  const displaySellValue = frame >= SWITCH_TO_SELL + 20 ? sellAmount.toString() : "";
  const isSellTyping = frame >= SWITCH_TO_SELL + 20 && frame < SWITCH_TO_SELL + 40;

  // Button states
  let buttonState: "normal" | "loading" | "hidden" = "normal";
  if (mode === "buy") {
    if (frame >= BUY_CLICK && frame < BUY_SUCCESS_START) buttonState = "loading";
  } else {
    if (showSellPlaceholder) buttonState = "hidden";
  }

  // Output values
  const buyOutput = buyTypingProgress >= 1 ? "267,380" : "";
  const sellOutput = frame >= SWITCH_TO_SELL + 30 ? "0.0187" : "";

  // Balance updates
  let displaySolBalance = solBalance;
  let displayCcBalance = ccBalance;
  if (frame >= BUY_SUCCESS_START) {
    displaySolBalance = solBalance - buyAmount;
    displayCcBalance = ccBalance + 267380;
  }
  if (frame >= SELL_SUCCESS_START) {
    displayCcBalance = displayCcBalance - sellAmount;
    displaySolBalance = displaySolBalance + 0.0187;
  }

  // Cursor positions
  let cursorX = -50;
  let cursorY = 200;
  let clicking = false;
  let frustrated = false;

  if (frame < 40) {
    cursorX = -50;
    cursorY = 200;
  } else if (frame < CONNECT_START) {
    // Move to connect wallet
    const p = (frame - 40) / 20;
    cursorX = interpolate(p, [0, 1], [-50, 950], { easing: Easing.inOut(Easing.cubic) });
    cursorY = interpolate(p, [0, 1], [200, 35], { easing: Easing.inOut(Easing.cubic) });
  } else if (frame < CONNECT_START + 10) {
    cursorX = 950;
    cursorY = 35;
    clicking = frame < CONNECT_START + 5;
  } else if (frame < BUY_START) {
    // Move to buy input
    const p = (frame - CONNECT_START - 10) / 30;
    cursorX = interpolate(p, [0, 1], [950, 870], { easing: Easing.inOut(Easing.cubic) });
    cursorY = interpolate(p, [0, 1], [35, 260], { easing: Easing.inOut(Easing.cubic) });
  } else if (frame < BUY_CLICK - 20) {
    // Stay at input while typing
    cursorX = 870;
    cursorY = 260;
  } else if (frame < BUY_CLICK) {
    // Move to buy button
    const p = (frame - (BUY_CLICK - 20)) / 20;
    cursorX = interpolate(p, [0, 1], [870, 870], { easing: Easing.inOut(Easing.cubic) });
    cursorY = interpolate(p, [0, 1], [260, 520], { easing: Easing.inOut(Easing.cubic) });
  } else if (frame < BUY_CLICK + 10) {
    // Click buy
    cursorX = 870;
    cursorY = 520;
    clicking = frame < BUY_CLICK + 5;
  } else if (frame < SWITCH_TO_SELL - 30) {
    // Wait during success
    cursorX = 870;
    cursorY = 520;
  } else if (frame < SWITCH_TO_SELL) {
    // Move to sell tab
    const p = (frame - (SWITCH_TO_SELL - 30)) / 30;
    cursorX = interpolate(p, [0, 1], [870, 920], { easing: Easing.inOut(Easing.cubic) });
    cursorY = interpolate(p, [0, 1], [520, 95], { easing: Easing.inOut(Easing.cubic) });
  } else if (frame < SWITCH_TO_SELL + 10) {
    // Click sell tab
    cursorX = 920;
    cursorY = 95;
    clicking = frame < SWITCH_TO_SELL + 5;
  } else if (frame < SELL_INPUT_DONE) {
    // Stay while inputting sell amount
    cursorX = 870;
    cursorY = 260;
  } else if (frame < CHASE_START) {
    // Move toward button (which is about to escape!)
    const p = (frame - SELL_INPUT_DONE) / (CHASE_START - SELL_INPUT_DONE);
    cursorX = interpolate(p, [0, 1], [870, 870], { easing: Easing.inOut(Easing.cubic) });
    cursorY = interpolate(p, [0, 1], [260, 480], { easing: Easing.inOut(Easing.cubic) });
  } else if (frame < CATCH_FRAME) {
    // CHASE THE BUTTON!
    frustrated = true;
    const state = getDVDPosition(frame - CHASE_START);

    // Cursor chases with delay (creates comedy)
    const delay = 12;
    const delayedState = getDVDPosition(Math.max(0, frame - CHASE_START - delay));

    cursorX = delayedState.x + 70;
    cursorY = delayedState.y + 26;

    // Occasional frustrated clicks that miss
    clicking = (frame - CHASE_START) % 25 < 4;
  } else if (frame < CTA_START) {
    // Caught it!
    const catchPos = getDVDPosition(CATCH_FRAME - CHASE_START);
    cursorX = catchPos.x + 70;
    cursorY = catchPos.y + 26;
    clicking = frame < CATCH_FRAME + 15;
  } else {
    cursorX = -100;
    cursorY = -100;
  }

  // Camera
  let camera: CameraPosition;

  if (frame < CONNECT_START) {
    const p = frame / CONNECT_START;
    camera = interpolateCamera(CAMERA_POSITIONS.intro, CAMERA_POSITIONS.overview, p);
  } else if (frame < BUY_START) {
    const p = (frame - CONNECT_START) / (BUY_START - CONNECT_START);
    camera = interpolateCamera(CAMERA_POSITIONS.overview, CAMERA_POSITIONS.buyPanel, p);
  } else if (frame < SWITCH_TO_SELL) {
    camera = CAMERA_POSITIONS.buyPanel;
  } else if (frame < CHASE_START) {
    const p = (frame - SWITCH_TO_SELL) / (CHASE_START - SWITCH_TO_SELL);
    camera = interpolateCamera(CAMERA_POSITIONS.buyPanel, CAMERA_POSITIONS.sellTab, p);
  } else if (frame < CHASE_START + 30) {
    const p = (frame - CHASE_START) / 30;
    camera = interpolateCamera(CAMERA_POSITIONS.sellTab, CAMERA_POSITIONS.wideChase, p);
  } else if (frame < CTA_START) {
    camera = CAMERA_POSITIONS.wideChase;
  } else {
    camera = CAMERA_POSITIONS.cta;
  }

  const showCTA = frame >= CTA_START;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgPrimary }}>
      {/* Main Content */}
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
        }}
      >
        {/* Terminal Container */}
        <div
          style={{
            width: 1050,
            height: 620,
            backgroundColor: colors.bgSecondary,
            borderRadius: 12,
            border: `1px solid ${colors.claudeOrange}33`,
            boxShadow: `0 0 60px ${colors.claudeOrange}22, 0 25px 50px rgba(0,0,0,0.5)`,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          <Header
            walletConnected={walletConnected}
            solBalance={displaySolBalance}
            ccBalance={displayCcBalance}
          />

          <div style={{ display: "flex", flex: 1 }}>
            <ChartArea frame={frame} />
            <TradingPanel
              mode={mode}
              inputValue={mode === "buy" ? displayBuyValue : displaySellValue}
              outputValue={mode === "buy" ? buyOutput : sellOutput}
              solBalance={displaySolBalance}
              ccBalance={displayCcBalance}
              isTyping={mode === "buy" ? isBuyTyping : isSellTyping}
              showPlaceholder={showSellPlaceholder}
              buttonState={buttonState}
            />
          </div>

          {/* Success Toasts */}
          {showBuySuccess && (
            <SuccessToast
              localFrame={frame - BUY_SUCCESS_START}
              amount="267,380"
              type="buy"
            />
          )}
          {showSellSuccess && (
            <SuccessToast
              localFrame={frame - SELL_SUCCESS_START}
              amount="0.0187"
              type="sell"
            />
          )}
        </div>

        {/* DVD Bouncing Button */}
        {showBouncingButton && (
          <DVDBouncingButton frame={frame} startFrame={CHASE_START} />
        )}

        {/* Cursor */}
        {!showCTA && (
          <Cursor x={cursorX} y={cursorY} clicking={clicking} frustrated={frustrated} />
        )}
      </div>

      {/* CTA */}
      {showCTA && (
        <Sequence from={CTA_START}>
          <CTAScene localFrame={frame - CTA_START} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

export default TradingTerminalTrailer;
