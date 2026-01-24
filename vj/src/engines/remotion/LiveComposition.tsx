/**
 * Remotion Live Composition
 * A composition designed to receive live audio data as props
 */

import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import type { AudioFeatures } from '../../audio/analyzer.js';
import type { BeatState } from '../../audio/beat.js';
import type { VisualStyle } from '../types.js';
import { STYLE_PALETTES } from '../types.js';

export interface LiveCompositionProps {
  audio: AudioFeatures;
  beat: BeatState;
  style: VisualStyle;
  intensity: number;
  colorShift: number;
}

export const LiveComposition: React.FC<LiveCompositionProps> = ({
  audio,
  beat,
  style,
  intensity,
  colorShift,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const palette = STYLE_PALETTES[style];
  const time = frame / fps;

  // Calculate reactive values
  const bassScale = 1 + audio.bands.bass * 0.5 * intensity;
  const midRotation = audio.bands.mid * 360 * intensity;
  const highOpacity = 0.3 + audio.bands.high * 0.7;
  const beatPulse = beat.phase < 0.1 ? 1 : 0;

  // Generate particles based on audio
  const particles = React.useMemo(() => {
    const count = Math.floor(20 + audio.overall * 30);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      size: 2 + Math.random() * 8,
      speed: 0.5 + Math.random() * 2,
      angle: Math.random() * Math.PI * 2,
    }));
  }, [audio.overall > 0.5, width, height]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: palette.background,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Central shape - bass reactive */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${bassScale}) rotate(${midRotation}deg)`,
          width: 200,
          height: 200,
          border: `3px solid ${palette.primary}`,
          borderRadius: style === 'abstract' ? '0%' : '50%',
          boxShadow: `0 0 ${20 + beatPulse * 40}px ${palette.primary}`,
          transition: 'transform 0.05s ease-out',
        }}
      />

      {/* Inner shape */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${1 + audio.bands.mid * 0.3}) rotate(${-midRotation * 0.5}deg)`,
          width: 100,
          height: 100,
          backgroundColor: palette.accent,
          opacity: highOpacity,
          clipPath:
            style === 'synthwave'
              ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
              : 'none',
          borderRadius: style === 'branded' ? '10px' : '0',
        }}
      />

      {/* Frequency bars */}
      <div
        style={{
          position: 'absolute',
          bottom: 50,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
        }}
      >
        {Object.entries(audio.bands).map(([band, value], i) => (
          <div
            key={band}
            style={{
              width: 30,
              height: Math.max(10, value * 200 * intensity),
              backgroundColor:
                i === 0
                  ? palette.primary
                  : i === 4
                    ? palette.accent
                    : palette.secondary,
              borderRadius: 4,
              transition: 'height 0.05s ease-out',
              boxShadow:
                beatPulse && i === 0
                  ? `0 0 20px ${palette.primary}`
                  : 'none',
            }}
          />
        ))}
      </div>

      {/* Particles */}
      {particles.map((p) => {
        const x =
          p.x + Math.sin(time * p.speed + p.angle) * 50 * audio.bands.high;
        const y =
          p.y + Math.cos(time * p.speed + p.angle) * 50 * audio.bands.high;

        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: p.size * (1 + audio.bands.bass * 0.5),
              height: p.size * (1 + audio.bands.bass * 0.5),
              borderRadius: '50%',
              backgroundColor: palette.secondary,
              opacity: 0.3 + audio.overall * 0.5,
            }}
          />
        );
      })}

      {/* BPM display */}
      {beat.bpm && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 24,
            color: palette.primary,
            opacity: 0.5 + beatPulse * 0.5,
          }}
        >
          {Math.round(beat.bpm)} BPM
        </div>
      )}

      {/* Scan lines overlay (synthwave style) */}
      {style === 'synthwave' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 0, 0, 0.1) 2px,
              rgba(0, 0, 0, 0.1) 4px
            )`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(
            circle at center,
            transparent 30%,
            ${palette.background} 100%
          )`,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
