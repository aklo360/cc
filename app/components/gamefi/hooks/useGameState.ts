'use client';

/**
 * useGameState Hook - Fetches game state from chain
 */

import { useState, useEffect, useCallback } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useProgram, CASINO_PROGRAM_ID } from './useProgram';

export interface GameState {
  publicKey: PublicKey;
  authority: PublicKey;
  gameType: 'coinflip' | 'crash' | 'jackpot' | 'gacha';
  slug: string;
  config: {
    minBet: number;
    maxBet: number;
    houseEdgeBps: number;
    platformFeeLamports: number;
  };
  isActive: boolean;
  totalVolume: number;
  totalFees: number;
  currentRound: number;
}

export interface UseGameStateResult {
  gameState: GameState | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useGameState(gameSlug: string): UseGameStateResult {
  const { connection } = useConnection();
  const { program } = useProgram();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchGameState = useCallback(async () => {
    if (!program || !gameSlug) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Derive game state PDA
      const [gameStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('game'), Buffer.from(gameSlug)],
        CASINO_PROGRAM_ID
      );

      // Fetch account data
      const accountInfo = await connection.getAccountInfo(gameStatePda);
      if (!accountInfo) {
        setGameState(null);
        return;
      }

      // Parse account data (simplified - use Anchor's fetch in production)
      // This is a placeholder - actual parsing depends on Anchor IDL
      const data = accountInfo.data;

      // Mock game state for development
      setGameState({
        publicKey: gameStatePda,
        authority: new PublicKey(data.slice(8, 40)),
        gameType: 'coinflip',
        slug: gameSlug,
        config: {
          minBet: 1_000_000,
          maxBet: 1_000_000_000,
          houseEdgeBps: 200,
          platformFeeLamports: 1_000_000,
        },
        isActive: true,
        totalVolume: 0,
        totalFees: 0,
        currentRound: 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch game state'));
    } finally {
      setIsLoading(false);
    }
  }, [program, gameSlug, connection]);

  useEffect(() => {
    fetchGameState();
    const interval = setInterval(fetchGameState, 5000);
    return () => clearInterval(interval);
  }, [fetchGameState]);

  return { gameState, isLoading, error, refresh: fetchGameState };
}

export default useGameState;
