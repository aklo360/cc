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
import { db, cleanupOnStartup, getTodayStats, getDailyLimit, canShipMore, getTimeUntilNextAllowed } from './db.js';
import { startNewCycle, executeScheduledTweets, getCycleStatus, cancelActiveCycle, buildEvents } from './cycle.js';

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

function broadcastLog(message: string): void {
  const payload = JSON.stringify({ type: 'log', message, timestamp: Date.now() });
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
      ],
    });
    return;
  }

  if (url === '/status' && method === 'GET') {
    const status = getCycleStatus();
    sendJson(res, 200, {
      brain: 'running',
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
    });
    return;
  }

  if (url === '/stats' && method === 'GET') {
    const stats = getTodayStats();
    const limit = getDailyLimit();
    const cooldownMs = getTimeUntilNextAllowed();

    sendJson(res, 200, {
      date: stats.date,
      features_shipped: stats.features_shipped,
      daily_limit: limit,
      remaining: limit - stats.features_shipped,
      can_ship_more: canShipMore(),
      last_cycle_end: stats.last_cycle_end,
      next_allowed_in_ms: cooldownMs,
      next_allowed_in_mins: Math.ceil(cooldownMs / 60000),
    });
    return;
  }

  if (url === '/go' && method === 'POST') {
    console.log('\n🚀 GO triggered! Starting full autonomous cycle...\n');
    broadcastLog('🚀 GO triggered! Starting full autonomous cycle...');

    const result = await startNewCycle();

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

    const result = cancelActiveCycle();

    if (result) {
      sendJson(res, 200, {
        success: true,
        message: 'Cycle cancelled',
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

function setupCronJobs(): void {
  console.log('Setting up cron jobs...');

  // Check for scheduled tweets every 5 minutes
  cron.schedule('*/5 * * * *', handleTweetExecutor);
  console.log('  ✓ Tweet Executor: every 5 minutes');
}

// ============ Main ============

async function main(): Promise<void> {
  console.log(BANNER);

  // Database is initialized on import (see db.ts)
  console.log('✓ Database ready');

  // Cleanup any incomplete cycles from previous crashes
  const cleanup = cleanupOnStartup();
  if (cleanup.cancelled > 0 || cleanup.expired > 0) {
    console.log(`✓ Cleanup: ${cleanup.cancelled} cancelled, ${cleanup.expired} expired cycles cleaned`);
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
