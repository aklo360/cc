/**
 * Cycle Engine - Full Autonomous 24-Hour Growth Cycle
 *
 * Complete loop:
 * 1. PLAN    - Claude plans project + tweets
 * 2. BUILD   - Claude Agent SDK builds the feature
 * 3. TEST    - Verify build succeeds
 * 4. DEPLOY  - Push to Cloudflare Pages
 * 5. VERIFY  - Check deployment works
 * 6. RECORD  - Capture video of the feature
 * 7. TWEET   - Post announcement with video
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
import { postTweetToCommunity, postTweetWithVideo, getTwitterCredentials, CC_COMMUNITY_ID } from './twitter.js';
import { buildProject, buildEvents, type BuildResult } from './builder.js';
import { deployToCloudflare, verifyDeployment } from './deployer.js';
import { recordFeature, type RecordResult } from './recorder.js';

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

interface FullCycleResult {
  cycleId: number;
  plan: CyclePlan;
  buildResult?: BuildResult;
  deployUrl?: string;
  recordResult?: RecordResult;
  announcementTweetId?: string;
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
- Tweet 1 (hour 0): Teaser - hint at what's coming, build hype
- Tweet 2 (hour 0, after deploy): Announcement - "just shipped [feature]" with link + video
- Tweet 3 (hour 6-8): Update/engagement - share reactions, respond to feedback
- Tweet 4 (hour 12-16): Meme or dev humor related to the project
- Tweet 5 (hour 20-24): Wrap up, tease what's next

PERSONALITY:
- Dev-focused: "just wanna code and vibe"
- Casual voice: lowercase preferred, "fr", "nah", "lowkey"
- Anti-crypto-bro: NO hype language, NO "gm", NO rocket emojis
- Genuine, not salesy

CONSTRAINTS:
- Each tweet max 280 chars
- Include claudecode.wtf/[slug] links in announcement tweet
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

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}`;
  console.log(logLine);
  buildEvents.emit('log', logLine);
}

export async function startNewCycle(): Promise<FullCycleResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    log('[Cycle Engine] No ANTHROPIC_API_KEY - cannot start cycle');
    return null;
  }

  // Check if there's already an active cycle
  const activeCycle = getActiveCycle();
  if (activeCycle) {
    log(`[Cycle Engine] Active cycle already exists (id: ${activeCycle.id})`);
    return null;
  }

  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('🚀 STARTING NEW 24-HOUR GROWTH CYCLE');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Create the cycle in DB
  const cycleId = createCycle();
  log(`📋 Created cycle #${cycleId}`);

  // ============ PHASE 1: PLAN ============
  log('\n▸ PHASE 1: PLANNING');

  const client = new Anthropic({ apiKey });
  const now = new Date();

  const userPrompt = `Current time: ${now.toISOString()}

Plan a complete 24-hour cycle starting now. Pick an exciting project and plan the tweets.

Remember: We're building for the $CC community - devs who love Claude Code and coding culture.

IMPORTANT: The first tweet should be a teaser (hours_from_start: 0).
The second tweet should be the announcement with video (hours_from_start: 0, but posted after deploy).
The rest should be spread across the 24 hours.

Return ONLY the JSON object, no other text.`;

  let plan: CyclePlan;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      log('[Cycle Engine] No text response from Claude');
      return null;
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      log('[Cycle Engine] No JSON found in response');
      return null;
    }

    plan = JSON.parse(jsonMatch[0]) as CyclePlan;
    log(`✅ Plan generated:`);
    log(`   Project: ${plan.project.idea} (/${plan.project.slug})`);
    log(`   Description: ${plan.project.description}`);
    log(`   Tweets: ${plan.tweets.length}`);

    updateCycleProject(cycleId, plan.project.idea, plan.project.slug);
  } catch (error) {
    log(`❌ Planning failed: ${error}`);
    return null;
  }

  // ============ PHASE 2: BUILD ============
  log('\n▸ PHASE 2: BUILDING');

  const buildResult = await buildProject({
    idea: plan.project.idea,
    slug: plan.project.slug,
    description: plan.project.description,
  });

  if (!buildResult.success) {
    log(`❌ Build failed: ${buildResult.error}`);
    log('⚠️ Cycle will continue with tweets only (no feature deployed)');
    // Schedule tweets anyway
    await scheduleAllTweets(cycleId, plan, now);
    return { cycleId, plan, buildResult };
  }

  log(`✅ Build successful`);
  log(`   Tokens: ${buildResult.tokensUsed}`);
  log(`   Cost: $${buildResult.costUsd?.toFixed(4)}`);

  // ============ PHASE 3: DEPLOY ============
  log('\n▸ PHASE 3: DEPLOYING');

  const deployResult = await deployToCloudflare();
  let deployUrl: string | undefined;

  if (!deployResult.success) {
    log(`❌ Deploy failed: ${deployResult.error}`);
    log('⚠️ Feature built but not deployed');
    await scheduleAllTweets(cycleId, plan, now);
    return { cycleId, plan, buildResult };
  }

  deployUrl = `https://claudecode.wtf/${plan.project.slug}`;
  log(`✅ Deployed to: ${deployUrl}`);

  // Verify deployment
  const verified = await verifyDeployment(deployUrl);
  if (!verified) {
    log('⚠️ Deployment verification failed, but continuing...');
  }

  // ============ PHASE 4: RECORD ============
  log('\n▸ PHASE 4: RECORDING');

  const recordResult = await recordFeature(deployUrl, plan.project.slug, 8);

  if (!recordResult.success) {
    log(`⚠️ Recording failed: ${recordResult.error}`);
    log('   Will post announcement without video');
  } else {
    log(`✅ Video recorded: ${recordResult.durationSec}s`);
  }

  // ============ PHASE 5: TWEET ANNOUNCEMENT ============
  log('\n▸ PHASE 5: TWEETING ANNOUNCEMENT');

  // Find the announcement tweet
  const announcementTweet = plan.tweets.find((t) => t.type === 'announcement');
  let announcementTweetId: string | undefined;

  if (announcementTweet) {
    try {
      const credentials = getTwitterCredentials();
      const tweetContent = announcementTweet.content.includes('claudecode.wtf')
        ? announcementTweet.content
        : `${announcementTweet.content}\n\n${deployUrl}`;

      if (recordResult.success && recordResult.videoBase64) {
        // Post with video
        log('📹 Posting announcement with video...');
        const result = await postTweetWithVideo(
          tweetContent,
          recordResult.videoBase64,
          credentials,
          CC_COMMUNITY_ID
        );
        announcementTweetId = result.id;
        log(`✅ Announcement posted with video: ${result.id}`);
      } else {
        // Post without video
        log('📝 Posting announcement (no video)...');
        const result = await postTweetToCommunity(tweetContent, credentials);
        announcementTweetId = result.id;
        log(`✅ Announcement posted: ${result.id}`);
      }

      // Record in DB
      insertTweet(tweetContent, 'announcement', announcementTweetId);
    } catch (error) {
      log(`❌ Announcement tweet failed: ${error}`);
    }
  }

  // ============ PHASE 6: SCHEDULE REMAINING TWEETS ============
  log('\n▸ PHASE 6: SCHEDULING TWEETS');

  // Schedule all non-announcement tweets
  for (const tweet of plan.tweets) {
    if (tweet.type === 'announcement') continue; // Already posted

    const scheduledTime = new Date(now.getTime() + tweet.hours_from_start * 60 * 60 * 1000);
    insertScheduledTweet(cycleId, tweet.content, scheduledTime.toISOString(), tweet.type);
    log(`   → ${tweet.type} scheduled for ${scheduledTime.toISOString()}`);
  }

  // ============ COMPLETE ============
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('🎉 CYCLE STARTED SUCCESSFULLY');
  log(`   Project: ${plan.project.idea}`);
  log(`   URL: ${deployUrl || 'not deployed'}`);
  log(`   Tweets scheduled: ${plan.tweets.length - 1}`);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return {
    cycleId,
    plan,
    buildResult,
    deployUrl,
    recordResult,
    announcementTweetId,
  };
}

async function scheduleAllTweets(cycleId: number, plan: CyclePlan, now: Date): Promise<void> {
  for (const tweet of plan.tweets) {
    const scheduledTime = new Date(now.getTime() + tweet.hours_from_start * 60 * 60 * 1000);
    insertScheduledTweet(cycleId, tweet.content, scheduledTime.toISOString(), tweet.type);
    log(`   → ${tweet.type} scheduled for ${scheduledTime.toISOString()}`);
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

  log(`[Tweet Executor] Found ${unpostedTweets.length} tweets ready to post`);

  let posted = 0;
  for (const tweet of unpostedTweets) {
    try {
      const credentials = getTwitterCredentials();
      // Post to the $CC community
      const result = await postTweetToCommunity(tweet.content, credentials);

      markTweetPosted(tweet.id, result.id);
      insertTweet(tweet.content, tweet.tweet_type, result.id);

      log(`  ✓ Posted to community: "${tweet.content.slice(0, 50)}..." (${result.id})`);
      posted++;

      // Wait a bit between tweets to avoid rate limits
      if (unpostedTweets.indexOf(tweet) < unpostedTweets.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (error) {
      log(`  ✗ Failed to post tweet: ${error}`);
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
  log(`[Cycle Engine] Cancelled cycle #${cycle.id}: ${cycle.project_idea}`);
  return cycle;
}

// Re-export buildEvents for the WebSocket server
export { buildEvents };
