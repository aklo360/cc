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
import { db, cleanupOnStartup, getTodayStats, getDailyLimit, canShipMore, getTimeUntilNextAllowed, getHoursBetweenCycles, seedInitialFeatures, getAllShippedFeatures, getActiveCycle, insertBuildLog, getRecentBuildLogs, cleanupOldBuildLogs, getMemeStats, canPostMeme as dbCanPostMeme, getGlobalTweetStats, type ActivityType } from './db.js';
import { startNewCycle, executeScheduledTweets, getCycleStatus, cancelActiveCycle, buildEvents } from './cycle.js';
import { executeVideoTweets, getPendingVideoTweets, cleanupOldScheduledTweets } from './video-scheduler.js';
import { cleanupOrphanedProcesses, killProcess, registerShutdownHandlers } from './process-manager.js';
import { getHumor } from './humor.js';
import { generateAndPostMeme, canPostMeme } from './meme.js';

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
  console.log('Setting up cron jobs...');

  // Check for scheduled tweets every 5 minutes
  cron.schedule('*/5 * * * *', handleTweetExecutor);
  console.log('  ✓ Tweet Executor: every 5 minutes');

  // Check for scheduled video tweets every 5 minutes
  cron.schedule('*/5 * * * *', handleVideoTweetExecutor);
  console.log('  ✓ Video Tweet Executor: every 5 minutes');

  // Auto-cycle: Check every 10 minutes if a new cycle should start
  // This replaces the broken setTimeout-based scheduling
  cron.schedule('*/10 * * * *', handleAutoCycle);
  console.log('  ✓ Auto-Cycle Checker: every 10 minutes');

  // Meme generator: Every 15 minutes during cooldown
  // Only runs when no active cycle and meme rate limits allow
  cron.schedule('*/15 * * * *', handleMemeGenerator);
  console.log('  ✓ Meme Generator: every 15 minutes (during cooldown)');
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
