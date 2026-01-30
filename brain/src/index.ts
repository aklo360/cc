/**
 * Central Brain - Autonomous $CC Growth Agent
 *
 * Full autonomous engineering loop:
 * 1. PLAN    - Claude plans project + tweets
 * 2. BUILD   - Claude Agent SDK builds the feature
 * 3. TEST    - Verify build succeeds
 * 4. DEPLOY  - Push to Cloudflare Pages
 * 5. VERIFY  - Check deployment works
 * 6. RECORD  - Capture video of the feature
 * 7. TWEET   - Post announcement with video
 *
 * HTTP Endpoints:
 *   GET  /status  - Check brain status and active cycle
 *   POST /go      - Start a new 24-hour cycle
 *   POST /cancel  - Cancel the active cycle
 *
 * WebSocket: ws://localhost:3001/ws
 *   Real-time log streaming for /watch page
 */

import 'dotenv/config';
import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cron from 'node-cron';
import {
  db,
  cleanupOnStartup,
  getTodayStats,
  getDailyLimit,
  canShipMore,
  getTimeUntilNextAllowed,
  getHoursBetweenCycles,
  seedInitialFeatures,
  resetShippedFeatures,
  getAllShippedFeatures,
  getActiveCycle,
  insertBuildLog,
  getRecentBuildLogs,
  cleanupOldBuildLogs,
  getGlobalTweetStats,
  createFlipCommitment,
  getFlipCommitment,
  getPendingCommitmentForWallet,
  markCommitmentDeposited,
  resolveCommitment,
  expireCommitment,
  expireWalletCommitments,
  isTxSignatureUsed,
  markTxSignatureUsed,
  cleanupExpiredCommitments,
  getDailyHouseLoss,
  getDailyFlipStats,
  getDailyPayoutStats,
  recordPayout,
  type ActivityType,
  type FlipChoice,
} from './db.js';
import { startExperiment, getCycleStatus, cancelActiveCycle, buildEvents } from './cycle.js';
import { cleanupOldScheduledTweets } from './video-scheduler.js';
import {
  getAllScheduledTweets,
  getPendingTweetCount,
  getRecentPostedTweets,
  fillTweetQueue,
  postNextDueTweet,
  cleanupOldUnifiedTweets,
  clearPendingTweets,
} from './tweet-drafter.js';
import { cleanupOrphanedProcesses, killProcess, registerShutdownHandlers } from './process-manager.js';
import { getHumor } from './humor.js';
import { getConnection, transferCC, verifyDepositTransaction, verifySolFeeTransaction, getBrainWalletAta, getBrainWalletSolAddress, NETWORK } from './solana.js';
import { loadWallet, createBurnWallet, burnWalletExists, getBurnWalletState, loadBurnWallet, createRewardsWallet, rewardsWalletExists, getRewardsWalletState, loadRewardsWallet, importRewardsWallet, CC_TOKEN_MINT } from './wallet.js';
import { executeBuybackAndBurn, shouldRunBuyback, getBuybackStats, processAllSwapFees, getSwapFeeBalances } from './buyback.js';
import { ensureBurnWalletAta, ensureRewardsWalletAta, getRewardsWalletAddress, ensureBrainWsolAta } from './solana.js';
import { checkPayoutCircuitBreaker, checkTopUpNeeded, topUpGameWallet, getWalletSystemStatus, getAllLimits, REWARDS_LIMITS, GAME_LIMITS } from './rewards.js';
import {
  GACHA_CONFIG,
  GACHA_DISTRIBUTION,
  generateGachaCommitment,
  createGachaCommitment,
  getGachaCommitment,
  getPendingGachaCommitment,
  expireGachaCommitments,
  markGachaDeposited,
  computeGachaResults,
  resolveGachaCommitment,
  getDailyGachaStats,
  getDailyGachaLoss,
  type GachaTier,
} from './gacha.js';
import { PublicKey } from '@solana/web3.js';
import { randomBytes, createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  startGrindLoop,
  stopGrindLoop,
  pauseGrindLoop,
  resumeGrindLoop,
  getGrindStatus,
  triggerReactiveThought,
} from './idle-grind.js';
import { startTokenMonitor, stopTokenMonitor } from './token-monitor.js';

const PORT = process.env.PORT || 3001;

// Store connected WebSocket clients
const wsClients = new Set<WebSocket>();

// ASCII art banner
const BANNER = `
   ██████╗██████╗ ██╗   ██╗██████╗ ████████╗ ██████╗
  ██╔════╝██╔══██╗╚██╗ ██╔╝██╔══██╗╚══██╔══╝██╔═══██╗
  ██║     ██████╔╝ ╚████╔╝ ██████╔╝   ██║   ██║   ██║
  ██║     ██╔══██╗  ╚██╔╝  ██╔═══╝    ██║   ██║   ██║
  ╚██████╗██║  ██║   ██║   ██║        ██║   ╚██████╔╝
   ╚═════╝╚═╝  ╚═╝   ╚═╝   ╚═╝        ╚═╝    ╚═════╝

  ██╗      █████╗ ██████╗
  ██║     ██╔══██╗██╔══██╗
  ██║     ███████║██████╔╝
  ██║     ██╔══██║██╔══██╗
  ███████╗██║  ██║██████╔╝
  ╚══════╝╚═╝  ╚═╝╚═════╝

  $CC Crypto Lab v2.0.0
  1 Viral Blockchain Experiment Per Day
  Experiments: Entropy Oracle | Momentum Curve | Probability Engine | Convergence Pool
`;

// ============ WebSocket Broadcast ============

