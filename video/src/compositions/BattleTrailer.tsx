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
  WelcomeCard,
  DailyChallengeCard,
  ChallengeGrid,
  CompletedScreen,
  CodeEditorScene,
  COLORS,
  TRAILER_CHALLENGES,
  DAILY_CHALLENGE,
} from '../components/BattleArena';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BATTLE TRAILER - Exact UI Recreation of Code Battle Arena
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This composition recreates the EXACT UI from /battle page:
 * - Welcome section with ⚔️ Code Battle Arena header
 * - Daily Challenge card with purple gradient
 * - Challenge grid with difficulty badges
 * - Code editor with timer
 * - Completion screen with confetti
 *
 * Timeline (30 seconds @ 30fps = 900 frames):
 * 0-90:    Title Card (3s)
 * 90-270:  Menu Screen (6s) - Welcome + Daily Challenge
 * 270-420: Challenge Selection (5s) - Grid with selection animation
 * 420-630: Playing State (7s) - Code editor with typing
 * 630-780: Success Screen (5s) - Complete with confetti
 * 780-900: CTA (4s)
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

      {/* Title with sword emoji */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ clipPath: `inset(0 ${(1 - titleReveal) * 100}% 0 0)` }}>
          <h1
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
              fontSize: 90,
              fontWeight: 700,
              color: COLORS.claudeOrange,
              letterSpacing: '-0.02em',
              margin: 0,
              textShadow: `0 0 60px ${COLORS.claudeOrange}${Math.floor(glowIntensity * 255).toString(16).padStart(2, '0')}`,
            }}
          >
            CODE BATTLE ARENA
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
        Race against the clock
      </p>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 2: MENU SCREEN
