/**
 * Experiment Templates System - Templates for Crypto Lab Experiments
 *
 * Brain 2.0 Crypto Lab terminology:
 * - coinflip  → entropy_oracle     (Cryptographic 50/50 outcome)
 * - crash     → momentum_curve     (Watch multiplier rise)
 * - jackpot   → convergence_pool   (Aggregate stakes, one winner)
 * - gacha     → probability_engine (Tiered outcome distribution)
 *
 * Each experiment type has a template that Claude uses to generate the frontend.
 * Templates include:
 * - Experiment mechanics description
 * - Required UI components
 * - Required React hooks
 * - Example code reference
 */

import type { GameType, GameConfig } from './db.js';
import { DEFAULT_GAME_CONFIGS } from './rewards.js';

// Experiment type mapping for Crypto Lab branding
export const EXPERIMENT_TYPE_MAP: Record<GameType, string> = {
  coinflip: 'entropy_oracle',
  crash: 'momentum_curve',
  jackpot: 'convergence_pool',
  gacha: 'probability_engine',
};

// Reverse mapping
export const EXPERIMENT_TYPE_REVERSE_MAP: Record<string, GameType> = {
  entropy_oracle: 'coinflip',
  momentum_curve: 'crash',
  convergence_pool: 'jackpot',
  probability_engine: 'gacha',
};

