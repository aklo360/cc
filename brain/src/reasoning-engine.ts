/**
 * Reasoning Engine - Hyper-Realistic Thinking Sessions
 *
 * This is the core of the v2 reasoning system. Instead of random activity spam,
 * the brain runs structured thinking sessions that expose the actual reasoning
 * process - not just outputs, but the thinking itself.
 *
 * Key characteristics:
 * - Single thread: One problem, worked through linearly
 * - Slow pace: 2-5 minutes between thoughts (human thinking speed)
 * - Chain of reasoning: Each thought references/builds on previous
 * - Visible logic: Shows the "why", not just conclusions
 * - Cumulative: Insights are stored and retrieved later
 *
 * Token economics:
 * - Uses Opus 4.5 for high-quality reasoning
 * - 8-15 thoughts per session, 1-3 sessions per day
 * - Higher cost but much better quality
 */

import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import {
  createThinkingSession,
  getThinkingSession,
  getActiveThinkingSession,
  updateSessionStatus,
  addSessionThought,
  getSessionThoughts,
  type ThinkingSession,
  type SessionThought,
  type ThoughtType,
  storeInsight,
} from './db.js';
import { selectProblem, type Problem, type ProblemCategory } from './problems.js';
import {
  getInsightsForPrompt,
  referenceInsights,
  extractInsightsFromConclusion,
} from './insights-db.js';

// ============ CONFIGURATION ============

const CONFIG = {
  // Session timing
  minThoughts: 8,          // Minimum thoughts before conclusion allowed
  maxThoughts: 15,         // Maximum thoughts before forcing conclusion
  sessionTimeoutMs: 45 * 60 * 1000, // 45 minutes max session

  // Thought timing (realistic human pacing)
  minThoughtIntervalMs: 2 * 60 * 1000,  // 2 minutes minimum
  maxThoughtIntervalMs: 5 * 60 * 1000,  // 5 minutes maximum

  // Rest period between sessions
  minRestPeriodMs: 15 * 60 * 1000,  // 15 minutes minimum
  maxRestPeriodMs: 60 * 60 * 1000,  // 1 hour maximum

  // Model configuration - Opus 4.5 for high-quality reasoning
  model: 'claude-opus-4-5-20251101',
  maxTokens: 200,
};

// ============ STATE ============

let anthropicClient: Anthropic | null = null;

// ============ PROMPT TEMPLATES ============

const REASONING_PROMPT = `You are the $CC memecoin dev's internal monologue. Thinking through a problem step by step.

PROBLEM: {problem}
{context}

CURRENT DATA:
{metrics}

PAST INSIGHTS:
{insights}

YOUR THINKING SO FAR:
{thought_chain}

Continue with ONE next thought. Critical rules:
- MOVE FORWARD - don't repeat or rephrase what you already said
- Each thought must explore a NEW angle or ask a NEW question
- If you already mentioned specific data, don't mention it again
- Explore different aspects: psychology, timing, friction, motivation, patterns
- NEVER prescribe solutions, features, or crypto mechanics
- Vary sentence starters naturally
- Build on previous thought but go somewhere new
- Lowercase, casual, 1-3 sentences
- If you've found a clear pattern after exploration, start with "insight:"

Your next thought:`;

const CONCLUSION_PROMPT = `You are the $CC memecoin dev. You've been pondering this problem and now need to capture what you've learned.

PROBLEM: {problem}

YOUR THINKING:
{thought_chain}

Write a brief insight (1-2 sentences) that:
- Captures a pattern, truth, or understanding you've discovered
- Starts with "insight:"
- Is an observation about human nature, community dynamics, or growth patterns
- NOT a feature idea or solution - just the underlying truth you've uncovered
- Uses lowercase, casual dev voice

Your insight:`;

// ============ CORE ENGINE ============

/**
 * Initialize the reasoning engine
 */
export function initReasoningEngine(): void {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    anthropicClient = new Anthropic({ apiKey });
    console.log('[ReasoningEngine] Initialized with Anthropic client');
  } else {
    console.warn('[ReasoningEngine] ANTHROPIC_API_KEY not set - using fallback mode');
  }
}

/**
 * Start a new thinking session
 */
export async function startSession(
  preferredCategory?: ProblemCategory,
  contextData?: Record<string, unknown>
): Promise<ThinkingSession | null> {
  // Check if there's already an active session
  const existing = getActiveThinkingSession();
  if (existing) {
    console.log(`[ReasoningEngine] Session already active: ${existing.id}`);
    return existing;
  }

  // Select a problem to work on
  const problem = selectProblem(preferredCategory);
  const sessionId = uuidv4();

  console.log(`[ReasoningEngine] Starting session: "${problem.question}"`);

  // Create the session
  const session = createThinkingSession(sessionId, problem.question, problem.category);

  // Generate the first thought
  await generateNextThought(session, problem, contextData);

  return getThinkingSession(sessionId);
}

