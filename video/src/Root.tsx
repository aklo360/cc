import { Composition } from "remotion";
import { Trailer } from "./Trailer";
import { FeatureTrailer, FeatureTrailerProps } from "./compositions/FeatureTrailer";

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

      {/* Dynamic Feature Trailer - accepts props for any feature */}
      <Composition<FeatureTrailerProps>
        id="FeatureTrailer"
        component={FeatureTrailer}
        durationInFrames={15 * 30} // 15 seconds at 30fps (default)
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          featureName: "Code Poetry Generator",
          featureSlug: "poetry",
          description: "Turn your code into beautiful haikus and poetry",
          featureType: "static",
        }}
        // Duration: 15 seconds for standard, 30 seconds for games/complex features
        calculateMetadata={({ props }) => {
          const isLongForm = props.featureType === "game" || props.featureType === "complex";
          return {
            durationInFrames: isLongForm ? 30 * 30 : 15 * 30,
          };
        }}
      />
    </>
  );
};
