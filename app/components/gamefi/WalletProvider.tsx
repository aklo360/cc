'use client';

/**
 * Solana Wallet Provider - Wraps the app with wallet connection capability
 *
 * Usage:
 * Wrap your game page with <WalletProvider> to enable wallet connection.
 */

import React, { useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl, Cluster } from '@solana/web3.js';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletProviderProps {
  children: React.ReactNode;
  network?: Cluster;
}

// Reliable RPC endpoints (Helius for mainnet)
const RPC_ENDPOINTS: Record<Cluster, string> = {
  'mainnet-beta': 'https://mainnet.helius-rpc.com/?api-key=8606e721-8a69-4f6f-b961-327d215ead31',
  'devnet': 'https://api.devnet.solana.com',
  'testnet': 'https://api.testnet.solana.com',
};

export function WalletProvider({
  children,
  network = 'mainnet-beta',
}: WalletProviderProps) {
  // RPC endpoint - use env var or fallback to cluster URL
  const endpoint = useMemo(() => {
    if (process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
      return process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    }
    return RPC_ENDPOINTS[network];
  }, [network]);

  // Wallet adapters
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}

export default WalletProvider;
