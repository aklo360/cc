import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  Img,
  staticFile,
  Easing,
} from "remotion";

/**
 * ULTRA PREMIUM CTA v2
 * Clean, powerful end screen
 */
export const CallToAction: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scale in
  const scaleProgress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  const scale = interpolate(scaleProgress, [0, 1], [0.8, 1]);
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // URL reveal
  const urlReveal = interpolate(frame, [20, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Glow pulse
  const glowIntensity = interpolate(
    Math.sin(frame * 0.1),
    [-1, 1],
    [0.4, 0.8]
  );

  // Ring animation
  const ringScale = interpolate(frame, [0, 60], [0.5, 1.5], {
    extrapolateRight: "clamp",
  });
  const ringOpacity = interpolate(frame, [0, 30, 60], [0.8, 0.4, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000000",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      {/* Radial gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 60% 40% at 50% 50%,
            rgba(218, 119, 86, 0.15) 0%,
            transparent 70%
          )`,
        }}
      />

      {/* Expanding ring */}
      <div
        style={{
          position: "absolute",
          width: 300,
          height: 300,
          border: "2px solid rgba(218, 119, 86, 0.5)",
          borderRadius: "50%",
          transform: `scale(${ringScale})`,
          opacity: ringOpacity,
        }}
      />

      {/* Content */}
      <div
        style={{
          transform: `scale(${scale})`,
          opacity,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Logo with glow */}
        <div style={{ position: "relative", marginBottom: 40 }}>
          <div
            style={{
              position: "absolute",
              inset: -30,
              background: `radial-gradient(circle, rgba(218, 119, 86, ${glowIntensity}) 0%, transparent 70%)`,
              filter: "blur(25px)",
            }}
          />
          <Img
            src={staticFile("cc.png")}
            style={{
              width: 100,
              height: 100,
              position: "relative",
              filter: "drop-shadow(0 0 20px rgba(218, 119, 86, 0.6))",
            }}
          />
        </div>

        {/* PLAY NOW */}
        <h2
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
            fontSize: 80,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "0.05em",
            margin: 0,
            textShadow: `0 0 60px rgba(218, 119, 86, ${glowIntensity})`,
          }}
        >
          PLAY NOW
        </h2>

        {/* URL with reveal */}
        <div
          style={{
            marginTop: 25,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <p
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
              fontSize: 36,
              fontWeight: 500,
              color: "#da7756",
              letterSpacing: "0.1em",
              margin: 0,
              clipPath: `inset(0 ${(1 - urlReveal) * 100}% 0 0)`,
            }}
          >
            claudecode.wtf/moon
          </p>
          {/* Scan line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: `${urlReveal * 100}%`,
              width: 2,
              height: "100%",
              background: "#da7756",
              opacity: urlReveal < 1 ? 1 : 0,
              boxShadow: "0 0 10px #da7756",
            }}
          />
        </div>

        {/* $CC badge */}
        <div
          style={{
            marginTop: 35,
            padding: "8px 24px",
            border: "1px solid rgba(218, 119, 86, 0.4)",
            borderRadius: 4,
          }}
        >
          <span
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
              fontSize: 18,
              fontWeight: 600,
              color: "rgba(218, 119, 86, 0.8)",
              letterSpacing: "0.2em",
            }}
          >
            $CC
          </span>
        </div>
      </div>

      {/* Corner accents */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 60,
          width: 60,
          height: 60,
          borderLeft: "2px solid rgba(218, 119, 86, 0.3)",
          borderTop: "2px solid rgba(218, 119, 86, 0.3)",
          opacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 60,
          right: 60,
          width: 60,
          height: 60,
          borderRight: "2px solid rgba(218, 119, 86, 0.3)",
          borderTop: "2px solid rgba(218, 119, 86, 0.3)",
          opacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 60,
          width: 60,
          height: 60,
          borderLeft: "2px solid rgba(218, 119, 86, 0.3)",
          borderBottom: "2px solid rgba(218, 119, 86, 0.3)",
          opacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 60,
          right: 60,
          width: 60,
          height: 60,
          borderRight: "2px solid rgba(218, 119, 86, 0.3)",
          borderBottom: "2px solid rgba(218, 119, 86, 0.3)",
          opacity,
        }}
      />
    </AbsoluteFill>
  );
};
