import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  Img,
  staticFile,
  Easing,
  OffthreadVideo,
  Video,
} from "remotion";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * REAL FOOTAGE TRAILER - Shows the ACTUAL page interaction
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This composition wraps real screen-recorded footage with:
 * - Title card (intro)
 * - REAL footage from page capture (the authentic UI/UX)
 * - CTA card (outro)
 *
 * The footage shows the ACTUAL user journey - no recreation needed.
 */

export interface RealFootageTrailerProps {
  featureName?: string;
  featureSlug?: string;
  description?: string;
  footagePath?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// TITLE CARD - Premium intro with feature name
// ═══════════════════════════════════════════════════════════════════════════
const TitleCard: React.FC<{ featureName: string }> = ({ featureName }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoProgress = spring({ frame, fps, config: { damping: 15, stiffness: 100 } });
  const logoScale = interpolate(logoProgress, [0, 1], [1.5, 1]);
  const logoOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  const titleReveal = interpolate(frame, [15, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const lineWidth = interpolate(frame, [40, 60], [0, 500], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const subtitleOpacity = interpolate(frame, [50, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const glowPulse = interpolate(Math.sin(frame * 0.08), [-1, 1], [0.3, 0.7]);

  // Floating particles
  const particles = Array.from({ length: 25 }, (_, i) => ({
    x: Math.sin(i * 0.8) * 700 + 960,
    y: Math.cos(i * 0.6) * 350 + 540,
    size: 2 + (i % 3),
    speed: 0.4 + (i % 4) * 0.15,
    delay: i * 2,
  }));

  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0d0d", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
      {/* Radial gradient */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(218, 119, 86, 0.1) 0%, transparent 70%)",
      }} />

      {/* Grid lines */}
      <div style={{
        position: "absolute",
        inset: 0,
        opacity: 0.03,
        backgroundImage: "linear-gradient(rgba(218, 119, 86, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(218, 119, 86, 0.5) 1px, transparent 1px)",
        backgroundSize: "80px 80px",
        transform: `translateY(${frame * 0.3}px)`,
      }} />

      {/* Particles */}
      {particles.map((p, i) => {
        const particleOpacity = interpolate(frame - p.delay, [0, 20, 70, 90], [0, 0.5, 0.5, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y - (frame - p.delay) * p.speed,
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

      {/* Logo */}
      <div style={{ transform: `scale(${logoScale})`, opacity: logoOpacity, marginBottom: 50, position: "relative" }}>
        <div style={{
          position: "absolute",
          inset: -25,
          background: `radial-gradient(circle, rgba(218, 119, 86, ${glowPulse}) 0%, transparent 70%)`,
          filter: "blur(25px)",
        }} />
        <Img
          src={staticFile("cc.png")}
          style={{ width: 140, height: 140, position: "relative", filter: "drop-shadow(0 0 40px rgba(218, 119, 86, 0.6))" }}
        />
      </div>

      {/* Title with reveal */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ clipPath: `inset(0 ${(1 - titleReveal) * 100}% 0 0)` }}>
          <h1 style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
            fontSize: Math.min(90, 1800 / featureName.length),
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-0.02em",
            margin: 0,
            textShadow: `0 0 80px rgba(218, 119, 86, ${glowPulse})`,
            textAlign: "center",
          }}>
            {featureName.toUpperCase()}
          </h1>
        </div>
        {/* Scan line */}
        <div style={{
          position: "absolute",
          top: 0,
          left: `${titleReveal * 100}%`,
          width: 3,
          height: "100%",
          background: "linear-gradient(180deg, transparent, #da7756, transparent)",
          opacity: titleReveal < 1 ? 1 : 0,
          boxShadow: "0 0 20px #da7756, 0 0 40px #da7756",
        }} />
      </div>

      {/* Accent line */}
      <div style={{
        width: lineWidth,
        height: 2,
        background: "linear-gradient(90deg, transparent, #da7756, transparent)",
        marginTop: 35,
        boxShadow: "0 0 20px rgba(218, 119, 86, 0.5)",
      }} />

      {/* Subtitle */}
      <p style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
        fontSize: 22,
        fontWeight: 500,
        color: "rgba(255, 255, 255, 0.5)",
        letterSpacing: "0.35em",
        marginTop: 30,
        opacity: subtitleOpacity,
        textTransform: "uppercase",
      }}>
        A $CC Production
      </p>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// FOOTAGE PLAYER - Displays the real captured interaction
// ═══════════════════════════════════════════════════════════════════════════
const FootagePlayer: React.FC<{ footagePath: string; durationInFrames: number }> = ({ footagePath, durationInFrames }) => {
  const frame = useCurrentFrame();

  // Fade in/out
  const opacity = interpolate(frame, [0, 15, durationInFrames - 15, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle zoom for cinematic feel
  const scale = interpolate(frame, [0, durationInFrames], [1.02, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0d0d" }}>
      <div style={{
        width: "100%",
        height: "100%",
        transform: `scale(${scale})`,
        transformOrigin: "center center",
        opacity,
      }}>
        <OffthreadVideo
          src={staticFile(footagePath)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      {/* Vignette overlay */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)",
        pointerEvents: "none",
      }} />

      {/* $CC watermark */}
      <div style={{
        position: "absolute",
        bottom: 30,
        right: 40,
        opacity: 0.6,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <Img src={staticFile("cc.png")} style={{ width: 32, height: 32 }} />
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 16,
          color: "#da7756",
          fontWeight: 600,
        }}>
          $CC
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// CTA CARD - Call to action with URL
// ═══════════════════════════════════════════════════════════════════════════
const CTACard: React.FC<{ featureSlug: string; description?: string }> = ({ featureSlug, description }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scaleProgress = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  const scale = interpolate(scaleProgress, [0, 1], [0.85, 1]);
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  const urlReveal = interpolate(frame, [25, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const glowPulse = interpolate(Math.sin(frame * 0.1), [-1, 1], [0.4, 0.8]);

  // Expanding ring
  const ringScale = interpolate(frame, [0, 60], [0.5, 1.5], { extrapolateRight: "clamp" });
  const ringOpacity = interpolate(frame, [0, 30, 60], [0.7, 0.3, 0], { extrapolateRight: "clamp" });

  const url = `claudecode.wtf/${featureSlug}`;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0d0d", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
      {/* Gradient */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(218, 119, 86, 0.15) 0%, transparent 70%)",
      }} />

      {/* Ring animation */}
      <div style={{
        position: "absolute",
        width: 300,
        height: 300,
        border: "2px solid rgba(218, 119, 86, 0.5)",
        borderRadius: "50%",
        transform: `scale(${ringScale})`,
        opacity: ringOpacity,
      }} />

      <div style={{ transform: `scale(${scale})`, opacity, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Logo */}
        <div style={{ position: "relative", marginBottom: 45 }}>
          <div style={{
            position: "absolute",
            inset: -35,
            background: `radial-gradient(circle, rgba(218, 119, 86, ${glowPulse}) 0%, transparent 70%)`,
            filter: "blur(30px)",
          }} />
          <Img
            src={staticFile("cc.png")}
            style={{ width: 110, height: 110, position: "relative", filter: "drop-shadow(0 0 25px rgba(218, 119, 86, 0.7))" }}
          />
        </div>

        {/* CTA Text */}
        <h2 style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
          fontSize: 72,
          fontWeight: 700,
          color: "#ffffff",
          letterSpacing: "0.05em",
          margin: 0,
          textShadow: `0 0 60px rgba(218, 119, 86, ${glowPulse})`,
        }}>
          TRY IT NOW
        </h2>

        {/* URL with reveal */}
        <div style={{ marginTop: 30, overflow: "hidden", position: "relative" }}>
          <p style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
            fontSize: 32,
            fontWeight: 500,
            color: "#da7756",
            letterSpacing: "0.08em",
            margin: 0,
            clipPath: `inset(0 ${(1 - urlReveal) * 100}% 0 0)`,
          }}>
            {url}
          </p>
          <div style={{
            position: "absolute",
            top: 0,
            left: `${urlReveal * 100}%`,
            width: 2,
            height: "100%",
            background: "#da7756",
            opacity: urlReveal < 1 ? 1 : 0,
            boxShadow: "0 0 10px #da7756",
          }} />
        </div>

        {/* Description */}
        {description && (
          <p style={{
            fontFamily: "-apple-system, sans-serif",
            fontSize: 18,
            color: "rgba(255,255,255,0.5)",
            marginTop: 25,
            maxWidth: 600,
          }}>
            {description}
          </p>
        )}

        {/* $CC badge */}
        <div style={{
          marginTop: 40,
          padding: "10px 28px",
          border: "1px solid rgba(218, 119, 86, 0.4)",
          borderRadius: 6,
        }}>
          <span style={{
            fontFamily: "-apple-system, sans-serif",
            fontSize: 16,
            fontWeight: 600,
            color: "rgba(218, 119, 86, 0.8)",
            letterSpacing: "0.2em",
          }}>
            POWERED BY $CC
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPOSITION
// ═══════════════════════════════════════════════════════════════════════════
export const RealFootageTrailer: React.FC<RealFootageTrailerProps> = ({
  featureName = "New Feature",
  featureSlug = "feature",
  description,
  footagePath = "footage/capture.mp4",
}) => {
  const { durationInFrames } = useVideoConfig();

  // Timeline: Title (3s) → Footage (14s) → CTA (3s) = 20s total
  const TITLE_DURATION = 90;  // 3 seconds
  const CTA_DURATION = 90;    // 3 seconds
  const FOOTAGE_DURATION = durationInFrames - TITLE_DURATION - CTA_DURATION; // ~14 seconds

  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0d0d" }}>
      {/* Title Card */}
      <Sequence from={0} durationInFrames={TITLE_DURATION}>
        <TitleCard featureName={featureName} />
      </Sequence>

      {/* Real Footage */}
      <Sequence from={TITLE_DURATION} durationInFrames={FOOTAGE_DURATION}>
        <FootagePlayer footagePath={footagePath} durationInFrames={FOOTAGE_DURATION} />
      </Sequence>

      {/* CTA */}
      <Sequence from={TITLE_DURATION + FOOTAGE_DURATION} durationInFrames={CTA_DURATION}>
        <CTACard featureSlug={featureSlug} description={description} />
      </Sequence>
    </AbsoluteFill>
  );
};
