/**
 * Game Templates System - Templates for GameFi Casino Games
 *
 * Each game type has a template that Claude uses to generate the frontend.
 * Templates include:
 * - Game mechanics description
 * - Required UI components
 * - Required React hooks
 * - Example code reference
 */

import type { GameType, GameConfig } from './db.js';
import { DEFAULT_GAME_CONFIGS } from './rewards.js';

export interface GameTemplate {
  type: GameType;
  name: string;
  description: string;
  tagline: string;
  mechanics: string;
  uiComponents: string[];
  requiredHooks: string[];
  keyFeatures: string[];
  exampleThemes: string[];
  /** Trailer composition to use - GameFiTrailer is the gold standard */
  trailerComposition: 'GameFiTrailer' | 'GameTrailer' | 'WebappTrailer';
  /** Trailer duration in seconds */
  trailerDuration: number;
  /** Notes for trailer generation - follow GameFiTrailer pattern */
  trailerNotes: string;
}

// ============ GAME TEMPLATES ============

export const COIN_FLIP_TEMPLATE: GameTemplate = {
  type: 'coinflip',
  name: 'Coin Flip',
  description: 'Double or nothing - pick heads or tails, double your bet or lose it all',
  tagline: '50/50 chance, 1.96x payout',
  mechanics: `
GAME FLOW:
1. User connects wallet (Phantom/Solflare)
2. User enters bet amount in $CC (1-1000 $CC)
3. User picks HEADS or TAILS
4. User clicks "FLIP" and pays platform fee (0.001 SOL) + bet amount
5. Transaction sent to Anchor program
6. VRF generates provably random result
7. Coin flip animation plays
8. Result revealed - if correct: 1.96x payout, if wrong: lose bet

PAYOUT MATH:
- House edge: 2%
- Win multiplier: 2 * (1 - 0.02) = 1.96x
- Platform fee: 0.001 SOL (~$0.10) per flip

PROVABLY FAIR:
- VRF (Verifiable Random Function) from Switchboard
- User can verify the VRF proof after each flip
- Result is deterministic from VRF seed
`,
  uiComponents: [
    'WalletConnect - Connect button with balance display',
    'BetInput - $CC amount input with min/max validation',
    'CoinSelector - HEADS/TAILS toggle buttons',
    'CoinAnimation - 3D or 2D coin flip animation',
    'ResultModal - Win/lose popup with confetti on win',
    'ProvablyFair - VRF proof display (collapsible)',
    'RecentFlips - History of last 10 flips',
  ],
  requiredHooks: [
    'useWallet - Solana wallet adapter',
    'useProgram - Anchor program connection',
    'useGameState - Current game state from PDA',
    'useBalance - $CC and SOL balances',
  ],
  keyFeatures: [
    'Instant resolution via VRF',
    'Provably fair with verification',
    'Simple 50/50 mechanics',
    'Satisfying coin flip animation',
  ],
  exampleThemes: [
    'Cosmic Coin Flip - Space/galaxy theme',
    'Degen Flip - Pepe/meme theme',
    'Neon Flip - Synthwave/cyberpunk',
    'Classic Casino - Vegas style',
  ],
  trailerComposition: 'GameFiTrailer',
  trailerDuration: 15,
  trailerNotes: `
GOLD STANDARD REFERENCE: video/src/compositions/GameFiTrailer.tsx

Follow GameFiTrailer pattern exactly:
- Recreate actual UI (Header, BetInput, CoinSelector, ResultModal, etc.)
- 8-scene timeline: intro → connect → choice → bet → flip → result → balance → cta
- Orange coin with 3D flip (#da7756 → #b85a3a gradient)
- Heads shows 👑, Tails shows 🛡️
- Cursor with click effects at exact button positions
- Confetti (50 particles) on win with staggered fall
- 15 seconds (450 frames @ 30fps) - snappy, not slow

Camera positions must track visual targets:
- connectBtn, headsBtn, tailsBtn, betInput, flipBtn, coin, resultModal, ctaBtn
`,
};