function broadcastLog(message: string, persist: boolean = true, activityType: ActivityType = 'system'): void {
  const timestamp = Date.now();
  const payload = JSON.stringify({ type: 'log', message, timestamp, activityType });

  // Persist to database for historical access
  if (persist) {
    try {
      const level = message.includes('Error') || message.includes('Failed') ? 'error' :
                    message.includes('Success') || message.includes('Complete') ? 'success' : 'info';
      insertBuildLog(message, level, activityType);
    } catch (e) {
      // Don't fail if DB write fails
      console.error('[broadcastLog] Failed to persist log:', e);
    }
  }

  // Send to all connected WebSocket clients
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// Subscribe to build events
buildEvents.on('log', (message: string) => {
  broadcastLog(message);
});

// ============ HTTP Server ============

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = req.url || '/';
  const method = req.method || 'GET';

  console.log(`[HTTP] ${method} ${url}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Routes
  if (url === '/' && method === 'GET') {
    sendJson(res, 200, {
      name: 'Crypto Lab',
      version: '2.0.0',
      codename: 'Crypto Lab',
      status: 'running',
      endpoints: {
        'GET /': 'This info',
        'GET /status': 'Check brain status and active experiment',
        'GET /stats': 'Daily experiment statistics',
        'GET /features': 'All deployed experiments',
        'POST /features/reset': 'Reset features to actual site features',
        'GET /logs': 'Recent build logs (last 24 hours)',
        'GET /tweets': 'Global tweet rate limiting stats',
        'GET /scheduled-tweets': 'Unified tweet queue (memes, AI insights, features)',
        'POST /scheduled-tweets/fill': 'Trigger queue fill (draft new tweets)',
        'POST /scheduled-tweets/post-next': 'Post next due tweet',
        'POST /experiment': 'Start a new blockchain experiment (replaces /go)',
        'POST /cancel': 'Cancel the active experiment',
        'POST /flip/commit': 'Request coin flip (returns commitment + deposit address)',
        'POST /flip/resolve': 'Submit deposit tx, get result (commit-reveal)',
        'GET /flip/status/:id': 'Check commitment status',
        'GET /flip/deposit-address': 'Get brain wallet ATA for deposits',
        'GET /flip/stats': 'Get daily flip stats + circuit breaker status',
        'POST /gacha/commit': 'Request gacha pull (1-10 samples, returns commitment)',
        'POST /gacha/resolve': 'Submit deposit tx, get tier results',
        'GET /gacha/stats': 'Get daily gacha stats + circuit breaker status',
        'GET /fees/balances': 'Get accumulated swap terminal fee balances (CC + SOL)',
        'POST /fees/process': 'Process all swap fees (CC direct burn + SOL buyback)',
        'POST /fees/create-wsol-ata': 'Create wSOL ATA for collecting sell fees',
        'GET /buyback/stats': 'Get buyback & burn statistics',
        'POST /buyback/trigger': 'Manually trigger SOL-only buyback & burn',
        'GET /burn-wallet/status': 'Get burn wallet status (airlock pattern)',
        'POST /burn-wallet/create': 'Create dedicated burn wallet (one-time)',
        'GET /rewards/status': 'Get rewards wallet status (cold storage)',
        'POST /rewards/create': 'Create rewards wallet (one-time)',
        'POST /rewards/import': 'Import existing rewards wallet from secret key',
        'POST /rewards/fund-sol': 'Transfer SOL from game wallet to rewards wallet for tx fees',
        'POST /rewards/top-up': 'Manually trigger top-up from rewards → game wallet',
        'GET /game-wallet/status': 'Get game wallet status + daily stats',
        'GET /limits': 'Get all system limits (rewards + game wallet)',
        'GET /wallet-system/status': 'Get full 3-wallet system status',
        'WS /ws': 'Real-time log streaming (WebSocket)',
      },
      experimentTypes: {
        entropy_oracle: 'Provably fair coin flip (50/50, 1.96x payout)',
        momentum_curve: 'Watch multiplier rise, cash out before crash',
        probability_engine: 'Pull for tiered prizes (common/rare/epic/legendary)',
        convergence_pool: 'Pool bets, one winner takes all',
      },
      capabilities: [
        'Plan experiments with Claude',
        'Build frontends with Claude Agent SDK',
        'Deploy to Cloudflare Pages',
        'Generate gameplay trailers',
        'Tweet announcements with video',
        'Auto-add buttons to homepage',
        '1 high-quality experiment per day',
        'Secure commit-reveal randomness',
        'Buyback & burn: SOL fees → buy $CC → burn 100%',
        'Burn wallet airlock: Safe burn pattern',
        '3-wallet architecture: Rewards (cold) → Game (hot) → Players',
        'Circuit breaker protection',
      ],
    });
    return;
  }

  if (url === '/status' && method === 'GET') {
    const status = getCycleStatus();
    const featureCooldownMs = getTimeUntilNextAllowed();
    const stats = getTodayStats();
    const grindStatus = getGrindStatus();

    // Determine brain mode: experimenting, calibrating (cooldown), or observing/grinding
    let mode: 'EXPERIMENTING' | 'CALIBRATING' | 'OBSERVING' = 'OBSERVING';
    if (status.active) {
      mode = 'EXPERIMENTING';
    } else if (featureCooldownMs > 0) {
      mode = 'CALIBRATING';
    }

    // Get wallet status for health check
    let walletHealth = { game: { healthy: false, balance: 0 }, rewards: { exists: false, balance: null as number | null }, burn: { exists: false } };
    try {
      const encryptionKey = process.env.BRAIN_WALLET_KEY;
      if (encryptionKey) {
        const connection = getConnection();
        const gameWallet = loadWallet(encryptionKey);
        const gameBalance = await gameWallet.getBalance(connection);
        walletHealth.game = { healthy: gameBalance.cc > 250_000, balance: gameBalance.cc };

        if (rewardsWalletExists()) {
          const rewardsWallet = loadRewardsWallet(encryptionKey);
          const rewardsBalance = await rewardsWallet.getBalance(connection);
          walletHealth.rewards = { exists: true, balance: rewardsBalance.cc };
        }

        walletHealth.burn = { exists: burnWalletExists() };
      }
    } catch (e) {
      // Wallet check failed, continue with defaults
    }

    sendJson(res, 200, {
      version: '2.0',
      codename: 'Crypto Lab',
      mode,
      wsClients: wsClients.size,
      experiment: status.active
        ? {
            active: true,
            id: status.cycle?.id,
            type: status.cycle?.project_idea,
            slug: status.cycle?.project_slug,
            phase: status.cycle?.status,
            started: status.cycle?.started_at,
          }
        : {
            active: false,
            id: null,
            type: null,
            phase: null,
          },
      grind: {
        active: grindStatus.running && !grindStatus.paused,
        currentActivity: grindStatus.currentActivity,
        lastThought: grindStatus.lastThought,
        lastThoughtAt: grindStatus.lastThoughtAt ? new Date(grindStatus.lastThoughtAt).toISOString() : null,
        // v2 reasoning session info
        session: grindStatus.session,
        insights: grindStatus.insights,
        isResting: grindStatus.isResting,
      },
      wallets: walletHealth,
      stats: {
        experimentsToday: stats.features_shipped,
        totalExperiments: getAllShippedFeatures().length,
        nextExperimentIn: featureCooldownMs > 0 ? featureCooldownMs : null,
      },
      cooldown: {
        next_allowed_in_ms: featureCooldownMs,
        next_allowed_at: featureCooldownMs > 0 ? new Date(Date.now() + featureCooldownMs).toISOString() : null,
      },
    });
    return;
  }

  if (url === '/stats' && method === 'GET') {
    const stats = getTodayStats();
    const limit = getDailyLimit();
    const cooldownMs = getTimeUntilNextAllowed();
    const nextAllowedAt = cooldownMs > 0 ? new Date(Date.now() + cooldownMs).toISOString() : null;

    sendJson(res, 200, {
      date: stats.date,
      features_shipped: stats.features_shipped,
      daily_limit: limit,
      remaining: limit - stats.features_shipped,
      can_ship_more: canShipMore(),
      last_cycle_end: stats.last_cycle_end,
      hours_between_cycles: getHoursBetweenCycles(),
      next_allowed_in_ms: cooldownMs,
      next_allowed_in_hours: Number((cooldownMs / 3600000).toFixed(2)),
      next_allowed_at: nextAllowedAt,
    });
    return;
  }

  if (url === '/features' && method === 'GET') {
    const features = getAllShippedFeatures();
    sendJson(res, 200, {
      total: features.length,
      features: features.map(f => ({
        slug: f.slug,
        name: f.name,
        description: f.description,
        url: `https://claudecode.wtf/${f.slug}`,
        shipped_at: f.shipped_at,
      })),
    });
    return;
  }

  // Admin endpoint to reset features to actual site features
  if (url === '/features/reset' && method === 'POST') {
    const count = resetShippedFeatures();
    const features = getAllShippedFeatures();
    sendJson(res, 200, {
      success: true,
      message: `Reset to ${count} features`,
      total: features.length,
      latest: features[0]?.name || null,
    });
    return;
  }

  if (url === '/logs' && method === 'GET') {
    // Get recent build logs (last 24 hours by default)
    const logs = getRecentBuildLogs(24, 500);
    sendJson(res, 200, {
      count: logs.length,
      logs: logs.map(l => ({
        message: l.message,
        level: l.level,
        activityType: l.activity_type,
        timestamp: new Date(l.created_at).getTime(),
        created_at: l.created_at,
      })),
    });
    return;
  }

  // Global tweet rate limiting stats
  if (url === '/tweets' && method === 'GET') {
    const stats = getGlobalTweetStats();
    sendJson(res, 200, stats);
    return;
  }

  // ============ REASONING SYSTEM V2 ENDPOINTS ============

  // Get insights from the learning system
  if (url === '/insights' && method === 'GET') {
    const { getAllInsights, getInsightsSummary } = await import('./insights-db.js');
    const insights = getAllInsights();
    const summary = getInsightsSummary();

    sendJson(res, 200, {
      total: summary.total,
      byConfidence: summary.byConfidence,
      byCategory: summary.byCategory,
      insights: insights.map(i => ({
        id: i.id,
        insight: i.insight,
        category: i.category,
        confidence: i.confidence,
        timesReferenced: i.timesReferenced,
        createdAt: i.createdAt,
      })),
    });
    return;
  }

  // Get current thinking session status
  if (url === '/session' && method === 'GET') {
    const { getSessionStatus } = await import('./reasoning-engine.js');
    const { getSessionThoughts } = await import('./db.js');
    const status = getSessionStatus();

    if (!status.active || !status.session) {
      sendJson(res, 200, {
        active: false,
        message: 'No active thinking session',
      });
      return;
    }

    const thoughts = getSessionThoughts(status.session.id);

    sendJson(res, 200, {
      active: true,
      session: {
        id: status.session.id,
        problem: status.session.problem,
        category: status.session.category,
        startedAt: status.session.startedAt,
        thoughtCount: status.session.thoughtCount,
        status: status.session.status,
      },
      progress: status.progress,
      thoughts: thoughts.map(t => ({
        index: t.thoughtIndex,
        content: t.content,
        type: t.thoughtType,
        time: new Date(t.createdAt).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
      })),
    });
    return;
  }

  // Scheduled tweets - unified queue for all tweet types
  if (url === '/scheduled-tweets' && method === 'GET') {
    const pending = getAllScheduledTweets();
    const recent = getRecentPostedTweets(10);
    const pendingCount = getPendingTweetCount();

    sendJson(res, 200, {
      queue_size: pendingCount,
      pending: pending.map(t => ({
        id: t.id,
        type: t.tweet_type,
        content: t.content,
        has_image: !!t.image_base64,
        has_video: !!t.video_path,
        scheduled_for: t.scheduled_for,
        quality_score: t.quality_score,
      })),
      recent: recent.map(t => ({
        id: t.id,
        type: t.tweet_type,
        content: t.content,
        twitter_id: t.twitter_id,
        posted_at: t.scheduled_for,
      })),
    });
    return;
  }

  // Trigger tweet queue fill (for testing)
  if (url === '/scheduled-tweets/fill' && method === 'POST') {
    console.log('[Tweet Drafter] Manual queue fill triggered');
    broadcastLog('📝 Manual tweet queue fill triggered', true, 'system');

    // Run async and return immediately
    fillTweetQueue(5)
      .then(count => {
        console.log(`[Tweet Drafter] Filled queue with ${count} tweets`);
        broadcastLog(`📝 Tweet queue filled: ${count} new tweets drafted`, true, 'system');
      })
      .catch(err => {
        console.error('[Tweet Drafter] Fill failed:', err);
        broadcastLog(`⚠️ Tweet queue fill failed: ${err.message}`, true, 'system');
      });

    sendJson(res, 200, {
      message: 'Queue fill started',
      current_queue_size: getPendingTweetCount(),
    });
    return;
  }

  // Trigger next tweet post (for testing)
  if (url === '/scheduled-tweets/post-next' && method === 'POST') {
    console.log('[Tweet Drafter] Manual post triggered');
    broadcastLog('📝 Manual tweet post triggered', true, 'system');

    const posted = await postNextDueTweet();
    if (posted) {
      sendJson(res, 200, { success: true, message: 'Tweet posted' });
    } else {
      sendJson(res, 200, { success: false, message: 'No tweet due or rate limited' });
    }
    return;
  }

  // Clear all pending tweets (for personality/prompt updates)
  if (url === '/scheduled-tweets/clear' && method === 'POST') {
    console.log('[Tweet Drafter] Clearing pending tweets...');
    const cleared = clearPendingTweets();
    console.log(`[Tweet Drafter] Cleared ${cleared} pending tweet(s)`);
    broadcastLog(`🗑️ Cleared ${cleared} pending tweet(s) from queue`, true, 'system');

    sendJson(res, 200, {
      success: true,
      cleared,
      message: `Cleared ${cleared} pending tweets. Use POST /scheduled-tweets/fill to regenerate.`,
    });
    return;
  }

  // Experiment control endpoint
  // /experiment is the primary endpoint (Brain 2.0)
  // /go and /gamefi/go are kept as aliases for backwards compatibility
  // Check if URL matches experiment endpoints (with or without query params)
  const urlPath = url.split('?')[0];
  if ((urlPath === '/experiment' || urlPath === '/go' || urlPath === '/gamefi/go') && method === 'POST') {
    // Parse URL for force flag
    const urlObj = new URL(url, `http://localhost:${PORT}`);
    const force = urlObj.searchParams.get('force') === 'true';

    if (getActiveCycle()) {
      sendJson(res, 409, { error: 'Experiment already in progress', status: getCycleStatus() });
      return;
    }

    // Check cooldown (skip if force=true)
    const cooldownMs = getTimeUntilNextAllowed();
    if (cooldownMs > 0 && !force) {
      const hours = Math.floor(cooldownMs / (1000 * 60 * 60));
      const minutes = Math.floor((cooldownMs % (1000 * 60 * 60)) / (1000 * 60));
      sendJson(res, 429, {
        error: `Must wait before starting a new experiment`,
        cooldown_remaining_ms: cooldownMs,
        cooldown_remaining: `${hours}h ${minutes}m`,
        next_allowed_at: new Date(Date.now() + cooldownMs).toISOString(),
        hint: 'Use ?force=true to bypass cooldown',
      });
      return;
    }

    console.log('\n🔬 Starting new blockchain experiment!\n');
    broadcastLog('🔬 Starting new blockchain experiment!', true, 'build');

    // Pause the grind loop during build
    pauseGrindLoop();

    // Start experiment asynchronously (non-blocking)
    startExperiment({ force })
      .then((result) => {
        if (result && result.deployUrl) {
          console.log(`✅ Experiment deployed: ${result.plan.experiment.slug}`);
        } else if (!result) {
          console.error(`❌ Experiment could not start (cooldown or active cycle)`);
        }
        // Resume grind loop after build completes
        resumeGrindLoop();
      })
      .catch((err) => {
        console.error('Experiment crashed:', err);
        broadcastLog(`❌ Experiment crashed: ${err.message}`, true, 'build');
        // Resume grind loop even after crash
        resumeGrindLoop();
      });

    sendJson(res, 200, { message: 'Experiment started', status: getCycleStatus() });
    return;
  }

  if (url === '/cancel' && method === 'POST') {
    console.log('\n⛔ CANCEL triggered! Stopping active experiment...\n');
    broadcastLog('⛔ CANCEL triggered! Stopping active experiment...');

    // cancelActiveCycle is now async (kills processes)
    const result = await cancelActiveCycle();

    if (result) {
      sendJson(res, 200, {
        success: true,
        message: 'Experiment cancelled and processes killed',
        experimentId: result.id,
        type: result.project_idea,
      });
    } else {
      sendJson(res, 404, {
        success: false,
        message: 'No active experiment to cancel',
      });
    }
    return;
  }

  // ============ SECURE ESCROW COIN FLIP API (COMMIT-REVEAL) ============

  // Game configuration
  const FLIP_CONFIG = {
    minBet: 1,              // Minimum bet in $CC
    maxBet: 1_000_000,      // Maximum bet in $CC (1M)
    multiplier: 1.96,       // 2x minus 2% house edge
    expirySeconds: 120,     // Commitment expires after 2 minutes
    maxDailyLoss: 1_500_000, // Maximum loss per day in $CC (1.5M) - circuit breaker
    platformFeeLamports: 500_000, // ~$0.05 USD in SOL (0.0005 SOL) - funds buyback & burn
  };

  /**
   * POST /flip/commit - Request to play (Step 1)
   * Returns commitment hash and deposit address
   * User must deposit tokens BEFORE result is revealed
   */
  if (url === '/flip/commit' && method === 'POST') {
    try {
      const body = await new Promise<string>((resolve) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
      });

      const { wallet, bet, choice } = JSON.parse(body) as {
        wallet: string;
        bet: number;
        choice: FlipChoice;
      };

      // Validate inputs
      if (!wallet || bet === undefined || !choice) {
        sendJson(res, 400, { error: 'Missing required fields: wallet, bet, choice' });
        return;
      }

      if (bet < FLIP_CONFIG.minBet || bet > FLIP_CONFIG.maxBet) {
        sendJson(res, 400, { error: `Bet must be between ${FLIP_CONFIG.minBet} and ${FLIP_CONFIG.maxBet} $CC` });
        return;
      }

      if (choice !== 'heads' && choice !== 'tails') {
        sendJson(res, 400, { error: 'Choice must be heads or tails' });
        return;
      }

      // Validate wallet address
      try {
        new PublicKey(wallet);
      } catch {
        sendJson(res, 400, { error: 'Invalid wallet address' });
        return;
      }

      // CIRCUIT BREAKER: Check daily loss limit
      const dailyLoss = getDailyHouseLoss();
      const potentialMaxLoss = bet * (FLIP_CONFIG.multiplier - 1); // Max loss if player wins
      if (dailyLoss + potentialMaxLoss > FLIP_CONFIG.maxDailyLoss) {
        console.log(`[Flip/Commit] CIRCUIT BREAKER: Daily loss ${dailyLoss.toLocaleString()} + potential ${potentialMaxLoss.toLocaleString()} > limit ${FLIP_CONFIG.maxDailyLoss.toLocaleString()}`);
        broadcastLog(`🚨 Circuit breaker triggered: Daily loss limit reached`, true, 'system');
        sendJson(res, 503, {
          error: 'Casino temporarily closed - daily loss limit reached',
          dailyLoss: Math.floor(dailyLoss),
          maxDailyLoss: FLIP_CONFIG.maxDailyLoss,
          resetsAt: new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString(),
        });
        return;
      }

      // Auto-expire any expired commitments for this wallet first
      expireWalletCommitments(wallet);

      // Check for existing pending commitment
      const existingCommitment = getPendingCommitmentForWallet(wallet);
      if (existingCommitment) {
        // If it's expired but wasn't cleaned up, expire it now
        if (existingCommitment.expires_at < Date.now()) {
          expireCommitment(existingCommitment.id);
        } else {
          sendJson(res, 409, {
            error: 'You already have a pending commitment',
            commitmentId: existingCommitment.id,
            expiresAt: existingCommitment.expires_at,
            // Tell frontend how long to wait
            expiresInMs: existingCommitment.expires_at - Date.now(),
          });
          return;
        }
      }

      // Get brain wallet ATA for $CC deposit
      const depositTo = await getBrainWalletAta();
      if (!depositTo) {
        sendJson(res, 500, { error: 'Server wallet not configured' });
        return;
      }

      // Get brain wallet SOL address for platform fee
      const feeRecipient = getBrainWalletSolAddress();
      if (!feeRecipient) {
        sendJson(res, 500, { error: 'Server wallet not configured' });
        return;
      }

      // Generate commitment ID and expiry
      const commitmentId = uuidv4();
      const expiresAt = Date.now() + (FLIP_CONFIG.expirySeconds * 1000);
      const depositAmount = bet * 1_000_000_000; // Convert to token lamports (9 decimals)

      // ============ PROVABLY FAIR: Server commits to secret ============
      // Security model:
      // 1. Server generates serverSecret and commits to SHA256(serverSecret)
      // 2. User deposits, creating a transaction with unpredictable signature
      // 3. Final result = SHA256(serverSecret + txSignature)[0] < 128 ? heads : tails
      //
      // Why this is secure:
      // - Server can't predict txSignature when committing (user hasn't signed yet)
      // - User can't predict serverSecret when signing (only sees commitment hash)
      // - Neither party can manipulate the final result
      // - User can verify: SHA256(serverSecret) === commitment, then compute result
      const serverSecret = randomBytes(32).toString('hex');
      const commitmentHash = createHash('sha256').update(serverSecret).digest('hex');

      // NOTE: We do NOT pre-calculate the result here!
      // Result is computed at resolve time using: SHA256(serverSecret + txSignature)

      // Store commitment (secret only - result computed at resolve time)
      createFlipCommitment(
        commitmentId,
        wallet,
        bet,
        choice,
        serverSecret,
        commitmentHash,
        expiresAt,
        {
          vrfResult: 'heads', // Placeholder - actual result computed at resolve time
          vrfProof: undefined,
          vrfRequestId: undefined,
          isFallback: false,
        }
      );

      console.log(`[Flip/Commit] ${wallet.slice(0, 8)}... betting ${bet} $CC on ${choice} (provably fair)`);
      broadcastLog(`🎰 Commit: ${wallet.slice(0, 8)}... betting ${bet} $CC on ${choice}`, true, 'system');

      sendJson(res, 200, {
        commitmentId,
        commitment: commitmentHash, // SHA256(serverSecret) - sent BEFORE user signs
        expiresAt,
        depositTo,          // Brain wallet ATA for $CC deposit
        depositAmount,
        feeRecipient,       // Brain wallet SOL address for platform fee
        platformFeeLamports: FLIP_CONFIG.platformFeeLamports, // ~$0.05 SOL platform fee
        // Explain the provably fair mechanism to the user
        provablyFair: 'Result = SHA256(serverSecret + yourTxSignature)[0] < 128 ? heads : tails',
        message: `Deposit ${bet} $CC + ~$0.05 SOL fee to play. Fee funds token buyback & burn.`,
      });
    } catch (error) {
      console.error('[Flip/Commit] Error:', error);
      sendJson(res, 500, { error: (error as Error).message });
    }
    return;
  }

  /**
   * POST /flip/resolve - Submit deposit and get result (Step 2)
   * Verifies deposit on-chain, then reveals result
   */
  if (url === '/flip/resolve' && method === 'POST') {
    try {
      const body = await new Promise<string>((resolve) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
      });

      const { commitmentId, txSignature } = JSON.parse(body) as {
        commitmentId: string;
        txSignature: string;
      };

      // Validate inputs
      if (!commitmentId || !txSignature) {
        sendJson(res, 400, { error: 'Missing required fields: commitmentId, txSignature' });
        return;
      }

      // Get commitment
      const commitment = getFlipCommitment(commitmentId);
      if (!commitment) {
        sendJson(res, 404, { error: 'Commitment not found' });
        return;
      }

      // Check commitment status
      if (commitment.status === 'resolved') {
        sendJson(res, 409, {
          error: 'Commitment already resolved',
          result: commitment.result,
          won: commitment.won === 1,
          payout_tx: commitment.payout_tx,
        });
        return;
      }

      if (commitment.status === 'expired' || commitment.expires_at < Date.now()) {
        sendJson(res, 410, { error: 'Commitment expired' });
        return;
      }

      // Check for replay attack
      if (isTxSignatureUsed(txSignature)) {
        sendJson(res, 409, { error: 'Transaction signature already used' });
        return;
      }

      // Verify deposit on-chain
      const expectedAmount = BigInt(commitment.bet_amount * 1_000_000_000); // 9 decimals
      const connection = getConnection(); // Uses SOLANA_NETWORK env var

      console.log(`[Flip/Resolve] Verifying deposit tx: ${txSignature.slice(0, 16)}...`);
      const verification = await verifyDepositTransaction(
        connection,
        txSignature,
        commitment.wallet,
        expectedAmount
      );

      if (!verification.valid) {
        console.log(`[Flip/Resolve] Deposit verification failed: ${verification.error}`);
        sendJson(res, 400, {
          error: 'Deposit verification failed',
          details: verification.error,
        });
        return;
      }

      // Verify SOL platform fee was paid (required for buyback & burn)
      const feeVerification = await verifySolFeeTransaction(
        connection,
        txSignature,
        FLIP_CONFIG.platformFeeLamports
      );

      if (!feeVerification.valid) {
        console.log(`[Flip/Resolve] SOL fee verification failed: ${feeVerification.error}`);
        // Log warning but don't block - fee is important but not critical
        // In production, we could require this, but for now we'll be lenient
        console.log(`[Flip/Resolve] WARNING: SOL fee not detected (expected ${FLIP_CONFIG.platformFeeLamports} lamports)`);
        broadcastLog(`⚠️ SOL fee not detected - proceeding anyway`, true, 'system');
      } else {
        console.log(`[Flip/Resolve] SOL fee verified: ${feeVerification.amount} lamports`);
      }

      // Mark tx signature as used (replay protection)
      markTxSignatureUsed(txSignature, commitmentId);

      // Mark commitment as deposited
      markCommitmentDeposited(commitmentId, txSignature);

      // ============ PROVABLY FAIR: Compute result from BOTH server secret AND user tx signature ============
      // This ensures neither party can manipulate the result:
      // - Server committed to serverSecret BEFORE seeing txSignature
      // - User created txSignature AFTER seeing commitment (but not the secret)
      // - Result = SHA256(serverSecret + txSignature)[0] < 128 ? heads : tails
      //
      // User can verify:
      // 1. SHA256(serverSecret) === commitment (server didn't change secret)
      // 2. Compute SHA256(serverSecret + txSignature) themselves to verify result
      const combinedEntropy = commitment.secret + txSignature;
      const finalHash = createHash('sha256').update(combinedEntropy).digest();
      const result: FlipChoice = finalHash[0] < 128 ? 'heads' : 'tails';
      console.log(`[Flip/Resolve] Result: ${result} (from SHA256(serverSecret + txSignature))`);
      const won = result === commitment.choice;

      // Calculate payout
      const payout = won ? Math.floor(commitment.bet_amount * FLIP_CONFIG.multiplier) : 0;

      console.log(`[Flip/Resolve] ${commitment.wallet.slice(0, 8)}... ${commitment.choice} → ${result} (${won ? 'WIN' : 'LOSE'})`);
      broadcastLog(`🎰 Flip: ${commitment.wallet.slice(0, 8)}... ${commitment.choice} → ${result} (${won ? `WIN +${payout}` : 'LOSE'})`, true, 'system');

      // Send payout if won
      let payoutTx: string | null = null;
      let payoutPending = false;
      let circuitBreakerReason: string | undefined;

      if (won && payout > 0) {
        const encryptionKey = process.env.BRAIN_WALLET_KEY;
        if (!encryptionKey) {
          // This shouldn't happen since we verified deposit, but handle gracefully
          console.error('[Flip/Resolve] BRAIN_WALLET_KEY not set for payout');
          resolveCommitment(commitmentId, result, won);
          sendJson(res, 200, {
            result,
            won,
            payout,
            depositTx: txSignature,
            serverSecret: commitment.secret,
            commitment: commitment.commitment_hash,
            txSignature: txSignature,
            error: 'Payout transfer pending - contact support',
          });
          return;
        }

        try {
          const gameWallet = loadWallet(encryptionKey);
          const gameWalletBalance = await gameWallet.getBalance(connection);

          // ============ CIRCUIT BREAKER CHECK ============
          // This protects the bankroll from rapid drainage due to bugs or attacks
          const circuitCheck = checkPayoutCircuitBreaker(payout, gameWalletBalance.cc);

          if (!circuitCheck.allowed) {
            // Circuit breaker triggered - don't fail the flip, queue for manual review
            console.log(`[Flip/Resolve] CIRCUIT BREAKER: ${circuitCheck.reason}`);
            broadcastLog(`🚨 Circuit breaker: ${circuitCheck.reason} - payout queued for review`, true, 'system');

            payoutPending = true;
            circuitBreakerReason = circuitCheck.reason;
            // Resolve commitment but mark payout as pending
            resolveCommitment(commitmentId, result, won, undefined);
          } else {
            // Proceed with payout
            const userPubkey = new PublicKey(commitment.wallet);
            const payoutLamports = BigInt(payout * 1_000_000_000); // 9 decimals

            console.log(`[Flip/Resolve] Sending payout: ${payout} $CC to ${commitment.wallet.slice(0, 8)}...`);
            payoutTx = await transferCC(connection, gameWallet, userPubkey, payoutLamports);
            console.log(`[Flip/Resolve] Payout sent: ${payoutTx}`);
            broadcastLog(`🎰 Payout: ${payout} $CC sent to ${commitment.wallet.slice(0, 8)}... (${payoutTx.slice(0, 8)}...)`, true, 'system');

            // Record the payout for circuit breaker tracking
            recordPayout(payoutLamports);
          }
        } catch (error) {
          console.error('[Flip/Resolve] Payout transfer failed:', error);
          // Still resolve the commitment, payout can be claimed later
          resolveCommitment(commitmentId, result, won);
          sendJson(res, 200, {
            result,
            won,
            payout,
            depositTx: txSignature,
            serverSecret: commitment.secret,
            commitment: commitment.commitment_hash,
            txSignature: txSignature,
            error: 'Payout transfer failed - please contact support',
            transferError: (error as Error).message,
          });
          return;
        }
      }

      // Resolve commitment (only if not already resolved by circuit breaker path)
      if (!payoutPending) {
        resolveCommitment(commitmentId, result, won, payoutTx || undefined);
      }

      // Build response with full provably fair verification data
      const response: Record<string, unknown> = {
        result,
        won,
        payout,
        payoutTx,
        depositTx: txSignature,
        // Provably fair verification data - user can verify independently:
        // 1. Check: SHA256(serverSecret) === commitment
        // 2. Compute: SHA256(serverSecret + txSignature)[0] < 128 ? 'heads' : 'tails'
        serverSecret: commitment.secret,
        commitment: commitment.commitment_hash,
        txSignature: txSignature,
        // How to verify
        verification: {
          step1: 'Verify SHA256(serverSecret) === commitment',
          step2: 'Compute SHA256(serverSecret + txSignature)',
          step3: 'Result = firstByte < 128 ? heads : tails',
        },
        message: won ? `You won! ${payout} $CC sent to your wallet.` : `You lost. Better luck next time!`,
      };

      // Add circuit breaker info if payout is pending
      if (payoutPending) {
        response.payoutPending = true;
        response.circuitBreakerReason = circuitBreakerReason;
        response.message = `You won! Payout of ${payout} $CC is pending manual review (safety limit reached).`;
      }

      sendJson(res, 200, response);
    } catch (error) {
      console.error('[Flip/Resolve] Error:', error);
      sendJson(res, 500, { error: (error as Error).message });
    }
    return;
  }

  /**
   * GET /flip/status/:id - Check commitment status
   */
  if (url.startsWith('/flip/status/') && method === 'GET') {
    const commitmentId = url.split('/flip/status/')[1];
    if (!commitmentId) {
      sendJson(res, 400, { error: 'Missing commitment ID' });
      return;
    }

    const commitment = getFlipCommitment(commitmentId);
    if (!commitment) {
      sendJson(res, 404, { error: 'Commitment not found' });
      return;
    }

    // Build status response with commit-reveal data
    sendJson(res, 200, {
      id: commitment.id,
      status: commitment.status,
      wallet: commitment.wallet,
      bet: commitment.bet_amount,
      choice: commitment.choice,
      expiresAt: commitment.expires_at,
      expired: commitment.expires_at < Date.now(),
      result: commitment.status === 'resolved' ? commitment.result : undefined,
      won: commitment.status === 'resolved' ? commitment.won === 1 : undefined,
      depositTx: commitment.deposit_tx,
      payoutTx: commitment.payout_tx,
      commitment: commitment.commitment_hash,
      // Only reveal secret after resolution (commit-reveal pattern)
      secret: commitment.status === 'resolved' ? commitment.secret : undefined,
    });
    return;
  }

  /**
   * POST /flip/cancel - Cancel a pending commitment
   * Allows user to start fresh if they abandoned a flip mid-flow
   */
  if (url === '/flip/cancel' && method === 'POST') {
    try {
      const body = await new Promise<string>((resolve) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
      });

      const { wallet, commitmentId } = JSON.parse(body) as {
        wallet?: string;
        commitmentId?: string;
      };

      if (!wallet && !commitmentId) {
        sendJson(res, 400, { error: 'Must provide wallet or commitmentId' });
        return;
      }

      let cancelled = 0;

      if (commitmentId) {
        // Cancel specific commitment
        const commitment = getFlipCommitment(commitmentId);
        if (!commitment) {
          sendJson(res, 404, { error: 'Commitment not found' });
          return;
        }
        if (commitment.status !== 'pending') {
          sendJson(res, 409, { error: `Cannot cancel commitment with status: ${commitment.status}` });
          return;
        }
        expireCommitment(commitmentId);
        cancelled = 1;
      } else if (wallet) {
        // Cancel all pending commitments for wallet
        cancelled = expireWalletCommitments(wallet);
        // Also cancel any that haven't technically expired but are pending
        const stillPending = getPendingCommitmentForWallet(wallet);
        if (stillPending) {
          expireCommitment(stillPending.id);
          cancelled++;
        }
      }

      console.log(`[Flip/Cancel] Cancelled ${cancelled} commitment(s) for ${wallet || commitmentId}`);
      sendJson(res, 200, { success: true, cancelled });
    } catch (error) {
      console.error('[Flip/Cancel] Error:', error);
      sendJson(res, 500, { error: (error as Error).message });
    }
    return;
  }

  /**
   * GET /flip/deposit-address - Get brain wallet ATA for deposits
   */
  if (url === '/flip/deposit-address' && method === 'GET') {
    const depositTo = await getBrainWalletAta();
    if (!depositTo) {
      sendJson(res, 500, { error: 'Server wallet not configured' });
      return;
    }
    sendJson(res, 200, { depositTo });
    return;
  }

  /**
   * GET /flip/stats - Get daily flip stats and circuit breaker status
   */
  if (url === '/flip/stats' && method === 'GET') {
    const stats = getDailyFlipStats();
    const remainingLoss = FLIP_CONFIG.maxDailyLoss - stats.houseLoss;
    const isCircuitBreakerActive = remainingLoss <= 0;

    sendJson(res, 200, {
      today: {
        flips: stats.totalFlips,
        wagered: stats.totalWagered,
        wins: stats.wins,
        losses: stats.losses,
        houseLoss: Math.floor(stats.houseLoss),
        houseProfit: Math.floor(-stats.houseLoss), // Negative loss = profit
      },
      limits: {
        maxBet: FLIP_CONFIG.maxBet,
        minBet: FLIP_CONFIG.minBet,
        maxDailyLoss: FLIP_CONFIG.maxDailyLoss,
        remainingLossCapacity: Math.max(0, Math.floor(remainingLoss)),
      },
      circuitBreaker: {
        active: isCircuitBreakerActive,
        resetsAt: new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString(),
      },
    });
    return;
  }

  // ============ GACHA (PROBABILITY ENGINE) ENDPOINTS ============

  /**
   * POST /gacha/commit - Request gacha pull (Step 1)
   * Returns commitment hash and deposit address
   */
  if (url === '/gacha/commit' && method === 'POST') {
    try {
      const body = await new Promise<string>((resolve) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
      });

      const { wallet, samples } = JSON.parse(body) as {
        wallet: string;
        samples: number;
      };

      // Validate inputs
      if (!wallet || samples === undefined) {
        sendJson(res, 400, { error: 'Missing required fields: wallet, samples' });
        return;
      }

      if (samples < GACHA_CONFIG.minSamples || samples > GACHA_CONFIG.maxSamples) {
        sendJson(res, 400, { error: `Samples must be between ${GACHA_CONFIG.minSamples} and ${GACHA_CONFIG.maxSamples}` });
        return;
      }

      // Validate wallet address
      try {
        new PublicKey(wallet);
      } catch {
        sendJson(res, 400, { error: 'Invalid wallet address' });
        return;
      }

      // Circuit breaker check
      const dailyLoss = getDailyGachaLoss();
      const maxPotentialPayout = samples * GACHA_CONFIG.stakePerSample * 7; // Max is 7x (Legendary)
      if (dailyLoss + maxPotentialPayout > GACHA_CONFIG.maxDailyLoss) {
        console.log(`[Gacha/Commit] CIRCUIT BREAKER: Daily loss ${dailyLoss} + potential ${maxPotentialPayout} > limit ${GACHA_CONFIG.maxDailyLoss}`);
        broadcastLog(`🚨 Gacha circuit breaker triggered`, true, 'system');
        sendJson(res, 503, {
          error: 'Gacha temporarily closed - daily loss limit reached',
          dailyLoss: Math.floor(dailyLoss),
          maxDailyLoss: GACHA_CONFIG.maxDailyLoss,
          resetsAt: new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString(),
        });
        return;
      }

      // Auto-expire old commitments
      expireGachaCommitments(wallet);

      // Check for existing pending commitment
      const existingCommitment = getPendingGachaCommitment(wallet);
      if (existingCommitment) {
        sendJson(res, 409, {
          error: 'You already have a pending gacha commitment',
          commitmentId: existingCommitment.id,
          expiresAt: existingCommitment.expires_at,
          expiresInMs: existingCommitment.expires_at - Date.now(),
        });
        return;
      }

      // Get brain wallet ATA for deposit
      const depositTo = await getBrainWalletAta();
      if (!depositTo) {
        sendJson(res, 500, { error: 'Server wallet not configured' });
        return;
      }

      const feeRecipient = getBrainWalletSolAddress();
      if (!feeRecipient) {
        sendJson(res, 500, { error: 'Server wallet not configured' });
        return;
      }

      // Generate commitment
      const { secret, hash } = generateGachaCommitment();
      const expiresAt = Date.now() + (GACHA_CONFIG.expirySeconds * 1000);
      const stakeAmount = samples * GACHA_CONFIG.stakePerSample;
      const depositAmount = stakeAmount * 1_000_000_000; // 9 decimals

      // Create commitment in database
      const commitmentId = createGachaCommitment(wallet, samples, secret, hash, expiresAt);

      console.log(`[Gacha/Commit] Created: ${commitmentId.slice(0, 8)}... for ${wallet.slice(0, 8)}... (${samples} samples, ${stakeAmount} $CC)`);
      broadcastLog(`🎰 Gacha commit: ${wallet.slice(0, 8)}... (${samples} samples)`, true, 'system');

      sendJson(res, 200, {
        commitmentId,
        commitment: hash,
        depositTo,
        depositAmount,
        samples,
        stakeAmount,
        expiresAt,
        feeRecipient,
        platformFeeLamports: GACHA_CONFIG.platformFeeLamports,
        distribution: GACHA_DISTRIBUTION,
      });
    } catch (error) {
      console.error('[Gacha/Commit] Error:', error);
      sendJson(res, 500, { error: 'Internal server error' });
    }
    return;
  }

  /**
   * POST /gacha/resolve - Submit deposit and get results (Step 2)
   */
  if (url === '/gacha/resolve' && method === 'POST') {
    try {
      const body = await new Promise<string>((resolve) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
      });

      const { commitmentId, txSignature } = JSON.parse(body) as {
        commitmentId: string;
        txSignature: string;
      };

      if (!commitmentId || !txSignature) {
        sendJson(res, 400, { error: 'Missing required fields: commitmentId, txSignature' });
        return;
      }

      // Get commitment
      const commitment = getGachaCommitment(commitmentId);
      if (!commitment) {
        sendJson(res, 404, { error: 'Commitment not found' });
        return;
      }

      if (commitment.status === 'resolved') {
        sendJson(res, 409, {
          error: 'Commitment already resolved',
          results: JSON.parse(commitment.results || '[]'),
          totalPayout: commitment.total_payout,
          payoutTx: commitment.payout_tx,
        });
        return;
      }

      if (commitment.status === 'expired' || commitment.expires_at < Date.now()) {
        sendJson(res, 410, { error: 'Commitment expired' });
        return;
      }

      // Check replay attack
      if (isTxSignatureUsed(txSignature)) {
        sendJson(res, 409, { error: 'Transaction signature already used' });
        return;
      }

      // Verify deposit on-chain
      const expectedAmount = BigInt(commitment.stake_amount * 1_000_000_000);
      const connection = getConnection();

      console.log(`[Gacha/Resolve] Verifying deposit: ${txSignature.slice(0, 16)}...`);
      const verification = await verifyDepositTransaction(
        connection,
        txSignature,
        commitment.wallet,
        expectedAmount
      );

      if (!verification.valid) {
        console.log(`[Gacha/Resolve] Deposit verification failed: ${verification.error}`);
        sendJson(res, 400, {
          error: 'Deposit verification failed',
          details: verification.error,
        });
        return;
      }

      // Mark tx as used
      markTxSignatureUsed(txSignature, commitmentId);
      markGachaDeposited(commitmentId, txSignature);

      // Compute results using provably fair method
      const { tiers, payouts, totalPayout } = computeGachaResults(
        commitment.secret,
        txSignature,
        commitment.sample_count
      );

      console.log(`[Gacha/Resolve] Results: ${tiers.join(', ')} → ${totalPayout} $CC`);
      broadcastLog(`🎰 Gacha: ${commitment.wallet.slice(0, 8)}... → ${tiers.filter(t => t !== 'Basic').length} hits, ${totalPayout} $CC`, true, 'system');

      // Send payout if > 0
      let payoutTx: string | null = null;

      if (totalPayout > 0) {
        const encryptionKey = process.env.BRAIN_WALLET_KEY;
        if (encryptionKey) {
          try {
            const gameWallet = loadWallet(encryptionKey);
            const userPubkey = new PublicKey(commitment.wallet);

            console.log(`[Gacha/Resolve] Sending payout: ${totalPayout} $CC to ${commitment.wallet.slice(0, 8)}...`);
            payoutTx = await transferCC(
              connection,
              gameWallet,
              userPubkey,
              BigInt(totalPayout * 1_000_000_000)
            );
            console.log(`[Gacha/Resolve] Payout sent: ${payoutTx}`);

            // Record payout for stats
            recordPayout(BigInt(totalPayout * 1_000_000_000));
          } catch (error) {
            console.error(`[Gacha/Resolve] Payout failed:`, error);
            // Continue - we'll mark as resolved but note payout failed
          }
        }
      }

      // Resolve commitment
      resolveGachaCommitment(commitmentId, tiers, totalPayout, payoutTx);

      sendJson(res, 200, {
        results: tiers,
        payouts,
        totalPayout,
        stakeAmount: commitment.stake_amount,
        netProfit: totalPayout - commitment.stake_amount,
        depositTx: txSignature,
        payoutTx,
        serverSecret: commitment.secret,
        commitment: commitment.commitment_hash,
      });
    } catch (error) {
      console.error('[Gacha/Resolve] Error:', error);
      sendJson(res, 500, { error: 'Internal server error' });
    }
    return;
  }

  /**
   * GET /gacha/stats - Get daily gacha statistics
   */
  if (url === '/gacha/stats' && method === 'GET') {
    const stats = getDailyGachaStats();
    const remainingLoss = GACHA_CONFIG.maxDailyLoss - Math.max(0, stats.totalPaidOut - stats.totalStaked);
    const isCircuitBreakerActive = remainingLoss <= 0;

    sendJson(res, 200, {
      today: {
        samples: stats.totalSamples,
        staked: stats.totalStaked,
        paidOut: stats.totalPaidOut,
        houseProfit: stats.netProfit,
      },
      limits: {
        stakePerSample: GACHA_CONFIG.stakePerSample,
        maxSamples: GACHA_CONFIG.maxSamples,
        maxDailyLoss: GACHA_CONFIG.maxDailyLoss,
        remainingLossCapacity: Math.max(0, Math.floor(remainingLoss)),
      },
      distribution: GACHA_DISTRIBUTION,
      circuitBreaker: {
        active: isCircuitBreakerActive,
        resetsAt: new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString(),
      },
    });
    return;
  }

  // ============ BUYBACK & BURN ENDPOINTS ============

  /**
   * GET /buyback/stats - Get buyback & burn statistics
   */
  if (url === '/buyback/stats' && method === 'GET') {
    const stats = getBuybackStats();
    const check = await shouldRunBuyback();

    sendJson(res, 200, {
      stats: {
        totalBuybacks: stats.totalBuybacks,
        totalSolSpent: stats.totalSolSpent,
        totalCcBought: stats.totalCcBought,
        totalCcBurned: stats.totalCcBurned,
        lastBuyback: stats.lastBuyback,
      },
      nextBuyback: {
        ready: check.should,
        reason: check.reason,
        availableSol: check.availableSol,
      },
      config: {
        platformFeeLamports: FLIP_CONFIG.platformFeeLamports,
        platformFeeUsd: '$0.05 (approximate)',
      },
    });
    return;
  }

  /**
   * GET /fees/balances - Get accumulated swap terminal fee balances
   */
  if (url === '/fees/balances' && method === 'GET') {
    const balances = await getSwapFeeBalances();
    sendJson(res, 200, {
      ccFees: {
        amount: balances.ccFees,
        note: balances.ccFeesNote,
      },
      solFees: {
        amount: balances.solFees,
        minimumForBuyback: 0.1,
        readyForBuyback: balances.solFees >= 0.1,
      },
      error: balances.error,
      explanation: {
        ccFees: 'CC fees from BUY transactions go to the same ATA as bankroll. They become house profit, not burned.',
        solFees: 'SOL fees from SELL transactions accumulate separately. When >= 0.1 SOL, they get swapped to CC and burned.',
      },
    });
    return;
  }

  /**
   * POST /fees/process - Process all accumulated swap terminal fees (CC + SOL)
   * Body: { dryRun?: boolean } - Set to true for simulation mode
   */
  if (url === '/fees/process' && method === 'POST') {
    // Parse optional body
    const body = await new Promise<string>((resolve) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => resolve(data));
    });
    let dryRun = false;
    try {
      const parsed = JSON.parse(body || '{}');
      dryRun = parsed.dryRun === true;
    } catch {
      // No body or invalid JSON
    }

    if (dryRun) {
      console.log('[Fee Processing] DRY RUN MODE');
      broadcastLog('🧪 Dry run fee processing triggered', true, 'system');
    } else {
      console.log('[Fee Processing] Manual trigger requested');
      broadcastLog('🔥 Manual fee processing triggered', true, 'system');
    }

    const result = await processAllSwapFees(dryRun);

    if (result.success) {
      if (result.totalCcBurned > 0) {
        broadcastLog(`🔥 Fee processing complete: ${result.totalCcBurned.toFixed(0)} $CC burned total`, true, 'system');
      }
      sendJson(res, 200, result);
    } else {
      broadcastLog(`⚠️ Fee processing failed: ${result.errors.join(', ')}`, true, 'system');
      sendJson(res, 500, result);
    }
    return;
  }

  /**
   * POST /fees/create-wsol-ata - Create wSOL ATA for collecting sell fees
   * This is needed before sells can have platform fees
   */
  if (url === '/fees/create-wsol-ata' && method === 'POST') {
    console.log('[Fees] Creating wSOL ATA for sell fee collection...');
    broadcastLog('💰 Creating wSOL ATA for sell fee collection...', true, 'system');

    try {
      const ata = await ensureBrainWsolAta();
      if (ata) {
        broadcastLog(`💰 wSOL ATA created/verified: ${ata}`, true, 'system');
        sendJson(res, 200, {
          success: true,
          wsolAta: ata,
          message: 'wSOL ATA created successfully. Sell fees can now be collected.',
        });
      } else {
        sendJson(res, 500, { success: false, error: 'Failed to create wSOL ATA' });
      }
    } catch (error) {
      console.error('[Fees] Failed to create wSOL ATA:', error);
      sendJson(res, 500, { success: false, error: (error as Error).message });
    }
    return;
  }

  /**
   * POST /buyback/trigger - Manually trigger buyback & burn
   * Body: { testAmount?: number } - Optional SOL amount for testing (bypasses min threshold)
   */
  if (url === '/buyback/trigger' && method === 'POST') {
    // Parse optional body
    const body = await new Promise<string>((resolve) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => resolve(data));
    });
    let testAmount: number | undefined;
    let dryRun = false;
    try {
      const parsed = JSON.parse(body || '{}');
      testAmount = parsed.testAmount;
      dryRun = parsed.dryRun === true;
    } catch {
      // No body or invalid JSON, proceed without testAmount
    }

    if (dryRun) {
      console.log(`[Buyback] DRY RUN MODE${testAmount ? `: ${testAmount} SOL` : ''}`);
      broadcastLog(`🧪 Dry run buyback triggered${testAmount ? `: ${testAmount} SOL` : ''}`, true, 'system');
    } else if (testAmount) {
      console.log(`[Buyback] TEST MODE: ${testAmount} SOL`);
      broadcastLog(`🧪 Test buyback triggered: ${testAmount} SOL`, true, 'system');
    } else {
      console.log('[Buyback] Manual trigger requested');
      broadcastLog('🔥 Manual buyback & burn triggered', true, 'system');

      const check = await shouldRunBuyback();
      if (!check.should) {
        sendJson(res, 400, {
          error: 'Cannot run buyback',
          reason: check.reason,
          availableSol: check.availableSol,
        });
        return;
      }
    }

    const result = await executeBuybackAndBurn(testAmount, dryRun);
    if (result.success) {
      const airlockMsg = result.usedAirlock ? ' (airlock)' : ' (direct)';
      broadcastLog(`🔥 Buyback complete${airlockMsg}: ${result.solSpent?.toFixed(4)} SOL → ${result.ccBought?.toFixed(0)} $CC burned!`, true, 'system');
      sendJson(res, 200, result);
    } else {
      broadcastLog(`⚠️ Buyback failed: ${result.error}`, true, 'system');
      sendJson(res, 500, result);
    }
    return;
  }

  // ============ BURN WALLET (AIRLOCK) ENDPOINTS ============

  /**
   * GET /burn-wallet/status - Get burn wallet status
   * The burn wallet is a dedicated wallet used ONLY for burn operations (safety airlock)
   */
  if (url === '/burn-wallet/status' && method === 'GET') {
    const exists = burnWalletExists();
    if (!exists) {
      sendJson(res, 200, {
        exists: false,
        message: 'Burn wallet not created yet. Use POST /burn-wallet/create to create it.',
        safety: 'Without a burn wallet, buyback uses direct burn (less safe).',
      });
      return;
    }

    const state = getBurnWalletState();
    if (!state) {
      sendJson(res, 500, { error: 'Failed to get burn wallet state' });
      return;
    }

    // Get live balance from chain
    const encryptionKey = process.env.BRAIN_WALLET_KEY;
    let liveBalance = { sol: 0, cc: 0 };
    if (encryptionKey) {
      try {
        const connection = getConnection();
        const burnWallet = loadBurnWallet(encryptionKey);
        const balance = await burnWallet.getBalance(connection);
        liveBalance = { sol: balance.sol, cc: balance.cc };
      } catch (error) {
        console.error('[Burn Wallet] Failed to get live balance:', error);
      }
    }

    sendJson(res, 200, {
      exists: true,
      publicKey: state.publicKey,
      isEmpty: liveBalance.cc === 0,
      balance: {
        cc: liveBalance.cc,
        sol: liveBalance.sol,
      },
      cached: {
        cc: state.ccBalance,
        sol: state.solBalance,
        lastSync: state.lastSync,
      },
      safety: 'This wallet acts as an airlock for burn operations. It should always be empty except during buyback.',
    });
    return;
  }

  // ============ REWARDS WALLET (COLD STORAGE) ENDPOINTS ============

  /**
   * GET /rewards/status - Get rewards wallet status and limits
   * The rewards wallet is cold storage (9M $CC) - never used by games directly
   */
  if (url === '/rewards/status' && method === 'GET') {
    const exists = rewardsWalletExists();
    if (!exists) {
      sendJson(res, 200, {
        exists: false,
        message: 'Rewards wallet not created yet. Use POST /rewards/create to create it.',
        safety: 'Without a rewards wallet, the game wallet has no backup funding source.',
      });
      return;
    }

    const state = getRewardsWalletState();
    if (!state) {
      sendJson(res, 500, { error: 'Failed to get rewards wallet state' });
      return;
    }

    // Get live balance from chain
    const encryptionKey = process.env.BRAIN_WALLET_KEY;
    let liveBalance = { sol: 0, cc: 0 };
    if (encryptionKey) {
      try {
        const connection = getConnection();
        const rewardsWallet = loadRewardsWallet(encryptionKey);
        const balance = await rewardsWallet.getBalance(connection);
        liveBalance = { sol: balance.sol, cc: balance.cc };
      } catch (error) {
        console.error('[Rewards Wallet] Failed to get live balance:', error);
      }
    }

    sendJson(res, 200, {
      exists: true,
      publicKey: state.publicKey,
      balance: {
        cc: liveBalance.cc,
        sol: liveBalance.sol,
      },
      cached: {
        cc: state.ccBalance,
        sol: state.solBalance,
        totalDistributed: state.totalDistributed,
        lastSync: state.lastSync,
      },
      limits: REWARDS_LIMITS,
      safety: 'Cold storage wallet - never used by games directly. Only tops up game wallet.',
    });
    return;
  }

  /**
   * POST /rewards/create - Create the rewards wallet (one-time)
   * This wallet holds 9M $CC as cold storage backup
   */
  if (url === '/rewards/create' && method === 'POST') {
    const encryptionKey = process.env.BRAIN_WALLET_KEY;
    if (!encryptionKey) {
      sendJson(res, 500, { error: 'BRAIN_WALLET_KEY not configured' });
      return;
    }

    if (rewardsWalletExists()) {
      const state = getRewardsWalletState();
      sendJson(res, 409, {
        error: 'Rewards wallet already exists',
        publicKey: state?.publicKey,
        message: 'The rewards wallet can only be created once.',
      });
      return;
    }

    try {
      console.log('[Rewards Wallet] Creating cold storage wallet...');
      broadcastLog('❄️ Creating rewards wallet (cold storage)...', true, 'system');

      const result = createRewardsWallet(encryptionKey);

      // Also create the ATA for $CC
      console.log('[Rewards Wallet] Ensuring rewards wallet has ATA for $CC...');
      const ata = await ensureRewardsWalletAta();

      console.log(`[Rewards Wallet] ✓ Rewards wallet created: ${result.publicKey}`);
      broadcastLog(`❄️ Rewards wallet created: ${result.publicKey}`, true, 'system');

      sendJson(res, 200, {
        success: true,
        publicKey: result.publicKey,
        ata,
        message: 'Rewards wallet created successfully. Fund this wallet with 9M $CC as cold storage.',
        nextSteps: [
          '1. Send 9M $CC to this wallet address',
          '2. The daily cron will automatically top up game wallet when needed',
          '3. Max 1M $CC/day can be transferred to game wallet',
        ],
      });
    } catch (error) {
      console.error('[Rewards Wallet] Failed to create:', error);
      sendJson(res, 500, { error: (error as Error).message });
    }
    return;
  }

  /**
   * POST /rewards/import - Import an existing rewards wallet from secret key
   */
  if (url === '/rewards/import' && method === 'POST') {
    const encryptionKey = process.env.BRAIN_WALLET_KEY;
    if (!encryptionKey) {
      sendJson(res, 500, { error: 'BRAIN_WALLET_KEY not configured' });
      return;
    }

    try {
      const body = await new Promise<string>((resolve) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
      });

      const { secretKey } = JSON.parse(body) as { secretKey: string };
      if (!secretKey) {
        sendJson(res, 400, { error: 'Missing secretKey in request body' });
        return;
      }

      console.log('[Rewards Wallet] Importing existing wallet...');
      const result = importRewardsWallet(secretKey, encryptionKey);

      // Also create the ATA for $CC
      const ata = await ensureRewardsWalletAta();

      console.log(`[Rewards Wallet] ✓ Rewards wallet imported: ${result.publicKey}`);
      broadcastLog(`❄️ Rewards wallet imported: ${result.publicKey}`, true, 'system');

      sendJson(res, 200, {
        success: true,
        publicKey: result.publicKey,
        ata,
        message: 'Rewards wallet imported successfully.',
      });
    } catch (error) {
      console.error('[Rewards Wallet] Failed to import:', error);
      sendJson(res, 500, { error: (error as Error).message });
    }
    return;
  }

  /**
   * POST /rewards/fund-sol - Transfer SOL from game wallet to rewards wallet
   * Used to fund the rewards wallet for transaction fees
   */
  if (url === '/rewards/fund-sol' && method === 'POST') {
    const encryptionKey = process.env.BRAIN_WALLET_KEY;
    if (!encryptionKey) {
      sendJson(res, 500, { error: 'BRAIN_WALLET_KEY not configured' });
      return;
    }

    if (!rewardsWalletExists()) {
      sendJson(res, 400, { error: 'Rewards wallet not created yet. Use POST /rewards/create first.' });
      return;
    }

    // Parse body for amount
    let lamports = 50_000_000; // Default: 0.05 SOL
    try {
      const body = await new Promise<string>((resolve) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
      });
      if (body) {
        const parsed = JSON.parse(body);
        if (parsed.lamports) {
          lamports = parsed.lamports;
        } else if (parsed.sol) {
          lamports = Math.floor(parsed.sol * 1_000_000_000); // Convert SOL to lamports
        }
      }
    } catch {
      // Use default amount
    }

    // Safety: Max 0.5 SOL per transfer
    const MAX_SOL_TRANSFER = 500_000_000; // 0.5 SOL
    if (lamports > MAX_SOL_TRANSFER) {
      sendJson(res, 400, {
        error: `Amount exceeds safety limit. Max: 0.5 SOL (${MAX_SOL_TRANSFER} lamports)`,
        requested: lamports,
        max: MAX_SOL_TRANSFER,
      });
      return;
    }

    try {
      const connection = getConnection();
      const gameWallet = loadWallet(encryptionKey);
      const rewardsWallet = loadRewardsWallet(encryptionKey);

      // Check game wallet has enough SOL
      const gameBalance = await gameWallet.getBalance(connection);
      if (gameBalance.solLamports < BigInt(lamports) + BigInt(10_000)) { // +10000 for tx fee
        sendJson(res, 400, {
          error: 'Insufficient SOL in game wallet',
          available: Number(gameBalance.solLamports),
          requested: lamports,
        });
        return;
      }

      console.log(`[Rewards/FundSOL] Transferring ${lamports / 1_000_000_000} SOL from game to rewards wallet`);
      broadcastLog(`💰 Funding rewards wallet with ${lamports / 1_000_000_000} SOL...`, true, 'system');

      const { transferSOL } = await import('./solana.js');
      const txSignature = await transferSOL(connection, gameWallet, rewardsWallet.publicKey, lamports);

      console.log(`[Rewards/FundSOL] ✓ Transfer complete: ${txSignature}`);
      broadcastLog(`💰 Rewards wallet funded: ${lamports / 1_000_000_000} SOL (${txSignature.slice(0, 8)}...)`, true, 'system');

      sendJson(res, 200, {
        success: true,
        lamports,
        sol: lamports / 1_000_000_000,
        from: gameWallet.publicKey.toBase58(),
        to: rewardsWallet.publicKey.toBase58(),
        txSignature,
      });
    } catch (error) {
      console.error('[Rewards/FundSOL] Error:', error);
      sendJson(res, 500, { error: (error as Error).message });
    }
    return;
  }

  /**
   * POST /rewards/top-up - Manually trigger top-up from rewards to game wallet
   */
  if (url === '/rewards/top-up' && method === 'POST') {
    // Parse optional body for custom amount
    let customAmount: number | undefined;
    try {
      const body = await new Promise<string>((resolve) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
      });
      if (body) {
        const parsed = JSON.parse(body);
        customAmount = parsed.amount;
      }
    } catch {
      // No body or invalid JSON, use auto-calculated amount
    }

    console.log('[Rewards] Manual top-up requested');
    broadcastLog('❄️ Manual top-up from rewards → game wallet...', true, 'system');

    const result = await topUpGameWallet(customAmount);

    if (result.success) {
      broadcastLog(`❄️ Top-up complete: ${result.transferred?.toLocaleString()} $CC transferred`, true, 'system');
      sendJson(res, 200, result);
    } else {
      broadcastLog(`⚠️ Top-up failed: ${result.reason}`, true, 'system');
      sendJson(res, 400, result);
    }
    return;
  }

  // ============ GAME WALLET (HOT WALLET) ENDPOINTS ============

  /**
   * GET /game-wallet/status - Get game wallet status and daily stats
   * The game wallet handles all payouts with strict limits
   */
  if (url === '/game-wallet/status' && method === 'GET') {
    const encryptionKey = process.env.BRAIN_WALLET_KEY;
    if (!encryptionKey) {
      sendJson(res, 500, { error: 'BRAIN_WALLET_KEY not configured' });
      return;
    }

    try {
      const connection = getConnection();
      const gameWallet = loadWallet(encryptionKey);
      const balance = await gameWallet.getBalance(connection);
      const topUpCheck = await checkTopUpNeeded();
      const dailyStats = getDailyFlipStats();

      sendJson(res, 200, {
        publicKey: gameWallet.publicKey.toBase58(),
        balance: {
          cc: balance.cc,
          sol: balance.sol,
        },
        topUp: {
          needed: topUpCheck.needed,
          currentBalance: topUpCheck.currentBalance,
          targetBalance: topUpCheck.targetBalance,
          topUpAmount: topUpCheck.topUpAmount,
        },
        dailyStats: {
          flips: dailyStats.totalFlips,
          wagered: dailyStats.totalWagered,
          houseLoss: dailyStats.houseLoss,
          wins: dailyStats.wins,
          losses: dailyStats.losses,
        },
        limits: GAME_LIMITS,
        safety: 'Hot wallet for game payouts. Max 100K per payout, 500K/day total.',
      });
    } catch (error) {
      sendJson(res, 500, { error: (error as Error).message });
    }
    return;
  }

  /**
   * GET /limits - Get all system limits
   */
  if (url === '/limits' && method === 'GET') {
    sendJson(res, 200, getAllLimits());
    return;
  }

  /**
   * GET /wallet-system/status - Get full 3-wallet system status
   */
  if (url === '/wallet-system/status' && method === 'GET') {
    const status = await getWalletSystemStatus();
    sendJson(res, 200, status);
    return;
  }

  /**
   * POST /burn-wallet/create - Create the burn wallet (one-time)
   * This wallet is used ONLY for burn operations (safety airlock pattern)
   */
  if (url === '/burn-wallet/create' && method === 'POST') {
    const encryptionKey = process.env.BRAIN_WALLET_KEY;
    if (!encryptionKey) {
      sendJson(res, 500, { error: 'BRAIN_WALLET_KEY not configured' });
      return;
    }

    if (burnWalletExists()) {
      const state = getBurnWalletState();
      sendJson(res, 409, {
        error: 'Burn wallet already exists',
        publicKey: state?.publicKey,
        message: 'The burn wallet can only be created once.',
      });
      return;
    }

    try {
      console.log('[Burn Wallet] Creating dedicated burn wallet...');
      broadcastLog('🔥 Creating dedicated burn wallet (safety airlock)...', true, 'system');

      const result = createBurnWallet(encryptionKey);

      // Also create the ATA for $CC
      console.log('[Burn Wallet] Ensuring burn wallet has ATA for $CC...');
      const ata = await ensureBurnWalletAta();

      console.log(`[Burn Wallet] ✓ Burn wallet created: ${result.publicKey}`);
      broadcastLog(`🔥 Burn wallet created: ${result.publicKey}`, true, 'system');

      sendJson(res, 200, {
        success: true,
        publicKey: result.publicKey,
        ata,
        message: 'Burn wallet created successfully. Buyback will now use the airlock pattern.',
        safety: 'This wallet acts as an airlock - even if code has a bug that burns "entire balance", only the burn wallet is affected, not the main rewards pool.',
      });
    } catch (error) {
      console.error('[Burn Wallet] Failed to create:', error);
      sendJson(res, 500, { error: (error as Error).message });
    }
    return;
  }

  // 404
  sendJson(res, 404, { error: 'Not found' });
}

