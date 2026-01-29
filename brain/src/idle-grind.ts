/**
 * Idle Grind System v2 - Hyper-Realistic Reasoning Sessions
 *
 * Instead of random activity spam, the brain runs structured thinking sessions
 * that expose the actual reasoning process. Each session:
 * - Works through a single problem (20-45 minutes)
 * - Generates thoughts every 2-5 minutes (human pacing)
 * - Builds a visible chain of reasoning
 * - Extracts and stores insights for future sessions
 *
 * Token Economics:
 * - Uses Opus 4.5 for high-quality reasoning
 * - 8-15 thoughts per session, 1-3 sessions per day
 * - Higher cost but much better quality
 */

import {
  getGrindState,
  updateGrindState,
  recordGrindThought,
  getActiveThinkingSession,
  type ActivityType,
  type GrindActivityType,
  type ThinkingSession,
} from './db.js';
import {
  initReasoningEngine,
  startSession,
  generateNextThought,
  isSessionComplete,
  getNextThoughtInterval,
  getRestPeriod,
  getSessionStatus,
  cancelSession,
} from './reasoning-engine.js';
import { getAllInsights, getInsightStats } from './insights-db.js';
import type { ProblemCategory } from './problems.js';

// ============ CONFIGURATION ============

// Rest messages shown between sessions
const REST_MESSAGES = [
  'taking a break to let this marinate...',
  'stepping back to get perspective...',
  'processing what we learned...',
  'letting the insights settle...',
  'clearing the mind before the next problem...',
  'good session. time to recharge.',
  'that was productive. resting for a bit.',
  'saved those insights. taking a breather.',
];

// Session start messages
const SESSION_START_MESSAGES = [
  'starting a new thinking session...',
  'time to work through another problem...',
  'fresh session. let\'s think this through.',
  'new problem to tackle. here we go.',
  'diving into the next challenge...',
];

// ============ STATE ============

let isGrindLoopRunning = false;
let grindLoopInterval: NodeJS.Timeout | null = null;
let isPaused = false;
let broadcastFn: ((message: string, persist?: boolean, activityType?: ActivityType) => void) | null = null;

// Session state
let currentSession: ThinkingSession | null = null;
let nextThoughtAt: number = 0;
let restingUntil: number = 0;
let contextData: Record<string, unknown> = {};

// ============ DATA FETCHERS ============

/**
 * Fetch token data from DexScreener API
 * Includes price, volume, transactions, market cap, and liquidity
 */
