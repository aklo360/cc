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
 * WEBAPP TRAILER - 3D CINEMATIC VERSION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This recreates the ACTUAL webapp UI in Remotion with:
 * - 3D perspective and tilted terminal window
 * - Cinematic camera movements (dolly ins, zooms, rotations)
 * - Same exact UI components and styling as claudecode.wtf
 *
 * The manifest provides REAL content from the deployed page.
 */

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS - Exact match to globals.css / tailwind config
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
  border: "#333333",
  // Traffic lights
  red: "#ff5f57",
  yellow: "#febc2e",
  green: "#28c840",
};

const fonts = {
  mono: "'JetBrains Mono', 'SF Mono', Monaco, monospace",
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

// ═══════════════════════════════════════════════════════════════════════════
// PROPS - Content from manifest
// ═══════════════════════════════════════════════════════════════════════════
export interface WebappTrailerProps {
  // Feature info
  featureName: string;
  featureSlug: string;
  tagline?: string;

  // UI Content (from manifest)
  inputPlaceholder?: string;
  inputContent?: string;
  buttonText?: string;
  outputLines?: string[];

  // Styling hints
  outputStyle?: "text" | "code" | "poetry";
}

// ═══════════════════════════════════════════════════════════════════════════
// TERMINAL HEADER - Exact match to app header
// ═══════════════════════════════════════════════════════════════════════════
const TerminalHeader: React.FC<{ title: string; tagline?: string }> = ({ title, tagline }) => {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 0",
      marginBottom: 24,
    }}>
      {/* Traffic lights */}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: colors.red }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: colors.yellow }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: colors.green }} />
      </div>

      {/* CC Icon */}
      <Img src={staticFile("cc.png")} style={{ width: 24, height: 24 }} />

      {/* Title */}
      <span style={{
        fontFamily: fonts.mono,
        fontSize: 14,
        fontWeight: 600,
        color: colors.claudeOrange,
      }}>
        {title}
      </span>

      {/* Tagline */}
      {tagline && (
        <span style={{
          fontFamily: fonts.mono,
          fontSize: 12,
          color: colors.textMuted,
          marginLeft: "auto",
        }}>
          {tagline}
        </span>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// CARD - bg-bg-secondary with border
// ═══════════════════════════════════════════════════════════════════════════
const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => {
  return (
    <div style={{
      backgroundColor: colors.bgSecondary,
      border: `1px solid ${colors.border}`,
      borderRadius: 8,
      padding: 16,
      ...style,
    }}>
      {children}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// LABEL - text-text-secondary uppercase
// ═══════════════════════════════════════════════════════════════════════════
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <span style={{
      fontFamily: fonts.mono,
      fontSize: 11,
      fontWeight: 500,
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      display: "block",
      marginBottom: 8,
    }}>
      {children}
    </span>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TEXTAREA - Input field styling
// ═══════════════════════════════════════════════════════════════════════════
const TextArea: React.FC<{
  content: string;
  placeholder?: string;
  cursorVisible?: boolean;
}> = ({ content, placeholder, cursorVisible = false }) => {
  return (
    <div style={{
      backgroundColor: colors.bgPrimary,
      border: `1px solid ${colors.border}`,
      borderRadius: 6,
      padding: 12,
      minHeight: 120,
    }}>
      <pre style={{
        fontFamily: fonts.mono,
        fontSize: 13,
        color: content ? colors.textPrimary : colors.textMuted,
        margin: 0,
        whiteSpace: "pre-wrap",
        lineHeight: 1.5,
      }}>
        {content || placeholder}
        {cursorVisible && <span style={{ color: colors.claudeOrange }}>|</span>}
      </pre>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// BUTTON - Primary orange button
// ═══════════════════════════════════════════════════════════════════════════
const Button: React.FC<{
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
}> = ({ children, loading, disabled }) => {
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      backgroundColor: disabled ? colors.bgTertiary : colors.claudeOrange,
      color: disabled ? colors.textMuted : "#ffffff",
      fontFamily: fonts.system,
      fontSize: 14,
      fontWeight: 600,
      padding: "10px 20px",
      borderRadius: 6,
      opacity: disabled ? 0.5 : 1,
    }}>
      {loading && (
        <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⚙️</span>
      )}
      {children}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT BOX - Shows generated content
// ═══════════════════════════════════════════════════════════════════════════
const OutputBox: React.FC<{
  lines: string[];
  style?: "text" | "code" | "poetry";
  revealProgress: number;
}> = ({ lines, style = "text", revealProgress }) => {
  const visibleLines = Math.floor(revealProgress * lines.length);

  const getTextStyle = (): React.CSSProperties => {
    switch (style) {
      case "code":
        return { fontFamily: fonts.mono, fontSize: 13, color: colors.accentGreen };
      case "poetry":
        return { fontFamily: "Georgia, serif", fontSize: 18, color: colors.textPrimary, fontStyle: "italic", textAlign: "center" };
      default:
        return { fontFamily: fonts.system, fontSize: 14, color: colors.textPrimary };
    }
  };

  return (
    <div style={{
      backgroundColor: colors.bgPrimary,
      border: `1px solid ${colors.claudeOrange}40`,
      borderRadius: 6,
      padding: 16,
      minHeight: 100,
    }}>
      {lines.slice(0, visibleLines + 1).map((line, i) => {
        const lineProgress = i < visibleLines ? 1 : (revealProgress * lines.length) - i;
        const opacity = Math.min(1, Math.max(0, lineProgress));

        return (
          <div
            key={i}
            style={{
              ...getTextStyle(),
              opacity,
              transform: `translateY(${(1 - opacity) * 10}px)`,
              marginBottom: 8,
              lineHeight: 1.6,
            }}
          >
            {style === "poetry" && i === 0 && <span style={{ color: colors.claudeOrange }}>"</span>}
            {line}
            {style === "poetry" && i === lines.length - 1 && <span style={{ color: colors.claudeOrange }}>"</span>}
          </div>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// FOOTER - Back link and attribution
// ═══════════════════════════════════════════════════════════════════════════
const Footer: React.FC = () => {
  return (
    <div style={{
      padding: "16px 0",
      marginTop: 24,
      textAlign: "center",
    }}>
      <span style={{
        fontFamily: fonts.system,
        fontSize: 14,
        color: colors.claudeOrange,
      }}>
        ← back
      </span>
      <p style={{
        fontFamily: fonts.system,
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 8,
      }}>
        claudecode.wtf · 100% of fees to @bcherny
      </p>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 3D CAMERA SYSTEM - Cinematic movements and perspective
// ═══════════════════════════════════════════════════════════════════════════

interface CameraState {
  rotateX: number;      // Tilt forward/backward
  rotateY: number;      // Rotate left/right
  rotateZ: number;      // Roll
  translateZ: number;   // Dolly in/out (negative = closer)
  translateX: number;   // Pan left/right
  translateY: number;   // Crane up/down
  scale: number;        // Zoom
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMERA POSITIONS - PERFECTLY CENTERED FOCAL POINTS
// ═══════════════════════════════════════════════════════════════════════════
// RULES:
// 1. Active element MUST be perfectly centered in frame
// 2. translateY: positive = view moves UP (see higher content)
// 3. translateY: negative = view moves DOWN (see lower content)
// 4. translateX: positive = view moves LEFT (see left content)
// 5. translateX: negative = view moves RIGHT (see right content)
// 6. At higher zoom (scale), smaller translate values have bigger effect
//
// LAYOUT REFERENCE (relative to center):
// - Header/Title: Y ≈ -180
// - TextArea center: Y ≈ -40
// - Button center: Y ≈ +100, X ≈ -250 (left-aligned)
// - Output text center: Y ≈ +20
// ═══════════════════════════════════════════════════════════════════════════

const CAMERA_POSITIONS = {
  // INTRO: Wide establishing shot - whole UI visible, cinematic tilt
  intro: {
    rotateX: 18,
    rotateY: -12,
    rotateZ: 0,
    translateZ: 300,
    translateX: 0,      // Centered
    translateY: 0,      // Centered
    scale: 0.7,
  },

  // INPUT TYPING: Extreme zoom on TextArea - CENTERED on the code
  // TextArea is slightly above center (Y ≈ -40), so translate UP to center it
  inputTyping: {
    rotateX: 3,
    rotateY: 0,
    rotateZ: 0,
    translateZ: -300,
    translateX: 0,      // TextArea is horizontally centered
    translateY: 80,     // Move view UP to center TextArea (which is above middle)
    scale: 2.2,
  },

  // CURSOR MOVING: Track from TextArea toward Button
  // Transitioning focus from center-top to bottom-left
  inputCursorMove: {
    rotateX: 3,
    rotateY: 2,
    rotateZ: 0,
    translateZ: -280,
    translateX: 200,    // Move view LEFT toward button (button is on left)
    translateY: -80,    // Move view DOWN toward button area
    scale: 2.4,
  },

  // BUTTON CLICK: Extreme tight on Button - PERFECTLY CENTERED
  // Button is at Y ≈ +100 (below center), X ≈ -250 (left side)
  inputButtonClick: {
    rotateX: 2,
    rotateY: 0,
    rotateZ: 0,
    translateZ: -400,
    translateX: 280,    // Move view LEFT to center the left-aligned button
    translateY: -160,   // Move view DOWN to center button (which is below middle)
    scale: 3.2,
  },

  // PROCESSING: Tight zoom on Spinner - CENTERED
  // Spinner is dead center of the card
  processing: {
    rotateX: 2,
    rotateY: 0,
    rotateZ: 0,
    translateZ: -300,
    translateX: 0,      // Spinner is centered
    translateY: 0,      // Spinner is centered
    scale: 2.4,
  },

  // OUTPUT REVEAL: Quick pullback - show the whole result appearing
  outputReveal: {
    rotateX: 12,
    rotateY: 5,
    rotateZ: 0,
    translateZ: 100,
    translateX: 0,
    translateY: 0,
    scale: 0.85,
  },

  // OUTPUT TYPING: Extreme zoom on Output text - CENTERED on where text appears
  // Output box is roughly centered, slightly below middle
  outputTyping: {
    rotateX: 2,
    rotateY: 0,
    rotateZ: 0,
    translateZ: -350,
    translateX: 0,      // Output text is centered horizontally
    translateY: -40,    // Move view slightly DOWN to center output area
    scale: 2.6,
  },

  // OUTPUT COMPLETE: Pull back to appreciate the full result
  outputComplete: {
    rotateX: 10,
    rotateY: 3,
    rotateZ: 0,
    translateZ: 60,
    translateX: 0,
    translateY: 0,
    scale: 0.95,
  },

  // CTA: Grand reveal - straight on, centered
  cta: {
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    translateZ: 100,
    translateX: 0,
    translateY: 0,
    scale: 1.0,
  },
};

const interpolateCamera = (
  from: CameraState,
  to: CameraState,
  progress: number,
  easing: (t: number) => number = Easing.inOut(Easing.cubic)
): CameraState => {
  const t = easing(progress);
  return {
    rotateX: from.rotateX + (to.rotateX - from.rotateX) * t,
    rotateY: from.rotateY + (to.rotateY - from.rotateY) * t,
    rotateZ: from.rotateZ + (to.rotateZ - from.rotateZ) * t,
    translateZ: from.translateZ + (to.translateZ - from.translateZ) * t,
    translateX: from.translateX + (to.translateX - from.translateX) * t,
    translateY: from.translateY + (to.translateY - from.translateY) * t,
    scale: from.scale + (to.scale - from.scale) * t,
  };
};

// 3D Wrapper that applies camera transforms
const Camera3D: React.FC<{
  camera: CameraState;
  children: React.ReactNode;
}> = ({ camera, children }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bgPrimary,
        perspective: 1200,
        perspectiveOrigin: "50% 50%",
      }}
    >
      {/* Ambient lighting effect - subtle gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 30%, rgba(218, 119, 86, 0.08) 0%, transparent 60%)`,
          pointerEvents: "none",
          zIndex: 10,
        }}
      />

      {/* Terminal window in 3D space */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          transformStyle: "preserve-3d",
          transform: `
            translateZ(${camera.translateZ}px)
            translateX(${camera.translateX}px)
            translateY(${camera.translateY}px)
            rotateX(${camera.rotateX}deg)
            rotateY(${camera.rotateY}deg)
            rotateZ(${camera.rotateZ}deg)
            scale(${camera.scale})
          `,
        }}
      >
        {/* Terminal window with shadow and reflection */}
        <div
          style={{
            width: "90%",
            maxWidth: 900,
            padding: "32px 5%",
            backgroundColor: colors.bgPrimary,
            borderRadius: 12,
            boxShadow: `
              0 50px 100px -20px rgba(0, 0, 0, 0.8),
              0 30px 60px -30px rgba(0, 0, 0, 0.6),
              0 0 0 1px ${colors.border},
              0 0 80px -20px rgba(218, 119, 86, 0.15)
            `,
            transformStyle: "preserve-3d",
          }}
        >
          {/* Subtle edge highlight */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${colors.border}, transparent)`,
              opacity: 0.5,
            }}
          />
          {children}
        </div>

        {/* Floor reflection */}
        <div
          style={{
            position: "absolute",
            bottom: -200,
            left: "50%",
            transform: "translateX(-50%) rotateX(90deg)",
            width: 1000,
            height: 400,
            background: `radial-gradient(ellipse at center, rgba(218, 119, 86, 0.1) 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PAGE CONTENT - The actual UI (no longer needs centering wrapper)
// ═══════════════════════════════════════════════════════════════════════════
const PageContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div style={{ width: "100%" }}>
      {children}
    </div>
  );
};

// Legacy PageWrapper for compatibility (not used in 3D mode)
const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AbsoluteFill style={{
      backgroundColor: colors.bgPrimary,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "32px 5%",
    }}>
      <div style={{
        width: "90%",
        maxWidth: 900,
      }}>
        {children}
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// CURSOR - Animated mouse cursor
// ═══════════════════════════════════════════════════════════════════════════
const Cursor: React.FC<{
  x: number;
  y: number;
  clicking?: boolean;
  visible?: boolean;
}> = ({ x, y, clicking = false, visible = true }) => {
  if (!visible) return null;

  return (
    <div style={{
      position: "absolute",
      left: x,
      top: y,
      width: 20,
      height: 20,
      transform: `scale(${clicking ? 0.8 : 1})`,
      transition: "transform 0.1s",
      zIndex: 1000,
      pointerEvents: "none",
    }}>
      {/* Cursor SVG */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M5.5 3.5L18.5 12.5L12 14L9.5 20.5L5.5 3.5Z"
          fill={clicking ? colors.claudeOrange : "#ffffff"}
          stroke={colors.bgPrimary}
          strokeWidth="1.5"
        />
      </svg>
      {/* Click ripple */}
      {clicking && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 30,
          height: 30,
          borderRadius: "50%",
          border: `2px solid ${colors.claudeOrange}`,
          animation: "ripple 0.3s ease-out",
          opacity: 0.6,
        }} />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE: INPUT - Shows the input state (3D version with cursor)
// ═══════════════════════════════════════════════════════════════════════════
const InputScene3D: React.FC<{
  featureName: string;
  tagline?: string;
  inputPlaceholder?: string;
  inputContent?: string;
  buttonText?: string;
  localFrame: number;  // Pass local frame for proper animation timing
}> = ({ featureName, tagline, inputPlaceholder, inputContent, buttonText, localFrame }) => {
  const frame = localFrame;

  // Typing animation (0-90 frames = 3 seconds)
  const typingProgress = interpolate(frame, [0, 90], [0, 1], { extrapolateRight: "clamp" });
  const fullContent = inputContent || "// Your code here...";
  const visibleChars = Math.floor(typingProgress * fullContent.length);
  const displayContent = fullContent.slice(0, visibleChars);
  const cursorVisible = frame % 20 < 10;

  // Fade in
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  // Button glow effect when typing completes
  const buttonGlow = interpolate(frame, [100, 120], [0, 1], { extrapolateRight: "clamp" });

  // Cursor animation - moves to button after typing
  const cursorStartX = 200;
  const cursorStartY = 180;
  const cursorEndX = 85;
  const cursorEndY = 320;

  const cursorMoveProgress = interpolate(frame, [95, 125], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  const cursorX = cursorStartX + (cursorEndX - cursorStartX) * cursorMoveProgress;
  const cursorY = cursorStartY + (cursorEndY - cursorStartY) * cursorMoveProgress;

  // Click animation
  const isClicking = frame >= 130 && frame < 145;
  const buttonPressed = frame >= 135;

  // Button press animation
  const buttonScale = buttonPressed
    ? interpolate(frame, [135, 140, 145], [1, 0.95, 1], { extrapolateRight: "clamp" })
    : 1;

  return (
    <PageContent>
      <div style={{ opacity, position: "relative" }}>
        <TerminalHeader title={featureName} tagline={tagline} />

        <Card>
          <Label>Your Code</Label>
          <TextArea
            content={displayContent}
            placeholder={inputPlaceholder}
            cursorVisible={cursorVisible && typingProgress < 1}
          />

          <div style={{
            marginTop: 16,
            filter: `drop-shadow(0 0 ${buttonGlow * 20}px ${colors.claudeOrange})`,
            transform: `scale(${buttonScale})`,
            transformOrigin: "left center",
          }}>
            <Button>{buttonText || "Generate"}</Button>
          </div>
        </Card>

        <Footer />

        {/* Animated cursor */}
        <Cursor
          x={cursorX}
          y={cursorY}
          clicking={isClicking}
          visible={frame > 30}
        />
      </div>
    </PageContent>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE: PROCESSING - Shows loading state (3D version)
// ═══════════════════════════════════════════════════════════════════════════
const ProcessingScene3D: React.FC<{
  featureName: string;
  tagline?: string;
  buttonText?: string;
  localFrame: number;
}> = ({ featureName, tagline, buttonText, localFrame }) => {
  const frame = localFrame;

  // Spinner rotation - FAST
  const rotation = frame * 15;

  // Progress bar - completes quickly
  const progress = interpolate(frame, [0, 35], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Dots animation - faster
  const dots = ".".repeat((Math.floor(frame / 4) % 4));

  // Pulse effect on spinner
  const pulse = Math.sin(frame * 0.4) * 0.15 + 1;

  return (
    <PageContent>
      <TerminalHeader title={featureName} tagline={tagline} />

      <Card style={{ textAlign: "center", padding: 48 }}>
        {/* Spinner with glow */}
        <div style={{
          width: 64,
          height: 64,
          margin: "0 auto 24px",
          border: `3px solid ${colors.border}`,
          borderTopColor: colors.claudeOrange,
          borderRadius: "50%",
          transform: `rotate(${rotation}deg) scale(${pulse})`,
          boxShadow: `0 0 30px ${colors.claudeOrange}40`,
        }} />

        <p style={{
          fontFamily: fonts.system,
          fontSize: 18,
          fontWeight: 600,
          color: colors.textPrimary,
          margin: 0,
        }}>
          Processing{dots}
        </p>

        {/* Progress bar */}
        <div style={{
          width: 200,
          height: 4,
          backgroundColor: colors.bgTertiary,
          borderRadius: 2,
          margin: "16px auto 0",
          overflow: "hidden",
        }}>
          <div style={{
            width: `${progress * 100}%`,
            height: "100%",
            backgroundColor: colors.claudeOrange,
            boxShadow: `0 0 10px ${colors.claudeOrange}`,
          }} />
        </div>

        <p style={{
          fontFamily: fonts.mono,
          fontSize: 12,
          color: colors.textMuted,
          marginTop: 12,
        }}>
          AI is working...
        </p>
      </Card>

      <Footer />
    </PageContent>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE: OUTPUT - Shows the result (3D version with typewriter animation)
// ═══════════════════════════════════════════════════════════════════════════
const OutputScene3D: React.FC<{
  featureName: string;
  tagline?: string;
  outputLines?: string[];
  outputStyle?: "text" | "code" | "poetry";
  localFrame: number;
}> = ({ featureName, tagline, outputLines = [], outputStyle = "text", localFrame }) => {
  const frame = localFrame;

  // Get the total characters to reveal
  const lines = outputLines.length > 0 ? outputLines : ["Your result appears here"];
  const totalChars = lines.reduce((acc, line) => acc + line.length, 0);

  // Typewriter animation - reveal characters over time (slower for readability)
  const charsPerFrame = 1.5; // Characters revealed per frame
  const typewriterDelay = 30; // Start after 30 frames (1 second)
  const charsRevealed = Math.max(0, Math.floor((frame - typewriterDelay) * charsPerFrame));

  // Calculate which lines and characters are visible
  const getVisibleContent = () => {
    let remaining = charsRevealed;
    const visibleLines: { text: string; complete: boolean }[] = [];

    for (const line of lines) {
      if (remaining <= 0) {
        break;
      }
      if (remaining >= line.length) {
        visibleLines.push({ text: line, complete: true });
        remaining -= line.length;
      } else {
        visibleLines.push({ text: line.slice(0, remaining), complete: false });
        remaining = 0;
      }
    }
    return visibleLines;
  };

  const visibleContent = getVisibleContent();
  const isTyping = charsRevealed < totalChars && frame > typewriterDelay;
  const typingCursorVisible = isTyping && frame % 15 < 8;

  // Success badge appears when typing completes
  const typingComplete = charsRevealed >= totalChars;
  const badgeOpacity = typingComplete
    ? interpolate(frame - (typewriterDelay + totalChars / charsPerFrame), [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 0;
  const badgeScale = typingComplete
    ? interpolate(frame - (typewriterDelay + totalChars / charsPerFrame), [0, 10, 20], [0.5, 1.15, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 0.5;

  // Output glow effect - builds as text appears
  const outputGlow = interpolate(frame, [typewriterDelay, typewriterDelay + 60], [0, 1], { extrapolateRight: "clamp" });

  // Text style based on output type
  const getTextStyle = (): React.CSSProperties => {
    switch (outputStyle) {
      case "code":
        return { fontFamily: fonts.mono, fontSize: 13, color: colors.accentGreen };
      case "poetry":
        return { fontFamily: "Georgia, serif", fontSize: 18, color: colors.textPrimary, fontStyle: "italic", textAlign: "center" };
      default:
        return { fontFamily: fonts.system, fontSize: 14, color: colors.textPrimary };
    }
  };

  return (
    <PageContent>
      <TerminalHeader title={featureName} tagline={tagline} />

      <Card style={{
        boxShadow: `0 0 ${outputGlow * 40}px ${colors.accentGreen}20`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Label>Result</Label>
          <div style={{
            opacity: badgeOpacity,
            transform: `scale(${badgeScale})`,
            padding: "4px 12px",
            backgroundColor: `${colors.accentGreen}20`,
            border: `1px solid ${colors.accentGreen}40`,
            borderRadius: 12,
            boxShadow: `0 0 15px ${colors.accentGreen}30`,
          }}>
            <span style={{
              fontFamily: fonts.mono,
              fontSize: 11,
              color: colors.accentGreen,
            }}>
              ✓ Complete
            </span>
          </div>
        </div>

        {/* Output box with typewriter effect */}
        <div style={{
          backgroundColor: colors.bgPrimary,
          border: `1px solid ${colors.claudeOrange}40`,
          borderRadius: 6,
          padding: 16,
          minHeight: 100,
        }}>
          {visibleContent.map((line, i) => (
            <div
              key={i}
              style={{
                ...getTextStyle(),
                marginBottom: 8,
                lineHeight: 1.6,
              }}
            >
              {outputStyle === "poetry" && i === 0 && <span style={{ color: colors.claudeOrange }}>"</span>}
              {line.text}
              {/* Show cursor at end of currently typing line */}
              {!line.complete && typingCursorVisible && (
                <span style={{
                  color: colors.accentGreen,
                  fontWeight: "bold",
                  marginLeft: 1,
                }}>|</span>
              )}
              {outputStyle === "poetry" && i === lines.length - 1 && line.complete && (
                <span style={{ color: colors.claudeOrange }}>"</span>
              )}
            </div>
          ))}
          {/* Show cursor on new line if between lines */}
          {visibleContent.length > 0 && visibleContent[visibleContent.length - 1].complete && isTyping && typingCursorVisible && (
            <div style={{ ...getTextStyle() }}>
              <span style={{ color: colors.accentGreen, fontWeight: "bold" }}>|</span>
            </div>
          )}
        </div>
      </Card>

      <Footer />
    </PageContent>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE: CTA - Call to action (3D version with dramatic reveal)
// ═══════════════════════════════════════════════════════════════════════════
const CTAScene3D: React.FC<{ featureSlug: string; featureName: string; localFrame: number }> = ({ featureSlug, featureName, localFrame }) => {
  const frame = localFrame;

  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(frame, [0, 30], [0.95, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const urlReveal = interpolate(frame, [30, 60], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Logo glow pulse
  const glowPulse = Math.sin(frame * 0.1) * 10 + 30;

  // Badge slide up
  const badgeSlide = interpolate(frame, [50, 80], [20, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const badgeOpacity = interpolate(frame, [50, 70], [0, 1], { extrapolateRight: "clamp" });

  return (
    <PageContent>
      <div style={{
        opacity,
        transform: `scale(${scale})`,
        textAlign: "center",
        paddingTop: 60,
      }}>
        {/* Logo with animated glow */}
        <Img
          src={staticFile("cc.png")}
          style={{
            width: 100,
            height: 100,
            marginBottom: 32,
            filter: `drop-shadow(0 0 ${glowPulse}px rgba(218, 119, 86, 0.6))`,
          }}
        />

        {/* CTA Text */}
        <h2 style={{
          fontFamily: fonts.system,
          fontSize: 48,
          fontWeight: 700,
          color: colors.textPrimary,
          margin: 0,
          marginBottom: 16,
          textShadow: `0 0 40px rgba(218, 119, 86, 0.3)`,
        }}>
          Try it now
        </h2>

        {/* URL with glow */}
        <div style={{ overflow: "hidden" }}>
          <p style={{
            fontFamily: fonts.mono,
            fontSize: 28,
            color: colors.claudeOrange,
            margin: 0,
            clipPath: `inset(0 ${(1 - urlReveal) * 100}% 0 0)`,
            textShadow: `0 0 20px ${colors.claudeOrange}80`,
          }}>
            claudecode.wtf/{featureSlug}
          </p>
        </div>

        {/* Badge with slide animation */}
        <div style={{
          marginTop: 32,
          display: "inline-block",
          padding: "10px 24px",
          border: `1px solid ${colors.border}`,
          borderRadius: 6,
          backgroundColor: colors.bgSecondary,
          opacity: badgeOpacity,
          transform: `translateY(${badgeSlide}px)`,
        }}>
          <span style={{
            fontFamily: fonts.mono,
            fontSize: 13,
            color: colors.textMuted,
            letterSpacing: "0.15em",
          }}>
            POWERED BY $CC
          </span>
        </div>
      </div>
    </PageContent>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPOSITION - 20 seconds total with 3D cinematic camera
// Zooms in on active elements as they're being interacted with
// ═══════════════════════════════════════════════════════════════════════════
export const WebappTrailer: React.FC<WebappTrailerProps> = ({
  featureName = "New Feature",
  featureSlug = "feature",
  tagline,
  inputPlaceholder,
  inputContent,
  buttonText,
  outputLines,
  outputStyle,
}) => {
  const frame = useCurrentFrame();

  // Timeline: Input (5s) → Processing (1.5s) → Output (8s) → CTA (5.5s) = 20s
  const INPUT_FRAMES = 150;      // 5 seconds
  const PROCESSING_FRAMES = 45;  // 1.5 seconds (snappy!)
  const OUTPUT_FRAMES = 240;     // 8 seconds
  const CTA_FRAMES = 165;        // 5.5 seconds

  // Scene boundaries
  const inputEnd = INPUT_FRAMES;
  const processingEnd = inputEnd + PROCESSING_FRAMES;
  const outputEnd = processingEnd + OUTPUT_FRAMES;

  // Calculate camera position based on what's happening
  const getCameraForFrame = (f: number): CameraState => {
    if (f < inputEnd) {
      // INPUT SCENE: Multiple phases
      // Phase 1 (0-30): Intro establishing shot
      // Phase 2 (30-95): Zoom in on text area while typing
      // Phase 3 (95-130): Track cursor moving to button
      // Phase 4 (130-150): Tight zoom on button click

      if (f < 30) {
        // Intro: Establishing shot
        const progress = f / 30;
        return interpolateCamera(
          CAMERA_POSITIONS.intro,
          CAMERA_POSITIONS.inputTyping,
          progress,
          Easing.out(Easing.cubic)
        );
      } else if (f < 95) {
        // Typing: Stay zoomed on text area
        return CAMERA_POSITIONS.inputTyping;
      } else if (f < 130) {
        // Cursor moving: Track toward button
        const progress = (f - 95) / 35;
        return interpolateCamera(
          CAMERA_POSITIONS.inputTyping,
          CAMERA_POSITIONS.inputCursorMove,
          progress,
          Easing.inOut(Easing.cubic)
        );
      } else {
        // Button click: Tight zoom
        const progress = (f - 130) / 20;
        return interpolateCamera(
          CAMERA_POSITIONS.inputCursorMove,
          CAMERA_POSITIONS.inputButtonClick,
          progress,
          Easing.out(Easing.cubic)
        );
      }
    } else if (f < processingEnd) {
      // PROCESSING SCENE: Quick zoom to spinner
      const localFrame = f - inputEnd;
      const progress = localFrame / PROCESSING_FRAMES;
      return interpolateCamera(
        CAMERA_POSITIONS.inputButtonClick,
        CAMERA_POSITIONS.processing,
        Math.min(1, progress * 2),  // Quick transition
        Easing.out(Easing.cubic)
      );
    } else if (f < outputEnd) {
      // OUTPUT SCENE: Multiple phases
      // Phase 1 (0-30): Pull back for reveal
      // Phase 2 (30-180): Zoom in on text being written
      // Phase 3 (180-240): Pull back to appreciate

      const localFrame = f - processingEnd;

      if (localFrame < 30) {
        // Quick pull back for reveal
        const progress = localFrame / 30;
        return interpolateCamera(
          CAMERA_POSITIONS.processing,
          CAMERA_POSITIONS.outputReveal,
          progress,
          Easing.out(Easing.cubic)
        );
      } else if (localFrame < 180) {
        // Zoom in on text being written
        const progress = (localFrame - 30) / 60;  // Transition takes 2 seconds
        return interpolateCamera(
          CAMERA_POSITIONS.outputReveal,
          CAMERA_POSITIONS.outputTyping,
          Math.min(1, progress),
          Easing.inOut(Easing.cubic)
        );
      } else {
        // Pull back to appreciate completed output
        const progress = (localFrame - 180) / 60;
        return interpolateCamera(
          CAMERA_POSITIONS.outputTyping,
          CAMERA_POSITIONS.outputComplete,
          Math.min(1, progress),
          Easing.inOut(Easing.cubic)
        );
      }
    } else {
      // CTA SCENE: Straighten up for clean finish
      const localFrame = f - outputEnd;
      const progress = Math.min(1, localFrame / 45);  // 1.5 second transition
      return interpolateCamera(
        CAMERA_POSITIONS.outputComplete,
        CAMERA_POSITIONS.cta,
        progress,
        Easing.out(Easing.cubic)
      );
    }
  };

  const camera = getCameraForFrame(frame);

  // Calculate local frame for each scene
  const getLocalFrame = (): number => {
    if (frame < inputEnd) return frame;
    if (frame < processingEnd) return frame - inputEnd;
    if (frame < outputEnd) return frame - processingEnd;
    return frame - outputEnd;
  };

  const localFrame = getLocalFrame();

  // Render scene content with local frame for proper animations
  const renderSceneContent = () => {
    if (frame < inputEnd) {
      return (
        <InputScene3D
          featureName={featureName}
          tagline={tagline}
          inputPlaceholder={inputPlaceholder}
          inputContent={inputContent}
          buttonText={buttonText}
          localFrame={localFrame}
        />
      );
    } else if (frame < processingEnd) {
      return (
        <ProcessingScene3D
          featureName={featureName}
          tagline={tagline}
          buttonText={buttonText}
          localFrame={localFrame}
        />
      );
    } else if (frame < outputEnd) {
      return (
        <OutputScene3D
          featureName={featureName}
          tagline={tagline}
          outputLines={outputLines}
          outputStyle={outputStyle}
          localFrame={localFrame}
        />
      );
    } else {
      return (
        <CTAScene3D
          featureSlug={featureSlug}
          featureName={featureName}
          localFrame={localFrame}
        />
      );
    }
  };

  // Scene transition crossfade (quick and smooth)
  const getSceneOpacity = () => {
    const fadeFrames = 6; // Quick 6-frame crossfade

    // Fade out at end of input scene
    if (frame >= inputEnd - fadeFrames && frame < inputEnd) {
      return interpolate(frame, [inputEnd - fadeFrames, inputEnd], [1, 0]);
    }
    // Fade in at start of processing
    if (frame >= inputEnd && frame < inputEnd + fadeFrames) {
      return interpolate(frame, [inputEnd, inputEnd + fadeFrames], [0, 1]);
    }
    // Fade out at end of processing
    if (frame >= processingEnd - fadeFrames && frame < processingEnd) {
      return interpolate(frame, [processingEnd - fadeFrames, processingEnd], [1, 0]);
    }
    // Fade in at start of output
    if (frame >= processingEnd && frame < processingEnd + fadeFrames) {
      return interpolate(frame, [processingEnd, processingEnd + fadeFrames], [0, 1]);
    }
    // Fade out at end of output
    if (frame >= outputEnd - fadeFrames && frame < outputEnd) {
      return interpolate(frame, [outputEnd - fadeFrames, outputEnd], [1, 0]);
    }
    // Fade in at start of CTA
    if (frame >= outputEnd && frame < outputEnd + fadeFrames) {
      return interpolate(frame, [outputEnd, outputEnd + fadeFrames], [0, 1]);
    }
    return 1;
  };

  return (
    <Camera3D camera={camera}>
      <div style={{ opacity: getSceneOpacity() }}>
        {renderSceneContent()}
      </div>
    </Camera3D>
  );
};
