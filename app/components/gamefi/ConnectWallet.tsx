'use client';

/**
 * Connect Wallet Button - Shows wallet connection status and balance
 *
 * Features:
 * - Connect/disconnect wallet
 * - Display SOL and $CC balance
 * - Truncated wallet address
 * - Network-aware token mint (devnet vs mainnet)
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

// $CC token mints - network-aware
const CC_MINT_MAINNET = new PublicKey('Hg23qBLJDvhQtGLHMvot7NK54qAhzQFj9BVd5jpABAGS');
const CC_MINT_DEVNET = new PublicKey('GzoMpC5ywKJzHsKmHBepHUXBP72V9QMtVBqus3egCDe9');

interface ConnectWalletProps {
  className?: string;
  showBalance?: boolean;
}

export function ConnectWallet({
  className = '',
  showBalance = true,
}: ConnectWalletProps) {
  const { connection } = useConnection();
  const { publicKey, disconnect, connected, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [ccBalance, setCcBalance] = useState<number | null>(null);

  // Detect network from RPC endpoint
  const ccMint = useMemo(() => {
    const endpoint = connection.rpcEndpoint;
    const isDevnet = endpoint.includes('devnet');
    return isDevnet ? CC_MINT_DEVNET : CC_MINT_MAINNET;
  }, [connection.rpcEndpoint]);

  // Fetch balances when connected
  useEffect(() => {
    if (!publicKey || !connected) {
      setSolBalance(null);
      setCcBalance(null);
      return;
    }

    const fetchBalances = async () => {
      try {
        // Get SOL balance
        const sol = await connection.getBalance(publicKey);
        setSolBalance(sol / LAMPORTS_PER_SOL);

        // Get $CC balance
        try {
          const ata = await getAssociatedTokenAddress(ccMint, publicKey);
          const tokenAccount = await getAccount(connection, ata);
          setCcBalance(Number(tokenAccount.amount) / 1_000_000);
        } catch {
          // Token account doesn't exist
          setCcBalance(0);
        }
      } catch (error) {
        console.error('Failed to fetch balances:', error);
      }
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [publicKey, connected, connection, ccMint]);

  const handleClick = () => {
    if (connected) {
      disconnect();
    } else {
      setVisible(true);
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (connecting) {
    return (
      <button
        className={`bg-bg-secondary border border-border text-text-secondary px-4 py-2 rounded-md text-sm ${className}`}
        disabled
      >
        Connecting...
      </button>
    );
  }

  if (connected && publicKey) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {showBalance && (
          <div className="flex items-center gap-3 text-sm">
            {solBalance !== null && (
              <span className="text-text-secondary">
                {solBalance.toFixed(3)} SOL
              </span>
            )}
            {ccBalance !== null && (
              <span className="text-claude-orange font-semibold">
                {ccBalance.toLocaleString()} $CC
              </span>
            )}
          </div>
        )}
        <button
          onClick={handleClick}
          className="bg-bg-secondary border border-border text-text-primary px-4 py-2 rounded-md text-sm hover:bg-bg-tertiary hover:border-claude-orange transition-colors"
        >
          {truncateAddress(publicKey.toBase58())}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`bg-claude-orange text-white font-semibold py-2 px-6 rounded-md text-sm hover:bg-claude-orange/80 transition-colors ${className}`}
    >
      Connect Wallet
    </button>
  );
}

export default ConnectWallet;
