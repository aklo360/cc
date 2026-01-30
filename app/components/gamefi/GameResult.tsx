'use client';

/**
 * Game Result Modal - Win/lose display with confetti
 *
 * Features:
 * - Win/lose animations
 * - Confetti on win
 * - Payout display
 * - Play again button
 */

import React, { useEffect, useState } from 'react';

interface GameResultProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayAgain?: () => void;
  result: 'win' | 'lose' | null;
  betAmount: number;
  payout: number;
  message?: string;
}

export function GameResult({
  isOpen,
  onClose,
  onPlayAgain,
  result,
  betAmount,
  payout,
  message,
}: GameResultProps) {
  const [confetti, setConfetti] = useState<React.ReactElement[]>([]);

  // Generate confetti on win
  useEffect(() => {
    if (result === 'win' && isOpen) {
      const particles: React.ReactElement[] = [];
      for (let i = 0; i < 50; i++) {
        const style = {
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 0.5}s`,
          backgroundColor: ['#da7756', '#4ade80', '#fbbf24', '#f472b6'][
            Math.floor(Math.random() * 4)
          ],
        };
        particles.push(
          <div
            key={i}
            className="confetti-particle"
            style={style}
          />
        );
      }
      setConfetti(particles);
    } else {
      setConfetti([]);
    }
  }, [result, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Confetti container */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confetti}
      </div>

      <div
        className="relative bg-bg-secondary border border-border rounded-lg p-8 max-w-md w-full mx-4 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Result icon */}
        <div className={`text-6xl mb-4 ${result === 'win' ? 'animate-bounce' : ''}`}>
          {result === 'win' ? '🎉' : '💀'}
        </div>

        {/* Result text */}
        <h2 className={`text-3xl font-bold mb-2 ${
          result === 'win' ? 'text-accent-green' : 'text-red-400'
        }`}>
          {result === 'win' ? 'YOU WON!' : 'YOU LOST'}
        </h2>

        {/* Custom message */}
        {message && (
          <p className="text-text-secondary mb-4">{message}</p>
        )}

        {/* Payout info */}
        <div className="bg-bg-primary rounded-md p-4 mb-6">
          {result === 'win' ? (
            <div className="space-y-1">
              <p className="text-text-muted text-sm">Payout</p>
              <p className="text-2xl font-bold text-accent-green">
                +{payout.toLocaleString()} $CC
              </p>
              <p className="text-xs text-text-muted">
                Net profit: +{(payout - betAmount).toLocaleString()} $CC
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-text-muted text-sm">Net Loss</p>
              <p className="text-2xl font-bold text-red-400">
                -{(betAmount - payout).toLocaleString()} $CC
              </p>
              {payout > 0 && (
                <p className="text-xs text-text-muted">
                  Staked {betAmount.toLocaleString()}, got back {payout.toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-bg-tertiary border border-border text-text-primary px-4 py-2 rounded-md text-sm hover:bg-bg-primary transition-colors"
          >
            Close
          </button>
          {onPlayAgain && (
            <button
              onClick={() => {
                onClose();
                onPlayAgain();
              }}
              className="flex-1 bg-claude-orange text-white font-semibold py-2 px-4 rounded-md text-sm hover:bg-claude-orange/80 transition-colors"
            >
              Play Again
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .confetti-particle {
          position: absolute;
          width: 10px;
          height: 10px;
          top: -10px;
          animation: fall 3s linear forwards;
        }

        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default GameResult;
