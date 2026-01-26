import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";

// Pulsing radial gradient background
const PsychedelicBackground: React.FC = () => {
  const frame = useCurrentFrame();

  const hue1 = (frame * 2) % 360;
  const hue2 = (hue1 + 60) % 360;
  const hue3 = (hue1 + 180) % 360;

  const pulse = Math.sin(frame * 0.1) * 0.2 + 0.8;

  return (
    <AbsoluteFill
      style={{
        background: `
          radial-gradient(circle at 50% 50%,
            hsl(${hue1}, 70%, ${15 * pulse}%) 0%,
            hsl(${hue2}, 80%, ${10 * pulse}%) 50%,
            hsl(${hue3}, 90%, ${5 * pulse}%) 100%
          )
        `,
      }}
    />
  );
};

// Single spinning logo for mandala ring
const SpinningLogo: React.FC<{
  angle: number;
  distance: number;
  size: number;
  rotationSpeed: number;
  pulsePhase: number;
  src: string;
  opacity?: number;
}> = ({ angle, distance, size, rotationSpeed, pulsePhase, src, opacity = 1 }) => {
  const frame = useCurrentFrame();

  const rotation = frame * rotationSpeed;
  const currentAngle = angle + frame * 0.5;

  const x = Math.cos((currentAngle * Math.PI) / 180) * distance;
  const y = Math.sin((currentAngle * Math.PI) / 180) * distance;

  const pulse = Math.sin((frame + pulsePhase) * 0.15) * 0.3 + 1;
  const currentSize = size * pulse;

  return (
    <Img
      src={src}
      style={{
        position: "absolute",
        width: currentSize,
        height: currentSize,
        left: `calc(50% + ${x}px - ${currentSize / 2}px)`,
        top: `calc(50% + ${y}px - ${currentSize / 2}px)`,
        transform: `rotate(${rotation}deg)`,
        imageRendering: "pixelated",
        opacity,
        filter: `hue-rotate(${frame * 3}deg)`,
      }}
    />
  );
};

// Ring of logos
const MandalaRing: React.FC<{
  count: number;
  distance: number;
  size: number;
  rotationSpeed: number;
  src: string;
  orbitSpeed?: number;
  opacity?: number;
}> = ({ count, distance, size, rotationSpeed, src, orbitSpeed = 0.5, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const baseAngle = frame * orbitSpeed;

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SpinningLogo
          key={i}
          angle={baseAngle + (360 / count) * i}
          distance={distance}
          size={size}
          rotationSpeed={rotationSpeed}
          pulsePhase={i * 30}
          src={src}
          opacity={opacity}
        />
      ))}
    </>
  );
};

// Center pulsing logo
const CenterLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const breathe = Math.sin(frame * 0.08) * 0.2 + 1;
  const rotation = Math.sin(frame * 0.02) * 15;

  // Explosion effect at certain frames
  const explosionScale = interpolate(
    frame,
    [0, 30, 60, 200, 230, 260, 350, 380, 410],
    [0, 1.5, 1, 1, 1.8, 1, 1, 2, 1.2],
    { extrapolateRight: "clamp" }
  );

  const scale = breathe * explosionScale;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
      }}
    >
      <Img
        src={staticFile("cc-3d.jpeg")}
        style={{
          width: 300,
          height: 300,
          objectFit: "contain",
          filter: `drop-shadow(0 0 ${30 * breathe}px rgba(249, 115, 22, 0.8))`,
        }}
      />
    </div>
  );
};

// Floating sparkles
const Sparkle: React.FC<{
  x: number;
  y: number;
  delay: number;
  speed: number;
}> = ({ x, y, delay, speed }) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  const opacity = Math.sin(adjustedFrame * speed) * 0.5 + 0.5;
  const scale = Math.sin(adjustedFrame * speed * 0.7) * 0.5 + 0.5;
  const yOffset = Math.sin(adjustedFrame * 0.05) * 20;

  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: `translateY(${yOffset}px) scale(${scale})`,
        opacity,
        fontSize: 24,
        color: "#f97316",
        textShadow: "0 0 10px #f97316",
      }}
    >
      ✦
    </div>
  );
};

