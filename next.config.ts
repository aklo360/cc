import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // Transpile Solana packages for browser compatibility
  transpilePackages: [
    "@solana/web3.js",
    "@solana/spl-token",
    "@solana/wallet-adapter-base",
    "@solana/wallet-adapter-react",
    "@solana/wallet-adapter-react-ui",
    "@solana/wallet-adapter-wallets",
    "@coral-xyz/anchor",
  ],
  // Turbopack config for Next.js 16+ (replaces webpack config)
  turbopack: {
    resolveAlias: {
      // Stub out Node.js modules for browser
      fs: { browser: "./node_modules/next/dist/compiled/empty" },
      net: { browser: "./node_modules/next/dist/compiled/empty" },
      tls: { browser: "./node_modules/next/dist/compiled/empty" },
    },
  },
};

export default nextConfig;
