/**
 * Token Types & Defaults for DEX
 *
 * Provides token metadata, search functionality, and defaults
 * for the any-token swap interface.
 */

import { Connection, PublicKey } from '@solana/web3.js';

// ============ TYPES ============

export interface TokenOption {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  isVerified?: boolean;
}

// ============ CONSTANTS ============

// Well-known token mints
export const WSOL_MINT = 'So11111111111111111111111111111111111111112';
export const CC_MINT = 'Hg23qBLJDvhQtGLHMvot7NK54qAhzQFj9BVd5jpABAGS';
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';

// Default tokens shown in the selector
export const DEFAULT_TOKENS: TokenOption[] = [
  {
    mint: WSOL_MINT,
    symbol: 'SOL',
    name: 'Wrapped SOL',
    decimals: 9,
    logoURI: '/sol.png',
    isVerified: true,
  },
  {
    mint: CC_MINT,
    symbol: '$CC',
    name: 'Claude Code Coin',
    decimals: 9,
    logoURI: '/cc.png',
    isVerified: true,
  },
  {
    mint: USDC_MINT,
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
    isVerified: true,
  },
  {
    mint: USDT_MINT,
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg',
    isVerified: true,
  },
  {
    mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    symbol: 'JUP',
    name: 'Jupiter',
    decimals: 6,
    logoURI: 'https://static.jup.ag/jup/icon.png',
    isVerified: true,
  },
  {
    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    symbol: 'BONK',
    name: 'Bonk',
    decimals: 5,
    logoURI: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
    isVerified: true,
  },
  {
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'RAY',
    name: 'Raydium',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png',
    isVerified: true,
  },
];

// Jupiter API for token search
const JUPITER_TOKEN_API = 'https://lite-api.jup.ag/tokens/v2';

// ============ FUNCTIONS ============

/**
 * Search tokens using Jupiter API
 * Returns tokens matching the query (symbol, name, or mint address)
 */
export async function searchTokens(query: string): Promise<TokenOption[]> {
  if (!query || query.length < 2) {
    return DEFAULT_TOKENS;
  }

  try {
    // Check if query is a mint address (base58, 32-44 chars)
    const isMintAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(query);

    if (isMintAddress) {
      // Try to load specific token by mint
      const response = await fetch(`${JUPITER_TOKEN_API}/${query}`);
      if (response.ok) {
        const token = await response.json();
        if (token && token.address) {
          return [
            {
              mint: token.address,
              symbol: token.symbol || 'Unknown',
              name: token.name || 'Unknown Token',
              decimals: token.decimals || 9,
              logoURI: token.logoURI,
              isVerified: token.tags?.includes('verified') || token.tags?.includes('strict'),
            },
          ];
        }
      }
    }

    // Search by text
    const response = await fetch(`${JUPITER_TOKEN_API}/search?query=${encodeURIComponent(query)}`);
    if (!response.ok) {
      console.error('[TokenSearch] API error:', response.status);
      return filterDefaultTokens(query);
    }

    const tokens = await response.json();
    if (!Array.isArray(tokens) || tokens.length === 0) {
      return filterDefaultTokens(query);
    }

    // Map to our format (limit to 20 results)
    return tokens.slice(0, 20).map((t: {
      address: string;
      symbol?: string;
      name?: string;
      decimals?: number;
      logoURI?: string;
      tags?: string[];
    }) => ({
      mint: t.address,
      symbol: t.symbol || 'Unknown',
      name: t.name || 'Unknown Token',
      decimals: t.decimals || 9,
      logoURI: t.logoURI,
      isVerified: t.tags?.includes('verified') || t.tags?.includes('strict'),
    }));
  } catch (error) {
    console.error('[TokenSearch] Error:', error);
    return filterDefaultTokens(query);
  }
}

/**
 * Filter default tokens by query (fallback when API fails)
 */
function filterDefaultTokens(query: string): TokenOption[] {
  const q = query.toLowerCase();
  return DEFAULT_TOKENS.filter(
    (t) =>
      t.symbol.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.mint.toLowerCase().includes(q)
  );
}

/**
 * Load a specific token by mint address
 * Falls back to on-chain data if Jupiter doesn't have it
 */
export async function loadTokenByMint(
  mint: string,
  connection?: Connection
): Promise<TokenOption | null> {
  try {
    // First try Jupiter API
    const response = await fetch(`${JUPITER_TOKEN_API}/${mint}`);
    if (response.ok) {
      const token = await response.json();
      if (token && token.address) {
        return {
          mint: token.address,
          symbol: token.symbol || 'Unknown',
          name: token.name || 'Unknown Token',
          decimals: token.decimals || 9,
          logoURI: token.logoURI,
          isVerified: token.tags?.includes('verified') || token.tags?.includes('strict'),
        };
      }
    }

    // If not in Jupiter, try to get on-chain mint info
    if (connection) {
      const mintPubkey = new PublicKey(mint);
      const mintInfo = await connection.getParsedAccountInfo(mintPubkey);

      if (mintInfo.value?.data && 'parsed' in mintInfo.value.data) {
        const parsed = mintInfo.value.data.parsed;
        if (parsed.type === 'mint') {
          return {
            mint,
            symbol: 'Unknown',
            name: `Token (${mint.slice(0, 4)}...${mint.slice(-4)})`,
            decimals: parsed.info.decimals || 9,
            isVerified: false,
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('[LoadToken] Error:', error);
    return null;
  }
}

/**
 * Get token from defaults by mint
 */
export function getDefaultToken(mint: string): TokenOption | undefined {
  return DEFAULT_TOKENS.find((t) => t.mint === mint);
}

/**
 * Get SOL token option
 */
export function getSOL(): TokenOption {
  return DEFAULT_TOKENS.find((t) => t.mint === WSOL_MINT)!;
}

/**
 * Get $CC token option
 */
export function getCC(): TokenOption {
  return DEFAULT_TOKENS.find((t) => t.mint === CC_MINT)!;
}
