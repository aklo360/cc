'use client';

/**
 * useBalance Hook - Fetches and tracks wallet balances
 * Network-aware: uses devnet token on devnet, mainnet token on mainnet
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

// $CC token mints - network-aware
const CC_MINT_MAINNET = new PublicKey('Hg23qBLJDvhQtGLHMvot7NK54qAhzQFj9BVd5jpABAGS');
const CC_MINT_DEVNET = new PublicKey('GzoMpC5ywKJzHsKmHBepHUXBP72V9QMtVBqus3egCDe9');

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

  const [sol, setSol] = useState(0);
  const [cc, setCc] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
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
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch SOL balance
      const solBalance = await connection.getBalance(publicKey);
      setSol(solBalance / LAMPORTS_PER_SOL);

      // Fetch $CC balance (9 decimals)
      try {
        const ata = await getAssociatedTokenAddress(ccMint, publicKey);
        console.log('[useBalance] Fetching $CC balance from ATA:', ata.toBase58());
        console.log('[useBalance] Using mint:', ccMint.toBase58());
        console.log('[useBalance] RPC endpoint:', connection.rpcEndpoint);
        const tokenAccount = await getAccount(connection, ata);
        const ccBalance = Number(tokenAccount.amount) / 1_000_000_000;
        console.log('[useBalance] $CC balance:', ccBalance, '(raw:', tokenAccount.amount.toString(), ')');
        setCc(ccBalance);
      } catch (err) {
        // Token account doesn't exist or error
        console.log('[useBalance] Error fetching $CC:', err);
        setCc(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch balances'));
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, connected, connection, ccMint]);

  // Initial fetch and refresh interval
  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 10000);
    return () => clearInterval(interval);
  }, [fetchBalances]);

  return { sol, cc, isLoading, error, refresh: fetchBalances };
}

export default useBalance;
