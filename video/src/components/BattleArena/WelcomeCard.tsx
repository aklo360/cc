import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { COLORS } from './colors';

interface WelcomeCardProps {
  playerName?: string;
}

export const WelcomeCard: React.FC<WelcomeCardProps> = ({ playerName = 'Anonymous Coder' }) => {
  const frame = useCurrentFrame();

  // Fade in animation
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Scale spring
  const scale = interpolate(frame, [0, 20], [0.95, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Cursor blink for input field
  const cursorOpacity = Math.sin(frame * 0.2) > 0 ? 1 : 0;

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        backgroundColor: COLORS.bgSecondary,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 40,
        textAlign: 'center',
        width: '100%',
      }}
    >
      {/* Title */}
      <h1
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
          fontSize: 48,
          fontWeight: 700,
          color: COLORS.claudeOrange,
          margin: 0,
          marginBottom: 12,
        }}
      >
        CODE BATTLE ARENA
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontFamily: "-apple-system, sans-serif",
          fontSize: 20,
          color: COLORS.textSecondary,
          margin: 0,
          marginBottom: 32,
        }}
      >
        Race against the clock to solve algorithmic challenges
      </p>

      {/* Player Name Input */}
      <div style={{ maxWidth: 400, margin: '0 auto' }}>
        <label
          style={{
            display: 'block',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            color: COLORS.textMuted,
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Your name (for leaderboard)
        </label>
        <div
          style={{
            backgroundColor: COLORS.bgPrimary,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 16,
              color: COLORS.textPrimary,
            }}
          >
            {playerName}
          </span>
          <span
            style={{
              width: 2,
              height: 20,
              backgroundColor: COLORS.claudeOrange,
              marginLeft: 2,
              opacity: cursorOpacity,
            }}
          />
        </div>
      </div>
    </div>
  );
};
