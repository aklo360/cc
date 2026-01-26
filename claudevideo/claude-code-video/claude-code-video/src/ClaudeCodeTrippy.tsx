import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  random,
} from "remotion";

// Image aspect ratios - PRESERVED
const FLAT_ASPECT = 911 / 614; // ~1.48
const THREE_D_ASPECT = 1; // 1:1

// Insane color cycling background
const TripBackground: React.FC = () => {
  const frame = useCurrentFrame();

  const layers = [];
  for (let i = 0; i < 6; i++) {
    const hue = (frame * (3 + i) + i * 60) % 360;
    const scale = 1 + Math.sin(frame * 0.05 + i) * 0.5;
    const rotation = frame * (i % 2 === 0 ? 0.5 : -0.5) + i * 30;

    layers.push(
      <div
        key={i}
        style={{
          position: "absolute",
          inset: -200,
          background: `conic-gradient(from ${rotation}deg at 50% 50%,
            hsl(${hue}, 100%, 50%) 0deg,
            hsl(${(hue + 60) % 360}, 100%, 50%) 60deg,
            hsl(${(hue + 120) % 360}, 100%, 50%) 120deg,
            hsl(${(hue + 180) % 360}, 100%, 50%) 180deg,
            hsl(${(hue + 240) % 360}, 100%, 50%) 240deg,
            hsl(${(hue + 300) % 360}, 100%, 50%) 300deg,
            hsl(${hue}, 100%, 50%) 360deg
          )`,
          transform: `scale(${scale}) rotate(${rotation}deg)`,
          opacity: 0.3,
          mixBlendMode: i % 2 === 0 ? "screen" : "multiply",
        }}
      />
    );
  }

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      {layers}
    </AbsoluteFill>
  );
};

// Fractal spiral of images
const FractalSpiral: React.FC<{
  src: string;
  aspectRatio: number;
  baseSize: number;
  spiralSpeed: number;
  direction: 1 | -1;
}> = ({ src, aspectRatio, baseSize, spiralSpeed, direction }) => {
  const frame = useCurrentFrame();
  const count = 20;

  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const t = i / count;
        const angle = t * 720 + frame * spiralSpeed * direction;
        const distance = 50 + t * 500;
        const scale = 1 - t * 0.7;
        const size = baseSize * scale;

        const x = Math.cos((angle * Math.PI) / 180) * distance;
        const y = Math.sin((angle * Math.PI) / 180) * distance;

        const hueShift = (frame * 5 + i * 20) % 360;
        const opacity = interpolate(t, [0, 0.5, 1], [1, 0.7, 0.3]);

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
              transform: `translate(-50%, -50%) rotate(${angle + frame}deg)`,
              filter: `hue-rotate(${hueShift}deg) saturate(2) brightness(1.2)`,
              opacity,
            }}
          />
        );
      })}
    </>
  );
};

// Kaleidoscope mirror effect
const Kaleidoscope: React.FC<{
  src: string;
  aspectRatio: number;
  segments: number;
  size: number;
}> = ({ src, aspectRatio, segments, size }) => {
  const frame = useCurrentFrame();
  const rotation = frame * 2;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      }}
    >
      {Array.from({ length: segments }).map((_, i) => {
        const angle = (360 / segments) * i;
        const hue = (frame * 3 + i * (360 / segments)) % 360;
        const pulse = Math.sin(frame * 0.1 + i * 0.5) * 0.2 + 1;

        return (
          <Img
            key={i}
            src={src}
            style={{
              position: "absolute",
              width: size * aspectRatio * pulse,
              height: size * pulse,
              transformOrigin: "center center",
              transform: `rotate(${angle}deg) translateY(-${size * 0.8}px) ${i % 2 === 0 ? "scaleX(-1)" : ""}`,
              filter: `hue-rotate(${hue}deg) drop-shadow(0 0 20px hsl(${hue}, 100%, 50%))`,
              opacity: 0.8,
            }}
          />
        );
      })}
    </div>
  );
};

