import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { COLORS, SEVERITY_CONFIG } from './colors';

interface SeveritySelectorProps {
  activeSeverity: 'mild' | 'spicy' | 'nuclear';
  highlightFrame?: number;
}

export const SeveritySelector: React.FC<SeveritySelectorProps> = ({
  activeSeverity,
  highlightFrame = 30,
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

  // Button highlight animation
  const highlightOpacity = interpolate(
    frame,
    [highlightFrame, highlightFrame + 10, highlightFrame + 20, highlightFrame + 30],
    [1, 1.2, 1, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        backgroundColor: COLORS.bgSecondary,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 20,
      }}
    >
      <label
        style={{
          display: 'block',
          fontFamily: "-apple-system, sans-serif",
          fontSize: 12,
          color: COLORS.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 16,
        }}
      >
        Roast Level
      </label>

      <div style={{ display: 'flex', gap: 12 }}>
        {(['mild', 'spicy', 'nuclear'] as const).map((level) => {
          const config = SEVERITY_CONFIG[level];
          const isActive = activeSeverity === level;

          return (
            <div
              key={level}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '14px 16px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "-apple-system, sans-serif",
                backgroundColor: isActive ? config.color : COLORS.bgPrimary,
                color: isActive ? '#ffffff' : COLORS.textSecondary,
                border: `1px solid ${isActive ? config.color : COLORS.border}`,
                transform: isActive ? `scale(${highlightOpacity})` : 'scale(1)',
                transition: 'all 0.2s ease',
              }}
            >
              <span>{config.emoji}</span>
              <span>{config.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
