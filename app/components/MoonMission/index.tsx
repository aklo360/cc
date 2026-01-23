'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense, useState, useEffect } from 'react';
import Game from './Game';

export default function MoonMission() {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'dead'>('start');
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [coins, setCoins] = useState(0);
  const [musicMuted, setMusicMuted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('cc-starclaude64-highscore');
    if (saved) setHighScore(parseInt(saved, 10));
    const mutedSaved = localStorage.getItem('cc-starclaude64-music-muted');
    if (mutedSaved) setMusicMuted(mutedSaved === 'true');
  }, []);

  const toggleMusicMute = () => {
    const newMuted = !musicMuted;
    setMusicMuted(newMuted);
    localStorage.setItem('cc-starclaude64-music-muted', String(newMuted));
  };

  const handleDeath = (finalScore: number, finalDistance: number, finalCoins: number) => {
    setScore(finalScore);
    setDistance(finalDistance);
    setCoins(finalCoins);
    setGameState('dead');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('cc-starclaude64-highscore', finalScore.toString());
    }
  };

  const handleStart = () => {
    setIsWarmingUp(true);
    setGameState('playing');
    setScore(0);
    setDistance(0);
    setCoins(0);

    // Warmup period - hide flicker behind loading screen
    setTimeout(() => {
      setIsWarmingUp(false);
    }, 1500);
  };

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>
        <Suspense fallback={null}>
          <Game
            gameState={gameState}
            onDeath={handleDeath}
            onScoreUpdate={setScore}
            onDistanceUpdate={setDistance}
            onCoinsUpdate={setCoins}
            musicMuted={musicMuted}
            isWarmingUp={isWarmingUp}
          />
        </Suspense>
      </Canvas>

      {/* Warmup loading screen - hides flicker */}
      {isWarmingUp && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center">
          <img src="/cc.png" alt="$CC" className="w-16 h-16 mb-4 animate-spin" />
          <div className="text-[#da7756] font-mono text-2xl animate-pulse">LAUNCHING...</div>
        </div>
      )}

      {/* HUD */}
      {gameState === 'playing' && (
        <>
          {/* Stats - top right */}
          <div className="absolute top-4 right-4 flex gap-6 text-white font-mono">
            <div className="text-center">
              <div className="text-xs text-[#da7756]/70">DISTANCE</div>
              <div className="text-xl text-[#da7756]">{Math.floor(distance)}m</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-[#da7756]/70">$CC</div>
              <div className="text-xl text-[#da7756]">{coins}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-[#da7756]/70">SCORE</div>
              <div className="text-xl text-[#da7756]">{score}</div>
            </div>
          </div>

          {/* Mute Button - bottom right */}
          <button
            onClick={toggleMusicMute}
            className="absolute bottom-4 right-4 px-4 py-3 bg-black/50 border border-[#da7756]/50 rounded-lg text-[#da7756] text-2xl hover:bg-[#da7756]/20 transition-colors font-mono"
          >
            {musicMuted ? '🔇' : '🔊'}
          </button>
        </>
      )}

      {/* Start Screen */}
      {gameState === 'start' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
          <img src="/cc.png" alt="$CC" className="w-20 h-20 mb-4 animate-bounce" />
          <h1 className="text-4xl font-bold text-[#da7756] mb-2 font-mono">
            STARCLAUDE64
          </h1>
          <p className="text-[#da7756]/60 mb-8 font-mono text-center text-sm">DODGE THE ASTEROIDS, COLLECT THE CLAUDE COINS</p>
          <button
            onClick={handleStart}
            className="px-8 py-4 bg-[#da7756] text-white font-bold rounded-lg hover:scale-105 hover:bg-[#c56a4d] transition-all font-mono"
          >
            LAUNCH
          </button>
          <div className="text-[#da7756]/70 text-sm mt-6 font-mono text-center space-y-1">
            <p><span className="text-[#da7756]">WASD</span> Move</p>
            <p><span className="text-[#da7756]">↑↓</span> Forward/Back</p>
            <p><span className="text-[#da7756]">←→</span> Barrel Roll (dodge!)</p>
            <p><span className="text-[#da7756]">SPACE</span> Shoot · <span className="text-[#da7756]">SHIFT</span> Bomb</p>
          </div>
          <p className="text-[#da7756]/40 text-xs mt-4 font-mono">HIGH SCORE: {highScore}</p>
        </div>
      )}

      {/* Death Screen */}
      {gameState === 'dead' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90">
          <h1 className="text-6xl font-bold text-[#da7756] mb-4 font-mono animate-pulse">
            REKT
          </h1>
          <div className="text-center mb-8">
            <div className="text-2xl text-[#da7756] font-mono mb-2">SCORE: {score}</div>
            <div className="text-[#da7756]/70 font-mono">Distance: {Math.floor(distance)}m</div>
            <div className="text-[#da7756]/70 font-mono">$CC Collected: {coins}</div>
            {score >= highScore && score > 0 && (
              <div className="text-[#da7756] font-mono mt-2 animate-pulse">NEW HIGH SCORE!</div>
            )}
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleStart}
              className="px-8 py-4 bg-[#da7756] text-white font-bold rounded-lg hover:scale-105 hover:bg-[#c56a4d] transition-all font-mono"
            >
              TRY AGAIN
            </button>
            <button
              onClick={() => {
                const text = encodeURIComponent(
                  `I scored ${score} on StarClaude64! 🚀✨\n\nDistance: ${Math.floor(distance)}m\n$CC Collected: ${coins}\n\nCan you beat my score?\nclaudecode.wtf/moon\n\n$CC`
                );
                window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
              }}
              className="px-8 py-4 bg-black/50 border border-[#da7756]/50 text-[#da7756] font-bold rounded-lg hover:bg-[#da7756]/20 transition-colors font-mono"
            >
              SHARE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
