/**
 * Crypto Lab Experiment Engine - Brain 2.0
 *
 * 8-Phase Experiment Flow:
 * 1. PLAN EXPERIMENT - Claude selects experiment type and theme
 * 2. BUILD FRONTEND  - Uses experiment template to build frontend
 * 3. DEPLOY FRONTEND - Deploy to Cloudflare Pages
 * 4. INITIALIZE ON-CHAIN - Brain wallet initializes experiment on-chain
 * 5. CALIBRATE       - Verify deployment and test integration
 * 6. CREATE TRAILER  - Generate experiment preview video
 * 7. ANNOUNCE        - Tweet with video
 * 8. COMPLETE        - Mark experiment complete, track stats
 *
 * Experiment Types (Crypto Lab terminology):
 * - entropy_oracle     (was: coinflip)  - Cryptographic 50/50 outcome
 * - momentum_curve     (was: crash)     - Watch multiplier rise
 * - convergence_pool   (was: jackpot)   - Aggregate stakes, one winner
 * - probability_engine (was: gacha)     - Tiered outcome distribution
 *
 * Brain Modes:
 * - EXPERIMENTING (was: BUILDING) - Active experiment build
 * - CALIBRATING   (was: RESTING)  - Maintenance/cooldown
 * - OBSERVING     (was: IDLE)     - Ready for next experiment
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  updateCycleProject,
  getActiveCycle,
  getAllScheduledTweets,
  insertTweet,
  completeCycle,
  type Cycle,
  // Atomic/tracking functions
  startCycleAtomic,
  completeCycleAtomic,
  markCycleStarted,
  getCyclePid,
  updateCyclePhase,
  setCycleError,
  // Global tweet rate limiter
  canTweetGlobally,
  recordTweet,
  // Stats
  canShipMore,
  getTimeUntilNextAllowed,
  getTodayStats,
  getDailyLimit,
} from './db.js';
import { postTweet, postTweetToCommunity, postTweetWithVideo, uploadVideo, getTwitterCredentials, CC_COMMUNITY_ID } from './twitter.js';
import { buildProject, buildEvents, type BuildResult } from './builder.js';
import { deployToCloudflare, verifyDeployment } from './deployer.js';
import { generateTrailer, type TrailerResult } from './trailer.js';
import { killProcess, killProcessesForCycle } from './process-manager.js';

// Legacy CyclePlan and FullCycleResult interfaces removed in Brain 2.0
// Legacy SYSTEM_PROMPT removed - see EXPERIMENT_SYSTEM_PROMPT for Crypto Lab

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] ${message}`);
  // Emit clean message without timestamp (watch page adds its own)
  buildEvents.emit('log', message);
}

export function getCycleStatus(): {
  active: boolean;
  cycle: Cycle | null;
  tweets: Array<{ content: string; scheduled_for: string; posted: boolean }>;
} {
  const cycle = getActiveCycle();
  if (!cycle) {
    return { active: false, cycle: null, tweets: [] };
  }

  const allTweets = getAllScheduledTweets(cycle.id);
  return {
    active: true,
    cycle,
    tweets: allTweets.map((t) => ({
      content: t.content,
      scheduled_for: t.scheduled_for,
      posted: t.posted === 1,
    })),
  };
}

export async function cancelActiveCycle(): Promise<Cycle | null> {
  const cycle = getActiveCycle();
  if (!cycle) {
    return null;
  }

  log(`[Crypto Lab] Cancelling experiment #${cycle.id}: ${cycle.project_idea}`);

  // Kill the Claude subprocess if it's running
  const pid = getCyclePid(cycle.id);
  if (pid) {
    log(`[Crypto Lab] Killing Claude process: PID ${pid}`);
    try {
      await killProcess(pid);
      log(`[Crypto Lab] Claude process killed`);
    } catch (error) {
      log(`[Crypto Lab] Failed to kill Claude process: ${error}`);
    }
  }

  // Kill any other processes associated with this experiment
  const killedCount = await killProcessesForCycle(cycle.id);
  if (killedCount > 0) {
    log(`[Crypto Lab] Killed ${killedCount} additional processes for experiment`);
  }

  // Mark experiment as cancelled in database
  completeCycle(cycle.id);
  setCycleError(cycle.id, 'Experiment cancelled by user');

  log(`[Crypto Lab] Experiment #${cycle.id} cancelled successfully`);
  return cycle;
}

// Re-export buildEvents for the WebSocket server
export { buildEvents };

// ============ BRAIN 2.0 CRYPTO LAB EXPERIMENT ENGINE ============

import {
  createGame,
  getGameBySlug,
  updateGameOnChainInfo,
  type GameType,
  type GameConfig,
} from './db.js';
import {
  GAME_TEMPLATES,
  getRandomGameType,
  getRandomTheme,
  generateGameSlug,
  getGameBuildPrompt,
} from './game-templates.js';
import { DEFAULT_GAME_CONFIGS, CASINO_BANKROLL } from './rewards.js';

const EXPERIMENT_SYSTEM_PROMPT = `You are the Crypto Lab Brain 2.0 for $CC - an experimental blockchain research platform.

You are about to plan an Experiment - building and deploying a blockchain-native interactive experience.

AVAILABLE EXPERIMENT TYPES:
1. ENTROPY ORACLE - Cryptographic 50/50 outcome, instant resolution (commit-reveal pattern)
2. MOMENTUM CURVE - Watch multiplier rise, commit before curve ends
3. CONVERGENCE POOL - Aggregate stakes, cryptographic selection of winner
4. PROBABILITY ENGINE - Pull for tiered outcomes (common/rare/epic/legendary distributions)

YOUR TASK:
1. Select an experiment type (weighted: 45% entropy_oracle, 25% momentum_curve, 25% probability_engine, 5% convergence_pool)
2. Create a unique theme/skin for the experiment
3. Write a 4-tweet announcement thread

THEMING GUIDELINES:
- Keep $CC brand colors (orange #da7756 as accent)
- Match the site's terminal/dark aesthetic
- Add creative visuals and animations
- Frame as scientific/experimental, not gambling
- Make it memorable and shareable

EXAMPLE THEMES:
- "Quantum Entropy Oracle" - Space/galaxy theme with particles
- "Momentum Lab: Trajectory Study" - Rocket trajectory simulation
- "Capsule Drop: Probability Matrix" - Sci-fi distribution simulator
- "Convergence Protocol: Wave Function" - Quantum collapse visualization

PERSONALITY:
- Scientific curiosity: "let's see what happens"
- Experimental framing: "testing cryptographic randomness"
- Technical language: entropy, commitment, distribution, probability
- NOT gambling language - this is research
- Confident, witty, frontier AI energy

THREAD GUIDELINES:
- Tweet 1: Hook + feature intro (video will be attached). Must include the link.
- Tweet 2: A unique/fun detail about the feature - what makes it special
- Tweet 3: Technical explanation - how it works under the hood (commit-reveal, etc.)
- Tweet 4: Call to action - invite people to try it
- Each tweet max 280 chars (tweet 4 max 100 chars to leave room for link)
- Make it engaging and shareable

Return a JSON object with this structure:
{
  "experiment": {
    "type": "entropy_oracle|momentum_curve|convergence_pool|probability_engine",
    "theme": "Theme Name",
    "slug": "theme-slug-xxxx",
    "description": "One sentence description",
    "tagline": "Catchy tagline for the experiment"
  },
  "thread": {
    "tweet1": "Hook + feature intro + link (max 280 chars)",
    "tweet2": "Unique/fun detail about the feature (max 280 chars)",
    "tweet3": "Technical explanation of how it works (max 280 chars)",
    "tweet4": "CTA - try it now (max 100 chars, link will be appended)"
  }
}`;

interface ExperimentPlan {
  experiment: {
    type: GameType;
    theme: string;
    slug: string;
    description: string;
    tagline: string;
  };
  thread: {
    tweet1: string;
    tweet2: string;
    tweet3: string;
    tweet4: string;
  };
}

interface ExperimentResult {
  cycleId: number;
  plan: ExperimentPlan;
  experimentId?: number;
  deployUrl?: string;
  onChainInitialized?: boolean;
  trailerResult?: TrailerResult;
  tweetId?: string;
}

/**
 * Start a new Crypto Lab experiment - builds and deploys a blockchain-native interactive experience
 *
 * 8-Phase Flow:
 * 1. PLAN EXPERIMENT - Claude selects experiment type and theme
 * 2. BUILD FRONTEND - Uses experiment template to build frontend
 * 3. DEPLOY FRONTEND - Deploy to Cloudflare Pages
 * 4. INITIALIZE ON-CHAIN - Brain wallet initializes experiment on-chain
 * 5. VERIFY INTEGRATION - Test wallet connection and commit flow
 * 6. CREATE TRAILER - Generate experiment preview
 * 7. ANNOUNCE - Tweet with video
 * 8. MONITOR - Track experiment activity
 */