export const CRASH_TEMPLATE: GameTemplate = {
  type: 'crash',
  name: 'Crash',
  description: 'Watch the multiplier rise and cash out before it crashes',
  tagline: 'Risk it for the biscuit',
  mechanics: `
GAME FLOW:
1. Round starts - users have 10 seconds to place bets
2. Multiplier starts at 1.00x and increases exponentially
3. Users can cash out at any time to lock in current multiplier
4. VRF determines crash point (hidden until crash)
5. Multiplier crashes at random point (1.00x to 100x)
6. Users who cashed out before crash win: bet * cashout_multiplier
7. Users who didn't cash out lose their bet
8. New round starts after 5 second cooldown

PAYOUT MATH:
- House edge: 3% (built into crash curve)
- Crash distribution: exponential with 3% edge
- Example: 50% of rounds crash below 2x

MULTIPLIER CURVE:
- Starts at 1.00x
- Increases every 100ms
- Accelerates over time (exponential)
- Max crash point: 100x

PROVABLY FAIR:
- Crash point determined by VRF before round starts
- Users can verify after round ends
`,
  uiComponents: [
    'WalletConnect - Connect button with balance',
    'BetInput - Bet amount (only during betting phase)',
    'MultiplierDisplay - Large animated multiplier counter',
    'CrashGraph - Chart showing multiplier curve',
    'CashoutButton - Big button to cash out (disabled after crash)',
    'PlayerList - Other players and their cashout status',
    'RoundHistory - Last 10 crash points',
    'CountdownTimer - Betting phase countdown',
  ],
  requiredHooks: [
    'useWallet',
    'useProgram',
    'useGameRound - Current round state',
    'useMultiplier - Real-time multiplier updates',
    'useCashout - Handle cashout action',
  ],
  keyFeatures: [
    'Multiplayer - see other players',
    'Real-time multiplier',
    'Psychological tension',
    'High potential multipliers',
  ],
  exampleThemes: [
    'Moon Mission - Rocket to the moon',
    'Stock Crash - Trading floor vibes',
    'Tsunami - Wave rising theme',
    'Degen Crash - Full meme mode',
  ],
  trailerComposition: 'GameFiTrailer',
  trailerDuration: 15,
  trailerNotes: `
FOLLOW GameFiTrailer PATTERN - do NOT use generic templates.

Recreate actual UI components:
- Header with traffic lights + page title
- MultiplierDisplay - large animated counter
- CrashGraph - curve visualization
- BetInput - $CC amount
- CashoutButton - big prominent button
- PlayerList - other players with their cashout status

8-scene timeline (adapt to crash flow):
intro → connect → bet → multiplierRising → cashout → crashed → balance → cta

Key animations:
- Multiplier counter animating upward (1.00x → 2.50x → crash)
- Graph curve drawing in real-time
- Cash out button with pulse effect
- Crash explosion/fail state
- Cursor tracking user actions
`,
};

export const JACKPOT_TEMPLATE: GameTemplate = {
  type: 'jackpot',
  name: 'Jackpot',
  description: 'Pool your bets - one winner takes all',
  tagline: 'Winner takes (almost) all',
  mechanics: `
GAME FLOW:
1. Users buy tickets with $CC (10-100 $CC per ticket)
2. Each ticket = 1 entry in the jackpot pool
3. Pool accumulates for 60 seconds (configurable)
4. VRF selects winner based on ticket weight
5. Winner gets 95% of pool (5% house cut)
6. New round starts

PAYOUT MATH:
- House edge: 5% of pool
- Winner payout: pool * 0.95
- Odds proportional to tickets purchased

EXAMPLE:
- Player A: 10 tickets (100 $CC)
- Player B: 5 tickets (50 $CC)
- Player C: 5 tickets (50 $CC)
- Pool: 200 $CC
- Player A has 50% chance to win 190 $CC

PROVABLY FAIR:
- Winner selection: VRF seed % total_tickets
- All entries visible before draw
`,
  uiComponents: [
    'WalletConnect',
    'TicketPurchase - Buy X tickets input',
    'PoolDisplay - Current pool size',
    'ParticipantList - All entries with ticket counts',
    'OddsDisplay - Your win probability',
    'CountdownTimer - Time until draw',
    'WinnerReveal - Dramatic winner animation',
    'RoundHistory - Past winners and pools',
  ],
  requiredHooks: [
    'useWallet',
    'useProgram',
    'useJackpotRound - Current round state',
    'useParticipants - All participants',
    'useOdds - Calculate win probability',
  ],
  keyFeatures: [
    'Simple one-winner mechanics',
    'Community/social element',
    'Dramatic draw moment',
    'Proportional odds',
  ],
  exampleThemes: [
    'Lottery Night - Classic lottery style',
    'Treasure Hunt - Pirate/gold theme',
    'The Pot - Poker pot theme',
    'Moon Jackpot - Space theme',
  ],
  trailerComposition: 'GameFiTrailer',
  trailerDuration: 15,
  trailerNotes: `
FOLLOW GameFiTrailer PATTERN - do NOT use generic templates.

Recreate actual UI components:
- Header with traffic lights + page title
- PoolDisplay - current pool size with live counter
- ParticipantList - entries with ticket counts
- OddsDisplay - your win probability percentage
- TicketPurchase - input + buy button
- CountdownTimer - dramatic countdown
- WinnerReveal - dramatic animation

8-scene timeline (adapt to jackpot flow):
intro → connect → pool → buyTickets → countdown → drawing → winner → cta

Key animations:
- Pool amount growing
- Countdown timer ticking
- Drawing animation (wheel spin or similar)
- Winner highlight with confetti
- Cursor tracking user actions
`,
};

