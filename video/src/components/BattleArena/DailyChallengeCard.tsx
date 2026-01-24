import React from 'react';
import { useCurrentFrame, interpolate, Easing, spring, useVideoConfig } from 'remotion';
import { COLORS, Challenge } from './colors';

interface DailyChallengeCardProps {
  challenge: Challenge;
  showButton?: boolean;
  buttonHighlight?: boolean;
}

export const DailyChallengeCard: React.FC<DailyChallengeCardProps> = ({
  challenge,
  showButton = true,
  buttonHighlight = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slide up animation
  const slideUp = interpolate(frame, [0, 25], [40, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Button pulse when highlighted
  const buttonScale = buttonHighlight
    ? interpolate(Math.sin(frame * 0.15), [-1, 1], [1, 1.05])
    : 1;

  const buttonGlow = buttonHighlight ? 20 : 0;

  // Get difficulty badge color
  const getDifficultyStyles = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return {
          bg: `${COLORS.accentGreen}33`, // 20% opacity
          text: COLORS.accentGreen,
          border: COLORS.accentGreen,
        };
      case 'medium':
        return {
          bg: `${COLORS.accentYellow}33`,
          text: COLORS.accentYellow,
          border: COLORS.accentYellow,
        };
      case 'hard':
        return {
          bg: '#ef444433',
          text: '#f87171',
          border: '#f87171',
        };
      default:
        return {
          bg: COLORS.bgTertiary,
          text: COLORS.textSecondary,
          border: COLORS.border,
        };
    }
  };

  const difficultyStyle = getDifficultyStyles(challenge.difficulty);

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${slideUp}px)`,
        background: `linear-gradient(135deg, ${COLORS.accentPurple}33 0%, ${COLORS.accentBlue}33 100%)`,
        border: `2px solid ${COLORS.accentPurple}`,
        borderRadius: 12,
        padding: 32,
        width: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28, color: COLORS.accentYellow }}>★</span>
          <h2
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.accentPurple,
              margin: 0,
            }}
          >
            Daily Challenge
          </h2>
        </div>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
            color: COLORS.textMuted,
          }}
        >
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* Challenge Title */}
      <h3
        style={{
          fontFamily: "-apple-system, sans-serif",
          fontSize: 24,
          fontWeight: 600,
          color: COLORS.textPrimary,
          margin: 0,
          marginBottom: 8,
        }}
      >
        {challenge.title}
      </h3>

      {/* Description */}
      <p
        style={{
          fontFamily: "-apple-system, sans-serif",
          fontSize: 16,
          color: COLORS.textSecondary,
          margin: 0,
          marginBottom: 20,
          lineHeight: 1.5,
        }}
      >
        {challenge.description}
      </p>

      {/* Footer with badges and button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Difficulty Badge */}
          <span
            style={{
              padding: '6px 12px',
              backgroundColor: COLORS.bgSecondary,
              border: `1px solid ${difficultyStyle.border}`,
              borderRadius: 6,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: difficultyStyle.text,
              textTransform: 'capitalize',
            }}
          >
            {challenge.difficulty}
          </span>

          {/* Category Badge */}
          <span
            style={{
              padding: '6px 12px',
              backgroundColor: COLORS.bgSecondary,
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

        {/* Start Button */}
        {showButton && (
          <button
            style={{
              transform: `scale(${buttonScale})`,
              backgroundColor: COLORS.accentPurple,
              border: 'none',
              borderRadius: 8,
              padding: '12px 28px',
              fontFamily: "-apple-system, sans-serif",
              fontSize: 16,
              fontWeight: 600,
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: buttonHighlight
                ? `0 0 ${buttonGlow}px ${COLORS.accentPurple}`
                : 'none',
            }}
          >
            Start Challenge
          </button>
        )}
      </div>
    </div>
  );
};
