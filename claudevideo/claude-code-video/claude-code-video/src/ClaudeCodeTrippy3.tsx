import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";

// Aspect ratios preserved
const FLAT_ASPECT = 911 / 614;
const THREE_D_ASPECT = 1;

// Morphing blob background - smooth continuous motion
const LiquidBackground: React.FC = () => {
  const frame = useCurrentFrame();

  const blobs = [
    { x: 30, y: 30, size: 800, hue: 0, speed: 1 },
    { x: 70, y: 70, size: 600, hue: 120, speed: 1.3 },
    { x: 20, y: 80, size: 700, hue: 240, speed: 0.8 },
    { x: 80, y: 20, size: 500, hue: 60, speed: 1.5 },
    { x: 50, y: 50, size: 900, hue: 180, speed: 0.6 },
  ];

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      {blobs.map((blob, i) => {
        const xMove = Math.sin(frame * 0.02 * blob.speed + i) * 20;
        const yMove = Math.cos(frame * 0.025 * blob.speed + i * 2) * 20;
        const sizeMove = Math.sin(frame * 0.03 + i) * 100;
        const hue = (blob.hue + frame * 2) % 360;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${blob.x + xMove}%`,
              top: `${blob.y + yMove}%`,
              width: blob.size + sizeMove,
              height: blob.size + sizeMove,
              background: `radial-gradient(circle, hsla(${hue}, 100%, 50%, 0.6) 0%, transparent 70%)`,
              transform: "translate(-50%, -50%)",
              filter: "blur(80px)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// Infinite recursive zoom - smooth continuous
const InfiniteZoom: React.FC<{
  src: string;
  aspectRatio: number;
  depth: number;
}> = ({ src, aspectRatio, depth }) => {
  const frame = useCurrentFrame();
  const zoomSpeed = 0.012;

  const layers = Array.from({ length: depth }).map((_, i) => {
    // Continuous smooth zoom with no reset
    const layerOffset = i / depth;
    const rawProgress = (frame * zoomSpeed + layerOffset) % 1;

    // Smooth the loop with sine easing
    const scale = Math.pow(2, rawProgress * 3);

    // Smooth opacity fade - no hard edges
    const opacity = Math.sin(rawProgress * Math.PI) * 0.9;

    const rotation = rawProgress * 180;
    const hue = (frame * 2 + i * 40) % 360;

    const size = 200;

    return (
      <Img
        key={i}
        src={src}
        style={{
          position: "absolute",
          width: size * aspectRatio * scale,
          height: size * scale,
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
          opacity,
          filter: `hue-rotate(${hue}deg) saturate(1.5)`,
        }}
      />
    );
  });

  return <>{layers}</>;
};

// Motion trail - smooth continuous paths
const MotionTrail: React.FC<{
  src: string;
  aspectRatio: number;
  size: number;
  trailLength: number;
  pathFn: (t: number) => { x: number; y: number; rotation: number };
}> = ({ src, aspectRatio, size, trailLength, pathFn }) => {
  const frame = useCurrentFrame();

  return (
    <>
      {Array.from({ length: trailLength }).map((_, i) => {
        const delay = i * 2;
        const trailFrame = Math.max(0, frame - delay);
        const { x, y, rotation } = pathFn(trailFrame);

        // Smooth opacity falloff
        const opacity = Math.pow(1 - i / trailLength, 1.5);
        const scale = 1 - (i / trailLength) * 0.3;
        const hue = (frame * 3 + i * 12) % 360;
        const blur = i * 0.3;

        return (
          <Img
            key={i}
            src={src}
            style={{
              position: "absolute",
              width: size * aspectRatio * scale,
              height: size * scale,
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              opacity,
              filter: `hue-rotate(${hue}deg) blur(${blur}px)`,
              mixBlendMode: i === 0 ? "normal" : "screen",
            }}
          />
        );
      })}
    </>
  );
};

// Hexagonal grid - smooth continuous pulsing
const HexGrid: React.FC<{
  src: string;
  aspectRatio: number;
  opacity: number;
}> = ({ src, aspectRatio, opacity }) => {
  const frame = useCurrentFrame();
  const hexSize = 110;
  const cols = 9;
  const rows = 7;

  const hexagons = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const xOffset = row % 2 === 0 ? 0 : hexSize * 0.75;
      const x = col * hexSize * 1.5 + xOffset - 250;
      const y = row * hexSize * 0.866 - 150;

      // Smooth wave across grid - no hard changes
      const wavePhase = (row * 0.3 + col * 0.2);
      const pulse = Math.sin(frame * 0.08 + wavePhase) * 0.3 + 0.7;
      const rotation = Math.sin(frame * 0.04 + wavePhase) * 20;
      const hue = (frame * 1.5 + (row + col) * 15) % 360;
      const scale = 0.5 + Math.sin(frame * 0.06 + wavePhase) * 0.15;

      hexagons.push(
        <Img
          key={`${row}-${col}`}
          src={src}
          style={{
            position: "absolute",
            width: hexSize * aspectRatio * scale,
            height: hexSize * scale,
            left: x,
            top: y,
            transform: `rotate(${rotation}deg)`,
            filter: `hue-rotate(${hue}deg) drop-shadow(0 0 12px hsla(${hue}, 100%, 50%, 0.4))`,
            opacity: pulse * opacity,
          }}
        />
      );
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
      }}
    >
      {hexagons}
    </div>
  );
};

// Waveform ring - smooth continuous
const WaveRing: React.FC<{
  src: string;
  aspectRatio: number;
  radius: number;
  count: number;
  waveFreq: number;
  waveAmp: number;
}> = ({ src, aspectRatio, radius, count, waveFreq, waveAmp }) => {
  const frame = useCurrentFrame();

  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const baseAngle = (360 / count) * i;

        // Smooth sine wave motion
        const waveOffset = Math.sin(frame * 0.08 + i * waveFreq) * waveAmp;
        const currentRadius = radius + waveOffset;

        const angle = baseAngle + frame * 0.4;
        const x = Math.cos((angle * Math.PI) / 180) * currentRadius;
        const y = Math.sin((angle * Math.PI) / 180) * currentRadius;

        // Smooth pulsing size
        const sizePulse = Math.sin(frame * 0.1 + i * 0.5) * 0.2 + 1;
        const size = 75 * sizePulse;
        const hue = (frame * 2.5 + i * (360 / count)) % 360;
        const rotation = angle + frame * 0.5;

        return (
          <Img
            key={i}
            src={src}
            style={{
              position: "absolute",
              width: size * aspectRatio,
              height: size,
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              filter: `hue-rotate(${hue}deg) drop-shadow(0 0 18px hsla(${hue}, 100%, 60%, 0.7))`,
            }}
          />
        );
      })}
    </>
  );
};

// Smooth spiral arms - continuous outward flow
const SpiralArms: React.FC<{
  src: string;
  aspectRatio: number;
  armCount: number;
  particlesPerArm: number;
}> = ({ src, aspectRatio, armCount, particlesPerArm }) => {
  const frame = useCurrentFrame();

  const particles = [];

  for (let arm = 0; arm < armCount; arm++) {
    for (let p = 0; p < particlesPerArm; p++) {
      const armAngle = (360 / armCount) * arm;
      const particleOffset = p / particlesPerArm;

      // Continuous outward spiral motion
      const spiralProgress = (frame * 0.008 + particleOffset) % 1;
      const distance = spiralProgress * 450 + 50;
      const spiralAngle = armAngle + spiralProgress * 360 + frame * 0.3;

      const x = Math.cos((spiralAngle * Math.PI) / 180) * distance;
      const y = Math.sin((spiralAngle * Math.PI) / 180) * distance;

      // Smooth fade based on distance - no hard edges
      const opacity = Math.sin(spiralProgress * Math.PI) * 0.8;
      const size = 50 + (1 - spiralProgress) * 40;
      const hue = (frame * 2 + arm * 60 + p * 10) % 360;
      const rotation = spiralAngle + frame;

      particles.push(
        <Img
          key={`${arm}-${p}`}
          src={src}
          style={{
            position: "absolute",
            width: size * aspectRatio,
            height: size,
            left: `calc(50% + ${x}px)`,
            top: `calc(50% + ${y}px)`,
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
            opacity,
            filter: `hue-rotate(${hue}deg) drop-shadow(0 0 15px hsla(${hue}, 100%, 55%, 0.6))`,
          }}
        />
      );
    }
  }

  return <>{particles}</>;
};

// Breathing concentric rings
const BreathingRings: React.FC<{
  src: string;
  aspectRatio: number;
}> = ({ src, aspectRatio }) => {
  const frame = useCurrentFrame();
  const ringCount = 5;

  return (
    <>
      {Array.from({ length: ringCount }).map((_, ring) => {
        const baseRadius = 120 + ring * 90;
        const itemsInRing = 6 + ring * 2;

        // Smooth breathing
        const breathe = Math.sin(frame * 0.06 + ring * 0.8) * 30;
        const currentRadius = baseRadius + breathe;
        const ringRotation = frame * (ring % 2 === 0 ? 0.3 : -0.3);

        return Array.from({ length: itemsInRing }).map((_, i) => {
          const angle = (360 / itemsInRing) * i + ringRotation;
          const x = Math.cos((angle * Math.PI) / 180) * currentRadius;
          const y = Math.sin((angle * Math.PI) / 180) * currentRadius;

          const size = 60 - ring * 5;
          const hue = (frame * 2 + ring * 40 + i * 20) % 360;
          const opacity = 0.9 - ring * 0.12;
          const itemRotation = angle + frame * 0.8;

          return (
            <Img
              key={`${ring}-${i}`}
              src={src}
              style={{
                position: "absolute",
                width: size * aspectRatio,
                height: size,
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: `translate(-50%, -50%) rotate(${itemRotation}deg)`,
                filter: `hue-rotate(${hue}deg) drop-shadow(0 0 12px hsla(${hue}, 100%, 55%, 0.5))`,
                opacity,
              }}
            />
          );
        });
      })}
    </>
  );
};

// Smooth pulsing center with glow waves
const SmoothCenter: React.FC<{
  src: string;
  aspectRatio: number;
}> = ({ src, aspectRatio }) => {
  const frame = useCurrentFrame();

  // Smooth continuous breathing
  const breathe = Math.sin(frame * 0.08) * 0.2 + 1;
  const breathe2 = Math.sin(frame * 0.12 + 1) * 0.15 + 1;
  const scale = breathe * breathe2;

  const rotation = Math.sin(frame * 0.025) * 12;
  const hue = (frame * 1.5) % 360;
  const size = 260 * scale;
  const glowPulse = Math.sin(frame * 0.1) * 15 + 35;

  // Smooth expanding glow rings
  const glowRings = Array.from({ length: 5 }).map((_, i) => {
    // Continuous smooth expansion
    const ringProgress = (frame * 0.015 + i * 0.2) % 1;
    const ringSize = ringProgress * 600 + 100;
    // Smooth sine fade
    const ringOpacity = Math.sin(ringProgress * Math.PI) * 0.4;
    const ringHue = (hue + i * 25) % 360;

    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: ringSize,
          height: ringSize,
          border: `2px solid hsla(${ringHue}, 100%, 60%, ${ringOpacity})`,
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
          boxShadow: `0 0 20px hsla(${ringHue}, 100%, 60%, ${ringOpacity * 0.5})`,
        }}
      />
    );
  });

  return (
    <>
      {glowRings}

      {/* Glow layers */}
      {[3, 2, 1].map((i) => (
        <Img
          key={`glow-${i}`}
          src={src}
          style={{
            position: "absolute",
            width: size * aspectRatio * (1 + i * 0.1),
            height: size * (1 + i * 0.1),
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
            filter: `blur(${i * 12}px) hue-rotate(${(hue + i * 20) % 360}deg) brightness(1.8)`,
            opacity: 0.4 / i,
          }}
        />
      ))}

      {/* Main center image */}
      <Img
        src={src}
        style={{
          position: "absolute",
          width: size * aspectRatio,
          height: size,
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
          filter: `hue-rotate(${hue}deg) drop-shadow(0 0 ${glowPulse}px hsla(${hue}, 100%, 60%, 0.85)) saturate(1.3)`,
        }}
      />
    </>
  );
};

// Subtle smooth noise - no harsh changes
const SmoothNoise: React.FC = () => {
  const frame = useCurrentFrame();
  // Very subtle, smooth variation
  const opacity = 0.02 + Math.sin(frame * 0.05) * 0.01;

  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' seed='${Math.floor(frame / 3)}'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        opacity,
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }}
    />
  );
};

export const ClaudeCodeTrippy3: React.FC = () => {
  const frame = useCurrentFrame();

  const flatSrc = staticFile("mascot-flat.png");
  const threeDSrc = staticFile("mascot-3d.png");

  // SMOOTH layer opacity transitions using sine waves - NO hard cuts
  const layer1Opacity = Math.sin(frame * 0.015) * 0.3 + 0.4;
  const layer2Opacity = Math.sin(frame * 0.012 + 2) * 0.25 + 0.35;
  const layer3Opacity = Math.sin(frame * 0.018 + 4) * 0.3 + 0.5;

  // Smooth continuous path functions
  const figure8Path = (t: number) => ({
    x: Math.sin(t * 0.04) * 280,
    y: Math.sin(t * 0.08) * 140,
    rotation: t * 1.5,
  });

  const spiralPath = (t: number) => {
    const angle = t * 0.06;
    const radius = 150 + Math.sin(t * 0.02) * 100;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      rotation: t * 2,
    };
  };

  return (
    <AbsoluteFill style={{ background: "#050508" }}>
      <LiquidBackground />

      {/* Layer 1: Infinite zoom - always present, opacity varies smoothly */}
      <div style={{ opacity: layer1Opacity }}>
        <InfiniteZoom src={threeDSrc} aspectRatio={THREE_D_ASPECT} depth={10} />
      </div>

      {/* Layer 2: Hex grid - smooth opacity */}
      <HexGrid src={flatSrc} aspectRatio={FLAT_ASPECT} opacity={layer2Opacity * 0.6} />

      {/* Layer 3: Wave rings - always visible */}
      <WaveRing
        src={flatSrc}
        aspectRatio={FLAT_ASPECT}
        radius={300}
        count={14}
        waveFreq={0.4}
        waveAmp={50}
      />
      <WaveRing
        src={threeDSrc}
        aspectRatio={THREE_D_ASPECT}
        radius={180}
        count={8}
        waveFreq={0.6}
        waveAmp={35}
      />

      {/* Layer 4: Motion trails - smooth opacity */}
      <div style={{ opacity: layer3Opacity }}>
        <MotionTrail
          src={flatSrc}
          aspectRatio={FLAT_ASPECT}
          size={90}
          trailLength={12}
          pathFn={figure8Path}
        />
        <MotionTrail
          src={threeDSrc}
          aspectRatio={THREE_D_ASPECT}
          size={70}
          trailLength={10}
          pathFn={spiralPath}
        />
      </div>

      {/* Layer 5: Spiral arms - continuous flow */}
      <SpiralArms
        src={flatSrc}
        aspectRatio={FLAT_ASPECT}
        armCount={4}
        particlesPerArm={8}
      />

      {/* Layer 6: Breathing rings */}
      <div style={{ opacity: 0.7 }}>
        <BreathingRings src={threeDSrc} aspectRatio={THREE_D_ASPECT} />
      </div>

      {/* Center piece - always prominent */}
      <SmoothCenter src={threeDSrc} aspectRatio={THREE_D_ASPECT} />

      {/* Subtle effects */}
      <SmoothNoise />

      {/* Smooth vignette */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,0.8) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
