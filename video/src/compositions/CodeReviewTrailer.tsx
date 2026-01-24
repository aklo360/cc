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
  Audio,
} from 'remotion';

import {
  SeveritySelector,
  CodeInputCard,
  ReviewResult,
  COLORS,
} from '../components/CodeReview';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CODE REVIEW TRAILER - Exact UI Recreation of Code Review Bot
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This composition recreates the EXACT UI from /review page:
 * - Title with roast level selector
 * - Code input with typing animation
 * - Roast button click
 * - Results with score and issues
 *
 * Timeline (15 seconds @ 30fps = 450 frames):
 * 0-75:    Title Card (2.5s)
 * 75-165:  Severity Selection (3s)
 * 165-285: Code Input + Button (4s)
 * 285-390: Results Display (3.5s)
 * 390-450: CTA (2s)
 */

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 1: TITLE CARD
// ═══════════════════════════════════════════════════════════════════════════
const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoProgress = spring({ frame, fps, config: { damping: 15, stiffness: 100 } });
  const logoScale = interpolate(logoProgress, [0, 1], [1.5, 1]);
  const logoOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  const titleReveal = interpolate(frame, [20, 45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const subtitleOpacity = interpolate(frame, [50, 65], [0, 1], { extrapolateRight: 'clamp' });
  const glowIntensity = interpolate(Math.sin(frame * 0.1), [-1, 1], [0.3, 0.6]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgPrimary,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Background gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 80% 50% at 50% 50%, ${COLORS.claudeOrange}15 0%, transparent 70%)`,
        }}
      />

      {/* Logo */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
          marginBottom: 40,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: -30,
            background: `radial-gradient(circle, ${COLORS.claudeOrange}${Math.floor(glowIntensity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
            filter: 'blur(20px)',
          }}
        />
        <Img
          src={staticFile('cc.png')}
          style={{
            width: 140,
            height: 140,
            position: 'relative',
            filter: `drop-shadow(0 0 30px ${COLORS.claudeOrange}80)`,
          }}
        />
      </div>

      {/* Title */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ clipPath: `inset(0 ${(1 - titleReveal) * 100}% 0 0)` }}>
          <h1
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
              fontSize: 80,
              fontWeight: 700,
              color: COLORS.claudeOrange,
              letterSpacing: '-0.02em',
              margin: 0,
              textShadow: `0 0 60px ${COLORS.claudeOrange}${Math.floor(glowIntensity * 255).toString(16).padStart(2, '0')}`,
            }}
          >
            CODE REVIEW BOT
          </h1>
        </div>
        {/* Scan line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: `${titleReveal * 100}%`,
            width: 3,
            height: '100%',
            background: `linear-gradient(180deg, transparent, ${COLORS.claudeOrange}, transparent)`,
            opacity: titleReveal < 1 ? 1 : 0,
            boxShadow: `0 0 20px ${COLORS.claudeOrange}`,
          }}
        />
      </div>

      {/* Subtitle */}
      <p
        style={{
          fontFamily: "-apple-system, sans-serif",
          fontSize: 28,
          fontWeight: 500,
          color: COLORS.textSecondary,
          marginTop: 25,
          opacity: subtitleOpacity,
          letterSpacing: '0.1em',
        }}
      >
        Get roasted (constructively)
      </p>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 2: SEVERITY SELECTION
