import { Composition } from "remotion";
import { Trailer } from "./Trailer";
import { FeatureTrailer } from "./compositions/FeatureTrailer";
import { BattleTrailer } from "./compositions/BattleTrailer";
import { CodeReviewTrailer } from "./compositions/CodeReviewTrailer";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Original StarClaude64 Trailer */}
      <Composition
        id="StarClaude64Trailer"
        component={Trailer}
        durationInFrames={15 * 30} // 15 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Dynamic Feature Trailer - Universal 20 second format */}
      <Composition
        id="FeatureTrailer"
        component={FeatureTrailer}
        durationInFrames={20 * 30} // 20 seconds at 30fps (600 frames)
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Code Battle Arena Trailer - Exact UI recreation */}
      <Composition
        id="BattleTrailer"
        component={BattleTrailer}
        durationInFrames={30 * 30} // 30 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Code Review Bot Trailer - Exact UI recreation */}
      <Composition
        id="CodeReviewTrailer"
        component={CodeReviewTrailer}
        durationInFrames={15 * 30} // 15 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
