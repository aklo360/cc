import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  interpolate,
  Easing,
  Img,
  staticFile,
} from "remotion";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WEBAPP TRAILER - Looks EXACTLY like the real claudecode.wtf UI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This recreates the ACTUAL webapp UI in Remotion using the same:
 * - Colors (#0d0d0d, #1a1a1a, #da7756, etc.)
 * - Components (terminal header, cards, buttons)
 * - Typography (JetBrains Mono, system fonts)
 * - Layout (max-w-[900px], centered)
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
// PAGE WRAPPER - Centers content like the real app
// ═══════════════════════════════════════════════════════════════════════════
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
// SCENE: INPUT - Shows the input state
// ═══════════════════════════════════════════════════════════════════════════
const InputScene: React.FC<{
  featureName: string;
  tagline?: string;
  inputPlaceholder?: string;
  inputContent?: string;
  buttonText?: string;
}> = ({ featureName, tagline, inputPlaceholder, inputContent, buttonText }) => {
  const frame = useCurrentFrame();

  // Typing animation
  const typingProgress = interpolate(frame, [0, 90], [0, 1], { extrapolateRight: "clamp" });
  const fullContent = inputContent || "// Your code here...";
  const visibleChars = Math.floor(typingProgress * fullContent.length);
  const displayContent = fullContent.slice(0, visibleChars);
  const cursorVisible = frame % 30 < 15;

  // Fade in
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <PageWrapper>
      <div style={{ opacity }}>
        <TerminalHeader title={featureName} tagline={tagline} />

        <Card>
          <Label>Your Code</Label>
          <TextArea
            content={displayContent}
            placeholder={inputPlaceholder}
            cursorVisible={cursorVisible && typingProgress < 1}
          />

          <div style={{ marginTop: 16 }}>
            <Button>{buttonText || "Generate"}</Button>
          </div>
        </Card>

        <Footer />
      </div>
    </PageWrapper>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE: PROCESSING - Shows loading state
// ═══════════════════════════════════════════════════════════════════════════
const ProcessingScene: React.FC<{
  featureName: string;
  tagline?: string;
  buttonText?: string;
}> = ({ featureName, tagline, buttonText }) => {
  const frame = useCurrentFrame();

  // Spinner rotation - FAST
  const rotation = frame * 8;

  // Progress bar - completes quickly
  const progress = interpolate(frame, [0, 40], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Dots animation - faster
  const dots = ".".repeat((Math.floor(frame / 6) % 4));

  return (
    <PageWrapper>
      <TerminalHeader title={featureName} tagline={tagline} />

      <Card style={{ textAlign: "center", padding: 48 }}>
        {/* Spinner */}
        <div style={{
          width: 64,
          height: 64,
          margin: "0 auto 24px",
          border: `3px solid ${colors.border}`,
          borderTopColor: colors.claudeOrange,
          borderRadius: "50%",
          transform: `rotate(${rotation}deg)`,
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
    </PageWrapper>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE: OUTPUT - Shows the result
// ═══════════════════════════════════════════════════════════════════════════
const OutputScene: React.FC<{
  featureName: string;
  tagline?: string;
  outputLines?: string[];
  outputStyle?: "text" | "code" | "poetry";
}> = ({ featureName, tagline, outputLines = [], outputStyle = "text" }) => {
  const frame = useCurrentFrame();

  // Reveal animation
  const revealProgress = interpolate(frame, [0, 120], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Success badge fade in
  const badgeOpacity = interpolate(frame, [60, 90], [0, 1], { extrapolateRight: "clamp" });

  return (
    <PageWrapper>
      <TerminalHeader title={featureName} tagline={tagline} />

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Label>Result</Label>
          <div style={{
            opacity: badgeOpacity,
            padding: "4px 12px",
            backgroundColor: `${colors.accentGreen}20`,
            border: `1px solid ${colors.accentGreen}40`,
            borderRadius: 12,
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

        <OutputBox
          lines={outputLines.length > 0 ? outputLines : ["Your result appears here"]}
          style={outputStyle}
          revealProgress={revealProgress}
        />
      </Card>

      <Footer />
    </PageWrapper>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE: CTA - Call to action
// ═══════════════════════════════════════════════════════════════════════════
const CTAScene: React.FC<{ featureSlug: string; featureName: string }> = ({ featureSlug, featureName }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(frame, [0, 30], [0.95, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const urlReveal = interpolate(frame, [30, 60], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{
      backgroundColor: colors.bgPrimary,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    }}>
      <div style={{
        opacity,
        transform: `scale(${scale})`,
        textAlign: "center",
      }}>
        {/* Logo */}
        <Img
          src={staticFile("cc.png")}
          style={{
            width: 80,
            height: 80,
            marginBottom: 32,
            filter: "drop-shadow(0 0 20px rgba(218, 119, 86, 0.5))",
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
        }}>
          Try it now
        </h2>

        {/* URL */}
        <div style={{ overflow: "hidden" }}>
          <p style={{
            fontFamily: fonts.mono,
            fontSize: 24,
            color: colors.claudeOrange,
            margin: 0,
            clipPath: `inset(0 ${(1 - urlReveal) * 100}% 0 0)`,
          }}>
            claudecode.wtf/{featureSlug}
          </p>
        </div>

        {/* Badge */}
        <div style={{
          marginTop: 32,
          display: "inline-block",
          padding: "8px 20px",
          border: `1px solid ${colors.border}`,
          borderRadius: 4,
        }}>
          <span style={{
            fontFamily: fonts.mono,
            fontSize: 12,
            color: colors.textMuted,
            letterSpacing: "0.1em",
          }}>
            POWERED BY $CC
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPOSITION - 20 seconds total
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
  // Timeline: Input (5s) → Processing (1.5s) → Output (8s) → CTA (5.5s) = 20s
  // Processing is SNAPPY - just a quick flash
  const INPUT_FRAMES = 150;      // 5 seconds
  const PROCESSING_FRAMES = 45;  // 1.5 seconds (snappy!)
  const OUTPUT_FRAMES = 240;     // 8 seconds (more time for output reveal)
  const CTA_FRAMES = 165;        // 5.5 seconds

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgPrimary }}>
      <Sequence from={0} durationInFrames={INPUT_FRAMES}>
        <InputScene
          featureName={featureName}
          tagline={tagline}
          inputPlaceholder={inputPlaceholder}
          inputContent={inputContent}
          buttonText={buttonText}
        />
      </Sequence>

      <Sequence from={INPUT_FRAMES} durationInFrames={PROCESSING_FRAMES}>
        <ProcessingScene
          featureName={featureName}
          tagline={tagline}
          buttonText={buttonText}
        />
      </Sequence>

      <Sequence from={INPUT_FRAMES + PROCESSING_FRAMES} durationInFrames={OUTPUT_FRAMES}>
        <OutputScene
          featureName={featureName}
          tagline={tagline}
          outputLines={outputLines}
          outputStyle={outputStyle}
        />
      </Sequence>

      <Sequence from={INPUT_FRAMES + PROCESSING_FRAMES + OUTPUT_FRAMES} durationInFrames={CTA_FRAMES}>
        <CTAScene featureSlug={featureSlug} featureName={featureName} />
      </Sequence>
    </AbsoluteFill>
  );
};