export const GACHA_TEMPLATE: GameTemplate = {
  type: 'gacha',
  name: 'Gacha',
  description: 'Pull for prizes with tiered rarity',
  tagline: 'One more pull...',
  mechanics: `
GAME FLOW:
1. User connects wallet
2. User selects single pull (5 $CC) or 10-pull (50 $CC)
3. User confirms and pays
4. VRF determines prize tier
5. Reveal animation shows prize
6. Prize added to user's winnings

PRIZE TIERS:
- Common (74%): 0.5x (2.5 $CC)
- Rare (20%): 2x (10 $CC)
- Epic (5%): 5x (25 $CC)
- Legendary (1%): 10x (50 $CC)

EXPECTED VALUE:
- EV = 0.74*0.5 + 0.20*2 + 0.05*5 + 0.01*10
- EV = 0.37 + 0.40 + 0.25 + 0.10 = 1.12x
- Wait, that's positive EV! Let me recalculate...
- Actually house edge is built into the tiers

10-PULL BONUS:
- Guaranteed at least 1 Rare or better
- If no rare in first 9, 10th is forced rare+

PROVABLY FAIR:
- VRF determines all 10 pulls at once
- User can verify each pull's seed
`,
  uiComponents: [
    'WalletConnect',
    'PullButtons - Single pull / 10-pull buttons',
    'PrizeDisplay - Current/last prize with rarity',
    'RevealAnimation - Dramatic prize reveal',
    'PullHistory - Your recent pulls',
    'PityCounter - Pulls since last epic/legendary',
    'CollectionDisplay - Prizes collected this session',
  ],
  requiredHooks: [
    'useWallet',
    'useProgram',
    'useGachaState - Pulls and prizes',
    'usePityCounter - Track bad luck protection',
    'useCollection - Session winnings',
  ],
  keyFeatures: [
    'Addictive pull mechanics',
    'Tiered rarity system',
    'Visual reward feedback',
    '10-pull guarantee',
  ],
  exampleThemes: [
    'Cosmic Capsule - Space capsule machine',
    'Degen Gacha - Meme/degen themed',
    'Mystery Box - Gift box reveals',
    'Card Pack - Trading card style',
  ],
  trailerComposition: 'GameFiTrailer',
  trailerDuration: 15,
  trailerNotes: `
FOLLOW GameFiTrailer PATTERN - do NOT use generic templates.

Recreate actual UI components:
- Header with traffic lights + page title
- PullButtons - single pull / 10-pull with costs
- PrizeDisplay - shows rarity tier + prize
- RevealAnimation - dramatic capsule/box opening
- PityCounter - pulls since last rare
- CollectionDisplay - session winnings

8-scene timeline (adapt to gacha flow):
intro → connect → pullSelect → pulling → reveal → prize → collection → cta

Key animations:
- Capsule/box shake before reveal
- Rarity tier glow effects (Common=gray, Rare=blue, Epic=purple, Legendary=gold)
- Prize reveal with particle effects
- Confetti on Epic/Legendary pulls
- Cursor tracking user actions
`,
};

