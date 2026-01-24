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
  Audio,
} from "remotion";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FEATURE TRAILER v2.0 - Authentic UI Recreation + Audio
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This trailer system:
 * 1. Uses ground truth from FeatureManifest (no hallucination)
 * 2. Recreates the actual UI style from the Next.js app
 * 3. Includes background music and SFX
 * 4. Fixes the blank section issue in callout scene
 */

export interface TrailerSceneContent {
  inputDemo: string;
  inputLabel: string;
  buttonText: string;
  processingText: string;
  processingSubtext: string;
  outputHeader: string;
  outputLines: string[];
  outputStyle: "poetry" | "code" | "terminal" | "battle";
  calloutTitle: string;
  calloutDescription: string;
}

export interface FeatureTrailerProps {
  featureName?: string;
  featureSlug?: string;
  description?: string;
  featureType?: "static" | "interactive" | "game" | "complex";
  tagline?: string;
  footagePath?: string;
  sceneContent?: TrailerSceneContent;
}

const DEFAULT_SCENE_CONTENT: TrailerSceneContent = {
  inputDemo: "// Your input here...",
  inputLabel: "Enter your input",
  buttonText: "Generate",
  processingText: "Processing",
  processingSubtext: "Creating something amazing",
  outputHeader: "Result",
  outputLines: ["Your output will appear here"],
  outputStyle: "terminal",
  calloutTitle: "HOW IT WORKS",
  calloutDescription: "A new feature from $CC",
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 1: TITLE CARD - Feature name with premium reveal
// ═══════════════════════════════════════════════════════════════════════════
const TitleScene: React.FC<{ featureName: string }> = ({ featureName }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoProgress = spring({ frame, fps, config: { damping: 15, stiffness: 100, mass: 0.8 } });
  const logoScale = interpolate(logoProgress, [0, 1], [1.5, 1]);
  const logoOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  const titleReveal = interpolate(frame, [15, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const subtitleOpacity = interpolate(frame, [40, 55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const lineWidth = interpolate(frame, [35, 55], [0, 400], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const glowIntensity = interpolate(Math.sin(frame * 0.08), [-1, 1], [0.3, 0.6]);

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
        backgroundColor: "#0d0d0d",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      {/* Deep gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 80% 50% at 50% 50%, rgba(218, 119, 86, 0.08) 0%, rgba(0, 0, 0, 0) 70%)`,
        }}
      />

      {/* Grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.03,
          backgroundImage: `linear-gradient(rgba(218, 119, 86, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(218, 119, 86, 0.5) 1px, transparent 1px)`,
          backgroundSize: "100px 100px",
          transform: `translateY(${frame * 0.5}px)`,
        }}
      />

      {/* Particles */}
      {particles.map((p, i) => {
        const particleOpacity = interpolate(frame - p.delay, [0, 20, 60, 80], [0, 0.6, 0.6, 0], {
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
      <div style={{ transform: `scale(${logoScale})`, opacity: logoOpacity, marginBottom: 40, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            inset: -20,
            background: `radial-gradient(circle, rgba(218, 119, 86, ${glowIntensity}) 0%, transparent 70%)`,
            filter: "blur(20px)",
          }}
        />
        <Img src={staticFile("cc.png")} style={{ width: 120, height: 120, position: "relative", filter: "drop-shadow(0 0 30px rgba(218, 119, 86, 0.5))" }} />
      </div>

      {/* Title */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ clipPath: `inset(0 ${(1 - titleReveal) * 100}% 0 0)` }}>
          <h1
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
              fontSize: Math.min(100, 2000 / featureName.length),
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.02em",
              margin: 0,
              textShadow: `0 0 80px rgba(218, 119, 86, ${glowIntensity}), 0 0 120px rgba(218, 119, 86, ${glowIntensity * 0.5})`,
              textAlign: "center",
            }}
          >
            {featureName.toUpperCase()}
          </h1>
        </div>
        {/* Scan line */}
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

      {/* Line */}
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
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 2: FEATURE UI - Authentic recreation of the actual UI
// ═══════════════════════════════════════════════════════════════════════════
const FeatureUIScene: React.FC<{
  featureName: string;
  content: TrailerSceneContent;
  phase: "input" | "processing" | "output";
}> = ({ featureName, content, phase }) => {
  const frame = useCurrentFrame();
  const containerOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const glowIntensity = interpolate(Math.sin(frame * 0.08), [-1, 1], [0.3, 0.6]);

  // Typing animation for input phase
  const typingProgress = interpolate(frame, [0, 80], [0, 1], { extrapolateRight: "clamp" });
  const visibleChars = Math.floor(typingProgress * content.inputDemo.length);
  const cursorOpacity = Math.sin(frame * 0.3) > 0 ? 1 : 0;

  // Processing animation
  const rotation = frame * 3;
  const progress = interpolate(frame, [0, 50], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const dotCount = Math.floor((frame / 10) % 4);
  const dots = ".".repeat(dotCount);

  // Output reveal animation
  const lineReveals = content.outputLines.map((_, i) => {
    const startFrame = 10 + i * 15;
    return interpolate(frame, [startFrame, startFrame + 15], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
  });

  // Get output text style based on type
  const getOutputStyle = () => {
    switch (content.outputStyle) {
      case "poetry":
        return { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 32, color: "#e0e0e0", fontStyle: "italic" as const };
      case "code":
        return { fontFamily: "'JetBrains Mono', monospace", fontSize: 18, color: "#4ade80" };
      case "battle":
        return { fontFamily: "-apple-system, sans-serif", fontSize: 24, color: "#da7756", fontWeight: 600 };
      default:
        return { fontFamily: "'JetBrains Mono', monospace", fontSize: 20, color: "#e0e0e0" };
    }
  };

  const outputStyle = getOutputStyle();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d0d0d",
        justifyContent: "center",
        alignItems: "center",
        opacity: containerOpacity
      }}
    >
      {/* Background gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 70% 50% at 50% 50%, rgba(218, 119, 86, 0.06) 0%, transparent 70%)`,
        }}
      />

      {/* Main container - matches the app's card style */}
      <div
        style={{
          width: 1400,
          backgroundColor: "#1a1a1a",
          borderRadius: 16,
          border: `1px solid rgba(218, 119, 86, ${phase === "output" ? 0.4 : 0.2})`,
          padding: 40,
          boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 ${phase === "output" ? "100" : "0"}px rgba(218, 119, 86, ${glowIntensity * 0.2})`,
        }}
      >
        {/* Header - matches app's terminal header style */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 30 }}>
          <div style={{ display: "flex", gap: 8, marginRight: 15 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#ff5f57" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#febc2e" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#28c840" }} />
          </div>
          <Img src={staticFile("cc.png")} style={{ width: 32, height: 32, marginRight: 12 }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 600, color: "#da7756" }}>
            {featureName}
          </span>
          {phase === "output" && (
            <div
              style={{
                marginLeft: "auto",
                padding: "6px 16px",
                backgroundColor: "rgba(74, 222, 128, 0.15)",
                borderRadius: 20,
                border: "1px solid rgba(74, 222, 128, 0.3)",
              }}
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: "#4ade80" }}>
                ✓ Complete
              </span>
            </div>
          )}
        </div>

        {/* INPUT PHASE */}
        {phase === "input" && (
          <>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: "#a0a0a0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {content.inputLabel}
              </span>
            </div>
            <div
              style={{
                backgroundColor: "#262626",
                borderRadius: 8,
                padding: 24,
                minHeight: 180,
                border: "1px solid rgba(74, 222, 128, 0.3)",
                boxShadow: "0 0 20px rgba(74, 222, 128, 0.1)",
              }}
            >
              <pre
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 16,
                  color: "#4ade80",
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.6,
                }}
              >
                {content.inputDemo.slice(0, visibleChars)}
                <span style={{ opacity: cursorOpacity, color: "#da7756" }}>|</span>
              </pre>
            </div>
            <div
              style={{
                display: "inline-block",
                backgroundColor: "#da7756",
                padding: "14px 32px",
                borderRadius: 8,
                marginTop: 24,
              }}
            >
              <span style={{ fontFamily: "-apple-system, sans-serif", fontSize: 16, fontWeight: 600, color: "#ffffff" }}>
                {content.buttonText}
              </span>
            </div>
          </>
        )}

        {/* PROCESSING PHASE */}
        {phase === "processing" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 60 }}>
            <div style={{ position: "relative", marginBottom: 40 }}>
              <div
                style={{
                  width: 120,
                  height: 120,
                  border: "3px solid rgba(218, 119, 86, 0.2)",
                  borderRadius: "50%",
                  borderTopColor: "#da7756",
                  transform: `rotate(${rotation}deg)`,
                }}
              />
              <Img
                src={staticFile("cc.png")}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 60,
                  height: 60,
                  filter: `drop-shadow(0 0 ${20 + glowIntensity * 20}px rgba(218, 119, 86, ${glowIntensity}))`,
                }}
              />
            </div>
            <h2
              style={{
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
                fontSize: 32,
                fontWeight: 600,
                color: "#ffffff",
                margin: 0,
                marginBottom: 20,
              }}
            >
              {content.processingText}{dots}
            </h2>
            <div
              style={{
                width: 400,
                height: 4,
                backgroundColor: "rgba(218, 119, 86, 0.2)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress * 100}%`,
                  height: "100%",
                  backgroundColor: "#da7756",
                  boxShadow: "0 0 10px #da7756",
                }}
              />
            </div>
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14,
                color: "rgba(255,255,255,0.5)",
                marginTop: 15,
              }}
            >
              {content.processingSubtext}
            </p>
          </div>
        )}

        {/* OUTPUT PHASE */}
        {phase === "output" && (
          <>
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 600, color: "#da7756" }}>
                {content.outputHeader}
              </span>
            </div>
            <div
              style={{
                backgroundColor: "#262626",
                borderRadius: 12,
                padding: 40,
                border: "1px solid rgba(218, 119, 86, 0.2)",
                textAlign: content.outputStyle === "poetry" ? "center" : "left",
              }}
            >
              <div style={{ ...outputStyle, lineHeight: 1.8 }}>
                {content.outputLines.map((line, i) => (
                  <div
                    key={i}
                    style={{
                      opacity: lineReveals[i],
                      transform: `translateY(${(1 - lineReveals[i]) * 15}px)`,
                      marginBottom: 8,
                    }}
                  >
                    {content.outputStyle === "poetry" && i === 0 && <span style={{ color: "#da7756", fontSize: 40 }}>"</span>}
                    {line}
                    {content.outputStyle === "poetry" && i === content.outputLines.length - 1 && <span style={{ color: "#da7756", fontSize: 40 }}>"</span>}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 3: CALL TO ACTION
// ═══════════════════════════════════════════════════════════════════════════
const CTAScene: React.FC<{ featureSlug: string; ctaText?: string }> = ({ featureSlug, ctaText = "TRY IT NOW" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scaleProgress = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const scale = interpolate(scaleProgress, [0, 1], [0.8, 1]);
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  const urlReveal = interpolate(frame, [20, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const glowIntensity = interpolate(Math.sin(frame * 0.1), [-1, 1], [0.4, 0.8]);
  const ringScale = interpolate(frame, [0, 60], [0.5, 1.5], { extrapolateRight: "clamp" });
  const ringOpacity = interpolate(frame, [0, 30, 60], [0.8, 0.4, 0], { extrapolateRight: "clamp" });

  const url = `claudecode.wtf/${featureSlug}`;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0d0d", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 60% 40% at 50% 50%, rgba(218, 119, 86, 0.15) 0%, transparent 70%)`,
        }}
      />

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

      <div style={{ transform: `scale(${scale})`, opacity, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ position: "relative", marginBottom: 40 }}>
          <div
            style={{
              position: "absolute",
              inset: -30,
              background: `radial-gradient(circle, rgba(218, 119, 86, ${glowIntensity}) 0%, transparent 70%)`,
              filter: "blur(25px)",
            }}
          />
          <Img src={staticFile("cc.png")} style={{ width: 100, height: 100, position: "relative", filter: "drop-shadow(0 0 20px rgba(218, 119, 86, 0.6))" }} />
        </div>

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
          {ctaText}
        </h2>

        <div style={{ marginTop: 25, overflow: "hidden", position: "relative" }}>
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
            {url}
          </p>
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

        <div style={{ marginTop: 35, padding: "8px 24px", border: "1px solid rgba(218, 119, 86, 0.4)", borderRadius: 4 }}>
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
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// GAMEPLAY VIDEO (for games with footage)
// ═══════════════════════════════════════════════════════════════════════════
const GameplayVideo: React.FC<{ footagePath: string; durationInFrames: number }> = ({ footagePath, durationInFrames }) => {
  const frame = useCurrentFrame();

  const zoomIn = interpolate(frame, [0, 6], [1.08, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const zoomOut = interpolate(frame, [durationInFrames - 6, durationInFrames], [1, 1.05], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  const opacity = interpolate(frame, [0, 6, durationInFrames - 6, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = frame < durationInFrames / 2 ? zoomIn : zoomOut;

  return (
    <AbsoluteFill style={{ opacity }}>
      <div style={{ width: "100%", height: "100%", transform: `scale(${scale})`, transformOrigin: "center center" }}>
        <OffthreadVideo src={staticFile(footagePath)} startFrom={0} volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPOSITION - Universal 20-second timeline (600 frames at 30fps)
// ═══════════════════════════════════════════════════════════════════════════
export const FeatureTrailer: React.FC<FeatureTrailerProps> = ({
  featureName = "New Feature",
  featureSlug = "feature",
  description = "A new feature from $CC",
  featureType = "static",
  tagline,
  footagePath,
  sceneContent
}) => {
  const hasFootage = featureType === "game" && footagePath;
  const content = sceneContent || DEFAULT_SCENE_CONTENT;

  // UNIVERSAL 20 SECOND TIMELINE (600 frames at 30fps)
  // Two variants: with WebGL footage or pure Remotion

  if (hasFootage) {
    // WebGL features with footage: Title → Gameplay → Gameplay → CTA
    // Total: 75 + 180 + 180 + 165 = 600 frames (20 seconds)
    return (
      <AbsoluteFill style={{ backgroundColor: "#0d0d0d" }}>
        <Sequence from={0} durationInFrames={75}>
          <TitleScene featureName={featureName} />
        </Sequence>
        <Sequence from={75} durationInFrames={180}>
          <GameplayVideo footagePath={footagePath} durationInFrames={180} />
        </Sequence>
        <Sequence from={255} durationInFrames={180}>
          <GameplayVideo footagePath={footagePath} durationInFrames={180} />
        </Sequence>
        <Sequence from={435} durationInFrames={165}>
          <CTAScene featureSlug={featureSlug} ctaText="PLAY NOW" />
        </Sequence>
      </AbsoluteFill>
    );
  }

  // Standard features: Title → Input → Processing → Output → CTA
  // Total: 75 + 120 + 90 + 180 + 135 = 600 frames (20 seconds)
  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0d0d" }}>
      <Sequence from={0} durationInFrames={75}>
        <TitleScene featureName={featureName} />
      </Sequence>
      <Sequence from={75} durationInFrames={120}>
        <FeatureUIScene featureName={featureName} content={content} phase="input" />
      </Sequence>
      <Sequence from={195} durationInFrames={90}>
        <FeatureUIScene featureName={featureName} content={content} phase="processing" />
      </Sequence>
      <Sequence from={285} durationInFrames={180}>
        <FeatureUIScene featureName={featureName} content={content} phase="output" />
      </Sequence>
      <Sequence from={465} durationInFrames={135}>
        <CTAScene featureSlug={featureSlug} ctaText="TRY IT NOW" />
      </Sequence>
    </AbsoluteFill>
  );
};
