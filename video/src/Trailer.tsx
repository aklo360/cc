import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
  OffthreadVideo,
  Audio,
  interpolate,
  Easing,
} from "remotion";
import { TitleCard } from "./scenes/TitleCard";
import { FeatureCallout } from "./scenes/FeatureCallout";
import { CallToAction } from "./scenes/CallToAction";

/**
 * STARCLAUDE64 CINEMATIC TRAILER v3
 * 15 seconds at 30fps = 450 frames
 * With smooth zoom transitions between shots
 *
 * Timeline:
 * 0:00 - 0:02.5 (0-75)    Title Card
 * 0:02.5 - 0:05 (75-150)  Gameplay: Action
 * 0:05 - 0:07 (150-210)   Feature: Collect $CC Coins
 * 0:07 - 0:09.5 (210-285) Gameplay: Combat
 * 0:09.5 - 0:11.5 (285-345) Feature: Barrel Roll
 * 0:11.5 - 0:13 (345-390) Gameplay: Barrel Roll
 * 0:13 - 0:15 (390-450)   CTA
 */

// Transition duration in frames (6 frames = 0.2s smooth transition)
const TRANSITION_FRAMES = 6;

// Gameplay clip with smooth zoom transition
const GameplayVideo: React.FC<{
  src: string;
  startFrom?: number;
  volume?: number;
  durationInFrames: number;
}> = ({ src, startFrom = 0, volume = 0.8, durationInFrames }) => {
  const frame = useCurrentFrame();

  // Zoom in transition at start
  const zoomIn = interpolate(
    frame,
    [0, TRANSITION_FRAMES],
    [1.08, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  // Zoom out transition at end
  const zoomOut = interpolate(
    frame,
    [durationInFrames - TRANSITION_FRAMES, durationInFrames],
    [1, 1.05],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.in(Easing.cubic),
    }
  );

  // Fade in/out
  const opacity = interpolate(
    frame,
    [0, TRANSITION_FRAMES, durationInFrames - TRANSITION_FRAMES, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const scale = frame < durationInFrames / 2 ? zoomIn : zoomOut;

  return (
    <AbsoluteFill style={{ opacity }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <OffthreadVideo
          src={staticFile(src)}
          startFrom={startFrom}
          volume={volume}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>
      {/* Cinematic vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)",
          pointerEvents: "none",
        }}
      />
      {/* Top/bottom cinematic bars */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 60,
          background: "linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 60,
          background: "linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

export const Trailer: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Music fade in/out
  const musicVolume = interpolate(
    frame,
    [0, 30, durationInFrames - 30, durationInFrames],
    [0, 0.7, 0.7, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {/* Background music - full trailer */}
      <Audio
        src={staticFile("bgm_level1.ogg")}
        volume={musicVolume}
        startFrom={0}
      />

      {/* Title Card: 0-2.5 seconds (0-75 frames) */}
      <Sequence from={0} durationInFrames={75}>
        <TitleCard />
      </Sequence>

      {/* Gameplay: Action 2.5-5 seconds (75-150 frames) */}
      <Sequence from={75} durationInFrames={75}>
        <GameplayVideo
          src="footage/clip_action.mp4"
          startFrom={4}
          durationInFrames={75}
        />
      </Sequence>

      {/* Feature: Collect Coins 5-7 seconds (150-210 frames) */}
      <Sequence from={150} durationInFrames={60}>
        <FeatureCallout title="COLLECT $CC" subtitle="EARN POINTS" />
      </Sequence>

      {/* Gameplay: Combat 7-9.5 seconds (210-285 frames) */}
      <Sequence from={210} durationInFrames={75}>
        <GameplayVideo
          src="footage/clip_combat.mp4"
          startFrom={4}
          durationInFrames={75}
        />
      </Sequence>

      {/* Feature: Barrel Roll 9.5-11.5 seconds (285-345 frames) */}
      <Sequence from={285} durationInFrames={60}>
        <FeatureCallout title="BARREL ROLL" subtitle="DODGE EVERYTHING" />
      </Sequence>

      {/* Gameplay: Barrel Roll 11.5-13 seconds (345-390 frames) */}
      <Sequence from={345} durationInFrames={45}>
        <GameplayVideo
          src="footage/clip_barrelroll.mp4"
          startFrom={4}
          durationInFrames={45}
        />
      </Sequence>

      {/* CTA: 13-15 seconds (390-450 frames) */}
      <Sequence from={390} durationInFrames={60}>
        <CallToAction />
      </Sequence>
    </AbsoluteFill>
  );
};