// ============ Cron Jobs ============

/**
 * Daily Experiment handler - starts one blockchain experiment per day
 * Runs at 9:00 AM UTC (peak dev Twitter hours)
 */
async function handleDailyExperiment(): Promise<void> {
  try {
    // Skip if there's already an active experiment
    const active = getActiveCycle();
    if (active) {
      console.log('[Daily Experiment] Skipping: Experiment already in progress');
      return;
    }

    // Check if we can ship more today
    if (!canShipMore()) {
      console.log('[Daily Experiment] Skipping: Daily limit reached');
      return;
    }

    // Check if cooldown has elapsed
    const cooldownMs = getTimeUntilNextAllowed();
    if (cooldownMs > 0) {
      console.log(`[Daily Experiment] Skipping: On cooldown (${Math.round(cooldownMs / 3600000)}h remaining)`);
      return;
    }

    // Check wallet health before starting
    const encryptionKey = process.env.BRAIN_WALLET_KEY;
    if (encryptionKey) {
      const topUpCheck = await checkTopUpNeeded();
      if (topUpCheck.needed) {
        console.log('[Daily Experiment] Game wallet low, triggering top-up first...');
        broadcastLog('❄️ Pre-experiment: Topping up game wallet...', true, 'system');
        const topUpResult = await topUpGameWallet();
        if (!topUpResult.success) {
          console.log(`[Daily Experiment] Warning: Top-up failed: ${topUpResult.reason}`);
        }
      }
    }

    // All checks passed - start the daily experiment!
    console.log('\n🔬 [Daily Experiment] Starting daily blockchain experiment...');
    broadcastLog('🔬 Daily experiment starting - 9:00 AM UTC trigger', true, 'build');

    // Pause grind loop during build
    pauseGrindLoop();

    const result = await startExperiment();

    if (result && result.deployUrl) {
      console.log(`[Daily Experiment] ✓ Deployed: ${result.plan.experiment.slug}`);
    } else {
      console.log(`[Daily Experiment] ✗ Could not start (cooldown or other issue)`);
    }

    // Resume grind loop after build
    resumeGrindLoop();
  } catch (error) {
    console.error('[Daily Experiment] Error:', error);
    // Resume grind loop even after error
    resumeGrindLoop();
  }
}

