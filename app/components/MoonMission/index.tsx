'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense, useState, useEffect } from 'react';
import Game from './Game';

export default function MoonMission() {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'dead'>('start');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('cc-moon-mission-highscore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  const handleDeath = (finalScore: number, finalDistance: number, finalCoins: number) => {
    setScore(finalScore);
    setDistance(finalDistance);
    setCoins(finalCoins);
    setGameState('dead');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('cc-moon-mission-highscore', finalScore.toString());
    }
  };

  const handleStart = () => {
    setGameState('playing');
    setScore(0);
    setDistance(0);
    setCoins(0);
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
          />
        </Suspense>
      </Canvas>

      {/* HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-4 left-4 right-4 flex justify-between text-white font-mono">
          <div className="text-cyan-400">
            <div className="text-xs opacity-70">DISTANCE</div>
            <div className="text-xl">{Math.floor(distance)}m</div>
          </div>
          <div className="text-yellow-400 text-center">
            <div className="text-xs opacity-70">$CC</div>
            <div className="text-xl">{coins}</div>
          </div>
          <div className="text-fuchsia-400 text-right">
            <div className="text-xs opacity-70">SCORE</div>
            <div className="text-xl">{score}</div>
          </div>
        </div>
      )}

      {/* Start Screen */}
      {gameState === 'start' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
          <img src="/cc.png" alt="$CC" className="w-20 h-20 mb-4 animate-bounce" />
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-yellow-400 mb-2 font-mono">
            $CC MOON MISSION
          </h1>
          <p className="text-gray-400 mb-8 font-mono">TO THE MOON</p>
          <button
            onClick={handleStart}
            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white font-bold rounded-lg hover:scale-105 transition-transform font-mono"
          >
            LAUNCH
          </button>
          <p className="text-gray-500 text-sm mt-4 font-mono">Move mouse to control</p>
          <p className="text-gray-600 text-xs mt-2 font-mono">HIGH SCORE: {highScore}</p>
        </div>
      )}

      {/* Death Screen */}
      {gameState === 'dead' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90">
          <h1 className="text-6xl font-bold text-red-500 mb-4 font-mono animate-pulse">
            REKT
          </h1>
          <div className="text-center mb-8">
            <div className="text-2xl text-white font-mono mb-2">SCORE: {score}</div>
            <div className="text-gray-400 font-mono">Distance: {Math.floor(distance)}m</div>
            <div className="text-yellow-400 font-mono">$CC Collected: {coins}</div>
            {score >= highScore && score > 0 && (
              <div className="text-fuchsia-400 font-mono mt-2 animate-pulse">NEW HIGH SCORE!</div>
            )}
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleStart}
              className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white font-bold rounded-lg hover:scale-105 transition-transform font-mono"
            >
              TRY AGAIN
            </button>
            <button
              onClick={() => {
                const text = encodeURIComponent(
                  `I scored ${score} on $CC Moon Mission! 🚀🌙\n\nDistance: ${Math.floor(distance)}m\n$CC Collected: ${coins}\n\nCan you beat my score?\nclaudecode.wtf/moon\n\n$CC`
                );
                window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
              }}
              className="px-8 py-4 bg-white/10 border border-white/30 text-white font-bold rounded-lg hover:bg-white/20 transition-colors font-mono"
            >
              SHARE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
