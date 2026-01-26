import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";

// Image aspect ratios - PRESERVED
const FLAT_ASPECT = 911 / 614; // ~1.48
const THREE_D_ASPECT = 1; // 1:1

// SCALE FACTOR - everything bigger and tighter
const SCALE = 2.5;

// Even more insane rainbow vortex background
const VortexBackground: React.FC = () => {
  const frame = useCurrentFrame();

  const layers = [];
  for (let i = 0; i < 8; i++) {
    const hue = (frame * (4 + i * 0.5) + i * 45) % 360;
    const scale = 1.5 + Math.sin(frame * 0.06 + i * 0.8) * 0.8;
    const rotation = frame * (i % 2 === 0 ? 0.8 : -0.6) * (1 + i * 0.1);

    layers.push(
      <div
        key={i}
        style={{
          position: "absolute",
          inset: -400,
          background: `conic-gradient(from ${rotation}deg at 50% 50%,
            hsl(${hue}, 100%, 60%) 0deg,
            hsl(${(hue + 45) % 360}, 100%, 50%) 45deg,
            hsl(${(hue + 90) % 360}, 100%, 60%) 90deg,
            hsl(${(hue + 135) % 360}, 100%, 50%) 135deg,
            hsl(${(hue + 180) % 360}, 100%, 60%) 180deg,
            hsl(${(hue + 225) % 360}, 100%, 50%) 225deg,
            hsl(${(hue + 270) % 360}, 100%, 60%) 270deg,
            hsl(${(hue + 315) % 360}, 100%, 50%) 315deg,
            hsl(${hue}, 100%, 60%) 360deg
          )`,
          transform: `scale(${scale}) rotate(${rotation}deg)`,
          opacity: 0.35,
          mixBlendMode: i % 3 === 0 ? "screen" : i % 3 === 1 ? "overlay" : "multiply",
        }}
      />
    );
  }

  return (
    <AbsoluteFill style={{ background: "#0a0a0a", overflow: "hidden" }}>
      {layers}
    </AbsoluteFill>
  );
};

// Tighter fractal spiral - SCALED UP
const TightSpiral: React.FC<{
  src: string;
  aspectRatio: number;
  baseSize: number;
  spiralSpeed: number;
  direction: 1 | -1;
  offset: number;
}> = ({ src, aspectRatio, baseSize, spiralSpeed, direction, offset }) => {
  const frame = useCurrentFrame();
  const count = 16;

  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const t = i / count;
        const angle = t * 540 + frame * spiralSpeed * direction + offset;
        const distance = (20 + t * 200) * SCALE;
        const scale = 1 - t * 0.6;
        const size = baseSize * scale * SCALE;

        const x = Math.cos((angle * Math.PI) / 180) * distance;
        const y = Math.sin((angle * Math.PI) / 180) * distance;

        const hueShift = (frame * 6 + i * 25 + offset) % 360;
        const opacity = interpolate(t, [0, 0.5, 1], [1, 0.8, 0.4]);
        const glow = 20 + Math.sin(frame * 0.2 + i) * 10;

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
              transform: `translate(-50%, -50%) rotate(${angle + frame * 2}deg)`,
              filter: `hue-rotate(${hueShift}deg) saturate(2.5) brightness(1.3) drop-shadow(0 0 ${glow}px hsl(${hueShift}, 100%, 60%))`,
              opacity,
            }}
          />
        );
      })}
    </>
  );
};

// Mega kaleidoscope - SCALED UP
const MegaKaleidoscope: React.FC<{
  src: string;
  aspectRatio: number;
  segments: number;
  size: number;
}> = ({ src, aspectRatio, segments, size }) => {
  const frame = useCurrentFrame();
  const rotation = frame * 1.5;
  const breathe = Math.sin(frame * 0.1) * 0.3 + 1;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${breathe})`,
      }}
    >
      {Array.from({ length: segments }).map((_, i) => {
        const angle = (360 / segments) * i;
        const hue = (frame * 4 + i * (360 / segments)) % 360;
        const pulse = Math.sin(frame * 0.12 + i * 0.7) * 0.25 + 1;
        const dist = size * 0.6 * SCALE;

        return (
          <Img
            key={i}
            src={src}
            style={{
              position: "absolute",
              width: size * aspectRatio * pulse * SCALE,
              height: size * pulse * SCALE,
              left: "50%",
              top: "50%",
              transformOrigin: "center center",
              transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${dist}px) ${i % 2 === 0 ? "scaleX(-1)" : ""}`,
              filter: `hue-rotate(${hue}deg) drop-shadow(0 0 ${30 * pulse}px hsl(${hue}, 100%, 60%))`,
              opacity: 0.85,
            }}
          />
        );
      })}
    </div>
  );
};

