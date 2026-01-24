import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { COLORS, Challenge } from './colors';

interface ChallengeGridProps {
  challenges: Challenge[];
  highlightIndex?: number; // Which card to highlight (for selection animation)
}

export const ChallengeGrid: React.FC<ChallengeGridProps> = ({
  challenges,
  highlightIndex = -1,
}) => {
  const frame = useCurrentFrame();

  // Get difficulty badge styles
  const getDifficultyStyles = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return {
          bg: `${COLORS.accentGreen}33`,
          text: COLORS.accentGreen,
        };
      case 'medium':
        return {
          bg: `${COLORS.accentYellow}33`,
          text: COLORS.accentYellow,
        };
      case 'hard':
        return {
          bg: '#ef444433',
          text: '#f87171',
        };
      default:
        return {
          bg: COLORS.bgTertiary,
          text: COLORS.textSecondary,
        };
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 20,
        width: '100%',
      }}
    >
      {challenges.slice(0, 6).map((challenge, index) => {
        // Staggered entrance animation
        const staggerDelay = index * 5;
        const cardOpacity = interpolate(
          frame - staggerDelay,
          [0, 15],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        const cardSlide = interpolate(
          frame - staggerDelay,
          [0, 15],
          [20, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
        );

        // Highlight effect
        const isHighlighted = index === highlightIndex;
        const highlightScale = isHighlighted
          ? interpolate(Math.sin(frame * 0.15), [-1, 1], [1, 1.03])
          : 1;
        const borderColor = isHighlighted ? COLORS.claudeOrange : COLORS.border;
        const glowOpacity = isHighlighted ? 0.3 : 0;

        const difficultyStyle = getDifficultyStyles(challenge.difficulty);

        return (
          <div
            key={challenge.id}
            style={{
              opacity: cardOpacity,
              transform: `translateY(${cardSlide}px) scale(${highlightScale})`,
              backgroundColor: COLORS.bgSecondary,
              border: `1px solid ${borderColor}`,
              borderRadius: 12,
              padding: 20,
              boxShadow: isHighlighted
                ? `0 0 20px ${COLORS.claudeOrange}${Math.floor(glowOpacity * 255).toString(16).padStart(2, '0')}`
                : 'none',
              transition: 'border-color 0.2s',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <h3
                style={{
                  fontFamily: "-apple-system, sans-serif",
                  fontSize: 18,
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                  margin: 0,
                  flex: 1,
                }}
              >
                {challenge.title}
              </h3>
              <span
                style={{
                  padding: '4px 10px',
                  backgroundColor: difficultyStyle.bg,
                  borderRadius: 6,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: difficultyStyle.text,
                  textTransform: 'capitalize',
                  marginLeft: 10,
                }}
              >
                {challenge.difficulty}
              </span>
            </div>

            {/* Description */}
            <p
              style={{
                fontFamily: "-apple-system, sans-serif",
                fontSize: 13,
                color: COLORS.textSecondary,
                margin: 0,
                marginBottom: 16,
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                height: 36,
              }}
            >
              {challenge.description}
            </p>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  color: COLORS.textMuted,
                }}
              >
                {challenge.category}
              </span>
              <button
                style={{
                  backgroundColor: isHighlighted ? COLORS.claudeOrange : COLORS.claudeOrange,
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 18px',
                  fontFamily: "-apple-system, sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                Start
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
