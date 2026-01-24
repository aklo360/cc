import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { COLORS, EXAMPLE_CODE } from './colors';

interface CodeInputCardProps {
  showButton?: boolean;
  buttonHighlight?: boolean;
  typingProgress?: number;
}

export const CodeInputCard: React.FC<CodeInputCardProps> = ({
  showButton = true,
  buttonHighlight = false,
  typingProgress = 1,
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

  // Cursor blink
  const cursorOpacity = Math.sin(frame * 0.15) > 0 ? 1 : 0;

  // Typing animation
  const visibleCode = EXAMPLE_CODE.slice(0, Math.floor(EXAMPLE_CODE.length * typingProgress));

  // Button glow when highlighted
  const buttonGlow = buttonHighlight
    ? interpolate(Math.sin(frame * 0.1), [-1, 1], [0.4, 0.8])
    : 0;

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
          marginBottom: 12,
        }}
      >
        Your Code
      </label>

      {/* Code textarea */}
      <div
        style={{
          backgroundColor: COLORS.bgPrimary,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 8,
          padding: 16,
          minHeight: 180,
          position: 'relative',
        }}
      >
        <pre
          style={{
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: 13,
            color: COLORS.textPrimary,
            margin: 0,
            whiteSpace: 'pre-wrap',
            lineHeight: 1.5,
          }}
        >
          {visibleCode}
          <span
            style={{
              display: 'inline-block',
              width: 2,
              height: 16,
              backgroundColor: COLORS.claudeOrange,
              marginLeft: 2,
              opacity: cursorOpacity,
              verticalAlign: 'middle',
            }}
          />
        </pre>
      </div>

      {/* Submit button */}
      {showButton && (
        <button
          style={{
            width: '100%',
            marginTop: 16,
            backgroundColor: COLORS.claudeOrange,
            color: '#ffffff',
            fontFamily: "-apple-system, sans-serif",
            fontSize: 14,
            fontWeight: 600,
            padding: '14px 20px',
            borderRadius: 8,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: buttonHighlight
              ? `0 0 ${20 + buttonGlow * 20}px ${COLORS.claudeOrange}${Math.floor(buttonGlow * 200).toString(16).padStart(2, '0')}`
              : 'none',
          }}
        >
          <span>🔥</span>
          <span>Roast My Code</span>
        </button>
      )}
    </div>
  );
};
