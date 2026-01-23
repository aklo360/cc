/**
 * Cycle Engine - Plans and executes 24-hour growth cycles
 *
 * When triggered:
 * 1. Creates a new 24h cycle
 * 2. Uses Claude to plan a project + 4-6 tweets
 * 3. Schedules tweets throughout the 24h period
 * 4. Executes scheduled tweets via cron
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  createCycle,
  updateCycleProject,
  getActiveCycle,
  insertScheduledTweet,
  getUnpostedTweets,
  markTweetPosted,
  getAllScheduledTweets,
  insertTweet,
  completeCycle,
  type Cycle,
} from './db.js';
import { postTweetToCommunity, getTwitterCredentials } from './twitter.js';

interface CyclePlan {
  project: {
    idea: string;
    slug: string;
    description: string;
    why_viral: string;
  };
  tweets: Array<{
    content: string;
    type: 'teaser' | 'announcement' | 'update' | 'engagement' | 'meme';
    hours_from_start: number;
  }>;
}

const SYSTEM_PROMPT = `You are the Central Brain for $CC (Claude Code Coin), a memecoin community celebrating Claude Code.

You are about to plan a complete 24-hour growth cycle. This includes:
1. ONE project/experiment to build and ship
2. 4-6 strategic tweets spread throughout the 24 hours

PROJECT IDEAS (pick one or invent something better):
- Mini web games (like our Space Invaders or Moon Mission)
- Interactive tools (meme generators, calculators, visualizers)
- Fun experiments (AI demos, creative coding, generative art)
- Community features (leaderboards, challenges, rewards)

The project should be:
- Buildable in a few hours (simple but polished)
- Shareable/viral potential
- Related to coding, AI, or dev culture
- Fun and engaging

⚠️ CRITICAL PROJECT RULES - NEVER VIOLATE THESE:
1. ONLY ADD NEW FEATURES - Never modify, remove, or break existing code
2. Projects are ADDITIVE ONLY - New pages, new components, new files
3. NEVER touch existing files unless absolutely necessary for integration
4. If integration is needed, ONLY add imports/links - never change existing logic
5. All new code goes in NEW files in appropriate directories
6. Existing features MUST continue to work exactly as before
7. The site at claudecode.wtf must remain fully functional

EXISTING FEATURES (DO NOT BREAK):
- Landing page (/)
- Meme Generator (/meme)
- Space Invaders (/play)
- StarClaude64 3D game (/moon)
- All existing components and APIs

TWEET STRATEGY:
- Tweet 1 (hour 0-1): Teaser - hint at what's coming
- Tweet 2 (hour 4-6): Announcement - ship the thing, share the link
- Tweet 3 (hour 8-12): Update/engagement - share stats, respond to feedback
- Tweet 4 (hour 14-18): Meme or dev humor related to the project
- Tweet 5-6 (hour 20-24): Wrap up, tease tomorrow

PERSONALITY:
- Dev-focused: "just wanna code and vibe"
- Casual voice: lowercase preferred, "fr", "nah", "lowkey"
- Anti-crypto-bro: NO hype language, NO "gm", NO rocket emojis
- Genuine, not salesy

CONSTRAINTS:
- Each tweet max 280 chars
- Include claudecode.wtf links when relevant
- Don't be cringe
- No hashtags unless ironic

Return a JSON object with this exact structure:
{
  "project": {
    "idea": "Short name of the project",
    "slug": "url-friendly-slug",
    "description": "What it does in 1-2 sentences",
    "why_viral": "Why this could spread"
  },
  "tweets": [
    {
      "content": "The actual tweet text",
      "type": "teaser|announcement|update|engagement|meme",
      "hours_from_start": 0
    }
  ]
}`;

export async function startNewCycle(): Promise<{ cycleId: number; plan: CyclePlan } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('[Cycle Engine] No ANTHROPIC_API_KEY - cannot start cycle');
    return null;
  }

  // Check if there's already an active cycle
  const activeCycle = getActiveCycle();
  if (activeCycle) {
    console.log(`[Cycle Engine] Active cycle already exists (id: ${activeCycle.id})`);
    return null;
  }

  console.log('[Cycle Engine] Starting new 24-hour cycle...');

  // Create the cycle in DB
  const cycleId = createCycle();
  console.log(`[Cycle Engine] Created cycle #${cycleId}`);

  // Get Claude to plan the cycle
  const client = new Anthropic({ apiKey });

  const now = new Date();
  const userPrompt = `Current time: ${now.toISOString()}

Plan a complete 24-hour cycle starting now. Pick an exciting project and plan the tweets.

Remember: We're building for the $CC community - devs who love Claude Code and coding culture.

Return ONLY the JSON object, no other text.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      console.log('[Cycle Engine] No text response from Claude');
      return null;
    }

    // Extract JSON
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('[Cycle Engine] No JSON found in response');
      console.log('Response:', textContent.text);
      return null;
    }

    const plan = JSON.parse(jsonMatch[0]) as CyclePlan;
    console.log(`[Cycle Engine] Plan generated:`);
    console.log(`  Project: ${plan.project.idea} (${plan.project.slug})`);
    console.log(`  Tweets: ${plan.tweets.length}`);

    // Update cycle with project info
    updateCycleProject(cycleId, plan.project.idea, plan.project.slug);

    // Schedule all tweets
    for (const tweet of plan.tweets) {
      const scheduledTime = new Date(now.getTime() + tweet.hours_from_start * 60 * 60 * 1000);
      insertScheduledTweet(cycleId, tweet.content, scheduledTime.toISOString(), tweet.type);
      console.log(`  → Tweet scheduled for ${scheduledTime.toISOString()}: "${tweet.content.slice(0, 50)}..."`);
    }

    console.log('[Cycle Engine] Cycle planned and scheduled!');
    return { cycleId, plan };
  } catch (error) {
    console.error('[Cycle Engine] Error planning cycle:', error);
    return null;
  }
}

export async function executeScheduledTweets(): Promise<number> {
  const activeCycle = getActiveCycle();
  if (!activeCycle) {
    return 0;
  }

  const unpostedTweets = getUnpostedTweets(activeCycle.id);
  if (unpostedTweets.length === 0) {
    return 0;
  }

  console.log(`[Cycle Engine] Found ${unpostedTweets.length} tweets ready to post`);

  let posted = 0;
  for (const tweet of unpostedTweets) {
    try {
      const credentials = getTwitterCredentials();
      // Post to the $CC community
      const result = await postTweetToCommunity(tweet.content, credentials);

      markTweetPosted(tweet.id, result.id);
      insertTweet(tweet.content, tweet.tweet_type, result.id);

      console.log(`  ✓ Posted to community: "${tweet.content.slice(0, 50)}..." (${result.id})`);
      posted++;

      // Wait a bit between tweets to avoid rate limits
      if (unpostedTweets.indexOf(tweet) < unpostedTweets.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (error) {
      console.error(`  ✗ Failed to post tweet:`, error);
    }
  }

  return posted;
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

export function cancelActiveCycle(): Cycle | null {
  const cycle = getActiveCycle();
  if (!cycle) {
    return null;
  }

  completeCycle(cycle.id);
  console.log(`[Cycle Engine] Cancelled cycle #${cycle.id}: ${cycle.project_idea}`);
  return cycle;
}
