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
 * ULTRA PREMIUM TITLE CARD v2
 * Billion-dollar tech company aesthetic
 * Clean, minimal, powerful, cinematic
 */
export const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Smooth spring for logo
  const logoProgress = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.8 },
  });

  // Logo scale: starts big, settles to normal
  const logoScale = interpolate(logoProgress, [0, 1], [1.5, 1]);
  const logoOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Title reveal with stagger
  const titleReveal = interpolate(frame, [15, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Subtitle fade
  const subtitleOpacity = interpolate(frame, [40, 55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Horizontal line expand
  const lineWidth = interpolate(frame, [35, 55], [0, 400], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Glow pulse
  const glowIntensity = interpolate(
    Math.sin(frame * 0.08),
    [-1, 1],
    [0.3, 0.6]
  );

  // Particles
  const particles = Array.from({ length: 30 }, (_, i) => ({
    x: Math.sin(i * 0.7) * 800 + 960,
    y: Math.cos(i * 0.5) * 400 + 540,
    size: 2 + (i % 3),
    speed: 0.5 + (i % 5) * 0.2,
    delay: i * 3,
  }));

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000000",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      {/* Deep space gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse 80% 50% at 50% 50%,
              rgba(218, 119, 86, 0.08) 0%,
              rgba(0, 0, 0, 0) 70%
            )
          `,
        }}
      />

      {/* Animated grid lines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.03,
          backgroundImage: `
            linear-gradient(rgba(218, 119, 86, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(218, 119, 86, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: "100px 100px",
          transform: `translateY(${frame * 0.5}px)`,
        }}
      />

      {/* Floating particles */}
      {particles.map((p, i) => {
        const particleOpacity = interpolate(
          frame - p.delay,
          [0, 20, 60, 80],
          [0, 0.6, 0.6, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        const particleY = p.y - (frame - p.delay) * p.speed;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x,
              top: particleY,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              backgroundColor: "#da7756",
              opacity: particleOpacity,
              boxShadow: `0 0 ${p.size * 3}px rgba(218, 119, 86, 0.8)`,
            }}
          />
        );
      })}

      {/* Logo with glow */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
          marginBottom: 40,
          position: "relative",
        }}
      >
        {/* Glow layer */}
        <div
          style={{
            position: "absolute",
            inset: -20,
            background: `radial-gradient(circle, rgba(218, 119, 86, ${glowIntensity}) 0%, transparent 70%)`,
            filter: "blur(20px)",
          }}
        />
        <Img
          src={staticFile("cc.png")}
          style={{
            width: 120,
            height: 120,
            position: "relative",
            filter: "drop-shadow(0 0 30px rgba(218, 119, 86, 0.5))",
          }}
        />
      </div>

      {/* Main title */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Title mask for reveal */}
        <div
          style={{
            position: "relative",
            clipPath: `inset(0 ${(1 - titleReveal) * 100}% 0 0)`,
          }}
        >
          <h1
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
              fontSize: 140,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.02em",
              margin: 0,
              textShadow: `
                0 0 80px rgba(218, 119, 86, ${glowIntensity}),
                0 0 120px rgba(218, 119, 86, ${glowIntensity * 0.5})
              `,
            }}
          >
            STARCLAUDE
            <span style={{ color: "#da7756" }}>64</span>
          </h1>
        </div>

        {/* Scan line effect on reveal */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: `${titleReveal * 100}%`,
            width: 3,
            height: "100%",
            background: "linear-gradient(180deg, transparent, #da7756, transparent)",
            opacity: titleReveal < 1 ? 1 : 0,
            boxShadow: "0 0 20px #da7756, 0 0 40px #da7756",
          }}
        />
      </div>

      {/* Horizontal accent line */}
      <div
        style={{
          width: lineWidth,
          height: 2,
          background: "linear-gradient(90deg, transparent, #da7756, transparent)",
          marginTop: 30,
          boxShadow: "0 0 20px rgba(218, 119, 86, 0.5)",
        }}
      />

      {/* Subtitle */}
      <p
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
          fontSize: 24,
          fontWeight: 500,
          color: "rgba(255, 255, 255, 0.6)",
          letterSpacing: "0.3em",
          marginTop: 25,
          opacity: subtitleOpacity,
          textTransform: "uppercase",
        }}
      >
        A $CC Production
      </p>

      {/* Corner accents */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 60,
          width: 80,
          height: 80,
          borderLeft: "2px solid rgba(218, 119, 86, 0.3)",
          borderTop: "2px solid rgba(218, 119, 86, 0.3)",
          opacity: subtitleOpacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 60,
          right: 60,
          width: 80,
          height: 80,
          borderRight: "2px solid rgba(218, 119, 86, 0.3)",
          borderBottom: "2px solid rgba(218, 119, 86, 0.3)",
          opacity: subtitleOpacity,
        }}
      />
    </AbsoluteFill>
  );
};
