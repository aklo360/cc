import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  OffthreadVideo,
  staticFile,
  Img,
} from "remotion";

interface GameplayClipProps {
  clipName: string;
}

export const GameplayClip: React.FC<GameplayClipProps> = ({ clipName }) => {
  const frame = useCurrentFrame();

  // Fade in/out transitions
  const opacity = interpolate(
    frame,
    [0, 15, 135, 150],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Slight zoom effect
  const scale = interpolate(
    frame,
    [0, 150],
    [1, 1.05],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d0d0d",
        justifyContent: "center",
        alignItems: "center",
        opacity,
      }}
    >
      {/* Placeholder for gameplay footage */}
      {/* Replace with actual video when captured:
          <OffthreadVideo src={staticFile(`footage/${clipName}.mp4`)} />
      */}
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          transform: `scale(${scale})`,
          background: "linear-gradient(135deg, #1a1a2e 0%, #0d0d0d 100%)",
        }}
      >
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 48,
            color: "#da7756",
            opacity: 0.3,
            textAlign: "center",
          }}
        >
          [GAMEPLAY: {clipName.toUpperCase()}]
          <br />
          <span style={{ fontSize: 24, opacity: 0.6 }}>
            Replace with captured footage
          </span>
        </div>
      </div>

      {/* Vignette overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
