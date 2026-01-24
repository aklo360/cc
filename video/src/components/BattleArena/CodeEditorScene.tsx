import React from 'react';
import { useCurrentFrame, interpolate, Easing, Img, staticFile } from 'remotion';
import { COLORS, Challenge } from './colors';

interface CodeEditorSceneProps {
  challenge: Challenge;
  solutionCode: string;
}

export const CodeEditorScene: React.FC<CodeEditorSceneProps> = ({
  challenge,
  solutionCode,
}) => {
  const frame = useCurrentFrame();

  // Typing animation
  const typingProgress = interpolate(frame, [0, 120], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const visibleChars = Math.floor(typingProgress * solutionCode.length);
  const cursorOpacity = Math.sin(frame * 0.3) > 0 ? 1 : 0;

  // Timer counting up
  const timerSeconds = Math.floor(frame / 30);
  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;

  // Fade in
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Get difficulty badge styles
  const getDifficultyStyles = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return { bg: `${COLORS.accentGreen}33`, text: COLORS.accentGreen };
      case 'medium':
        return { bg: `${COLORS.accentYellow}33`, text: COLORS.accentYellow };
      case 'hard':
        return { bg: '#ef444433', text: '#f87171' };
      default:
        return { bg: COLORS.bgTertiary, text: COLORS.textSecondary };
    }
  };

  const difficultyStyle = getDifficultyStyles(challenge.difficulty);

  return (
    <div
      style={{
        opacity,
        width: '100%',
        maxWidth: 1200,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* Challenge Header */}
      <div
        style={{
          backgroundColor: COLORS.bgSecondary,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          padding: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.textPrimary,
              margin: 0,
            }}
          >
            {challenge.title}
          </h2>

          {/* Timer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: COLORS.bgTertiary,
              padding: '8px 16px',
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: 16, color: COLORS.claudeOrange }}>●</span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 20,
                fontWeight: 600,
                color: COLORS.claudeOrange,
              }}
            >
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        <p
          style={{
            fontFamily: "-apple-system, sans-serif",
            fontSize: 16,
            color: COLORS.textSecondary,
            margin: 0,
            marginBottom: 16,
          }}
        >
          {challenge.description}
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <span
            style={{
              padding: '6px 12px',
              backgroundColor: difficultyStyle.bg,
              borderRadius: 6,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: difficultyStyle.text,
              textTransform: 'capitalize',
            }}
          >
            {challenge.difficulty}
          </span>
          <span
            style={{
              padding: '6px 12px',
              backgroundColor: COLORS.bgTertiary,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 6,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: COLORS.textSecondary,
            }}
          >
            {challenge.category}
          </span>
        </div>
      </div>

      {/* Code Editor */}
      <div
        style={{
          backgroundColor: COLORS.bgSecondary,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {/* Editor Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            backgroundColor: COLORS.bgTertiary,
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <div style={{ display: 'flex', gap: 8, marginRight: 16 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ff5f57' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#febc2e' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#28c840' }} />
          </div>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 14,
              color: COLORS.textMuted,
            }}
          >
            solution.js
          </span>
        </div>

        {/* Code Area */}
        <div
          style={{
            padding: 24,
            minHeight: 300,
            backgroundColor: COLORS.bgPrimary,
          }}
        >
          <pre
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 16,
              color: COLORS.accentGreen,
              margin: 0,
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
            }}
          >
            {solutionCode.slice(0, visibleChars)}
            <span
              style={{
                display: 'inline-block',
                width: 2,
                height: 20,
                backgroundColor: COLORS.claudeOrange,
                marginLeft: 2,
                opacity: cursorOpacity,
                verticalAlign: 'middle',
              }}
            />
          </pre>
        </div>
      </div>
    </div>
  );
};
