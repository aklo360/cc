/**
 * Central Brain - Ultra-Lean $CC Growth Orchestrator
 *
 * No Docker. No Redis. Just SQLite + node-cron + HTTP server.
 *
 * Endpoints:
 *   GET  /status  - Check brain status and active cycle
 *   POST /go      - Start a new 24-hour cycle
 */

import 'dotenv/config';
import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import cron from 'node-cron';
import { db, cleanupOnStartup, completeCycle } from './db.js';
import { startNewCycle, executeScheduledTweets, getCycleStatus, cancelActiveCycle } from './cycle.js';

const PORT = process.env.PORT || 3001;

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

  $CC Growth Orchestrator v2.1.0
  Ultra-lean: SQLite + node-cron + HTTP
`;

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
      version: '2.1.0',
      status: 'running',
      endpoints: {
        'GET /': 'This info',
        'GET /status': 'Check brain status and active cycle',
        'POST /go': 'Start a new 24-hour cycle',
        'POST /cancel': 'Cancel the active cycle',
      },
    });
    return;
  }

  if (url === '/status' && method === 'GET') {
    const status = getCycleStatus();
    sendJson(res, 200, {
      brain: 'running',
      cycle: status.active
        ? {
            id: status.cycle?.id,
            status: status.cycle?.status,
            project: status.cycle?.project_idea,
            started: status.cycle?.started_at,
            ends: status.cycle?.ends_at,
            tweets: status.tweets,
          }
        : null,
    });
    return;
  }

  if (url === '/go' && method === 'POST') {
    console.log('\n🚀 GO triggered! Starting new 24-hour cycle...\n');

    const result = await startNewCycle();

    if (result) {
      sendJson(res, 200, {
        success: true,
        message: 'New 24-hour cycle started!',
        cycleId: result.cycleId,
        project: result.plan.project,
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

  // Start HTTP server
  const server = createServer((req, res) => {
    handleRequest(req, res).catch((error) => {
      console.error('[HTTP] Error:', error);
      sendJson(res, 500, { error: 'Internal server error' });
    });
  });

  server.listen(PORT, () => {
    console.log(`✓ HTTP server running on port ${PORT}`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Central Brain is now running');
  console.log(`  Trigger a cycle: curl -X POST http://localhost:${PORT}/go`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Graceful shutdown
function shutdown(): void {
  console.log('\nShutting down Central Brain...');
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