async function fetchTokenData(): Promise<{
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
  txns24h: { buys: number; sells: number };
} | null> {
  try {
    const response = await fetch(
      'https://api.dexscreener.com/latest/dex/tokens/Hg23qBLJDvhQtGLHMvot7NK54qAhzQFj9BVd5jpABAGS',
      { headers: { 'User-Agent': 'CCBrain/2.0' } }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const pair = data?.pairs?.[0];
    if (!pair) return null;

    return {
      price: parseFloat(pair.priceUsd || '0'),
      change24h: parseFloat(pair.priceChange?.h24 || '0'),
      volume24h: parseFloat(pair.volume?.h24 || '0'),
      marketCap: parseFloat(pair.marketCap || '0'),
      liquidity: parseFloat(pair.liquidity?.usd || '0'),
      txns24h: {
        buys: pair.txns?.h24?.buys || 0,
        sells: pair.txns?.h24?.sells || 0,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Gather context data for thinking sessions
 * Uses DexScreener for reliable market data
 */
async function gatherContextData(): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {};

  // Fetch market data from DexScreener
  const tokenData = await fetchTokenData();
  if (tokenData) {
    data.marketCap = `$${tokenData.marketCap.toLocaleString()}`;
    data.liquidity = `$${tokenData.liquidity.toLocaleString()}`;
    data.volume24h = `$${tokenData.volume24h.toLocaleString()}`;
    data.change24h = `${tokenData.change24h > 0 ? '+' : ''}${tokenData.change24h.toFixed(1)}%`;
    data.txns24h = `${tokenData.txns24h.buys} buys, ${tokenData.txns24h.sells} sells`;
    data.buyPressure = tokenData.txns24h.buys > tokenData.txns24h.sells ? 'more buyers than sellers' : 'more sellers than buyers';
  } else {
    data.marketData = 'unavailable';
  }

  // Add insight stats
  const insightStats = getInsightStats();
  data.totalInsights = insightStats.total;
  data.provenInsights = insightStats.proven;

  return data;
}

// ============ SESSION MANAGEMENT ============

/**
 * Start a new thinking session
 */
async function beginSession(): Promise<void> {
  // Gather fresh context data
  contextData = await gatherContextData();

  // Start message
  const startMsg = SESSION_START_MESSAGES[Math.floor(Math.random() * SESSION_START_MESSAGES.length)];
  recordGrindThought('reflecting', startMsg);
  broadcastFn?.(startMsg, false, 'grind');

  // Start the session
  const session = await startSession(undefined, contextData);
  if (!session) {
    console.error('[IdleGrind] Failed to start session');
    return;
  }

  currentSession = session;

  // Broadcast the problem
  setTimeout(() => {
    const problemMsg = `thinking: "${session.problem}"`;
    broadcastFn?.(problemMsg, true, 'grind');
  }, 3000);

  // Schedule first thought
  nextThoughtAt = Date.now() + 10000; // First thought in 10 seconds

  console.log(`[IdleGrind] Session started: ${session.id}`);
  console.log(`  Problem: ${session.problem}`);
}

/**
 * Generate and broadcast the next thought
 */
async function doNextThought(): Promise<void> {
  if (!currentSession) return;

  // Refresh session state
  const session = getActiveThinkingSession();
  if (!session) {
    // Session was completed or cancelled
    currentSession = null;
    return;
  }

  currentSession = session;

  // Generate thought
  const thought = await generateNextThought(session, undefined, contextData);
  if (!thought) {
    console.error('[IdleGrind] Failed to generate thought');
    return;
  }

  // Broadcast the thought
  const activityType = mapThoughtTypeToActivity(thought.thoughtType);
  recordGrindThought(activityType, thought.content);
  broadcastFn?.(thought.content, false, 'grind');

  // Check if session is complete
  if (isSessionComplete(session)) {
    await endSession();
    return;
  }

  // Schedule next thought
  nextThoughtAt = Date.now() + getNextThoughtInterval();
}

/**
 * End the current session and enter rest period
 */
async function endSession(): Promise<void> {
  if (!currentSession) return;

  // Get final session state
  const session = getActiveThinkingSession();
  if (session) {
    console.log(`[IdleGrind] Session ended: ${session.id}`);
    console.log(`  Thoughts: ${session.thoughtCount}`);
  }

  currentSession = null;

  // Rest message
  const restMsg = REST_MESSAGES[Math.floor(Math.random() * REST_MESSAGES.length)];
  recordGrindThought('reflecting', restMsg);
  broadcastFn?.(restMsg, false, 'grind');

  // Enter rest period
  const restPeriod = getRestPeriod();
  restingUntil = Date.now() + restPeriod;
  nextThoughtAt = 0;

  const restMinutes = Math.round(restPeriod / 60000);
  console.log(`[IdleGrind] Resting for ${restMinutes} minutes`);
}

/**
 * Map thought type to activity type for display
 */
function mapThoughtTypeToActivity(thoughtType: string): GrindActivityType {
  switch (thoughtType) {
    case 'observation':
      return 'monitoring';
    case 'analysis':
      return 'analyzing';
    case 'hypothesis':
      return 'strategizing';
    case 'conclusion':
      return 'reflecting';
    default:
      return 'reflecting';
  }
}

// ============ MAIN LOOP ============

/**
 * Main tick function - runs every second
 */
async function grindTick(): Promise<void> {
  if (isPaused) return;

  const now = Date.now();

  // If resting, check if rest period is over
  if (restingUntil > 0) {
    if (now < restingUntil) {
      return; // Still resting
    }
    restingUntil = 0;
    console.log('[IdleGrind] Rest period complete, starting new session');
    await beginSession();
    return;
  }

  // If no active session, start one
  if (!currentSession) {
    await beginSession();
    return;
  }

  // Check if it's time for next thought
  if (nextThoughtAt > 0 && now >= nextThoughtAt) {
    await doNextThought();
  }
}

// ============ PUBLIC API ============

/**
 * Start the idle grind loop
 */
export function startGrindLoop(
  broadcast: (message: string, persist?: boolean, activityType?: ActivityType) => void
): void {
  if (isGrindLoopRunning) {
    console.log('[IdleGrind] Loop already running');
    return;
  }

  // Initialize the reasoning engine
  initReasoningEngine();

  broadcastFn = broadcast;
  isGrindLoopRunning = true;
  isPaused = false;
  restingUntil = 0;
  currentSession = null;

  console.log('[IdleGrind] Starting reasoning session loop');
  broadcast('the grind begins... v2 reasoning system active.', true, 'grind');

  // Update grind state
  const now = Date.now();
  updateGrindState({
    currentActivity: 'reflecting',
    taskStartedAt: now,
    nextStepAt: now + 5000,
  });

  // Run tick every second
  grindLoopInterval = setInterval(() => {
    grindTick().catch((err) => {
      console.error('[IdleGrind] Tick error:', err);
    });
  }, 1000);
}

/**
 * Stop the idle grind loop
 */
export function stopGrindLoop(): void {
  if (!isGrindLoopRunning) return;

  console.log('[IdleGrind] Stopping grind loop');

  if (grindLoopInterval) {
    clearInterval(grindLoopInterval);
    grindLoopInterval = null;
  }

  // Cancel any active session
  if (currentSession) {
    cancelSession(currentSession.id);
    currentSession = null;
  }

  isGrindLoopRunning = false;
  isPaused = false;
}

/**
 * Pause the grind loop (during builds)
 */
export function pauseGrindLoop(): void {
  if (!isGrindLoopRunning) return;

  console.log('[IdleGrind] Pausing grind loop (build in progress)');
  isPaused = true;
}

/**
 * Resume the grind loop (after builds)
 */
export function resumeGrindLoop(): void {
  if (!isGrindLoopRunning) return;

  console.log('[IdleGrind] Resuming grind loop');
  isPaused = false;

  // Schedule next action soon
  const now = Date.now();
  if (currentSession) {
    nextThoughtAt = now + 10000; // Next thought in 10 seconds
  } else {
    restingUntil = 0; // Exit rest immediately
  }

  broadcastFn?.('back to the grind...', true, 'grind');
}

/**
 * Check if the grind loop is currently running
 */
export function isGrindLoopActive(): boolean {
  return isGrindLoopRunning && !isPaused;
}

/**
 * Get the current grind status
 */
export function getGrindStatus(): {
  running: boolean;
  paused: boolean;
  currentActivity: GrindActivityType;
  lastThought: string | null;
  lastThoughtAt: number;
  session: {
    active: boolean;
    problem: string | null;
    thoughtCount: number;
    nextThoughtIn: number | null;
  };
  insights: {
    total: number;
    proven: number;
  };
  isResting: boolean;
  restingUntil: number | null;
} {
  const state = getGrindState();
  const sessionStatus = getSessionStatus();
  const insightStats = getInsightStats();

  // Calculate next thought time
  let nextThoughtIn: number | null = null;
  if (sessionStatus.active && nextThoughtAt > 0) {
    nextThoughtIn = Math.max(0, nextThoughtAt - Date.now());
  }

  return {
    running: isGrindLoopRunning,
    paused: isPaused,
    currentActivity: state.currentActivity,
    lastThought: state.lastThought,
    lastThoughtAt: state.lastThoughtAt,
    session: {
      active: sessionStatus.active,
      problem: sessionStatus.session?.problem || null,
      thoughtCount: sessionStatus.session?.thoughtCount || 0,
      nextThoughtIn,
    },
    insights: {
      total: insightStats.total,
      proven: insightStats.proven,
    },
    isResting: restingUntil > 0 && Date.now() < restingUntil,
    restingUntil: restingUntil > 0 ? restingUntil : null,
  };
}

/**
 * Trigger a reactive thought (called externally when events happen)
 * In v2, this just broadcasts the message - it doesn't interrupt sessions
 */
export function triggerReactiveThought(
  trigger: 'holderIncrease' | 'holderMilestone' | 'priceUp' | 'tweetPosted' | 'tweetPerformance',
  data?: Record<string, string | number>
): void {
  if (!isGrindLoopRunning || isPaused) return;

  // Simple reactive messages
  const messages: Record<string, string[]> = {
    holderIncrease: ['new holder joined. nice.', '+1 believer.', 'another one.'],
    holderMilestone: ['milestone hit. {holders} holders now.'],
    priceUp: ['chart looking good.', 'green candles.'],
    tweetPosted: ['content deployed.', 'tweet live.'],
    tweetPerformance: ['{impressions} impressions. not bad.'],
  };

  const options = messages[trigger] || [];
  if (options.length === 0) return;

  let message = options[Math.floor(Math.random() * options.length)];

  // Substitute data
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      message = message.replace(`{${key}}`, String(value));
    }
  }

  recordGrindThought('monitoring', message);
  broadcastFn?.(message, false, 'grind');
}