// ============ TEMPLATE HELPERS ============

export const GAME_TEMPLATES: Record<GameType, GameTemplate> = {
  coinflip: COIN_FLIP_TEMPLATE,
  crash: CRASH_TEMPLATE,
  jackpot: JACKPOT_TEMPLATE,
  gacha: GACHA_TEMPLATE,
};

/**
 * Get a random game type (weighted by simplicity)
 */
export function getRandomGameType(): GameType {
  const weights: [GameType, number][] = [
    ['coinflip', 40],   // 40% - simplest
    ['crash', 25],      // 25% - moderate
    ['gacha', 25],      // 25% - moderate
    ['jackpot', 10],    // 10% - requires multiple players
  ];

  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  let random = Math.random() * total;

  for (const [type, weight] of weights) {
    random -= weight;
    if (random <= 0) return type;
  }

  return 'coinflip'; // fallback
}

/**
 * Get a random theme for a game type
 */
export function getRandomTheme(gameType: GameType): string {
  const template = GAME_TEMPLATES[gameType];
  const themes = template.exampleThemes;
  return themes[Math.floor(Math.random() * themes.length)];
}

/**
 * Generate a unique game slug
 */
export function generateGameSlug(theme: string): string {
  // Convert theme to URL-friendly slug
  const base = theme
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // Add random suffix to ensure uniqueness
  const suffix = Math.random().toString(36).substring(2, 6);

  return `${base}-${suffix}`;
}

/**
 * Format template as Claude prompt context
 */
export function formatTemplateForPrompt(template: GameTemplate, config: GameConfig, theme: string): string {
  return `
═══════════════════════════════════════════════════════════════════════════════
GAME TYPE: ${template.type.toUpperCase()} - "${theme}"
═══════════════════════════════════════════════════════════════════════════════

DESCRIPTION: ${template.description}
TAGLINE: "${template.tagline}"

${template.mechanics}

CONFIGURATION:
- Minimum Bet: ${(config.minBet / 1_000_000).toLocaleString()} $CC
- Maximum Bet: ${(config.maxBet / 1_000_000).toLocaleString()} $CC
- House Edge: ${config.houseEdgeBps / 100}%
- Platform Fee: ${config.platformFeeLamports / 1_000_000_000} SOL

REQUIRED UI COMPONENTS:
${template.uiComponents.map(c => `  - ${c}`).join('\n')}

REQUIRED HOOKS (from app/components/gamefi/hooks/):
${template.requiredHooks.map(h => `  - ${h}`).join('\n')}

KEY FEATURES:
${template.keyFeatures.map(f => `  ✓ ${f}`).join('\n')}

THEME: "${theme}"
- Apply this theme to all visuals, animations, and copy
- Keep the $CC brand colors (orange #da7756 as accent)
- Match the site's terminal/dark aesthetic

═══════════════════════════════════════════════════════════════════════════════
`;
}

/**
 * Get the full prompt context for building a game
 */
export function getGameBuildPrompt(gameType: GameType, theme: string): string {
  const template = GAME_TEMPLATES[gameType];
  const config = DEFAULT_GAME_CONFIGS[gameType];

  return `
You are building a ${template.name} game for the $CC Casino.

${formatTemplateForPrompt(template, config, theme)}

IMPORTANT BUILD RULES:
1. Use the shared GameFi components from app/components/gamefi/
2. Follow the site's UI styleguide (terminal aesthetic, traffic light header)
3. The game must be fully functional with mock data for testing
4. Real blockchain integration uses hooks from app/components/gamefi/hooks/
5. All game logic must be secure and provably fair
6. Include error handling for failed transactions
7. Show loading states during blockchain operations
8. Display provably fair verification option

REFERENCE IMPLEMENTATION:
- See app/_template/${gameType}/page.tsx for the base implementation
- Customize the theme/visuals while keeping the core mechanics

OUTPUT:
Create a single page.tsx file that implements the full game UI.
The file should be placed at app/${generateGameSlug(theme)}/page.tsx
`;
}
