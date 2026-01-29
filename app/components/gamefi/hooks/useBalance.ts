'use client';

/**
 * useBalance Hook - Fetches and tracks wallet balances
 * Network-aware: uses devnet token on devnet, mainnet token on mainnet
 * Features: caching, parallel fetching, optimistic updates
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

// $CC token mints - network-aware
const CC_MINT_MAINNET = new PublicKey('Hg23qBLJDvhQtGLHMvot7NK54qAhzQFj9BVd5jpABAGS');
const CC_MINT_DEVNET = new PublicKey('GzoMpC5ywKJzHsKmHBepHUXBP72V9QMtVBqus3egCDe9');

// Cache key prefix
const CACHE_KEY = 'cc_balance_cache_';
const CACHE_TTL = 30000; // 30 seconds

// Get cached balance for a wallet
function getCachedBalance(wallet: string): { sol: number; cc: number; timestamp: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY + wallet);
    if (cached) {
      const data = JSON.parse(cached);
      // Return cache if not expired
      if (Date.now() - data.timestamp < CACHE_TTL) {
        return data;
      }
    }
  } catch {}
  return null;
}

// Set cached balance
function setCachedBalance(wallet: string, sol: number, cc: number) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY + wallet, JSON.stringify({ sol, cc, timestamp: Date.now() }));
  } catch {}
}

export interface Balance {
  sol: number;
  cc: number;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useBalance(): Balance {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();

  // Initialize from cache if available
  const initialCache = publicKey ? getCachedBalance(publicKey.toBase58()) : null;
  const [sol, setSol] = useState(initialCache?.sol ?? 0);
  const [cc, setCc] = useState(initialCache?.cc ?? 0);
  const [isLoading, setIsLoading] = useState(!initialCache); // Only loading if no cache
  const [error, setError] = useState<Error | null>(null);

  // Detect network from RPC endpoint
  const ccMint = useMemo(() => {
    const endpoint = connection.rpcEndpoint;
    const isDevnet = endpoint.includes('devnet');
    return isDevnet ? CC_MINT_DEVNET : CC_MINT_MAINNET;
  }, [connection.rpcEndpoint]);

  const fetchBalances = useCallback(async () => {
    if (!publicKey || !connected) {
      setSol(0);
      setCc(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Pre-compute ATA address (this is synchronous, no RPC call)
      const ata = await getAssociatedTokenAddress(ccMint, publicKey);

      // Fetch SOL and CC balances in PARALLEL
      const [solBalance, ccBalance] = await Promise.all([
        connection.getBalance(publicKey),
        connection.getTokenAccountBalance(ata).then(res => {
          return Number(res.value.amount) / 1_000_000_000;
        }).catch(() => 0) // Account doesn't exist = 0
      ]);

      const solVal = solBalance / LAMPORTS_PER_SOL;
      setSol(solVal);
      setCc(ccBalance);

      // Cache the result
      setCachedBalance(publicKey.toBase58(), solVal, ccBalance);
    } catch (err) {
      console.error('[useBalance] Error:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch balances'));
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, connected, connection, ccMint]);

  // Load from cache immediately on wallet change, then fetch fresh
  useEffect(() => {
    if (publicKey) {
      const cached = getCachedBalance(publicKey.toBase58());
      if (cached) {
        setSol(cached.sol);
        setCc(cached.cc);
        setIsLoading(false); // Show cached immediately
      }
    }
    fetchBalances();
    const interval = setInterval(fetchBalances, 10000);
    return () => clearInterval(interval);
  }, [fetchBalances, publicKey]);

  return { sol, cc, isLoading, error, refresh: fetchBalances };
}

export default useBalance;