export async function startExperiment(options?: { force?: boolean }): Promise<ExperimentResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    log('[Crypto Lab] No ANTHROPIC_API_KEY - cannot start experiment');
    return null;
  }

  // Check cooldown (24 hours between experiments)
  const cooldownMs = getTimeUntilNextAllowed();
  if (cooldownMs > 0 && !options?.force) {
    const cooldownHours = (cooldownMs / 3600000).toFixed(1);
    log(`[Crypto Lab] Cooldown active - ${cooldownHours} hours remaining`);
    return null;
  }

  // Atomically start new cycle
  const cycleId = startCycleAtomic();
  if (cycleId === null) {
    const activeCycle = getActiveCycle();
    log(`[Crypto Lab] Active experiment already exists (id: ${activeCycle?.id})`);
    return null;
  }

  markCycleStarted();

  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('🧪 STARTING CRYPTO LAB EXPERIMENT');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log(`📋 Created experiment #${cycleId}`);

  // ============ PHASE 1: PLAN EXPERIMENT ============
  log('\n▸ PHASE 1: PLANNING EXPERIMENT');

  const client = new Anthropic({ apiKey });

  let plan: ExperimentPlan;

  try {
    log('[CLAUDE_AGENT:PLANNING] Selecting experiment type and theme...');
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: EXPERIMENT_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Plan a new blockchain experiment for $CC Crypto Lab. Current time: ${new Date().toISOString()}

Pick an experiment type and create a unique, memorable theme. Make it intriguing and shareable.

Return ONLY the JSON object, no other text.`,
      }],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      log('[Crypto Lab] No text response from Claude');
      return null;
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      log('[Crypto Lab] No JSON found in response');
      return null;
    }

    plan = JSON.parse(jsonMatch[0]) as ExperimentPlan;
    log(`✅ Experiment planned`);
    log(`   Type: ${plan.experiment.type}`);
    log(`   Theme: "${plan.experiment.theme}"`);
    log(`   Slug: /${plan.experiment.slug}`);

    updateCycleProject(cycleId, plan.experiment.theme, plan.experiment.slug);
    updateCyclePhase(cycleId, 1);
  } catch (error) {
    log(`❌ Planning failed: ${error}`);
    setCycleError(cycleId, `Planning failed: ${error}`);
    completeCycle(cycleId);
    return null;
  }

  // ============ PHASE 2: BUILD FRONTEND ============
  log('\n▸ PHASE 2: BUILDING FRONTEND');

  const template = GAME_TEMPLATES[plan.experiment.type];
  const config = DEFAULT_GAME_CONFIGS[plan.experiment.type];

  // Create experiment record in database
  const experimentId = createGame(
    plan.experiment.slug,
    plan.experiment.theme,
    plan.experiment.type,
    config,
    plan.experiment.theme
  );
  log(`   📋 Created experiment record: #${experimentId}`);

  // Build the frontend using the experiment template
  const buildPrompt = getGameBuildPrompt(plan.experiment.type, plan.experiment.theme);

  const buildResult = await buildProject({
    idea: plan.experiment.theme,
    slug: plan.experiment.slug,
    description: plan.experiment.description,
    cycleId,
    // Pass additional context for experiment builds
    additionalContext: buildPrompt,
  });

  if (!buildResult.success) {
    log(`❌ Build failed: ${buildResult.error}`);
    setCycleError(cycleId, `Build failed: ${buildResult.error}`);
    completeCycle(cycleId);
    return { cycleId, plan, experimentId };
  }

  log(`✅ Frontend built`);
  updateCyclePhase(cycleId, 2);

  // Add button to homepage (before deploy so it's included)
  try {
    const { addFeatureButtonOnly } = await import('./homepage.js');
    const homepageResult = addFeatureButtonOnly(plan.experiment.slug, plan.experiment.theme, log);
    if (!homepageResult.success && !homepageResult.alreadyExists) {
      log(`   ⚠️ Homepage update skipped: ${homepageResult.error}`);
    }
  } catch (error) {
    log(`   ⚠️ Homepage update failed: ${error}`);
  }

  // ============ PHASE 3: DEPLOY FRONTEND ============
  log('\n▸ PHASE 3: DEPLOYING FRONTEND');

  const deployResult = await deployToCloudflare();
  if (!deployResult.success) {
    log(`❌ Deploy failed: ${deployResult.error}`);
    setCycleError(cycleId, `Deploy failed: ${deployResult.error}`);
    completeCycle(cycleId);
    return { cycleId, plan, experimentId };
  }

  const deployUrl = `https://claudecode.wtf/${plan.experiment.slug}`;
  log(`✅ Deployed to: ${deployUrl}`);
  updateCyclePhase(cycleId, 3);

  // ============ PHASE 4: INITIALIZE ON-CHAIN ============
  log('\n▸ PHASE 4: INITIALIZING ON-CHAIN');
  log('   ⚠️ Note: On-chain initialization requires funded brain wallet');

  // Check if brain wallet is configured
  const walletKey = process.env.BRAIN_WALLET_KEY;
  let onChainInitialized = false;

  if (!walletKey) {
    log('   ⏭️ Skipping on-chain init (BRAIN_WALLET_KEY not set)');
    log('   → Experiment will work in "demo mode" without real stakes');
  } else {
    try {
      // Import solana module dynamically
      const { getConnection, initializeGame: initExperimentOnChain, fundEscrow } = await import('./solana.js');
      const { loadWallet } = await import('./wallet.js');

      const connection = getConnection();
      const wallet = loadWallet(walletKey);

      log('   🔗 Initializing experiment on Solana...');

      // Initialize experiment on-chain
      const { gameStatePda, escrowPda, signature } = await initExperimentOnChain(
        connection,
        wallet,
        plan.experiment.slug,
        plan.experiment.type,
        {
          minBet: BigInt(config.minBet),
          maxBet: BigInt(config.maxBet),
          houseEdgeBps: config.houseEdgeBps,
          platformFeeLamports: BigInt(config.platformFeeLamports),
        }
      );

      log(`   ✓ Experiment initialized: ${gameStatePda.toBase58()}`);
      log(`   ✓ Escrow: ${escrowPda.toBase58()}`);
      log(`   ✓ Tx: ${signature}`);

      // Fund escrow with initial allocation
      const allocation = CASINO_BANKROLL.perGameAllocation[plan.experiment.type];
      log(`   💰 Funding escrow with ${allocation.toLocaleString()} $CC...`);

      const fundTx = await fundEscrow(
        connection,
        wallet,
        plan.experiment.slug,
        BigInt(allocation * 1_000_000) // Convert to lamports
      );

      log(`   ✓ Escrow funded: ${fundTx}`);

      // Update experiment record with on-chain info
      updateGameOnChainInfo(experimentId, gameStatePda.toBase58(), escrowPda.toBase58());
      onChainInitialized = true;

    } catch (error) {
      log(`   ⚠️ On-chain init failed: ${error}`);
      log('   → Experiment will work in "demo mode" without real stakes');
    }
  }

  updateCyclePhase(cycleId, 4);

  // ============ PHASE 5: VERIFY INTEGRATION ============
  log('\n▸ PHASE 5: CALIBRATING');

  // Verify deployment is accessible
  let verified = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    log(`   Calibration attempt ${attempt}/3...`);
    verified = await verifyDeployment(deployUrl);
    if (verified) {
      log(`✅ Experiment calibrated!`);
      break;
    }
    if (attempt < 3) {
      log(`   Waiting 30s before retry...`);
      await new Promise(r => setTimeout(r, 30000));
    }
  }

  if (!verified) {
    log('❌ Calibration failed');
    setCycleError(cycleId, 'Calibration failed');
  }

  updateCyclePhase(cycleId, 5);

  // ============ PHASE 6: CREATE TRAILER ============
  log('\n▸ PHASE 6: CREATING TRAILER');

  const trailerResult = await generateTrailer(
    {
      name: plan.experiment.theme,
      slug: plan.experiment.slug,
      description: plan.experiment.description,
      cycleId,
    },
    deployUrl
  );

  if (!trailerResult.success) {
    log(`⚠️ Trailer generation failed: ${trailerResult.error}`);
  } else {
    log(`✅ Trailer created: ${trailerResult.durationSec}s`);
  }

  updateCyclePhase(cycleId, 6);

  // ============ PHASE 7: ANNOUNCE (4-Tweet Thread) ============
  log('\n▸ PHASE 7: ANNOUNCING (Thread)');

  let tweetId: string | undefined;

  // Check tweet rate limit
  const globalCheck = canTweetGlobally();
  if (!globalCheck.allowed) {
    log(`⚠️ Tweet rate limit: ${globalCheck.reason}`);
  } else {
    try {
      const credentials = getTwitterCredentials();

      // Ensure tweet1 has the deploy URL
      const tweet1Content = plan.thread.tweet1.includes('claudecode.wtf')
        ? plan.thread.tweet1
        : `${plan.thread.tweet1}\n\n${deployUrl}`;

      // Ensure tweet4 has the deploy URL (CTA)
      const tweet4Content = plan.thread.tweet4.includes('claudecode.wtf')
        ? plan.thread.tweet4
        : `${plan.thread.tweet4}\n\n${deployUrl}`;

      if (trailerResult.success && trailerResult.videoBase64) {
        log('📹 Posting 4-tweet thread with trailer...');

        // Upload video first
        log('   Uploading video...');
        const mediaId = await uploadVideo(trailerResult.videoBase64, credentials);
        log(`   ✓ Video uploaded: ${mediaId}`);

        // Tweet 1: Feature intro + video (to community)
        log('   Posting tweet 1 (intro + video)...');
        const tweet1Result = await postTweet(tweet1Content, credentials, {
          mediaId,
          communityId: CC_COMMUNITY_ID,
        });
        tweetId = tweet1Result.id;
        log(`   ✓ Tweet 1: ${tweet1Result.id}`);

        // Tweet 2: Unique/fun detail (reply)
        log('   Posting tweet 2 (detail)...');
        const tweet2Result = await postTweet(plan.thread.tweet2, credentials, {
          replyToId: tweet1Result.id,
        });
        log(`   ✓ Tweet 2: ${tweet2Result.id}`);

        // Tweet 3: Technical explanation (reply)
        log('   Posting tweet 3 (technical)...');
        const tweet3Result = await postTweet(plan.thread.tweet3, credentials, {
          replyToId: tweet2Result.id,
        });
        log(`   ✓ Tweet 3: ${tweet3Result.id}`);

        // Tweet 4: CTA with link (reply)
        log('   Posting tweet 4 (CTA)...');
        const tweet4Result = await postTweet(tweet4Content, credentials, {
          replyToId: tweet3Result.id,
        });
        log(`   ✓ Tweet 4: ${tweet4Result.id}`);

        // Record the thread (use tweet1 as main)
        recordTweet(tweet1Result.id, 'announcement', tweet1Content);
      } else {
        log('📝 Posting thread (no video)...');

        // Tweet 1: Feature intro (to community, no video)
        const tweet1Result = await postTweetToCommunity(tweet1Content, credentials);
        tweetId = tweet1Result.id;
        log(`   ✓ Tweet 1: ${tweet1Result.id}`);

        // Tweet 2: Unique/fun detail (reply)
        const tweet2Result = await postTweet(plan.thread.tweet2, credentials, {
          replyToId: tweet1Result.id,
        });
        log(`   ✓ Tweet 2: ${tweet2Result.id}`);

        // Tweet 3: Technical explanation (reply)
        const tweet3Result = await postTweet(plan.thread.tweet3, credentials, {
          replyToId: tweet2Result.id,
        });
        log(`   ✓ Tweet 3: ${tweet3Result.id}`);

        // Tweet 4: CTA with link (reply)
        const tweet4Result = await postTweet(tweet4Content, credentials, {
          replyToId: tweet3Result.id,
        });
        log(`   ✓ Tweet 4: ${tweet4Result.id}`);

        recordTweet(tweet1Result.id, 'announcement', tweet1Content);
      }

      log(`✅ Thread posted: ${tweetId}`);
      insertTweet(tweet1Content, 'announcement', tweetId);
    } catch (error) {
      log(`❌ Thread failed: ${error}`);
    }
  }

  updateCyclePhase(cycleId, 7);

  // ============ PHASE 8: COMPLETE ============
  log('\n▸ PHASE 8: COMPLETING EXPERIMENT');

  // Complete experiment atomically
  const stats = completeCycleAtomic(
    cycleId,
    plan.experiment.slug,
    plan.experiment.theme,
    plan.experiment.description
  );

  updateCyclePhase(cycleId, 8);

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('🧪 CRYPTO LAB EXPERIMENT COMPLETED');
  log(`   Experiment: ${plan.experiment.theme} (${plan.experiment.type})`);
  log(`   URL: ${deployUrl}`);
  log(`   On-chain: ${onChainInitialized ? 'Yes' : 'Demo mode'}`);
  log(`   Experiments today: ${stats.features_shipped}/${getDailyLimit()}`);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return {
    cycleId,
    plan,
    experimentId,
    deployUrl,
    onChainInitialized,
    trailerResult,
    tweetId,
  };
}

/**
 * Get Crypto Lab experiment status
 */
export function getExperimentStatus(): {
  totalExperiments: number;
  activeExperiments: number;
  todayExperiments: number;
  dailyLimit: number;
  canRunMore: boolean;
  cooldownMs: number;
} {
  const stats = getTodayStats();
  const cooldownMs = getTimeUntilNextAllowed();

  // Import db functions for experiment stats
  const { getActiveGames, getAllGamesStats } = require('./db.js');
  const allStats = getAllGamesStats();

  return {
    totalExperiments: allStats.totalGames,
    activeExperiments: allStats.activeGames,
    todayExperiments: stats.features_shipped,
    dailyLimit: getDailyLimit(),
    canRunMore: canShipMore() && cooldownMs === 0,
    cooldownMs,
  };
}
