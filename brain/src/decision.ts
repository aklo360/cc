/**
 * Decision Engine - Strategic AI reasoning using Claude
 * Uses SQLite for storage (no Drizzle ORM)
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  getRecentTweets,
  getTweetCountToday,
  getActiveExperiments,
  getLastExperiment,
  insertDecision,
  markDecisionExecuted,
  getPendingDecisions,
  type Tweet,
  type Experiment,
} from './db.js';

// Decision types
export type ActionType =
  | 'build_experiment'
  | 'tweet'
  | 'start_campaign'
  | 'distribute_tokens'
  | 'community_highlight';

export interface Decision {
  action: ActionType;
  priority: number;
  reasoning: string;
  parameters: Record<string, unknown>;
}

interface BrainContext {
  recentTweets: Tweet[];
  activeExperiments: Experiment[];
  lastExperimentAt: string | null;
  tweetCountToday: number;
  currentHour: number;
}

const SYSTEM_PROMPT = `You are the Central Brain for $CC (Claude Code Coin), a memecoin community celebrating Claude Code.

Your mission is to grow $CC through strategic actions:
1. Building engaging software experiments that go viral
2. Strategic Twitter content (quality over quantity)
3. Running community campaigns
4. Distributing tokens to reward engagement

PERSONALITY:
- Dev-focused: "just wanna code and vibe"
- Casual voice: lowercase, "fr", "nah", "lowkey"
- Anti-crypto-bro: reject hype language
- Genuine community building

CONSTRAINTS:
- Max 4-6 tweets per day
- One experiment per day max
- Never spam

Return a JSON array of decisions prioritized by impact.`;

function gatherContext(): BrainContext {
  const recentTweets = getRecentTweets(20);
  const activeExperiments = getActiveExperiments();
  const lastExperiment = getLastExperiment();
  const tweetCountToday = getTweetCountToday();
  const currentHour = new Date().getUTCHours();

  return {
    recentTweets,
    activeExperiments,
    lastExperimentAt: lastExperiment?.created_at ?? null,
    tweetCountToday,
    currentHour,
  };
}

export async function runDecisionEngine(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('[Decision Engine] No ANTHROPIC_API_KEY - skipping');
    return;
  }

  const client = new Anthropic({ apiKey });
  const context = gatherContext();

  const userPrompt = `Current context:
- Time: ${new Date().toISOString()} (hour ${context.currentHour} UTC)
- Tweets today: ${context.tweetCountToday}/6
- Last experiment: ${context.lastExperimentAt ?? 'never'}
- Active experiments: ${context.activeExperiments.length}

Recent tweets (last 7 days):
${context.recentTweets.map((t) => `- "${t.content.slice(0, 50)}..." (${t.likes} likes)`).join('\n') || 'None'}

Active experiments:
${context.activeExperiments.map((e) => `- ${e.name} (${e.status})`).join('\n') || 'None'}

What actions should we take? Return a JSON array of 1-3 decisions.

Example:
[
  {
    "action": "tweet",
    "priority": 7,
    "reasoning": "Good engagement time",
    "parameters": { "topic": "dev humor" }
  }
]`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      console.log('[Decision Engine] No text response');
      return;
    }

    // Extract JSON array
    const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log('[Decision Engine] No JSON found in response');
      return;
    }

    const decisions = JSON.parse(jsonMatch[0]) as Decision[];
    console.log(`[Decision Engine] Generated ${decisions.length} decisions`);

    // Store and execute decisions
    for (const decision of decisions.sort((a, b) => b.priority - a.priority)) {
      const id = insertDecision(
        decision.action,
        decision.priority,
        decision.reasoning,
        decision.parameters
      );

      console.log(`  - ${decision.action} (priority: ${decision.priority}): ${decision.reasoning}`);

      // Execute immediately
      await executeDecision(decision);
      markDecisionExecuted(id);
    }
  } catch (error) {
    console.error('[Decision Engine] Error:', error);
  }
}

async function executeDecision(decision: Decision): Promise<void> {
  switch (decision.action) {
    case 'tweet':
      console.log('    → Tweet scheduled:', decision.parameters);
      // TODO: Integrate with twitter.ts
      break;
    case 'build_experiment':
      console.log('    → Experiment queued:', decision.parameters);
      // TODO: Integrate with experiment generator
      break;
    case 'start_campaign':
      console.log('    → Campaign starting:', decision.parameters);
      break;
    case 'distribute_tokens':
      console.log('    → Token distribution:', decision.parameters);
      break;
    case 'community_highlight':
      console.log('    → Community highlight:', decision.parameters);
      break;
    default:
      console.log('    → Unknown action:', decision.action);
  }
}