export interface GameTemplate {
  type: GameType;
  /** Crypto Lab experiment type name */
  experimentType: string;
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

// ============ EXPERIMENT TEMPLATES ============

export const ENTROPY_ORACLE_TEMPLATE: GameTemplate = {
  type: 'coinflip',
  experimentType: 'entropy_oracle',
  name: 'Entropy Oracle',
  description: 'Cryptographic 50/50 outcome determination using commit-reveal entropy',
  tagline: 'Two-party entropy, instant resolution',
  mechanics: `
EXPERIMENT FLOW:
1. User connects wallet (Phantom/Solflare)
2. User enters stake amount in $CC (1-1000 $CC)
3. User commits to outcome A or B (heads/tails abstraction)
4. Server generates serverSecret, sends commitment = SHA256(serverSecret)
5. User signs transaction, creating unpredictable txSignature
6. Server reveals serverSecret
7. Result = SHA256(serverSecret + txSignature)[0] < 128 ? A : B
8. Entropy resolution animation plays
9. Outcome revealed - if correct: 1.96x return, if wrong: stake forfeited

CRYPTOGRAPHIC GUARANTEE:
- Protocol fee: 2%
- Return multiplier: 2 * (1 - 0.02) = 1.96x
- Platform fee: 0.001 SOL (~$0.10) per resolution

TWO-PARTY ENTROPY (Commit-Reveal):
- Server commits to secret BEFORE user acts
- User's transaction signature is unpredictable
- Result computed from BOTH sources
- Neither party can predict or manipulate outcome
- Fully verifiable on-chain
`,
  uiComponents: [
    'WalletConnect - Connect button with balance display',
    'StakeInput - $CC amount input with min/max validation',
    'OutcomeSelector - A/B (or themed) toggle buttons',
    'EntropyAnimation - Visual entropy resolution animation',
    'ResultModal - Outcome reveal with celebration on correct',
    'CommitmentVerifier - Cryptographic proof display (collapsible)',
    'RecentOutcomes - History of last 10 resolutions',
  ],
  requiredHooks: [
    'useWallet - Solana wallet adapter',
    'useProgram - Anchor program connection',
    'useExperimentState - Current experiment state from PDA',
    'useBalance - $CC and SOL balances',
  ],
  keyFeatures: [
    'Instant resolution via commit-reveal',
    'Cryptographically verifiable',
    'Simple 50/50 mechanics',
    'Satisfying entropy animation',
  ],
  exampleThemes: [
    'Quantum Entropy Oracle - Particle physics theme',
    'Schrodinger\'s Commit - Quantum superposition',
    'Binary Oracle - Digital/cyberpunk',
    'Cosmic Entropy - Space/galaxy theme',
  ],
  trailerComposition: 'GameFiTrailer',
  trailerDuration: 15,
  trailerNotes: `
GOLD STANDARD REFERENCE: video/src/compositions/GameFiTrailer.tsx

Follow GameFiTrailer pattern exactly:
- Recreate actual UI (Header, StakeInput, OutcomeSelector, ResultModal, etc.)
- 8-scene timeline: intro → connect → choice → stake → resolve → result → balance → cta
- Orange entropy visualization (#da7756 → #b85a3a gradient)
- Outcome A shows ⚛️, Outcome B shows 🔮
- Cursor with click effects at exact button positions
- Particle effects on correct outcome
- 15 seconds (450 frames @ 30fps) - snappy, not slow

Camera positions must track visual targets:
- connectBtn, outcomeABtn, outcomeBBtn, stakeInput, resolveBtn, entropy, resultModal, ctaBtn
`,
};

export const MOMENTUM_CURVE_TEMPLATE: GameTemplate = {
  type: 'crash',
  experimentType: 'momentum_curve',
  name: 'Momentum Curve',
  description: 'Watch the multiplier trajectory and commit before the curve ends',
  tagline: 'Trajectory analysis, timing precision',
  mechanics: `
EXPERIMENT FLOW:
1. Round starts - users have 10 seconds to commit stakes
2. Momentum multiplier starts at 1.00x and increases exponentially
3. Users can commit at any time to lock in current multiplier
4. VRF determines termination point (hidden until termination)
5. Curve terminates at random point (1.00x to 100x)
6. Users who committed before termination return: stake * commit_multiplier
7. Users who didn't commit forfeit their stake
8. New round starts after 5 second calibration period

TRAJECTORY MATH:
- Protocol edge: 3% (built into curve distribution)
- Termination distribution: exponential with 3% edge
- Example: 50% of rounds terminate below 2x

MOMENTUM CURVE:
- Starts at 1.00x
- Increases every 100ms
- Accelerates over time (exponential)
- Max termination point: 100x

VERIFIABLE RANDOMNESS:
- Termination point determined by VRF before round starts
- Users can verify cryptographic proof after round ends
`,
  uiComponents: [
    'WalletConnect - Connect button with balance',
    'StakeInput - Stake amount (only during commitment phase)',
    'MomentumDisplay - Large animated multiplier counter',
    'TrajectoryGraph - Chart showing momentum curve',
    'CommitButton - Big button to commit (disabled after termination)',
    'ParticipantList - Other participants and their commit status',
    'RoundHistory - Last 10 termination points',
    'CountdownTimer - Commitment phase countdown',
  ],
  requiredHooks: [
    'useWallet',
    'useProgram',
    'useExperimentRound - Current round state',
    'useMomentum - Real-time momentum updates',
    'useCommit - Handle commit action',
  ],
  keyFeatures: [
    'Multi-participant - see other participants',
    'Real-time momentum tracking',
    'Timing precision challenge',
    'High potential multipliers',
  ],
  exampleThemes: [
    'Trajectory Lab - Rocket trajectory simulation',
    'Momentum Study - Physics experiment theme',
    'Acceleration Test - Speed/velocity theme',
    'Wave Function - Quantum mechanics theme',
  ],
  trailerComposition: 'GameFiTrailer',
  trailerDuration: 15,
  trailerNotes: `
FOLLOW GameFiTrailer PATTERN - do NOT use generic templates.

Recreate actual UI components:
- Header with traffic lights + page title
- MomentumDisplay - large animated counter
- TrajectoryGraph - curve visualization
- StakeInput - $CC amount
- CommitButton - big prominent button
- ParticipantList - other participants with their commit status

8-scene timeline (adapt to momentum flow):
intro → connect → stake → momentumRising → commit → terminated → balance → cta

Key animations:
- Momentum counter animating upward (1.00x → 2.50x → termination)
- Graph curve drawing in real-time
- Commit button with pulse effect
- Termination state visualization
- Cursor tracking user actions
`,
};

export const CONVERGENCE_POOL_TEMPLATE: GameTemplate = {
  type: 'jackpot',
  experimentType: 'convergence_pool',
  name: 'Convergence Pool',
  description: 'Aggregate stakes into a shared pool - cryptographic selection determines recipient',
  tagline: 'Collective entropy, single convergence',
  mechanics: `
EXPERIMENT FLOW:
1. Users commit stakes with $CC (10-100 $CC per unit)
2. Each unit = 1 weighted entry in the convergence pool
3. Pool accumulates for 60 seconds (configurable)
4. VRF selects convergence point based on stake weight
5. Selected participant receives 95% of pool (5% protocol fee)
6. New round starts

DISTRIBUTION MATH:
- Protocol fee: 5% of pool
- Recipient payout: pool * 0.95
- Selection probability proportional to stake weight

EXAMPLE:
- Participant A: 10 units (100 $CC)
- Participant B: 5 units (50 $CC)
- Participant C: 5 units (50 $CC)
- Pool: 200 $CC
- Participant A has 50% probability to receive 190 $CC

VERIFIABLE SELECTION:
- Convergence selection: VRF seed % total_units
- All entries visible before resolution
`,
  uiComponents: [
    'WalletConnect',
    'StakeCommit - Commit X units input',
    'PoolDisplay - Current pool size',
    'ParticipantList - All entries with stake weights',
    'ProbabilityDisplay - Your selection probability',
    'CountdownTimer - Time until convergence',
    'ConvergenceReveal - Dramatic selection animation',
    'RoundHistory - Past convergences and pools',
  ],
  requiredHooks: [
    'useWallet',
    'useProgram',
    'useConvergenceRound - Current round state',
    'useParticipants - All participants',
    'useProbability - Calculate selection probability',
  ],
  keyFeatures: [
    'Simple single-recipient mechanics',
    'Community/social element',
    'Dramatic convergence moment',
    'Proportional probability',
  ],
  exampleThemes: [
    'Wave Function Collapse - Quantum convergence',
    'Convergence Protocol - Network/tech theme',
    'The Singularity - AI/future theme',
    'Pool Resonance - Physics/wave theme',
  ],
  trailerComposition: 'GameFiTrailer',
  trailerDuration: 15,
  trailerNotes: `
FOLLOW GameFiTrailer PATTERN - do NOT use generic templates.

Recreate actual UI components:
- Header with traffic lights + page title
- PoolDisplay - current pool size with live counter
- ParticipantList - entries with stake weights
- ProbabilityDisplay - your selection probability percentage
- StakeCommit - input + commit button
- CountdownTimer - dramatic countdown
- ConvergenceReveal - dramatic animation

8-scene timeline (adapt to convergence flow):
intro → connect → pool → commitStake → countdown → converging → selected → cta

Key animations:
- Pool amount growing
- Countdown timer ticking
- Convergence animation (wave collapse or similar)
- Selected participant highlight with effects
- Cursor tracking user actions
`,
};

export const PROBABILITY_ENGINE_TEMPLATE: GameTemplate = {
  type: 'gacha',
  experimentType: 'probability_engine',
  name: 'Probability Engine',
  description: 'Pull for tiered outcomes from a cryptographically determined distribution',
  tagline: 'Distribution sampling, tiered returns',
  mechanics: `
EXPERIMENT FLOW:
1. User connects wallet
2. User selects single sample (5 $CC) or 10-sample (50 $CC)
3. User confirms and commits
4. VRF determines outcome tier
5. Reveal animation shows outcome
6. Return added to user's balance

OUTCOME DISTRIBUTION:
- Tier 1 (74%): 0.5x return (2.5 $CC)
- Tier 2 (20%): 2x return (10 $CC)
- Tier 3 (5%): 5x return (25 $CC)
- Tier 4 (1%): 10x return (50 $CC)

EXPECTED VALUE:
- EV = 0.74*0.5 + 0.20*2 + 0.05*5 + 0.01*10
- Protocol edge built into tier probabilities
- Long-term expectation favors protocol

10-SAMPLE GUARANTEE:
- At least 1 Tier 2+ result guaranteed
- If no Tier 2 in first 9, 10th is forced Tier 2+

VERIFIABLE DISTRIBUTION:
- VRF determines all 10 samples at once
- User can verify each sample's seed
`,
  uiComponents: [
    'WalletConnect',
    'SampleButtons - Single sample / 10-sample buttons',
    'OutcomeDisplay - Current/last outcome with tier',
    'RevealAnimation - Dramatic outcome reveal',
    'SampleHistory - Your recent samples',
    'GuaranteeCounter - Samples since last Tier 3/4',
    'SessionDisplay - Returns collected this session',
  ],
  requiredHooks: [
    'useWallet',
    'useProgram',
    'useDistributionState - Samples and outcomes',
    'useGuaranteeCounter - Track guarantee progression',
    'useSession - Session returns',
  ],
  keyFeatures: [
    'Engaging sampling mechanics',
    'Tiered distribution system',
    'Visual outcome feedback',
    '10-sample guarantee',
  ],
  exampleThemes: [
    'Probability Matrix - Digital/matrix theme',
    'Distribution Lab - Science lab theme',
    'Sample Station - Space station theme',
    'Entropy Capsule - Quantum capsule machine',
  ],
  trailerComposition: 'GameFiTrailer',
  trailerDuration: 15,
  trailerNotes: `
FOLLOW GameFiTrailer PATTERN - do NOT use generic templates.

Recreate actual UI components:
- Header with traffic lights + page title
- SampleButtons - single sample / 10-sample with costs
- OutcomeDisplay - shows distribution tier + return
- RevealAnimation - dramatic sampling animation
- GuaranteeCounter - samples since last Tier 3+
- SessionDisplay - session returns

8-scene timeline (adapt to distribution flow):
intro → connect → sampleSelect → sampling → reveal → outcome → session → cta

Key animations:
- Sampling visualization before reveal
- Tier glow effects (Tier1=gray, Tier2=blue, Tier3=purple, Tier4=gold)
- Outcome reveal with particle effects
- Celebration on Tier 3/4 outcomes
- Cursor tracking user actions
`,
};

// ============ TEMPLATE HELPERS ============

export const GAME_TEMPLATES: Record<GameType, GameTemplate> = {
  coinflip: ENTROPY_ORACLE_TEMPLATE,
  crash: MOMENTUM_CURVE_TEMPLATE,
  jackpot: CONVERGENCE_POOL_TEMPLATE,
  gacha: PROBABILITY_ENGINE_TEMPLATE,
};

// Alias for Crypto Lab terminology
export const EXPERIMENT_TEMPLATES = GAME_TEMPLATES;

/**
 * Get a random experiment type (weighted by complexity)
 * Crypto Lab weights: 45% entropy_oracle, 25% momentum_curve, 25% probability_engine, 5% convergence_pool
 */
export function getRandomGameType(): GameType {
  const weights: [GameType, number][] = [
    ['coinflip', 45],   // 45% - entropy_oracle (simplest)
    ['crash', 25],      // 25% - momentum_curve (moderate)
    ['gacha', 25],      // 25% - probability_engine (moderate)
    ['jackpot', 5],     // 5% - convergence_pool (requires multiple participants)
  ];

  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  let random = Math.random() * total;

  for (const [type, weight] of weights) {
    random -= weight;
    if (random <= 0) return type;
  }

  return 'coinflip'; // fallback
}

// Alias for Crypto Lab terminology
export const getRandomExperimentType = getRandomGameType;

/**
 * Get a random theme for an experiment type
 */
export function getRandomTheme(gameType: GameType): string {
  const template = GAME_TEMPLATES[gameType];
  const themes = template.exampleThemes;
  return themes[Math.floor(Math.random() * themes.length)];
}

/**
 * Generate a unique experiment slug
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

// Alias for Crypto Lab terminology
export const generateExperimentSlug = generateGameSlug;

/**
 * Format template as Claude prompt context
 */
export function formatTemplateForPrompt(template: GameTemplate, config: GameConfig, theme: string): string {
  return `
═══════════════════════════════════════════════════════════════════════════════
EXPERIMENT TYPE: ${template.experimentType?.toUpperCase() || template.type.toUpperCase()} - "${theme}"
═══════════════════════════════════════════════════════════════════════════════

DESCRIPTION: ${template.description}
TAGLINE: "${template.tagline}"

${template.mechanics}

CONFIGURATION:
- Minimum Stake: ${(config.minBet / 1_000_000).toLocaleString()} $CC
- Maximum Stake: ${(config.maxBet / 1_000_000).toLocaleString()} $CC
- Protocol Edge: ${config.houseEdgeBps / 100}%
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
- Use experimental/research framing, not gambling language

═══════════════════════════════════════════════════════════════════════════════
`;
}

/**
 * Get the full prompt context for building an experiment
 */
export function getGameBuildPrompt(gameType: GameType, theme: string): string {
  const template = GAME_TEMPLATES[gameType];
  const config = DEFAULT_GAME_CONFIGS[gameType];

  return `
You are building a ${template.name} experiment for the $CC Crypto Lab.

${formatTemplateForPrompt(template, config, theme)}

IMPORTANT BUILD RULES:
1. Use the shared GameFi components from app/components/gamefi/
2. Follow the site's UI styleguide (terminal aesthetic, traffic light header)
3. The experiment must be fully functional with mock data for testing
4. Real blockchain integration uses hooks from app/components/gamefi/hooks/
5. All experiment logic must be secure and cryptographically verifiable
6. Include error handling for failed transactions
7. Show loading states during blockchain operations
8. Display commit-reveal verification option

LANGUAGE GUIDELINES (Crypto Lab, NOT Casino):
- "stake" instead of "bet"
- "commit" instead of "place bet"
- "protocol edge" instead of "house edge"
- "experiment" instead of "game"
- "outcome" instead of "result"
- "participant" instead of "player"
- "verification" instead of "provably fair"

REFERENCE IMPLEMENTATION:
- See app/_template/${gameType}/page.tsx for the base implementation
- Customize the theme/visuals while keeping the core mechanics

OUTPUT:
Create a single page.tsx file that implements the full experiment UI.
The file should be placed at app/${generateGameSlug(theme)}/page.tsx
`;
}

// Alias for Crypto Lab terminology
export const getExperimentBuildPrompt = getGameBuildPrompt;