// Radial burst lines
const BurstLines: React.FC = () => {
  const frame = useCurrentFrame();
  const count = 24;

  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (360 / count) * i + frame * 0.3;
        const length = interpolate(
          Math.sin((frame + i * 10) * 0.1),
          [-1, 1],
          [100, 400]
        );
        const opacity = interpolate(
          Math.sin((frame + i * 15) * 0.08),
          [-1, 1],
          [0.1, 0.4]
        );

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: length,
              height: 2,
              background: `linear-gradient(90deg, transparent, rgba(249, 115, 22, ${opacity}), transparent)`,
              transform: `rotate(${angle}deg)`,
              transformOrigin: "left center",
            }}
          />
        );
      })}
    </>
  );
};

// Kaleidoscope overlay
const KaleidoscopeOverlay: React.FC = () => {
  const frame = useCurrentFrame();

  const segments = 8;
  const rotation = frame * 0.5;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        opacity: 0.3,
      }}
    >
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            transform: `rotate(${(360 / segments) * i}deg)`,
            transformOrigin: "center center",
          }}
        >
          <Img
            src={staticFile("ccbanner.png")}
            style={{
              width: 600,
              height: 200,
              objectFit: "cover",
              transform: "translateX(100px)",
              filter: `hue-rotate(${frame * 2 + i * 45}deg)`,
            }}
          />
        </div>
      ))}
    </div>
  );
};

// Concentric pulsing rings
const PulseRings: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <>
      {[1, 2, 3, 4, 5].map((ring) => {
        const delay = ring * 20;
        const baseRadius = 100 + ring * 80;
        const pulse = Math.sin((frame - delay) * 0.1) * 30;
        const opacity = interpolate(
          Math.sin((frame - delay) * 0.08),
          [-1, 1],
          [0.05, 0.2]
        );

        return (
          <div
            key={ring}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: (baseRadius + pulse) * 2,
              height: (baseRadius + pulse) * 2,
              border: `2px solid rgba(249, 115, 22, ${opacity})`,
              borderRadius: "50%",
              transform: "translate(-50%, -50%)",
              boxShadow: `0 0 20px rgba(249, 115, 22, ${opacity * 0.5})`,
            }}
          />
        );
      })}
    </>
  );
};

export const ClaudeCodeMandala: React.FC = () => {
  const frame = useCurrentFrame();

  // Generate random sparkle positions (deterministic based on index)
  const sparkles = Array.from({ length: 30 }).map((_, i) => ({
    x: ((i * 37) % 100),
    y: ((i * 53) % 100),
    delay: i * 5,
    speed: 0.1 + (i % 5) * 0.02,
  }));

  return (
    <AbsoluteFill>
      <PsychedelicBackground />

      <BurstLines />
      <PulseRings />

      {/* Outer ring - slow orbit */}
      <MandalaRing
        count={12}
        distance={450}
        size={60}
        rotationSpeed={2}
        src={staticFile("cc-logo.png")}
        orbitSpeed={0.3}
        opacity={0.7}
      />

      {/* Middle ring - medium orbit, opposite direction */}
      <MandalaRing
        count={8}
        distance={300}
        size={80}
        rotationSpeed={-3}
        src={staticFile("cc-logo-black.png")}
        orbitSpeed={-0.5}
        opacity={0.8}
      />

      {/* Inner ring - fast orbit */}
      <MandalaRing
        count={6}
        distance={180}
        size={70}
        rotationSpeed={4}
        src={staticFile("cc-logo.png")}
        orbitSpeed={0.8}
        opacity={0.9}
      />

      <KaleidoscopeOverlay />

      {/* Sparkles */}
      {sparkles.map((s, i) => (
        <Sparkle key={i} {...s} />
      ))}

      <CenterLogo />

      {/* Vignette overlay */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(circle, transparent 30%, rgba(0,0,0,0.7) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
