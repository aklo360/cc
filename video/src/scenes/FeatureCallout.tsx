import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  Easing,
} from "remotion";

interface FeatureCalloutProps {
  title: string;
  subtitle: string;
}

/**
 * ULTRA PREMIUM FEATURE CALLOUT v2
 * Clean, powerful text overlay
 */
export const FeatureCallout: React.FC<FeatureCalloutProps> = ({
  title,
  subtitle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Spring for scale
  const scaleProgress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  const scale = interpolate(scaleProgress, [0, 1], [0.9, 1]);

  // Fade in/out
  const opacity = interpolate(
    frame,
    [0, 12, 48, 60],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Title reveal with clipPath
  const titleReveal = interpolate(frame, [5, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Subtitle fade
  const subtitleOpacity = interpolate(frame, [20, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Line expand
  const lineWidth = interpolate(frame, [15, 35], [0, 500], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Glow pulse
  const glowIntensity = interpolate(
    Math.sin(frame * 0.12),
    [-1, 1],
    [0.4, 0.8]
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        justifyContent: "center",
        alignItems: "center",
        opacity,
      }}
    >
      {/* Radial gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 70% 50% at 50% 50%,
            rgba(218, 119, 86, 0.12) 0%,
            transparent 70%
          )`,
        }}
      />

      {/* Subtle grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.03,
          backgroundImage: `
            linear-gradient(rgba(218, 119, 86, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(218, 119, 86, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Content */}
      <div
        style={{
          transform: `scale(${scale})`,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Title with reveal */}
        <div style={{ position: "relative", overflow: "hidden" }}>
          <div
            style={{
              clipPath: `inset(0 ${(1 - titleReveal) * 100}% 0 0)`,
            }}
          >
            <h2
              style={{
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
                fontSize: 90,
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "0.02em",
                margin: 0,
                textShadow: `0 0 60px rgba(218, 119, 86, ${glowIntensity})`,
              }}
            >
              {title}
            </h2>
          </div>

          {/* Scan line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: `${titleReveal * 100}%`,
              width: 2,
              height: "100%",
              background: "#da7756",
              opacity: titleReveal < 1 ? 1 : 0,
              boxShadow: "0 0 15px #da7756",
            }}
          />
        </div>

        {/* Horizontal line */}
        <div
          style={{
            width: lineWidth,
            height: 2,
            background: "linear-gradient(90deg, transparent, #da7756, transparent)",
            marginTop: 25,
            boxShadow: "0 0 20px rgba(218, 119, 86, 0.5)",
          }}
        />

        {/* Subtitle */}
        <p
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
            fontSize: 28,
            fontWeight: 500,
            color: "#da7756",
            letterSpacing: "0.25em",
            marginTop: 20,
            opacity: subtitleOpacity,
            textTransform: "uppercase",
          }}
        >
          {subtitle}
        </p>
      </div>

      {/* Corner accents */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 80,
          width: 50,
          height: 50,
          borderLeft: "2px solid rgba(218, 119, 86, 0.3)",
          borderTop: "2px solid rgba(218, 119, 86, 0.3)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 80,
          right: 80,
          width: 50,
          height: 50,
          borderRight: "2px solid rgba(218, 119, 86, 0.3)",
          borderTop: "2px solid rgba(218, 119, 86, 0.3)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 80,
          width: 50,
          height: 50,
          borderLeft: "2px solid rgba(218, 119, 86, 0.3)",
          borderBottom: "2px solid rgba(218, 119, 86, 0.3)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 80,
          right: 80,
          width: 50,
          height: 50,
          borderRight: "2px solid rgba(218, 119, 86, 0.3)",
          borderBottom: "2px solid rgba(218, 119, 86, 0.3)",
        }}
      />
    </AbsoluteFill>
  );
};