// ═══════════════════════════════════════════════════════════════════════════
const SeverityScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Animate through severity levels
  const severityIndex = Math.floor(interpolate(frame, [20, 70], [0, 2.99], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }));

  const severities = ['mild', 'spicy', 'nuclear'] as const;
  const activeSeverity = severities[severityIndex];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgPrimary,
        padding: 60,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 700 }}>
        <h2
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
            fontSize: 36,
            fontWeight: 600,
            color: COLORS.textPrimary,
            marginBottom: 30,
            textAlign: 'center',
          }}
        >
          Pick Your Roast Level
        </h2>
        <SeveritySelector activeSeverity={activeSeverity} />
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 3: CODE INPUT
// ═══════════════════════════════════════════════════════════════════════════
const CodeInputScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Typing animation
  const typingProgress = interpolate(frame, [0, 80], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Button highlight near end of scene
  const buttonHighlight = frame > 90;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgPrimary,
        padding: 60,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 700 }}>
        <CodeInputCard
          typingProgress={typingProgress}
          buttonHighlight={buttonHighlight}
        />
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 4: RESULTS
// ═══════════════════════════════════════════════════════════════════════════
const ResultsScene: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgPrimary,
        padding: 60,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'auto',
      }}
    >
      <div style={{ width: '100%', maxWidth: 700 }}>
        <ReviewResult score={40} showIssues={true} />
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 5: CTA
// ═══════════════════════════════════════════════════════════════════════════
const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scaleProgress = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const scale = interpolate(scaleProgress, [0, 1], [0.8, 1]);
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  const urlReveal = interpolate(frame, [15, 35], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const glowIntensity = interpolate(Math.sin(frame * 0.1), [-1, 1], [0.4, 0.8]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgPrimary,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 60% 40% at 50% 50%, ${COLORS.claudeOrange}25 0%, transparent 70%)`,
        }}
      />

      <div
        style={{
          transform: `scale(${scale})`,
          opacity,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', marginBottom: 30 }}>
          <div
            style={{
              position: 'absolute',
              inset: -20,
              background: `radial-gradient(circle, ${COLORS.claudeOrange}${Math.floor(glowIntensity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
              filter: 'blur(20px)',
            }}
          />
          <Img
            src={staticFile('cc.png')}
            style={{
              width: 80,
              height: 80,
              position: 'relative',
              filter: `drop-shadow(0 0 15px ${COLORS.claudeOrange}80)`,
            }}
          />
        </div>

        <h2
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
            fontSize: 64,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '0.05em',
            margin: 0,
          }}
        >
          GET ROASTED
        </h2>

        <div style={{ marginTop: 20, overflow: 'hidden', position: 'relative' }}>
          <p
            style={{
              fontFamily: "-apple-system, sans-serif",
              fontSize: 32,
              fontWeight: 500,
              color: COLORS.claudeOrange,
              letterSpacing: '0.1em',
              margin: 0,
              clipPath: `inset(0 ${(1 - urlReveal) * 100}% 0 0)`,
            }}
          >
            claudecode.wtf/review
          </p>
        </div>

        <div
          style={{
            marginTop: 25,
            padding: '6px 18px',
            border: `1px solid ${COLORS.claudeOrange}66`,
            borderRadius: 4,
          }}
        >
          <span
            style={{
              fontFamily: "-apple-system, sans-serif",
              fontSize: 16,
              fontWeight: 600,
              color: `${COLORS.claudeOrange}cc`,
              letterSpacing: '0.2em',
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
// SCENE WRAPPER WITH FADE TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════
const FadeScene: React.FC<{ children: React.ReactNode; durationInFrames: number }> = ({
  children,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const FADE_FRAMES = 8;

  const opacity = interpolate(
    frame,
    [0, FADE_FRAMES, durationInFrames - FADE_FRAMES, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPOSITION
// ═══════════════════════════════════════════════════════════════════════════
export const CodeReviewTrailer: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Music fade in/out
  const musicVolume = interpolate(
    frame,
    [0, 20, durationInFrames - 20, durationInFrames],
    [0, 0.5, 0.5, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bgPrimary }}>
      {/* Background Music */}
      <Audio src={staticFile('bgm_level1.ogg')} volume={musicVolume} startFrom={0} />

      {/* Scene 1: Title (0-75 frames, 2.5s) */}
      <Sequence from={0} durationInFrames={75}>
        <FadeScene durationInFrames={75}>
          <TitleScene />
        </FadeScene>
      </Sequence>

      {/* Scene 2: Severity Selection (75-165 frames, 3s) */}
      <Sequence from={75} durationInFrames={90}>
        <FadeScene durationInFrames={90}>
          <SeverityScene />
        </FadeScene>
      </Sequence>

      {/* Scene 3: Code Input (165-285 frames, 4s) */}
      <Sequence from={165} durationInFrames={120}>
        <FadeScene durationInFrames={120}>
          <CodeInputScene />
        </FadeScene>
      </Sequence>

      {/* Scene 4: Results (285-390 frames, 3.5s) */}
      <Sequence from={285} durationInFrames={105}>
        <FadeScene durationInFrames={105}>
          <ResultsScene />
        </FadeScene>
      </Sequence>

      {/* Scene 5: CTA (390-450 frames, 2s) */}
      <Sequence from={390} durationInFrames={60}>
        <FadeScene durationInFrames={60}>
          <CTAScene />
        </FadeScene>
      </Sequence>
    </AbsoluteFill>
  );
};

export default CodeReviewTrailer;