function setupCronJobs(): void {
  console.log('Setting up cron jobs (Brain 2.0 Crypto Lab)...');

  // Daily Experiment: 21:00 UTC (4 PM EST) - peak US afternoon hours
  // This is the main driver of Brain 2.0 - one high-quality experiment per day
  cron.schedule('0 21 * * *', handleDailyExperiment);
  console.log('  ✓ Daily Experiment: 21:00 UTC (4 PM EST)');

  // Cleanup expired flip commitments every minute
  cron.schedule('* * * * *', () => {
    const expired = cleanupExpiredCommitments();
    if (expired > 0) {
      console.log(`[Flip Cleanup] Expired ${expired} commitment(s)`);
    }
  });
  console.log('  ✓ Flip Commitment Cleanup: every minute');

  // Fee Processing & Burn: Every 6 hours - process all swap terminal fees
  // Handles BOTH CC fees (from buys) and SOL fees (from sells)
  cron.schedule('0 */6 * * *', async () => {
    console.log('[Fee Processing] Starting scheduled fee processing...');
    broadcastLog('🔥 Processing swap terminal fees...', true, 'system');

    const result = await processAllSwapFees();

    if (result.success) {
      const ccBurned = result.ccFees.ccBurned || 0;
      const solBurned = result.solFees.ccBurned || 0;
      const total = result.totalCcBurned;

      if (total > 0) {
        broadcastLog(`🔥 Fee processing complete! Total burned: ${total.toFixed(0)} $CC`, true, 'system');
        if (ccBurned > 0) {
          broadcastLog(`   └─ CC fees (buys): ${ccBurned.toFixed(0)} $CC burned`, true, 'system');
        }
        if (solBurned > 0) {
          broadcastLog(`   └─ SOL fees (sells): ${result.solFees.solSpent?.toFixed(4)} SOL → ${solBurned.toFixed(0)} $CC burned`, true, 'system');
        }
      } else {
        console.log('[Fee Processing] No fees to process this cycle');
      }
    } else {
      broadcastLog(`⚠️ Fee processing had errors: ${result.errors.join(', ')}`, true, 'system');
    }
  });
  console.log('  ✓ Fee Processing & Burn: every 6 hours (CC + SOL fees)');

  // Daily Top-Up: Midnight UTC - top up game wallet from rewards wallet if needed
  cron.schedule('0 0 * * *', async () => {
    console.log('[Top-Up] Daily check: Does game wallet need top-up from rewards?');

    // Check if rewards wallet exists
    if (!rewardsWalletExists()) {
      console.log('[Top-Up] Skipping: Rewards wallet not created yet');
      return;
    }

    const topUpCheck = await checkTopUpNeeded();
    if (!topUpCheck.needed) {
      console.log(`[Top-Up] Skipping: ${topUpCheck.reason}`);
      return;
    }

    console.log(`[Top-Up] Starting: Game wallet at ${topUpCheck.currentBalance.toLocaleString()} $CC (below ${REWARDS_LIMITS.gameWalletLowThreshold.toLocaleString()} threshold)`);
    broadcastLog(`❄️ Daily top-up: Game wallet low, topping up from rewards...`, true, 'system');

    const result = await topUpGameWallet();
    if (result.success) {
      console.log(`[Top-Up] Complete: ${result.transferred?.toLocaleString()} $CC transferred`);
      broadcastLog(`❄️ Top-up complete: ${result.transferred?.toLocaleString()} $CC transferred from cold storage`, true, 'system');
    } else {
      console.log(`[Top-Up] Failed: ${result.reason}`);
      broadcastLog(`⚠️ Top-up failed: ${result.reason}`, true, 'system');
    }
  });
  console.log('  ✓ Daily Top-Up: midnight UTC (rewards → game wallet)');

  // ============ UNIFIED TWEET SYSTEM CRONS ============

  // Tweet Poster: Every 30 minutes - post next due tweet
  cron.schedule('*/30 * * * *', async () => {
    // Cleanup old tweets first
    const cleaned = cleanupOldUnifiedTweets();
    if (cleaned > 0) {
      console.log(`[Tweet Poster] Cleaned up ${cleaned} overdue tweet(s)`);
    }

    // Post next due tweet
    const posted = await postNextDueTweet();
    if (posted) {
      broadcastLog('📝 Scheduled tweet posted', true, 'system');
    }
  });
  console.log('  ✓ Tweet Poster: every 30 minutes');

  // Tweet Drafter: Every 4 hours (during idle) - fill queue if < 5 pending
  cron.schedule('0 */4 * * *', async () => {
    // Skip if experiment is running
    const active = getActiveCycle();
    if (active) {
      console.log('[Tweet Drafter] Skipping: Experiment in progress');
      return;
    }

    const pendingCount = getPendingTweetCount();
    if (pendingCount >= 5) {
      console.log(`[Tweet Drafter] Queue has ${pendingCount} tweets, no drafting needed`);
      return;
    }

    console.log(`[Tweet Drafter] Queue low (${pendingCount}), drafting new tweets...`);
    broadcastLog(`📝 Queue low (${pendingCount}), drafting new tweets...`, true, 'system');

    const drafted = await fillTweetQueue(5);
    if (drafted > 0) {
      broadcastLog(`📝 Drafted ${drafted} new tweet(s), queue now has ${getPendingTweetCount()}`, true, 'system');
    }
  });
  console.log('  ✓ Tweet Drafter: every 4 hours (when idle, if queue < 5)');
}