// Hyper tunnel - SCALED UP
const HyperTunnel: React.FC<{
  src: string;
  aspectRatio: number;
}> = ({ src, aspectRatio }) => {
  const frame = useCurrentFrame();
  const layers = 12;

  return (
    <>
      {Array.from({ length: layers }).map((_, i) => {
        const baseScale = 0.15 + i * 0.25;
        const zoomProgress = ((frame * 0.025 + i * 0.12) % 1);
        const scale = (baseScale + zoomProgress * 1.5) * SCALE;
        const opacity = interpolate(zoomProgress, [0, 0.4, 1], [0, 0.7, 0]);
        const rotation = i * 20 + frame * (i % 2 === 0 ? 1.5 : -1.5);
        const hue = (frame * 5 + i * 30) % 360;

        const size = 120 * scale;

        return (
          <Img
            key={i}
            src={src}
            style={{
              position: "absolute",
              width: size * aspectRatio,
              height: size,
              left: "50%",
              top: "50%",
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              filter: `hue-rotate(${hue}deg) blur(${zoomProgress * 3}px) drop-shadow(0 0 20px hsl(${hue}, 100%, 50%))`,
              opacity,
            }}
          />
        );
      })}
    </>
  );
};

// Chromatic beast - SCALED UP
const ChromaticBeast: React.FC<{
  src: string;
  aspectRatio: number;
  size: number;
  x: number;
  y: number;
  rotation: number;
}> = ({ src, aspectRatio, size, x, y, rotation }) => {
  const frame = useCurrentFrame();
  const spread = Math.sin(frame * 0.18) * 20 + 8;
  const scaledSize = size * SCALE;

  return (
    <div
      style={{
        position: "absolute",
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      }}
    >
      {/* Cyan channel */}
      <Img
        src={src}
        style={{
          position: "absolute",
          width: scaledSize * aspectRatio,
          height: scaledSize,
          transform: `translate(${-spread}px, ${-spread * 0.5}px)`,
          filter: "hue-rotate(180deg) saturate(4)",
          mixBlendMode: "screen",
          opacity: 0.85,
        }}
      />
      {/* Magenta channel */}
      <Img
        src={src}
        style={{
          position: "absolute",
          width: scaledSize * aspectRatio,
          height: scaledSize,
          transform: `translate(${spread}px, 0)`,
          filter: "hue-rotate(-60deg) saturate(4)",
          mixBlendMode: "screen",
          opacity: 0.85,
        }}
      />
      {/* Yellow channel */}
      <Img
        src={src}
        style={{
          position: "absolute",
          width: scaledSize * aspectRatio,
          height: scaledSize,
          transform: `translate(0, ${spread}px)`,
          filter: "hue-rotate(60deg) saturate(4)",
          mixBlendMode: "screen",
          opacity: 0.85,
        }}
      />
    </div>
  );
};

// Tight wave orbit - SCALED UP
const TightWaveOrbit: React.FC<{
  src: string;
  aspectRatio: number;
  count: number;
  radius: number;
  size: number;
  speed: number;
  waveAmp: number;
}> = ({ src, aspectRatio, count, radius, size, speed, waveAmp }) => {
  const frame = useCurrentFrame();
  const scaledRadius = radius * SCALE * 0.5; // Tighter radius
  const scaledSize = size * SCALE;

  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const baseAngle = (360 / count) * i + frame * speed;
        const wave = Math.sin(frame * 0.25 + i * 0.6) * waveAmp * SCALE * 0.5;
        const currentRadius = scaledRadius + wave;

        const x = Math.cos((baseAngle * Math.PI) / 180) * currentRadius;
        const y = Math.sin((baseAngle * Math.PI) / 180) * currentRadius;

        const scale = 0.9 + Math.sin(frame * 0.18 + i) * 0.5;
        const hue = (frame * 7 + i * (360 / count)) % 360;
        const rotation = frame * 4 + i * 60;
        const glow = 25 + Math.sin(frame * 0.15 + i) * 15;

        return (
          <Img
            key={i}
            src={src}
            style={{
              position: "absolute",
              width: scaledSize * aspectRatio * scale,
              height: scaledSize * scale,
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              filter: `hue-rotate(${hue}deg) drop-shadow(0 0 ${glow}px hsl(${hue}, 100%, 65%)) saturate(1.8)`,
            }}
          />
        );
      })}
    </>
  );
};

// MASSIVE pulsing center - SCALED UP
const MassiveCenter: React.FC<{
  src: string;
  aspectRatio: number;
}> = ({ src, aspectRatio }) => {
  const frame = useCurrentFrame();

  const breathe = Math.sin(frame * 0.1) * 0.35 + 1;
  const megaPulse = interpolate(
    frame % 50,
    [0, 8, 25, 50],
    [1, 1.6, 1, 1]
  );
  const scale = breathe * megaPulse * SCALE;
  const rotation = Math.sin(frame * 0.04) * 25;
  const hue = (frame * 3) % 360;

  const size = 150;
  const glowIntensity = 50 + Math.sin(frame * 0.12) * 30;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
      }}
    >
      {/* Mega glow layers */}
      {[4, 3, 2, 1].map((i) => (
        <Img
          key={i}
          src={src}
          style={{
            position: "absolute",
            width: size * aspectRatio,
            height: size,
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            filter: `blur(${i * 20}px) hue-rotate(${hue + i * 40}deg) brightness(2.5)`,
            opacity: 0.6 / i,
          }}
        />
      ))}
      {/* Main image */}
      <Img
        src={src}
        style={{
          position: "absolute",
          width: size * aspectRatio,
          height: size,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          filter: `hue-rotate(${hue}deg) drop-shadow(0 0 ${glowIntensity}px hsl(${hue}, 100%, 65%)) saturate(1.5)`,
        }}
      />
    </div>
  );
};