/**
 * Generate the next thought in the chain
 */
export async function generateNextThought(
  session: ThinkingSession,
  problem?: Problem,
  contextData?: Record<string, unknown>
): Promise<SessionThought | null> {
  if (!anthropicClient) {
    // Fallback mode - generate simple thought
    return generateFallbackThought(session);
  }

  // Get the thought chain so far
  const thoughts = getSessionThoughts(session.id);
  const thoughtChain = thoughts.length > 0
    ? thoughts.map((t, i) => {
        const time = formatTime(t.createdAt);
        return `${time} - ${t.content}`;
      }).join('\n')
    : '(starting fresh - this is my first thought)';

  // Get relevant insights from past sessions
  const insights = getInsightsForPrompt(session.category, 5);
  const insightsText = insights.length > 0
    ? insights.join('\n')
    : '(no past insights for this category yet)';

  // Format context data as metrics
  const metricsText = contextData
    ? Object.entries(contextData)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n')
    : '(no current metrics available)';

  // Get problem context
  const problemObj = problem || { question: session.problem, context: '' };
  const contextText = problemObj.context
    ? `CONTEXT: ${problemObj.context}`
    : '';

  // Check if we should force a conclusion
  const shouldConclude = session.thoughtCount >= CONFIG.maxThoughts;

  // Build the prompt
  const prompt = shouldConclude
    ? CONCLUSION_PROMPT
        .replace('{problem}', session.problem)
        .replace('{thought_chain}', thoughtChain)
    : REASONING_PROMPT
        .replace('{problem}', session.problem)
        .replace('{context}', contextText)
        .replace('{metrics}', metricsText)
        .replace('{insights}', insightsText)
        .replace('{thought_chain}', thoughtChain);

  try {
    const response = await anthropicClient.messages.create({
      model: CONFIG.model,
      max_tokens: CONFIG.maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return generateFallbackThought(session);
    }

    // Clean up the response
    let thoughtText = content.text.trim().toLowerCase();

    // Determine thought type - look for "insight:" (v2) or "conclusion:" (legacy)
    const isInsight = thoughtText.startsWith('insight:') || thoughtText.startsWith('conclusion:');
    const thoughtType: ThoughtType = isInsight ? 'conclusion' : determineThoughtType(thoughtText);

    // Clean insight/conclusion prefix if present
    if (isInsight) {
      thoughtText = thoughtText.replace(/^(insight|conclusion):\s*/i, '').trim();
    }

    // Add the thought to the session
    const thought = addSessionThought(session.id, thoughtText, thoughtType);

    // If this is an insight/conclusion, complete the session
    if (isInsight || thoughtType === 'conclusion') {
      await completeSession(session, thoughtText);
    }

    return thought;
  } catch (error) {
    console.error('[ReasoningEngine] Failed to generate thought:', error);
    return generateFallbackThought(session);
  }
}

/**
 * Generate a fallback thought when API is unavailable
 */
function generateFallbackThought(session: ThinkingSession): SessionThought {
  const thoughts = getSessionThoughts(session.id);
  const count = thoughts.length;

  // Simple progression through thought types
  const fallbackThoughts = [
    'let me think about this problem...',
    'looking at the current state of things...',
    'considering what we know...',
    'analyzing the patterns here...',
    'this suggests we should focus on...',
    'the data points toward...',
    'building on that observation...',
    'this connects to earlier insights...',
    'weighing the options...',
    'narrowing down to the key factor...',
    'the pattern is becoming clear...',
    'insight: understanding comes from observation, not prescription.',
  ];

  const index = Math.min(count, fallbackThoughts.length - 1);
  const thoughtText = fallbackThoughts[index];
  const isInsight = thoughtText.startsWith('insight:');

  const thought = addSessionThought(
    session.id,
    isInsight ? thoughtText.replace('insight: ', '') : thoughtText,
    isInsight ? 'conclusion' : 'observation'
  );

  if (isInsight) {
    completeSession(session, thoughtText);
  }

  return thought;
}

/**
 * Determine the type of thought based on content
 */
function determineThoughtType(text: string): ThoughtType {
  const lowerText = text.toLowerCase();

  // Check for conclusion indicators
  if (lowerText.includes('conclusion') || lowerText.includes('takeaway') || lowerText.includes('the answer is')) {
    return 'conclusion';
  }

  // Check for hypothesis indicators
  if (lowerText.includes('hypothesis') || lowerText.includes('i think') || lowerText.includes('maybe') ||
      lowerText.includes('could be') || lowerText.includes('might be') || lowerText.includes('testing')) {
    return 'hypothesis';
  }

  // Check for analysis indicators
  if (lowerText.includes('comparing') || lowerText.includes('looking at') || lowerText.includes('analyzing') ||
      lowerText.includes('the data') || lowerText.includes('pattern') || lowerText.includes('%') ||
      /\d+/.test(text)) {
    return 'analysis';
  }

  // Default to observation
  return 'observation';
}

/**
 * Complete a session and extract insights
 */
async function completeSession(session: ThinkingSession, conclusion: string): Promise<void> {
  // Extract insights from the conclusion
  const insights = extractInsightsFromConclusion(conclusion, session.category);
  const insightIds: number[] = [];

  // Store each insight
  for (const insight of insights) {
    const id = storeInsight(insight, session.category, session.id);
    insightIds.push(id);
  }

  // Update session status
  updateSessionStatus(session.id, 'complete', conclusion, insightIds);

  console.log(`[ReasoningEngine] Session complete: ${session.id}`);
  console.log(`  Problem: ${session.problem}`);
  console.log(`  Thoughts: ${session.thoughtCount}`);
  console.log(`  Insights stored: ${insightIds.length}`);
}

/**
 * Check if a session has reached a natural conclusion
 */
export function isSessionComplete(session: ThinkingSession): boolean {
  if (session.status === 'complete') return true;

  // Check timeout
  const elapsed = Date.now() - session.startedAt;
  if (elapsed > CONFIG.sessionTimeoutMs) {
    console.log(`[ReasoningEngine] Session timed out: ${session.id}`);
    return true;
  }

  // Check if last thought was a conclusion
  const thoughts = getSessionThoughts(session.id);
  if (thoughts.length > 0) {
    const lastThought = thoughts[thoughts.length - 1];
    if (lastThought.thoughtType === 'conclusion') {
      return true;
    }
  }

  // Check max thoughts
  if (session.thoughtCount >= CONFIG.maxThoughts) {
    return true;
  }

  return false;
}

/**
 * Check if we've met minimum thoughts for conclusion
 */
export function canConclude(session: ThinkingSession): boolean {
  return session.thoughtCount >= CONFIG.minThoughts;
}

/**
 * Get the next thought interval (randomized for realism)
 */
export function getNextThoughtInterval(): number {
  const range = CONFIG.maxThoughtIntervalMs - CONFIG.minThoughtIntervalMs;
  return CONFIG.minThoughtIntervalMs + Math.floor(Math.random() * range);
}

/**
 * Get the rest period between sessions
 */
export function getRestPeriod(): number {
  const range = CONFIG.maxRestPeriodMs - CONFIG.minRestPeriodMs;
  return CONFIG.minRestPeriodMs + Math.floor(Math.random() * range);
}

/**
 * Format timestamp for thought chain display
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// ============ SESSION STATE ============

/**
 * Get current session status for /watch display
 */
export function getSessionStatus(): {
  active: boolean;
  session: ThinkingSession | null;
  thoughts: SessionThought[];
  progress: { current: number; min: number; max: number };
  nextThoughtIn: number | null;
} {
  const session = getActiveThinkingSession();

  if (!session) {
    return {
      active: false,
      session: null,
      thoughts: [],
      progress: { current: 0, min: CONFIG.minThoughts, max: CONFIG.maxThoughts },
      nextThoughtIn: null,
    };
  }

  const thoughts = getSessionThoughts(session.id);

  return {
    active: true,
    session,
    thoughts,
    progress: {
      current: session.thoughtCount,
      min: CONFIG.minThoughts,
      max: CONFIG.maxThoughts,
    },
    nextThoughtIn: null, // Calculated by the caller
  };
}

/**
 * Force complete a session (for manual control)
 */
export async function forceCompleteSession(sessionId: string): Promise<void> {
  const session = getThinkingSession(sessionId);
  if (!session || session.status === 'complete') return;

  const thoughts = getSessionThoughts(sessionId);
  const lastThought = thoughts[thoughts.length - 1];
  const conclusion = lastThought?.content || 'session ended early - no clear conclusion reached.';

  await completeSession(session, conclusion);
}

/**
 * Cancel a session without storing insights
 */
export function cancelSession(sessionId: string): void {
  const session = getThinkingSession(sessionId);
  if (!session || session.status === 'complete') return;

  updateSessionStatus(sessionId, 'complete', 'session cancelled', []);
  console.log(`[ReasoningEngine] Session cancelled: ${sessionId}`);
}
