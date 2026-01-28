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
  getAllShippedFeatures,
  getActiveCycle,
  insertBuildLog,
  getRecentBuildLogs,
  cleanupOldBuildLogs,
  getMemeStats,
  canPostMeme as dbCanPostMeme,
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
  type ActivityType,
  type FlipChoice,
} from './db.js';
import { startNewCycle, executeScheduledTweets, getCycleStatus, cancelActiveCycle, buildEvents } from './cycle.js';
import { executeVideoTweets, getPendingVideoTweets, cleanupOldScheduledTweets } from './video-scheduler.js';
import { cleanupOrphanedProcesses, killProcess, registerShutdownHandlers } from './process-manager.js';
import { getHumor } from './humor.js';
import { generateAndPostMeme, canPostMeme } from './meme.js';
import { getConnection, transferCC, verifyDepositTransaction, verifySolFeeTransaction, getBrainWalletAta, getBrainWalletSolAddress, NETWORK } from './solana.js';
import { loadWallet, CC_TOKEN_MINT } from './wallet.js';
import { executeBuybackAndBurn, shouldRunBuyback, getBuybackStats } from './buyback.js';
import { PublicKey } from '@solana/web3.js';
import { randomBytes, createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.PORT || 3001;

// Store connected WebSocket clients
const wsClients = new Set<WebSocket>();

// ASCII art banner
const BANNER = `
   ██████╗ ███████╗███╗   ██╗████████╗██████╗  █████╗ ██╗
  ██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝██╔══██╗██╔══██╗██║
  ██║      █████╗  ██╔██╗ ██║   ██║   ██████╔╝███████║██║
  ██║      ██╔══╝  ██║╚██╗██║   ██║   ██╔══██╗██╔══██║██║
  ╚██████╗ ███████╗██║ ╚████║   ██║   ██║  ██║██║  ██║███████╗
   ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝

  ██████╗ ██████╗  █████╗ ██╗███╗   ██╗
  ██╔══██╗██╔══██╗██╔══██╗██║████╗  ██║
  ██████╔╝██████╔╝███████║██║██╔██╗ ██║
  ██╔══██╗██╔══██╗██╔══██║██║██║╚██╗██║
  ██████╔╝██║  ██║██║  ██║██║██║ ╚████║
  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝

  $CC Autonomous Growth Agent v4.0.0
  Full loop: Plan → Build → Deploy → Record → Tweet → Homepage
  Continuous Shipping: Up to 5 features per day!
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
      name: 'Central Brain',
      version: '4.0.0',
      status: 'running',
      endpoints: {
        'GET /': 'This info',
        'GET /status': 'Check brain status and active cycle',
        'GET /stats': 'Daily shipping statistics',
        'GET /features': 'All shipped features',
        'GET /scheduled-tweets': 'All scheduled tweets',
        'GET /logs': 'Recent build logs (last 24 hours)',
        'GET /tweets': 'Global tweet rate limiting stats',
        'GET /memes': 'Meme generation stats',
        'POST /meme/trigger': 'Manually trigger meme generation',
        'POST /go': 'Start a new 24-hour cycle (full autonomous loop)',
        'POST /cancel': 'Cancel the active cycle',
        'POST /flip/commit': 'Request coin flip (returns commitment + deposit address)',
        'POST /flip/resolve': 'Submit deposit tx, get result (commit-reveal)',
        'GET /flip/status/:id': 'Check commitment status',
        'GET /flip/deposit-address': 'Get brain wallet ATA for deposits',
        'GET /flip/stats': 'Get daily flip stats + circuit breaker status',
        'GET /buyback/stats': 'Get buyback & burn statistics',
        'POST /buyback/trigger': 'Manually trigger buyback & burn',
        'WS /ws': 'Real-time log streaming (WebSocket)',
      },
      capabilities: [
        'Plan projects with Claude',
        'Build features with Claude Agent SDK',
        'Deploy to Cloudflare Pages',
        'Record video of deployed features',
        'Tweet announcements with video',
        'Schedule follow-up tweets',
        'Auto-add feature buttons to homepage',
        'Continuous shipping (up to 5/day)',
        'Generate memes during cooldown periods',
        'Secure coin flip with commit-reveal pattern',
        'Buyback & burn: SOL fees → buy $CC → burn 100%',
      ],
    });
    return;
  }

  if (url === '/status' && method === 'GET') {
    const status = getCycleStatus();
    const memeStats = getMemeStats();
    const featureCooldownMs = getTimeUntilNextAllowed();

    // Determine brain mode: building, resting (cooldown), or idle
    let mode: 'building' | 'resting' | 'idle' = 'idle';
    if (status.active) {
      mode = 'building';
    } else if (featureCooldownMs > 0) {
      mode = 'resting';
    }

    sendJson(res, 200, {
      brain: 'running',
      mode,
      wsClients: wsClients.size,
      cycle: status.active
        ? {
            id: status.cycle?.id,
            status: status.cycle?.status,
            project: status.cycle?.project_idea,
            slug: status.cycle?.project_slug,
            started: status.cycle?.started_at,
            ends: status.cycle?.ends_at,
            tweets: status.tweets,
          }
        : null,
      cooldown: {
        next_allowed_in_ms: featureCooldownMs,
        next_allowed_at: featureCooldownMs > 0 ? new Date(Date.now() + featureCooldownMs).toISOString() : null,
      },
      memes: {
        daily_count: memeStats.daily_count,
        daily_limit: memeStats.daily_limit,
        can_post: memeStats.can_post,
        next_allowed_in_ms: memeStats.next_allowed_in_ms,
        in_progress: memeStats.in_progress,
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

  if (url === '/scheduled-tweets' && method === 'GET') {
    // Get all pending video tweets (brain-scheduled)
    const videoTweets = getPendingVideoTweets();

    // Get cycle-scheduled tweets if there's an active cycle
    const cycleStatus = getCycleStatus();
    const cycleTweets = cycleStatus.tweets || [];

    sendJson(res, 200, {
      video_tweets: videoTweets.map(t => ({
        id: t.id,
        content: t.content,
        scheduled_for: t.scheduled_for,
        posted: t.posted === 1,
        source: 'brain-video',
      })),
      cycle_tweets: cycleTweets.map(t => ({
        content: t.content,
        scheduled_for: t.scheduled_for,
        posted: t.posted,
        source: 'brain-cycle',
      })),
      total_pending: videoTweets.filter(t => t.posted === 0).length +
                     cycleTweets.filter(t => !t.posted).length,
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

  // Meme endpoints
  if (url === '/memes' && method === 'GET') {
    const stats = getMemeStats();
    sendJson(res, 200, stats);
    return;
  }

  if (url === '/meme/trigger' && method === 'POST') {
    // Parse request body for force option
    let force = false;
    try {
      const body = await new Promise<string>((resolve) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
      });
      if (body) {
        const parsed = JSON.parse(body);
        force = parsed.force === true;
      }
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Check if there's an active cycle (don't generate memes during builds)
    const active = getActiveCycle();
    if (active && !force) {
      sendJson(res, 409, {
        success: false,
        error: 'Cannot generate memes during active build cycle',
      });
      return;
    }

    console.log(`\n🎨 Meme trigger! Starting meme generation...${force ? ' (FORCE MODE)' : ''}\n`);
    broadcastLog(`🎨 Starting meme generation...${force ? ' (FORCE MODE)' : ''}`, true, 'meme');

    const result = await generateAndPostMeme(force, (msg) => {
      broadcastLog(`🎨 ${msg}`, true, 'meme');
    });

    if (result.success) {
      broadcastLog(`🎨 Meme posted! Tweet ID: ${result.tweet_id}`, true, 'meme');
      sendJson(res, 200, result);
    } else {
      broadcastLog(`🎨 Meme generation failed: ${result.error}`, true, 'meme');
      sendJson(res, 500, result);
    }
    return;
  }

  if (url === '/go' && method === 'POST') {
    // Parse request body for force option
    let force = false;
    try {
      const body = await new Promise<string>((resolve) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
      });
      if (body) {
        const parsed = JSON.parse(body);
        force = parsed.force === true;
      }
    } catch {
      // No body or invalid JSON, use defaults
    }

    console.log(`\n🚀 GO triggered! Starting full autonomous cycle...${force ? ' (FORCE MODE)' : ''}\n`);
    broadcastLog(`🚀 GO triggered! Starting full autonomous cycle...${force ? ' (FORCE MODE)' : ''}`);

    const result = await startNewCycle({ force });

    if (result) {
      sendJson(res, 200, {
        success: true,
        message: 'Autonomous cycle started!',
        cycleId: result.cycleId,
        project: result.plan.project,
        buildSuccess: result.buildResult?.success,
        deployUrl: result.deployUrl,
        trailerGenerated: result.trailerResult?.success,
        announcementTweetId: result.announcementTweetId,
        tweets: result.plan.tweets.map((t) => ({
          content: t.content,
          type: t.type,
          scheduled_hours: t.hours_from_start,
        })),
      });
    } else {
      const existing = getCycleStatus();
      if (existing.active) {
        sendJson(res, 409, {
          success: false,
          message: 'A cycle is already active',
          cycle: {
            id: existing.cycle?.id,
            project: existing.cycle?.project_idea,
            ends: existing.cycle?.ends_at,
          },
        });
      } else {
        sendJson(res, 500, {
          success: false,
          message: 'Failed to start cycle - check logs',
        });
      }
    }
    return;
  }

  if (url === '/cancel' && method === 'POST') {
    console.log('\n⛔ CANCEL triggered! Stopping active cycle...\n');
    broadcastLog('⛔ CANCEL triggered! Stopping active cycle...');

    // cancelActiveCycle is now async (kills processes)
    const result = await cancelActiveCycle();

    if (result) {
      sendJson(res, 200, {
        success: true,
        message: 'Cycle cancelled and processes killed',
        cycleId: result.id,
        project: result.project_idea,
      });
    } else {
      sendJson(res, 404, {
        success: false,
        message: 'No active cycle to cancel',
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
          const brainWallet = loadWallet(encryptionKey);
          const userPubkey = new PublicKey(commitment.wallet);
          const payoutLamports = BigInt(payout * 1_000_000_000); // 9 decimals

          console.log(`[Flip/Resolve] Sending payout: ${payout} $CC to ${commitment.wallet.slice(0, 8)}...`);
          payoutTx = await transferCC(connection, brainWallet, userPubkey, payoutLamports);
          console.log(`[Flip/Resolve] Payout sent: ${payoutTx}`);
          broadcastLog(`🎰 Payout: ${payout} $CC sent to ${commitment.wallet.slice(0, 8)}... (${payoutTx.slice(0, 8)}...)`, true, 'system');
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

      // Resolve commitment
      resolveCommitment(commitmentId, result, won, payoutTx || undefined);

      // Build response with full provably fair verification data
      sendJson(res, 200, {
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
      });
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
   * POST /buyback/trigger - Manually trigger buyback & burn
   */
  if (url === '/buyback/trigger' && method === 'POST') {
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

    const result = await executeBuybackAndBurn();
    if (result.success) {
      broadcastLog(`🔥 Buyback complete: ${result.solSpent?.toFixed(4)} SOL → ${result.ccBought?.toFixed(0)} $CC burned!`, true, 'system');
      sendJson(res, 200, result);
    } else {
      broadcastLog(`⚠️ Buyback failed: ${result.error}`, true, 'system');
      sendJson(res, 500, result);
    }
    return;
  }

  // 404
  sendJson(res, 404, { error: 'Not found' });
}

// ============ Cron Jobs ============

async function handleTweetExecutor(): Promise<void> {
  console.log('\n[Tweet Executor] Checking for scheduled tweets...');
  try {
    const posted = await executeScheduledTweets();
    if (posted > 0) {
      console.log(`[Tweet Executor] Posted ${posted} tweet(s)`);
      broadcastLog(`[Tweet Executor] Posted ${posted} tweet(s)`);
    } else {
      console.log('[Tweet Executor] No tweets due');
    }
  } catch (error) {
    console.error('[Tweet Executor] Error:', error);
  }
}

async function handleVideoTweetExecutor(): Promise<void> {
  console.log('\n[Video Tweet Executor] Checking for scheduled video tweets...');
  try {
    const posted = await executeVideoTweets();
    if (posted > 0) {
      console.log(`[Video Tweet Executor] Posted ${posted} video tweet(s)`);
      broadcastLog(`[Video Tweet Executor] Posted ${posted} video tweet(s)`);
    } else {
      const pending = getPendingVideoTweets();
      if (pending.length > 0) {
        console.log(`[Video Tweet Executor] ${pending.length} video tweet(s) pending, next at: ${pending[0].scheduled_for}`);
      }
    }
  } catch (error) {
    console.error('[Video Tweet Executor] Error:', error);
  }
}

/**
 * Auto-cycle handler - checks if a new cycle should start
 * This replaces the broken setTimeout-based scheduling
 */
async function handleAutoCycle(): Promise<void> {
  // Don't log every check - only when something happens
  try {
    // Skip if there's already an active cycle
    const active = getActiveCycle();
    if (active) {
      return;
    }

    // Check if we can ship more today
    if (!canShipMore()) {
      return;
    }

    // Check if cooldown has elapsed
    const cooldownMs = getTimeUntilNextAllowed();
    if (cooldownMs > 0) {
      return;
    }

    // All checks passed - start a new cycle!
    console.log('\n🔄 [Auto-Cycle] Cooldown elapsed, starting new cycle...');
    broadcastLog('🔄 [Auto-Cycle] Cooldown elapsed, starting new cycle...');

    await startNewCycle();
  } catch (error) {
    console.error('[Auto-Cycle] Error:', error);
  }
}

/**
 * Meme generator handler - generates memes during cooldown periods
 * Runs every 15 minutes, only during cooldown (no active cycle)
 */
async function handleMemeGenerator(): Promise<void> {
  try {
    // Skip if there's an active cycle (focus on building)
    const active = getActiveCycle();
    if (active) {
      return;
    }

    // Check meme rate limits
    const canPost = canPostMeme();
    if (!canPost.allowed) {
      // Only log if it's not a simple interval check
      if (!canPost.reason?.includes('wait')) {
        console.log(`[Meme Generator] Skipped: ${canPost.reason}`);
      }
      return;
    }

    // Generate and post a meme!
    console.log('\n🎨 [Meme Generator] Starting meme generation during cooldown...');
    broadcastLog(`🎨 ${getHumor('memeStart')}`, true, 'meme');

    const result = await generateAndPostMeme(false, (msg) => {
      broadcastLog(`🎨 ${msg}`, true, 'meme');
    });

    if (result.success) {
      console.log(`[Meme Generator] Posted! Tweet ID: ${result.tweet_id}`);
      broadcastLog(`🎨 ${getHumor('memeSuccess')} - Tweet ID: ${result.tweet_id}`, true, 'meme');
    } else {
      console.log(`[Meme Generator] Failed: ${result.error}`);
      broadcastLog(`🎨 ${getHumor('memeFailed')}: ${result.error}`, true, 'meme');
    }
  } catch (error) {
    console.error('[Meme Generator] Error:', error);
  }
}

function setupCronJobs(): void {
  console.log('Setting up cron jobs (CONSERVATIVE after account lock)...');

  // Check for scheduled tweets every 3 hours (relaxed from 5 min)
  cron.schedule('0 */3 * * *', handleTweetExecutor);
  console.log('  ✓ Tweet Executor: every 3 hours');

  // Check for scheduled video tweets every 4 hours (relaxed from 5 min)
  cron.schedule('0 */4 * * *', handleVideoTweetExecutor);
  console.log('  ✓ Video Tweet Executor: every 4 hours');

  // Auto-cycle: Check every 10 minutes if a new cycle should start
  // This replaces the broken setTimeout-based scheduling
  cron.schedule('*/10 * * * *', handleAutoCycle);
  console.log('  ✓ Auto-Cycle Checker: every 10 minutes');

  // Meme generator: Every 4 hours during cooldown (relaxed from 15 min)
  // Only runs when no active cycle and meme rate limits allow
  cron.schedule('0 */4 * * *', handleMemeGenerator);
  console.log('  ✓ Meme Generator: every 4 hours (during cooldown)');

  // Cleanup expired flip commitments every minute
  cron.schedule('* * * * *', () => {
    const expired = cleanupExpiredCommitments();
    if (expired > 0) {
      console.log(`[Flip Cleanup] Expired ${expired} commitment(s)`);
    }
  });
  console.log('  ✓ Flip Commitment Cleanup: every minute');

  // Buyback & Burn: Every 6 hours - swap accumulated SOL fees for $CC and burn
  cron.schedule('0 */6 * * *', async () => {
    console.log('[Buyback] Checking if buyback should run...');
    broadcastLog('🔥 Checking buyback & burn conditions...', true, 'system');

    const check = await shouldRunBuyback();
    if (!check.should) {
      console.log(`[Buyback] Skipping: ${check.reason}`);
      return;
    }

    console.log(`[Buyback] Starting: ${check.reason}`);
    broadcastLog(`🔥 Starting buyback & burn (${check.availableSol?.toFixed(4)} SOL available)`, true, 'system');

    const result = await executeBuybackAndBurn();
    if (result.success) {
      broadcastLog(`🔥 Buyback complete: ${result.solSpent?.toFixed(4)} SOL → ${result.ccBought?.toFixed(0)} $CC bought → ${result.ccBurned?.toFixed(0)} $CC burned!`, true, 'system');
    } else {
      broadcastLog(`⚠️ Buyback failed: ${result.error}`, true, 'system');
    }
  });
  console.log('  ✓ Buyback & Burn: every 6 hours');
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
    console.log(`✓ Skipped ${skippedTweets} old scheduled tweet(s) that were >1 hour overdue`);
  }

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
  console.log('  Central Brain is now running');
  console.log(`  Start cycle: curl -X POST http://localhost:${PORT}/go`);
  console.log(`  Watch logs:  ws://localhost:${PORT}/ws`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Log startup to database (so /watch page has something to show)
  const startupHumor = getHumor('startup');
  broadcastLog(`🧠 Central Brain started - ${startupHumor}`);
}

// Graceful shutdown
function shutdown(): void {
  console.log('\nShutting down Central Brain...');

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
