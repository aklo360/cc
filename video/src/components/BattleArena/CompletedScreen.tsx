import React from 'react';
import { useCurrentFrame, interpolate, Easing, spring, useVideoConfig } from 'remotion';
import { COLORS, Challenge } from './colors';

interface CompletedScreenProps {
  challenge: Challenge;
  completionTime: number; // in seconds
}

export const CompletedScreen: React.FC<CompletedScreenProps> = ({
  challenge,
  completionTime,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scale in animation
  const scaleProgress = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const scale = interpolate(scaleProgress, [0, 1], [0.8, 1]);

  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Emoji bounce
  const emojiBounce = spring({
    frame: frame - 10,
    fps,
    config: { damping: 8, stiffness: 150 },
  });
  const emojiScale = interpolate(emojiBounce, [0, 1], [0, 1]);

  // Timer count up animation
  const timerProgress = interpolate(frame, [30, 60], [0, completionTime], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const displayTime = Math.floor(timerProgress);
  const minutes = Math.floor(displayTime / 60);
  const seconds = displayTime % 60;

  // Confetti particles
  const particles = Array.from({ length: 20 }, (_, i) => ({
    x: Math.sin(i * 0.8 + frame * 0.02) * (200 + i * 10),
    y: -100 + (frame - 20) * (2 + i * 0.3) - Math.sin(i) * 50,
    rotation: frame * (3 + i % 5),
    color: [COLORS.accentGreen, COLORS.accentPurple, COLORS.claudeOrange, COLORS.accentBlue][i % 4],
    size: 8 + (i % 3) * 4,
    delay: i * 2,
  }));

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Confetti */}
      {particles.map((p, i) => {
        const particleOpacity = interpolate(
          frame - p.delay,
          [0, 20, 80, 100],
          [0, 1, 1, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        if (frame < p.delay) return null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `calc(50% + ${p.x}px)`,
              top: p.y,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: i % 2 === 0 ? '50%' : 2,
              transform: `rotate(${p.rotation}deg)`,
              opacity: particleOpacity,
            }}
          />
        );
      })}

      {/* Success Card */}
      <div
        style={{
          background: `linear-gradient(135deg, ${COLORS.accentGreen}33 0%, ${COLORS.accentBlue}33 100%)`,
          border: `2px solid ${COLORS.accentGreen}`,
          borderRadius: 20,
          padding: 60,
          textAlign: 'center',
          maxWidth: 600,
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Success icon */}
        <div
          style={{
            fontSize: 80,
            marginBottom: 20,
            transform: `scale(${emojiScale})`,
            color: COLORS.accentGreen,
          }}
        >
          ✓
        </div>

        {/* Title */}
        <h2
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.accentGreen,
            margin: 0,
            marginBottom: 16,
          }}
        >
          Challenge Complete!
        </h2>

        {/* Challenge name */}
        <p
          style={{
            fontFamily: "-apple-system, sans-serif",
            fontSize: 20,
            color: COLORS.textSecondary,
            margin: 0,
            marginBottom: 32,
          }}
        >
          You solved{' '}
          <span style={{ color: COLORS.textPrimary, fontWeight: 600 }}>
            {challenge.title}
          </span>
        </p>

        {/* Timer Display */}
        <div
          style={{
            display: 'inline-block',
            backgroundColor: COLORS.bgSecondary,
            border: `1px solid ${COLORS.accentGreen}`,
            borderRadius: 12,
            padding: '24px 48px',
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 14,
              color: COLORS.textMuted,
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Your Time
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 56,
              fontWeight: 700,
              color: COLORS.accentGreen,
            }}
          >
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
        </div>
      </div>
    </div>
  );
};
