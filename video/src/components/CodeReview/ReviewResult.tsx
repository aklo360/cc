import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { COLORS, SEVERITY_CONFIG, TRAILER_ISSUES } from './colors';

interface ReviewResultProps {
  score?: number;
  showIssues?: boolean;
}

export const ReviewResult: React.FC<ReviewResultProps> = ({
  score = 40,
  showIssues = true,
}) => {
  const frame = useCurrentFrame();

  // Fade in animation
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const scale = interpolate(frame, [0, 20], [0.95, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Score color based on value
  const getScoreColor = (s: number) => {
    if (s >= 80) return COLORS.accentGreen;
    if (s >= 60) return COLORS.accentYellow;
    if (s >= 40) return COLORS.claudeOrange;
    return COLORS.red400;
  };

  // Score counter animation
  const displayScore = Math.floor(interpolate(frame, [0, 45], [0, score], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  }));

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Score Card */}
      <div
        style={{
          backgroundColor: COLORS.bgSecondary,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          padding: 32,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
            fontSize: 72,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <span style={{ color: getScoreColor(score) }}>{displayScore}</span>
          <span style={{ fontSize: 32, color: COLORS.textMuted }}>/100</span>
        </div>
        <p
          style={{
            fontFamily: "-apple-system, sans-serif",
            fontSize: 16,
            color: COLORS.textSecondary,
            fontStyle: 'italic',
            marginTop: 12,
          }}
        >
          "Could be worse, could be better. Story of my life."
        </p>
      </div>

      {/* Issues */}
      {showIssues &&
        TRAILER_ISSUES.map((issue, index) => {
          const config = SEVERITY_CONFIG[issue.severity];
          const issueOpacity = interpolate(
            frame,
            [30 + index * 20, 45 + index * 20],
            [0, 1],
            { extrapolateRight: 'clamp' }
          );

          return (
            <div
              key={index}
              style={{
                opacity: issueOpacity,
                backgroundColor: COLORS.bgSecondary,
                border: `1px solid ${config.color}33`,
                borderRadius: 12,
                padding: 20,
                display: 'flex',
                gap: 16,
              }}
            >
              <div style={{ fontSize: 32, flexShrink: 0 }}>{config.emoji}</div>
              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    fontFamily: "-apple-system, sans-serif",
                    fontSize: 14,
                    fontWeight: 600,
                    color: COLORS.claudeOrange,
                    textTransform: 'capitalize',
                    marginBottom: 8,
                  }}
                >
                  {issue.issue}
                </h3>
                <p
                  style={{
                    fontFamily: "-apple-system, sans-serif",
                    fontSize: 14,
                    color: COLORS.textPrimary,
                    marginBottom: 8,
                  }}
                >
                  <span style={{ color: COLORS.red400, fontWeight: 500 }}>Roast: </span>
                  {issue.roast}
                </p>
                <p
                  style={{
                    fontFamily: "-apple-system, sans-serif",
                    fontSize: 14,
                    color: COLORS.textSecondary,
                  }}
                >
                  <span style={{ color: COLORS.accentGreen, fontWeight: 500 }}>Fix: </span>
                  {issue.fix}
                </p>
              </div>
            </div>
          );
        })}
    </div>
  );
};
