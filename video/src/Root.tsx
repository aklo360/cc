import { Composition } from "remotion";
import { Trailer } from "./Trailer";
import { FeatureTrailer } from "./compositions/FeatureTrailer";
import { BattleTrailer } from "./compositions/BattleTrailer";
import { CodeReviewTrailer } from "./compositions/CodeReviewTrailer";
import { RealFootageTrailer } from "./compositions/RealFootageTrailer";
import { WebappTrailer } from "./compositions/WebappTrailer";
import { GameTrailer } from "./compositions/GameTrailer";

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

      {/* Real Footage Trailer - Uses actual page capture */}
      <Composition
        id="RealFootageTrailer"
        component={RealFootageTrailer}
        durationInFrames={20 * 30} // 20 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Webapp Trailer - Exact UI recreation from styleguide */}
      <Composition
        id="WebappTrailer"
        component={WebappTrailer}
        durationInFrames={20 * 30} // 20 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Game Trailer - CC Invaders arcade game */}
      <Composition
        id="GameTrailer"
        component={GameTrailer}
        durationInFrames={20 * 30} // 20 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