// ═══════════════════════════════════════════════════════════════════════════
const MenuScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Show daily challenge after 30 frames (1 second)
  const showDailyChallenge = frame >= 30;

  // Daily challenge fade in
  const dailyChallengeOpacity = interpolate(frame, [30, 45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgPrimary,
        padding: 60,
      }}
    >
      <div
        style={{
          maxWidth: 1000,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 30,
        }}
      >
        {/* Welcome Card - always visible */}
        <WelcomeCard playerName="Anonymous Coder" />

        {/* Daily Challenge - fades in after 1 second, positioned below welcome */}
        {showDailyChallenge && (
          <div style={{ opacity: dailyChallengeOpacity }}>
            <DailyChallengeCard challenge={DAILY_CHALLENGE} buttonHighlight={frame > 120} />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 3: CHALLENGE SELECTION
// ═══════════════════════════════════════════════════════════════════════════
const SelectionScene: React.FC = () => {
  const frame = useCurrentFrame();

  const containerOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  // Animate through challenges
  const highlightIndex = Math.floor(interpolate(frame, [30, 120], [0, 2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  }));

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgPrimary,
        padding: 60,
        opacity: containerOpacity,
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h2
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
            fontSize: 36,
            fontWeight: 600,
            color: COLORS.textPrimary,
            marginBottom: 30,
          }}
        >
          Choose Your Challenge
        </h2>
        <ChallengeGrid challenges={TRAILER_CHALLENGES} highlightIndex={highlightIndex} />
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 4: PLAYING STATE
// ═══════════════════════════════════════════════════════════════════════════
const PlayingScene: React.FC = () => {
  const solutionCode = `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgPrimary,
        padding: 60,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <CodeEditorScene challenge={DAILY_CHALLENGE} solutionCode={solutionCode} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 5: SUCCESS SCREEN
// ═══════════════════════════════════════════════════════════════════════════
const SuccessScene: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgPrimary,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <CompletedScreen challenge={DAILY_CHALLENGE} completionTime={47} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 6: CTA
// ═══════════════════════════════════════════════════════════════════════════
const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scaleProgress = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const scale = interpolate(scaleProgress, [0, 1], [0.8, 1]);
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  const urlReveal = interpolate(frame, [20, 45], [0, 1], {
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
        <div style={{ position: 'relative', marginBottom: 40 }}>
          <div
            style={{
              position: 'absolute',
              inset: -30,
              background: `radial-gradient(circle, ${COLORS.claudeOrange}${Math.floor(glowIntensity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
              filter: 'blur(25px)',
            }}
          />
          <Img
            src={staticFile('cc.png')}
            style={{
              width: 100,
              height: 100,
              position: 'relative',
              filter: `drop-shadow(0 0 20px ${COLORS.claudeOrange}80)`,
            }}
          />
        </div>

        <h2
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
            fontSize: 72,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '0.05em',
            margin: 0,
            textShadow: `0 0 60px ${COLORS.claudeOrange}${Math.floor(glowIntensity * 255).toString(16).padStart(2, '0')}`,
          }}
        >
          TRY IT NOW
        </h2>

        <div style={{ marginTop: 25, overflow: 'hidden', position: 'relative' }}>
          <p
            style={{
              fontFamily: "-apple-system, sans-serif",
              fontSize: 36,
              fontWeight: 500,
              color: COLORS.claudeOrange,
              letterSpacing: '0.1em',
              margin: 0,
              clipPath: `inset(0 ${(1 - urlReveal) * 100}% 0 0)`,
            }}
          >
            claudecode.wtf/battle
          </p>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: `${urlReveal * 100}%`,
              width: 2,
              height: '100%',
              background: COLORS.claudeOrange,
              opacity: urlReveal < 1 ? 1 : 0,
              boxShadow: `0 0 10px ${COLORS.claudeOrange}`,
            }}
          />
        </div>

        <div
          style={{
            marginTop: 35,
            padding: '8px 24px',
            border: `1px solid ${COLORS.claudeOrange}66`,
            borderRadius: 4,
          }}
        >
          <span
            style={{
              fontFamily: "-apple-system, sans-serif",
              fontSize: 18,
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
export const BattleTrailer: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Music fade in/out like StarClaude64
  const musicVolume = interpolate(
    frame,
    [0, 30, durationInFrames - 30, durationInFrames],
    [0, 0.6, 0.6, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bgPrimary }}>
      {/* Background Music - Use the real game music like StarClaude64 */}
      <Audio src={staticFile('bgm_level1.ogg')} volume={musicVolume} startFrom={0} />

      {/* Scene 1: Title (0-100 frames, 3.3s) - with fade out */}
      <Sequence from={0} durationInFrames={100}>
        <FadeScene durationInFrames={100}>
          <TitleScene />
        </FadeScene>
      </Sequence>

      {/* Scene 2: Menu Screen (100-280 frames, 6s) - with fade in/out */}
      <Sequence from={100} durationInFrames={180}>
        <FadeScene durationInFrames={180}>
          <MenuScene />
        </FadeScene>
      </Sequence>

      {/* Scene 3: Challenge Selection (280-430 frames, 5s) */}
      <Sequence from={280} durationInFrames={150}>
        <FadeScene durationInFrames={150}>
          <SelectionScene />
        </FadeScene>
      </Sequence>

      {/* Scene 4: Playing State (430-640 frames, 7s) */}
      <Sequence from={430} durationInFrames={210}>
        <FadeScene durationInFrames={210}>
          <PlayingScene />
        </FadeScene>
      </Sequence>

      {/* Scene 5: Success Screen (640-790 frames, 5s) */}
      <Sequence from={640} durationInFrames={150}>
        <FadeScene durationInFrames={150}>
          <SuccessScene />
        </FadeScene>
      </Sequence>

      {/* Scene 6: CTA (790-900 frames, 3.7s) */}
      <Sequence from={790} durationInFrames={110}>
        <FadeScene durationInFrames={110}>
          <CTAScene />
        </FadeScene>
      </Sequence>
    </AbsoluteFill>
  );
};

export default BattleTrailer;