// Tunnel zoom effect
const TunnelZoom: React.FC<{
  src: string;
  aspectRatio: number;
}> = ({ src, aspectRatio }) => {
  const frame = useCurrentFrame();
  const layers = 15;

  return (
    <>
      {Array.from({ length: layers }).map((_, i) => {
        const baseScale = 0.1 + i * 0.3;
        const zoomProgress = ((frame * 0.02 + i * 0.1) % 1);
        const scale = baseScale + zoomProgress * 2;
        const opacity = interpolate(zoomProgress, [0, 0.5, 1], [0, 0.6, 0]);
        const rotation = i * 15 + frame * (i % 2 === 0 ? 1 : -1);
        const hue = (frame * 4 + i * 25) % 360;

        const size = 200 * scale;

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
              filter: `hue-rotate(${hue}deg) blur(${zoomProgress * 2}px)`,
              opacity,
            }}
          />
        );
      })}
    </>
  );
};

// Chromatic aberration split
const ChromaticImage: React.FC<{
  src: string;
  aspectRatio: number;
  size: number;
  x: number;
  y: number;
  rotation: number;
}> = ({ src, aspectRatio, size, x, y, rotation }) => {
  const frame = useCurrentFrame();
  const spread = Math.sin(frame * 0.15) * 15 + 5;

  return (
    <div
      style={{
        position: "absolute",
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      }}
    >
      {/* Red channel */}
      <Img
        src={src}
        style={{
          position: "absolute",
          width: size * aspectRatio,
          height: size,
          transform: `translate(${-spread}px, 0)`,
          filter: "hue-rotate(-60deg) saturate(3)",
          mixBlendMode: "screen",
          opacity: 0.8,
        }}
      />
      {/* Green channel */}
      <Img
        src={src}
        style={{
          position: "absolute",
          width: size * aspectRatio,
          height: size,
          transform: `translate(0, ${-spread * 0.5}px)`,
          filter: "hue-rotate(60deg) saturate(3)",
          mixBlendMode: "screen",
          opacity: 0.8,
        }}
      />
      {/* Blue channel */}
      <Img
        src={src}
        style={{
          position: "absolute",
          width: size * aspectRatio,
          height: size,
          transform: `translate(${spread}px, ${spread * 0.5}px)`,
          filter: "hue-rotate(180deg) saturate(3)",
          mixBlendMode: "screen",
          opacity: 0.8,
        }}
      />
    </div>
  );
};

// Orbiting ring with wave motion
const WaveOrbit: React.FC<{
  src: string;
  aspectRatio: number;
  count: number;
  radius: number;
  size: number;
  speed: number;
  waveAmp: number;
}> = ({ src, aspectRatio, count, radius, size, speed, waveAmp }) => {
  const frame = useCurrentFrame();

  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const baseAngle = (360 / count) * i + frame * speed;
        const wave = Math.sin(frame * 0.2 + i * 0.5) * waveAmp;
        const currentRadius = radius + wave;

        const x = Math.cos((baseAngle * Math.PI) / 180) * currentRadius;
        const y = Math.sin((baseAngle * Math.PI) / 180) * currentRadius;

        const scale = 0.8 + Math.sin(frame * 0.15 + i) * 0.4;
        const hue = (frame * 6 + i * (360 / count)) % 360;
        const rotation = frame * 3 + i * 45;

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
              filter: `hue-rotate(${hue}deg) drop-shadow(0 0 30px hsl(${hue}, 100%, 60%))`,
            }}
          />
        );
      })}
    </>
  );
};

// Pulsing center with glow
const PulsingCenter: React.FC<{
  src: string;
  aspectRatio: number;
}> = ({ src, aspectRatio }) => {
  const frame = useCurrentFrame();

  const breathe = Math.sin(frame * 0.08) * 0.3 + 1;
  const megaPulse = interpolate(
    frame % 60,
    [0, 10, 30, 60],
    [1, 1.5, 1, 1]
  );
  const scale = breathe * megaPulse;
  const rotation = Math.sin(frame * 0.03) * 20;
  const hue = (frame * 2) % 360;

  const size = 250;
  const glowIntensity = 30 + Math.sin(frame * 0.1) * 20;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
      }}
    >
      {/* Glow layers */}
      {[3, 2, 1].map((i) => (
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
            filter: `blur(${i * 15}px) hue-rotate(${hue + i * 30}deg) brightness(2)`,
            opacity: 0.5 / i,
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
          filter: `hue-rotate(${hue}deg) drop-shadow(0 0 ${glowIntensity}px hsl(${hue}, 100%, 60%))`,
        }}
      />
    </div>
  );
};