// Intense strobe
const IntenseStrobe: React.FC = () => {
  const frame = useCurrentFrame();
  const flash = frame % 35 < 2;
  const hue = (frame * 12) % 360;

  return flash ? (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle, hsl(${hue}, 100%, 80%) 0%, transparent 70%)`,
        opacity: 0.4,
        mixBlendMode: "overlay",
      }}
    />
  ) : null;
};

// Animated scan lines
const AnimatedScanLines: React.FC = () => {
  const frame = useCurrentFrame();
  const offset = (frame * 3) % 6;

  return (
    <AbsoluteFill
      style={{
        background: `repeating-linear-gradient(
          0deg,
          transparent 0px,
          transparent ${3 + offset * 0.2}px,
          rgba(0,0,0,0.15) ${3 + offset * 0.2}px,
          rgba(0,0,0,0.15) ${6 + offset * 0.2}px
        )`,
        pointerEvents: "none",
      }}
    />
  );
};

// RGB shift overlay
const RGBShiftOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const shift = Math.sin(frame * 0.1) * 3;

  return (
    <>
      <AbsoluteFill
        style={{
          background: "rgba(255,0,0,0.03)",
          transform: `translateX(${shift}px)`,
          mixBlendMode: "screen",
        }}
      />
      <AbsoluteFill
        style={{
          background: "rgba(0,255,0,0.03)",
          transform: `translateY(${shift}px)`,
          mixBlendMode: "screen",
        }}
      />
      <AbsoluteFill
        style={{
          background: "rgba(0,0,255,0.03)",
          transform: `translate(${-shift}px, ${-shift}px)`,
          mixBlendMode: "screen",
        }}
      />
    </>
  );
};

export const ClaudeCodeTrippy2: React.FC = () => {
  const frame = useCurrentFrame();

  const flatSrc = staticFile("mascot-flat.png");
  const threeDSrc = staticFile("mascot-3d.png");

  // Scene transitions
  const scene = Math.floor(frame / 75) % 6;

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <VortexBackground />

      {/* Layer 1: Hyper tunnel */}
      <div style={{ opacity: scene === 0 || scene === 3 ? 1 : 0.35 }}>
        <HyperTunnel src={threeDSrc} aspectRatio={THREE_D_ASPECT} />
      </div>

      {/* Layer 2: Dual tight spirals */}
      <div style={{ opacity: scene === 1 || scene === 4 ? 1 : 0.4 }}>
        <TightSpiral
          src={flatSrc}
          aspectRatio={FLAT_ASPECT}
          baseSize={70}
          spiralSpeed={2.5}
          direction={1}
          offset={0}
        />
        <TightSpiral
          src={threeDSrc}
          aspectRatio={THREE_D_ASPECT}
          baseSize={55}
          spiralSpeed={2}
          direction={-1}
          offset={180}
        />
      </div>

      {/* Layer 3: Mega kaleidoscope */}
      <div style={{ opacity: scene === 2 || scene === 5 ? 1 : 0.35 }}>
        <MegaKaleidoscope
          src={flatSrc}
          aspectRatio={FLAT_ASPECT}
          segments={10}
          size={100}
        />
      </div>

      {/* Layer 4: Tight wave orbits */}
      <TightWaveOrbit
        src={flatSrc}
        aspectRatio={FLAT_ASPECT}
        count={6}
        radius={280}
        size={65}
        speed={1.2}
        waveAmp={40}
      />
      <TightWaveOrbit
        src={threeDSrc}
        aspectRatio={THREE_D_ASPECT}
        count={5}
        radius={180}
        size={50}
        speed={-1.8}
        waveAmp={25}
      />

      {/* Layer 5: Chromatic orbiting beasts */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = frame * 1 + i * 60;
        const radius = 220 * SCALE * 0.4;
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius;
        return (
          <ChromaticBeast
            key={i}
            src={i % 2 === 0 ? flatSrc : threeDSrc}
            aspectRatio={i % 2 === 0 ? FLAT_ASPECT : THREE_D_ASPECT}
            size={70}
            x={x}
            y={y}
            rotation={frame * 2.5 + i * 60}
          />
        );
      })}

      {/* MASSIVE center piece */}
      <MassiveCenter src={threeDSrc} aspectRatio={THREE_D_ASPECT} />

      {/* Effects overlays */}
      <RGBShiftOverlay />
      <IntenseStrobe />
      <AnimatedScanLines />

      {/* Tighter vignette */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(circle, transparent 10%, rgba(0,0,0,0.9) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
