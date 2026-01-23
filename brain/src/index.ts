/**
 * Central Brain - Ultra-Lean $CC Growth Orchestrator
 *
 * No Docker. No Redis. Just SQLite + node-cron.
 */

import 'dotenv/config';
import cron from 'node-cron';
import { db } from './db.js';
import { runDecisionEngine } from './decision.js';

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

  $CC Growth Orchestrator v2.0.0
  Ultra-lean: SQLite + node-cron
`;

// ============ Cron Job Handlers ============

async function handleDecisionEngine(): Promise<void> {
  console.log('\n[Decision Engine] Starting hourly analysis...');
  try {
    await runDecisionEngine();
  } catch (error) {
    console.error('[Decision Engine] Error:', error);
  }
}

async function handleTweetScheduler(): Promise<void> {
  console.log('\n[Tweet Scheduler] Checking tweet queue...');
  // TODO: Implement strategic tweet posting
  console.log('[Tweet Scheduler] Not yet implemented');
}

async function handleDailyExperiment(): Promise<void> {
  console.log('\n[Daily Experiment] Building today\'s experiment...');
  // TODO: Implement experiment generator
  console.log('[Daily Experiment] Not yet implemented');
}

// ============ Main ============

function setupCronJobs(): void {
  console.log('Setting up cron jobs...');

  // Decision engine - every hour at :00
  cron.schedule('0 * * * *', handleDecisionEngine);
  console.log('  ✓ Decision Engine: hourly at :00');

  // Tweet scheduler - every 4 hours
  cron.schedule('0 */4 * * *', handleTweetScheduler);
  console.log('  ✓ Tweet Scheduler: every 4 hours');

  // Daily experiment - 10 AM UTC
  cron.schedule('0 10 * * *', handleDailyExperiment);
  console.log('  ✓ Daily Experiment: 10 AM UTC');
}

async function main(): Promise<void> {
  console.log(BANNER);

  // Database is initialized on import (see db.ts)
  console.log('✓ Database ready');

  // Set up cron schedules
  setupCronJobs();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Central Brain is now running');
  console.log('  Waiting for scheduled jobs...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Run initial decision engine pass
  console.log('Running initial decision engine pass...');
  await handleDecisionEngine();
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