// Strobe flash overlay
const StrobeFlash: React.FC = () => {
  const frame = useCurrentFrame();
  // Flash every ~20 frames but not too intense
  const flash = frame % 45 < 2;
  const hue = (frame * 10) % 360;

  return flash ? (
    <AbsoluteFill
      style={{
        background: `hsl(${hue}, 100%, 70%)`,
        opacity: 0.3,
        mixBlendMode: "overlay",
      }}
    />
  ) : null;
};

// Scan lines for retro effect
const ScanLines: React.FC = () => {
  const frame = useCurrentFrame();
  const offset = (frame * 2) % 4;

  return (
    <AbsoluteFill
      style={{
        background: `repeating-linear-gradient(
          0deg,
          transparent 0px,
          transparent ${2 + offset}px,
          rgba(0,0,0,0.1) ${2 + offset}px,
          rgba(0,0,0,0.1) ${4 + offset}px
        )`,
        pointerEvents: "none",
      }}
    />
  );
};

export const ClaudeCodeTrippy: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const flatSrc = staticFile("mascot-flat.png");
  const threeDSrc = staticFile("mascot-3d.png");

  // Scene transitions based on frame
  const scene = Math.floor(frame / 90) % 5;

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <TripBackground />

      {/* Layer 1: Tunnel zoom with 3D mascot */}
      <div style={{ opacity: scene === 0 || scene === 3 ? 1 : 0.3 }}>
        <TunnelZoom src={threeDSrc} aspectRatio={THREE_D_ASPECT} />
      </div>

      {/* Layer 2: Fractal spirals */}
      <div style={{ opacity: scene === 1 || scene === 4 ? 1 : 0.4 }}>
        <FractalSpiral
          src={flatSrc}
          aspectRatio={FLAT_ASPECT}
          baseSize={80}
          spiralSpeed={2}
          direction={1}
        />
        <FractalSpiral
          src={threeDSrc}
          aspectRatio={THREE_D_ASPECT}
          baseSize={60}
          spiralSpeed={1.5}
          direction={-1}
        />
      </div>

      {/* Layer 3: Kaleidoscope */}
      <div style={{ opacity: scene === 2 ? 1 : 0.3 }}>
        <Kaleidoscope
          src={flatSrc}
          aspectRatio={FLAT_ASPECT}
          segments={12}
          size={120}
        />
      </div>

      {/* Layer 4: Wave orbits */}
      <WaveOrbit
        src={flatSrc}
        aspectRatio={FLAT_ASPECT}
        count={8}
        radius={350}
        size={70}
        speed={1}
        waveAmp={50}
      />
      <WaveOrbit
        src={threeDSrc}
        aspectRatio={THREE_D_ASPECT}
        count={6}
        radius={220}
        size={55}
        speed={-1.5}
        waveAmp={30}
      />

      {/* Layer 5: Chromatic orbiting elements */}
      {[0, 1, 2, 3].map((i) => {
        const angle = frame * 0.8 + i * 90;
        const radius = 280;
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius;
        return (
          <ChromaticImage
            key={i}
            src={i % 2 === 0 ? flatSrc : threeDSrc}
            aspectRatio={i % 2 === 0 ? FLAT_ASPECT : THREE_D_ASPECT}
            size={90}
            x={x}
            y={y}
            rotation={frame * 2 + i * 45}
          />
        );
      })}

      {/* Center piece */}
      <PulsingCenter src={threeDSrc} aspectRatio={THREE_D_ASPECT} />

      {/* Effects overlays */}
      <StrobeFlash />
      <ScanLines />

      {/* Vignette */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(circle, transparent 20%, rgba(0,0,0,0.8) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
