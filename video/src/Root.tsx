import { Composition } from "remotion";
import { Trailer } from "./Trailer";
import { FeatureTrailer } from "./compositions/FeatureTrailer";
import { BattleTrailer } from "./compositions/BattleTrailer";
import { CodeReviewTrailer } from "./compositions/CodeReviewTrailer";
import { RealFootageTrailer } from "./compositions/RealFootageTrailer";
import { WebappTrailer } from "./compositions/WebappTrailer";
import { GameTrailer } from "./compositions/GameTrailer";
import { GameFiTrailer, GameFiTrailerProps } from "./compositions/GameFiTrailer";
import { TradingTerminalTrailer, TradingTerminalTrailerProps } from "./compositions/TradingTerminalTrailer";
import { WatchPageTrailer } from "./compositions/WatchPageTrailer";
import { NeuralGenesisTrailer, NeuralGenesisTrailerProps } from "./compositions/NeuralGenesisTrailer";

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

      {/* ═══════════════════════════════════════════════════════════════════════
       * GAMEFI TRAILER - GOLD STANDARD TEMPLATE
       * ═══════════════════════════════════════════════════════════════════════
       * This is the template for ALL future game trailers. Key patterns:
       * - 15 seconds (450 frames) - snappy, not slow
       * - 8 scenes: intro → connect → choice → bet → flip → result → balance → cta
       * - UI recreation (not generic boxes)
       * - Orange coin with 3D flip, confetti on win
       * - Cursor with click effects at exact positions
       *
       * When creating new game trailers, COPY THIS PATTERN.
       */}
      <Composition
        id="GameFiTrailer"
        component={GameFiTrailer}
        durationInFrames={15 * 30} // 15 seconds at 30fps (snappy!)
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          featureName: "CC Flip",
          featureSlug: "ccflip",
          network: "mainnet",
          initialBalance: 10000,
          betAmount: 1000,
          multiplier: 1.96,
          coinChoice: "heads",
          flipResult: "heads",
        } as GameFiTrailerProps}
      />

      {/* ═══════════════════════════════════════════════════════════════════════
       * TRADING TERMINAL TRAILER - CC Trading Terminal with DVD Bouncing Sell Button
       * ═══════════════════════════════════════════════════════════════════════
       * Showcases:
       * - GMGN-style price chart
       * - Buy/Sell tabs
       * - The iconic DVD bouncing sell button anti-sell mechanic!
       * - Cursor chasing the button across the screen
       * - 1% fee → buyback & burn messaging
       */}
      <Composition
        id="TradingTerminalTrailer"
        component={TradingTerminalTrailer}
        durationInFrames={20 * 30} // 20 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          buyAmount: 0.5,
          sellAmount: 10000,
          solBalance: 2.5,
          ccBalance: 50000,
        } as TradingTerminalTrailerProps}
      />

      {/* ═══════════════════════════════════════════════════════════════════════
       * WATCH PAGE TRAILER - 24/7 Livestream & Trade Reactions
       * ═══════════════════════════════════════════════════════════════════════
       * Showcases the /watch page with:
       * - 90s chatroom aesthetic with ASCII art
       * - Live dev logs scrolling
       * - Trade reactions (💚 buys, 🔻 sells) with personality
       * - Thinking session with insight discovery
       * - Real-time feel with terminal glow
       */}
      <Composition
        id="WatchPageTrailer"
        component={WatchPageTrailer}
        durationInFrames={15 * 30} // 15 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />

      {/* ═══════════════════════════════════════════════════════════════════════
       * NEURAL NETWORK GENESIS TRAILER - On-Chain Gacha
       * ═══════════════════════════════════════════════════════════════════════
       * Showcases the gacha probability engine with:
       * - Tier distribution grid (Basic/Advanced/Elite/Legendary)
       * - Sample size selector (Single 5,000 vs Batch 50,000)
       * - Evolution animation with progress bar
       * - Recent samples section with animated entries
       * - Confetti on Legendary hits
       */}
      <Composition
        id="NeuralGenesisTrailer"
        component={NeuralGenesisTrailer}
        durationInFrames={15 * 30} // 15 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          featureName: "Neural Network Genesis",
          featureSlug: "neural",
          // Good variety batch with a Legendary at the end for drama
          results: ["Basic", "Advanced", "Basic", "Basic", "Elite", "Basic", "Basic", "Advanced", "Basic", "Legendary"],
        } as NeuralGenesisTrailerProps}
      />
    </>
  );
};