// ============ Main ============

async function main(): Promise<void> {
  console.log(BANNER);

  // Register shutdown handlers for process cleanup
  registerShutdownHandlers();
  console.log('✓ Shutdown handlers registered');

  // Database is initialized on import (see db.ts)
  console.log('✓ Database ready');

  // Cleanup any incomplete cycles from previous crashes
  const cleanup = cleanupOnStartup();
  if (cleanup.cancelled > 0 || cleanup.expired > 0) {
    console.log(`✓ Cleanup: ${cleanup.cancelled} cancelled, ${cleanup.expired} expired cycles cleaned`);
  }

  // Cleanup old scheduled tweets that are more than 1 hour overdue
  const skippedTweets = cleanupOldScheduledTweets();
  if (skippedTweets > 0) {
    console.log(`✓ Skipped ${skippedTweets} old video tweet(s) that were >1 hour overdue`);
  }

  // Cleanup old unified tweets
  const skippedUnifiedTweets = cleanupOldUnifiedTweets();
  if (skippedUnifiedTweets > 0) {
    console.log(`✓ Skipped ${skippedUnifiedTweets} old unified tweet(s) that were >1 hour overdue`);
  }

  // Log queue status
  const queueSize = getPendingTweetCount();
  console.log(`✓ Tweet queue: ${queueSize} pending tweet(s)`);

  // Cleanup old build logs (older than 7 days)
  const deletedLogs = cleanupOldBuildLogs(7);
  if (deletedLogs > 0) {
    console.log(`✓ Cleaned up ${deletedLogs} old build log(s) (>7 days old)`);
  }

  // Kill any orphaned processes from previous crashes (PIDs from database)
  if (cleanup.pidsToKill.length > 0) {
    console.log(`  Killing ${cleanup.pidsToKill.length} orphaned Claude processes from database...`);
    for (const pid of cleanup.pidsToKill) {
      try {
        await killProcess(pid);
        console.log(`    ✓ Killed PID ${pid}`);
      } catch {
        console.log(`    - PID ${pid} already dead`);
      }
    }
  }

  // Also clean up any Claude/Chrome processes not in database (from hard crashes)
  console.log('  Scanning for orphaned processes...');
  const orphanCleanup = await cleanupOrphanedProcesses();
  if (orphanCleanup.claude > 0 || orphanCleanup.chrome > 0) {
    console.log(`    ✓ Killed ${orphanCleanup.claude} orphaned Claude, ${orphanCleanup.chrome} orphaned Chrome processes`);
  } else {
    console.log('    ✓ No orphaned processes found');
  }

  // Seed initial features to prevent duplicates
  const seeded = seedInitialFeatures();
  const totalFeatures = getAllShippedFeatures().length;
  if (seeded > 0) {
    console.log(`✓ Seeded ${seeded} initial features (${totalFeatures} total in database)`);
  } else {
    console.log(`✓ Features database ready (${totalFeatures} features tracked)`);
  }

  // Set up cron schedules
  setupCronJobs();

  // Create HTTP server
  const server = createServer((req, res) => {
    handleRequest(req, res).catch((error) => {
      console.error('[HTTP] Error:', error);
      sendJson(res, 500, { error: 'Internal server error' });
    });
  });

  // Create WebSocket server
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Heartbeat to keep connections alive through Cloudflare tunnel
  const heartbeatInterval = setInterval(() => {
    for (const client of wsClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.ping();
      }
    }
  }, 30000); // Ping every 30 seconds

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  wss.on('connection', (ws) => {
    console.log('[WS] Client connected');
    wsClients.add(ws);

    // Mark connection as alive
    (ws as WebSocket & { isAlive: boolean }).isAlive = true;

    ws.on('pong', () => {
      (ws as WebSocket & { isAlive: boolean }).isAlive = true;
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to Central Brain',
      timestamp: Date.now(),
    }));

    ws.on('close', () => {
      console.log('[WS] Client disconnected');
      wsClients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('[WS] Error:', error);
      wsClients.delete(ws);
    });
  });

  // Start server
  server.listen(PORT, () => {
    console.log(`✓ HTTP server running on port ${PORT}`);
    console.log(`✓ WebSocket server running on ws://localhost:${PORT}/ws`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Crypto Lab v2.0 is now running');
  console.log(`  Start experiment: curl -X POST http://localhost:${PORT}/experiment`);
  console.log(`  Watch logs:       ws://localhost:${PORT}/ws`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Log startup to database (so /watch page has something to show)
  const startupHumor = getHumor('startup');
  broadcastLog(`🔬 Crypto Lab v2.0 started - ${startupHumor}`);

  // Start the Idle Grind Loop - the dev that never sleeps
  // Only runs when not building, emits thoughts every 15-90 seconds
  console.log('Starting Idle Grind Loop...');
  startGrindLoop(broadcastLog);
  console.log('✓ Idle Grind Loop active');

  // Start the Token Monitor - reacts to $CC buys/sells in chat
  console.log('Starting Token Monitor...');
  startTokenMonitor(broadcastLog);
  console.log('✓ Token Monitor active');
}

// Graceful shutdown
function shutdown(): void {
  console.log('\nShutting down Central Brain...');

  // Stop the grind loop
  stopGrindLoop();

  // Stop the token monitor
  stopTokenMonitor();

  // Close all WebSocket connections
  for (const client of wsClients) {
    client.close();
  }
  wsClients.clear();

  db.close();
  console.log('Goodbye!');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the brain
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
