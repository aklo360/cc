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
} from "remotion";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DYNAMIC FEATURE TRAILER - LINEAR STORY STRUCTURE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PHILOSOPHY: Each shot must have ONE distinct purpose. NO REDUNDANCY.
 * The trailer tells a LINEAR STORY that answers these questions in order:
 *
 *   1. HOOK    → "What is this?"        (Title, intrigue, branding)
 *   2. INPUT   → "What do I give it?"   (User's action/input)
 *   3. MAGIC   → "What happens?"        (Processing/transformation)
 *   4. OUTPUT  → "What do I get?"       (The result/payoff)
 *   5. CTA     → "Where can I try it?"  (URL + call to action)
 *
 * RULES FOR EACH SCENE:
 * - HOOK:   Show the feature name prominently. Build anticipation. NO UI yet.
 * - INPUT:  Show ONLY the input phase. User typing/pasting. NO output visible.
 * - MAGIC:  Show the transformation. Loading states, particles, processing.
 * - OUTPUT: Show ONLY the result. The payoff. Fresh reveal, not repeated.
 * - CTA:    URL and call to action. Clean, memorable.
 *
 * ANTI-PATTERNS TO AVOID:
 * ✗ Showing output in the INPUT scene (spoils the reveal)
 * ✗ Showing input in the OUTPUT scene (redundant, we already saw it)
 * ✗ Skipping MAGIC (makes transformation feel instant/unimpressive)
 * ✗ Repeating any content between scenes
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * TIMELINE - Standard Features (15 seconds = 450 frames @ 30fps):
 *   0:00-0:02 (0-60)      HOOK    - Title card with feature name
 *   0:02-0:05 (60-150)    INPUT   - User input demonstration
 *   0:05-0:07 (150-210)   MAGIC   - Processing/transformation animation
 *   0:07-0:11 (210-330)   OUTPUT  - Result reveal
 *   0:11-0:13 (330-390)   CALLOUT - "How it works" explanation
 *   0:13-0:15 (390-450)   CTA     - URL and call to action
 *
 * TIMELINE - Games/Complex Features (30 seconds = 900 frames @ 30fps):
 *   0:00-0:03 (0-90)      HOOK    - Title card
 *   0:03-0:12 (90-360)    GAMEPLAY - Screen-recorded footage (intercut)
 *   0:12-0:20 (360-600)   GAMEPLAY2 - More gameplay footage
 *   0:20-0:26 (600-780)   CALLOUT - Feature highlights
 *   0:26-0:30 (780-900)   CTA     - URL and call to action
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface FeatureTrailerProps {
  featureName: string;
  featureSlug: string;
  description: string;
  featureType: "static" | "interactive" | "game" | "complex";
  tagline?: string;
  footagePath?: string; // For games - path to screen-recorded footage
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 1: HOOK - "What is this?"
// Purpose: Establish the feature name, build intrigue, show branding
// Rules: NO UI elements yet. Just title, logo, atmosphere.
// ═══════════════════════════════════════════════════════════════════════════
const HookScene: React.FC<{ featureName: string }> = ({ featureName }) => {
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
// SCENE 2: INPUT - "What do I give it?"
// Purpose: Show the user's input action ONLY. No output visible.
// Rules: Typing animation, input field focus. Button can be shown but NOT clicked yet.
// ═══════════════════════════════════════════════════════════════════════════
const InputScene: React.FC<{ featureName: string }> = ({ featureName }) => {
  const frame = useCurrentFrame();

  // Typing animation - show code being entered
  const inputText = "function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n-1) + fibonacci(n-2);\n}";
  const typingProgress = interpolate(frame, [0, 80], [0, 1], { extrapolateRight: "clamp" });
  const visibleChars = Math.floor(typingProgress * inputText.length);

  // Cursor blink
  const cursorOpacity = Math.sin(frame * 0.3) > 0 ? 1 : 0;

  // Container fade in
  const containerOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0d0d", justifyContent: "center", alignItems: "center", opacity: containerOpacity }}>
      {/* Radial gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 70% 50% at 50% 50%, rgba(218, 119, 86, 0.06) 0%, transparent 70%)`,
        }}
      />

      {/* UI Container - INPUT ONLY */}
      <div
        style={{
          width: 1400,
          backgroundColor: "#1a1a1a",
          borderRadius: 16,
          border: "1px solid rgba(218, 119, 86, 0.2)",
          padding: 40,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 30 }}>
          <Img src={staticFile("cc.png")} style={{ width: 40, height: 40, marginRight: 15 }} />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 24,
              fontWeight: 600,
              color: "#da7756",
            }}
          >
            {featureName}
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#4ade80" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#facc15" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#f87171" }} />
          </div>
        </div>

        {/* Label */}
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: "#a0a0a0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Paste your code
          </span>
        </div>

        {/* Input Area - ONLY input, no output */}
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
            {inputText.slice(0, visibleChars)}
            <span style={{ opacity: cursorOpacity, color: "#da7756" }}>|</span>
          </pre>
        </div>

        {/* Generate Button - visible but NOT clicked in this scene */}
        <div
          style={{
            display: "inline-block",
            backgroundColor: "#4a3a32",
            padding: "14px 32px",
            borderRadius: 8,
            marginTop: 24,
          }}
        >
          <span
            style={{
              fontFamily: "-apple-system, sans-serif",
              fontSize: 16,
              fontWeight: 600,
              color: "rgba(255,255,255,0.6)",
            }}
          >
            Generate Poetry
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 3: MAGIC - "What happens?"
// Purpose: Show the transformation/processing. Build anticipation for result.
// Rules: Loading animation, particles, processing visuals. No final output yet.
// ═══════════════════════════════════════════════════════════════════════════
const MagicScene: React.FC<{ featureName: string }> = ({ featureName }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Pulsing glow
  const glowIntensity = interpolate(Math.sin(frame * 0.15), [-1, 1], [0.3, 0.8]);

  // Spinning particles
  const rotation = frame * 3;

  // Progress bar
  const progress = interpolate(frame, [0, 50], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  // Text opacity
  const textOpacity = interpolate(frame, [10, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Dots animation for "Generating..."
  const dotCount = Math.floor((frame / 10) % 4);
  const dots = ".".repeat(dotCount);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0d0d", justifyContent: "center", alignItems: "center" }}>
      {/* Radial pulse */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(218, 119, 86, ${glowIntensity * 0.15}) 0%, transparent 70%)`,
          transform: `scale(${1 + glowIntensity * 0.2})`,
        }}
      />

      {/* Spinning ring */}
      <div
        style={{
          position: "absolute",
          width: 300,
          height: 300,
          border: "2px solid rgba(218, 119, 86, 0.3)",
          borderRadius: "50%",
          borderTopColor: "#da7756",
          transform: `rotate(${rotation}deg)`,
        }}
      />

      {/* Inner ring */}
      <div
        style={{
          position: "absolute",
          width: 200,
          height: 200,
          border: "1px solid rgba(218, 119, 86, 0.2)",
          borderRadius: "50%",
          borderBottomColor: "#da7756",
          transform: `rotate(${-rotation * 1.5}deg)`,
        }}
      />

      {/* Center content */}
      <div style={{ textAlign: "center", zIndex: 10 }}>
        {/* Logo */}
        <Img
          src={staticFile("cc.png")}
          style={{
            width: 80,
            height: 80,
            marginBottom: 30,
            filter: `drop-shadow(0 0 ${20 + glowIntensity * 20}px rgba(218, 119, 86, ${glowIntensity}))`,
          }}
        />

        {/* Generating text */}
        <div style={{ opacity: textOpacity }}>
          <h2
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
              fontSize: 36,
              fontWeight: 600,
              color: "#ffffff",
              margin: 0,
              marginBottom: 20,
            }}
          >
            Generating{dots}
          </h2>

          {/* Progress bar */}
          <div
            style={{
              width: 300,
              height: 4,
              backgroundColor: "rgba(218, 119, 86, 0.2)",
              borderRadius: 2,
              overflow: "hidden",
              margin: "0 auto",
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
            Transforming code into poetry
          </p>
        </div>
      </div>

      {/* Floating particles */}
      {Array.from({ length: 20 }, (_, i) => {
        const angle = (i / 20) * Math.PI * 2 + frame * 0.02;
        const radius = 180 + Math.sin(frame * 0.05 + i) * 30;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const size = 3 + (i % 3);
        const opacity = 0.3 + Math.sin(frame * 0.1 + i) * 0.2;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              width: size,
              height: size,
              borderRadius: "50%",
              backgroundColor: "#da7756",
              opacity,
              boxShadow: `0 0 ${size * 2}px rgba(218, 119, 86, 0.6)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 4: OUTPUT - "What do I get?"
// Purpose: Reveal the final result. The payoff. Fresh, not repeated from earlier.
// Rules: Show ONLY the output. No input field visible. Clean reveal animation.
// ═══════════════════════════════════════════════════════════════════════════
const OutputScene: React.FC<{ featureName: string }> = ({ featureName }) => {
  const frame = useCurrentFrame();

  // Fade in
  const containerOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  // Poetry lines reveal one by one
  const line1Reveal = interpolate(frame, [20, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const line2Reveal = interpolate(frame, [40, 65], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const line3Reveal = interpolate(frame, [60, 85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  // Glow pulse
  const glowIntensity = interpolate(Math.sin(frame * 0.08), [-1, 1], [0.3, 0.6]);

  // Success indicator
  const successOpacity = interpolate(frame, [90, 105], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0d0d", justifyContent: "center", alignItems: "center", opacity: containerOpacity }}>
      {/* Radial gradient - celebratory */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 70% 50% at 50% 50%, rgba(218, 119, 86, 0.1) 0%, transparent 70%)`,
        }}
      />

      {/* Output Display - ONLY output, no input */}
      <div
        style={{
          width: 1100,
          backgroundColor: "#1a1a1a",
          borderRadius: 20,
          border: "2px solid rgba(218, 119, 86, 0.4)",
          padding: 60,
          boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 100px rgba(218, 119, 86, ${glowIntensity * 0.2})`,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 40 }}>
          <Img src={staticFile("cc.png")} style={{ width: 50, height: 50, marginRight: 20 }} />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 28,
              fontWeight: 600,
              color: "#da7756",
            }}
          >
            Your Code Poetry
          </span>
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
              ✓ Generated
            </span>
          </div>
        </div>

        {/* Poetry Output - The REVEAL */}
        <div
          style={{
            backgroundColor: "#262626",
            borderRadius: 12,
            padding: 50,
            border: "1px solid rgba(218, 119, 86, 0.2)",
            textAlign: "center",
          }}
        >
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 36, color: "#e0e0e0", lineHeight: 2.2 }}>
            <div style={{ opacity: line1Reveal, transform: `translateY(${(1 - line1Reveal) * 15}px)` }}>
              <span style={{ color: "#da7756", fontSize: 48 }}>"</span>
              <span style={{ fontStyle: "italic" }}>Recursion calls itself,</span>
            </div>
            <div style={{ opacity: line2Reveal, transform: `translateY(${(1 - line2Reveal) * 15}px)` }}>
              <span style={{ fontStyle: "italic" }}>Numbers spiral down to one,</span>
            </div>
            <div style={{ opacity: line3Reveal, transform: `translateY(${(1 - line3Reveal) * 15}px)` }}>
              <span style={{ fontStyle: "italic" }}>Then bloom back as gold.</span>
              <span style={{ color: "#da7756", fontSize: 48 }}>"</span>
            </div>
          </div>
        </div>

        {/* Success indicator */}
        <div
          style={{
            marginTop: 30,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
            opacity: successOpacity,
          }}
        >
          <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: "#4ade80", boxShadow: "0 0 15px rgba(74, 222, 128, 0.5)" }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, color: "#4ade80" }}>
            Haiku from fibonacci()
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 5: CALLOUT - "How does it work?"
// Purpose: Brief explanation of the feature's value proposition
// ═══════════════════════════════════════════════════════════════════════════
const CalloutScene: React.FC<{ description: string }> = ({ description }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scaleProgress = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  const scale = interpolate(scaleProgress, [0, 1], [0.9, 1]);
  const opacity = interpolate(frame, [0, 12, 78, 90], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const titleReveal = interpolate(frame, [5, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const subtitleOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineWidth = interpolate(frame, [15, 35], [0, 500], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const glowIntensity = interpolate(Math.sin(frame * 0.12), [-1, 1], [0.4, 0.8]);

  return (
    <AbsoluteFill style={{ backgroundColor: "rgba(13, 13, 13, 0.95)", justifyContent: "center", alignItems: "center", opacity }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 70% 50% at 50% 50%, rgba(218, 119, 86, 0.12) 0%, transparent 70%)`,
        }}
      />

      <div style={{ transform: `scale(${scale})`, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ position: "relative", overflow: "hidden" }}>
          <div style={{ clipPath: `inset(0 ${(1 - titleReveal) * 100}% 0 0)` }}>
            <h2
              style={{
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
                fontSize: 70,
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "0.02em",
                margin: 0,
                textShadow: `0 0 60px rgba(218, 119, 86, ${glowIntensity})`,
              }}
            >
              HOW IT WORKS
            </h2>
          </div>
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

        <div style={{ width: lineWidth, height: 2, background: "linear-gradient(90deg, transparent, #da7756, transparent)", marginTop: 25, boxShadow: "0 0 20px rgba(218, 119, 86, 0.5)" }} />

        <p
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
            fontSize: 32,
            fontWeight: 500,
            color: "#da7756",
            letterSpacing: "0.05em",
            marginTop: 30,
            opacity: subtitleOpacity,
            maxWidth: 900,
            lineHeight: 1.4,
          }}
        >
          {description}
        </p>
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 6: CTA - "Where can I try it?"
// Purpose: Clear call to action with URL
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

      <div style={{ transform: `scale(${scale})`, opacity, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Logo */}
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

        {/* CTA Text */}
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

        {/* URL */}
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

        {/* $CC badge */}
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
// GAMEPLAY VIDEO (for games - intercut footage)
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
      {/* Vignette */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPOSITION
// ═══════════════════════════════════════════════════════════════════════════
export const FeatureTrailer: React.FC<FeatureTrailerProps> = ({ featureName, featureSlug, description, featureType, tagline, footagePath }) => {
  const isGame = featureType === "game";
  const isComplex = featureType === "complex";
  const isLong = isGame || isComplex; // Both get 30-second trailers

  // Standard features: 15 seconds (450 frames)
  // Games/complex: 30 seconds (900 frames)

  if (isLong) {
    // LONG TIMELINE (30 seconds) - for games with footage OR complex features without
    // Games: Show intercut screen recording footage
    // Complex: Extended INPUT → MAGIC → OUTPUT flow for detailed explanation

    if (isGame && footagePath) {
      // GAME with footage
      const hookDuration = 90;      // 3s
      const gameplay1Duration = 270; // 9s
      const gameplay2Duration = 240; // 8s
      const calloutDuration = 180;   // 6s
      const ctaDuration = 120;       // 4s

      return (
        <AbsoluteFill style={{ backgroundColor: "#0d0d0d" }}>
          <Sequence from={0} durationInFrames={hookDuration}>
            <HookScene featureName={featureName} />
          </Sequence>

          <Sequence from={hookDuration} durationInFrames={gameplay1Duration}>
            <GameplayVideo footagePath={footagePath} durationInFrames={gameplay1Duration} />
          </Sequence>

          <Sequence from={hookDuration + gameplay1Duration} durationInFrames={gameplay2Duration}>
            <GameplayVideo footagePath={footagePath} durationInFrames={gameplay2Duration} />
          </Sequence>

          <Sequence from={hookDuration + gameplay1Duration + gameplay2Duration} durationInFrames={calloutDuration}>
            <CalloutScene description={tagline || description} />
          </Sequence>

          <Sequence from={hookDuration + gameplay1Duration + gameplay2Duration + calloutDuration} durationInFrames={ctaDuration}>
            <CTAScene featureSlug={featureSlug} ctaText="PLAY NOW" />
          </Sequence>
        </AbsoluteFill>
      );
    }

    // COMPLEX FEATURE TIMELINE (30 seconds) - Extended story with more explanation time
    // For code-heavy, conceptually dense features that need more time to explain
    // HOOK → INPUT → MAGIC → OUTPUT → CALLOUT (extended) → CTA
    const hookDuration = 90;      // 3s - Title card
    const inputDuration = 150;    // 5s - Show the input
    const magicDuration = 120;    // 4s - Processing
    const outputDuration = 180;   // 6s - The result reveal
    const calloutDuration = 240;  // 8s - Extended explanation of how it works
    const ctaDuration = 120;      // 4s - CTA

    return (
      <AbsoluteFill style={{ backgroundColor: "#0d0d0d" }}>
        <Sequence from={0} durationInFrames={hookDuration}>
          <HookScene featureName={featureName} />
        </Sequence>

        <Sequence from={hookDuration} durationInFrames={inputDuration}>
          <InputScene featureName={featureName} />
        </Sequence>

        <Sequence from={hookDuration + inputDuration} durationInFrames={magicDuration}>
          <MagicScene featureName={featureName} />
        </Sequence>

        <Sequence from={hookDuration + inputDuration + magicDuration} durationInFrames={outputDuration}>
          <OutputScene featureName={featureName} />
        </Sequence>

        <Sequence from={hookDuration + inputDuration + magicDuration + outputDuration} durationInFrames={calloutDuration}>
          <CalloutScene description={tagline || description} />
        </Sequence>

        <Sequence from={hookDuration + inputDuration + magicDuration + outputDuration + calloutDuration} durationInFrames={ctaDuration}>
          <CTAScene featureSlug={featureSlug} ctaText="TRY IT NOW" />
        </Sequence>
      </AbsoluteFill>
    );
  }

  // STANDARD FEATURE TIMELINE (15 seconds)
  // HOOK → INPUT → MAGIC → OUTPUT → CALLOUT → CTA
  const hookDuration = 60;     // 2s
  const inputDuration = 90;    // 3s
  const magicDuration = 60;    // 2s
  const outputDuration = 120;  // 4s
  const calloutDuration = 60;  // 2s
  const ctaDuration = 60;      // 2s

  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0d0d" }}>
      {/* HOOK - "What is this?" */}
      <Sequence from={0} durationInFrames={hookDuration}>
        <HookScene featureName={featureName} />
      </Sequence>

      {/* INPUT - "What do I give it?" */}
      <Sequence from={hookDuration} durationInFrames={inputDuration}>
        <InputScene featureName={featureName} />
      </Sequence>

      {/* MAGIC - "What happens?" */}
      <Sequence from={hookDuration + inputDuration} durationInFrames={magicDuration}>
        <MagicScene featureName={featureName} />
      </Sequence>

      {/* OUTPUT - "What do I get?" */}
      <Sequence from={hookDuration + inputDuration + magicDuration} durationInFrames={outputDuration}>
        <OutputScene featureName={featureName} />
      </Sequence>

      {/* CALLOUT - "How does it work?" */}
      <Sequence from={hookDuration + inputDuration + magicDuration + outputDuration} durationInFrames={calloutDuration}>
        <CalloutScene description={tagline || description} />
      </Sequence>

      {/* CTA - "Where can I try it?" */}
      <Sequence from={hookDuration + inputDuration + magicDuration + outputDuration + calloutDuration} durationInFrames={ctaDuration}>
        <CTAScene featureSlug={featureSlug} ctaText="TRY IT NOW" />
      </Sequence>
    </AbsoluteFill>
  );
};
