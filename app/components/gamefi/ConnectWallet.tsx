'use client';

/**
 * Connect Wallet Button - Shows wallet connection status and balance
 *
 * Features:
 * - Connect/disconnect wallet
 * - Display SOL and $CC balance (via shared useBalance hook)
 * - Truncated wallet address
 * - Network-aware token mint (devnet vs mainnet)
 */

import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useBalance } from './hooks/useBalance';

interface ConnectWalletProps {
  className?: string;
  showBalance?: boolean;
}

export function ConnectWallet({
  className = '',
  showBalance = true,
}: ConnectWalletProps) {
  const { publicKey, disconnect, connected, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  // Use shared balance hook - eliminates redundant RPC calls
  const { cc: ccBalance, isLoading: balanceLoading } = useBalance();

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
          <span className="text-claude-orange font-semibold text-sm">
            {balanceLoading ? '...' : `${ccBalance.toLocaleString()} $CC`}
          </span>
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
