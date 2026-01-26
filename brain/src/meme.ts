/**
 * Meme Generation Engine for Central Brain
 *
 * Generates AI memes during cooldown periods between feature builds.
 * Uses:
 * - Claude Opus 4.5 for prompt generation, captions, and quality gating
 * - Gemini 2.0 Flash for image generation
 * - Twitter API for posting
 *
 * Ported from worker/src/index.ts + worker/src/claude.ts
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  getMemeState,
  canPostMeme as dbCanPostMeme,
  setMemeInProgress,
  insertMeme,
  recordMemePost,
  getMemeStats,
  canTweetGlobally,
  recordTweet,
} from './db.js';
import { MEME_PROMPTS } from './meme-prompts.js';
import {
  postTweetWithImage,
  getTwitterCredentials,
  CC_COMMUNITY_ID,
} from './twitter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Base prompt for meme generation - describes the CC mascot
const BASE_PROMPT = `Generate this EXACT character from the reference image in a new scene.

CRITICAL SHAPE RULES - THE TOP OF THE BODY IS COMPLETELY FLAT:

THE CHARACTER'S BODY FROM TOP TO BOTTOM:
1. TOP EDGE: Completely flat horizontal line. NO bumps. NO antenna. NO protrusions. FLAT.
2. BODY: A rectangular block, wider than it is tall, with heavily rounded edges.
3. LEFT SIDE: one rectangular arm
4. RIGHT SIDE: one rectangular arm
5. BOTTOM: 4 short rectangular legs (2 on left side, 2 on right side, with a gap in the middle).

WHAT THE CHARACTER DOES NOT HAVE:
- NO antenna or protrusions on TOP of the body
- NO mouth
- NO tail
- NO extra limbs of any kind
- The only things sticking out are: the 4 LEGS at the BOTTOM, and the two ARMS on the LEFT and RIGHT

FACE: Two vertical rectangular EMPTY HOLES on the front (these are carved indentations, not real eyes - no pupils, no eyeballs, just empty cavities). No other facial features.

THIS IS AN INANIMATE CERAMIC FIGURINE - like a toy or statue. It has no expressions, no emotions, no moving parts.

COLOR: Warm peachy-coral orange (#da7756)
MATERIAL: Smooth matte ceramic
STYLE: 3D render, soft studio lighting, warm tones, Blender aesthetic, square 1:1

COPY THE EXACT SHAPE FROM THE REFERENCE IMAGE. Place this unchanged character in:`;

// Base image URL for the CC mascot
const BASE_IMAGE_URL = 'https://claudecode.wtf/claudecode.jpg';

// Cache the base image
let cachedImageBase64: string | null = null;

export interface MemeResult {
  success: boolean;
  error?: string;
  tweet_id?: string;
  caption?: string;
  quality_score?: number;
  attempts?: number;
  prompt?: string;
  description?: string;
}

// ============ Claude API Helpers ============

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>;
  stop_reason: string;
}

async function callClaude(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 300,
      temperature: 0.9,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as AnthropicResponse;
  const text = data.content.find((c) => c.type === 'text')?.text;
  if (!text) throw new Error('No text response from Claude');
  return text.trim();
}

// ============ Meme Generation Functions ============

/**
 * Generate a creative meme prompt using Claude
 */
export async function generateMemePrompt(
  recentPrompts: string[]
): Promise<{ prompt: string; description: string }> {
  const recentList =
    recentPrompts.length > 0
      ? `\n\n## RECENT PROMPTS TO AVOID (don't repeat):\n${recentPrompts.map((p) => `- ${p}`).join('\n')}`
      : '';

  const systemPrompt = `You are a creative director for a dev-focused Twitter meme account featuring the $CC mascot.

The mascot is a cute peachy-orange ceramic robot figurine who just wants to code.

YOUR JOB: Generate a DETAILED scene description for Gemini to render as an image.

## CRITICAL: Gemini needs VISUAL DETAILS to create a unique image!

BAD PROMPT (too vague, Gemini will just show a generic pose):
"CC mascot debugging code"

GOOD PROMPT (specific scene, props, lighting, atmosphere):
"CC mascot sitting at a desk with a laptop, the screen shows a wall of red error messages, the mascot is holding its head with both arms in frustration, a 'JavaScript for Dummies' book is open next to it, coffee mug labeled 'I <3 Bugs' has tipped over and coffee is pooling on the desk, the clock on the wall shows 3:47am, room lit only by the laptop's blue glow casting dramatic shadows, sticky notes with 'WHY' written on them are stuck everywhere"

## REQUIRED ELEMENTS IN YOUR PROMPT:
1. Physical setting (desk, office, coffee shop, server room, etc.)
2. Props on screen or nearby (error messages, code, Stack Overflow, etc.)
3. The mascot's pose/action (typing, frustrated, celebrating, etc.)
4. Atmosphere/lighting (3am vibes, chaotic energy, etc.)
5. Small funny details (coffee spills, burning books, sticky notes, etc.)

## THEMES TO EXPLORE:
- Debugging at 3am
- Code reviews from hell
- "It works on my machine"
- Tutorial hell
- Stack Overflow copy-paste
- Deploying on Friday
- Merge conflicts
- Documentation that doesn't exist
- AI coding assistants (meta humor)
- Git blame pointing at yourself
${recentList}

AVOID:
- Crypto-specific themes (no trading, no charts, no "diamond hands")
- Financial/investment angles
- Anything that requires crypto knowledge to understand

Output as JSON only, no markdown:
{
  "prompt": "DETAILED visual scene description with setting, props, pose, lighting, and funny details (at least 50 words)",
  "description": "Brief 5-10 word summary for caption generation"
}`;

  const text = await callClaude(systemPrompt);

  try {
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch {
    // Fallback to a random base prompt
    const randomPrompt = MEME_PROMPTS[Math.floor(Math.random() * MEME_PROMPTS.length)];
    return {
      prompt: randomPrompt,
      description: randomPrompt,
    };
  }
}

/**
 * Generate a caption for the meme
 */
export async function generateCaption(memeDescription: string): Promise<string> {
  const prompt = `You are Claude Code Bot - a friendly robot who lives to code. You're the mascot for $CC (Claude Code Coin).

PERSONALITY:
- You're self-aware you're an AI and lean into it playfully
- You genuinely want everyone to learn to code
- You're like WALL-E meets a developer - curious, helpful, a little mischievous
- You speak like a real person on Twitter, not a corporate account

VOICE RULES:
- Lowercase is fine, feels more natural
- Use casual slang naturally: "fr", "nah", "lowkey", "deadass"
- Use emojis sparingly, mostly just \u{1F62D} for when something is too good/funny/relatable
- Keep it SHORT (under 150 chars ideal, 200 max)
- MUST include $cc somewhere
- NO hashtags ever
- NO crypto slang (ser, ngmi, wagmi, rug, jeet, fren, gm)

TOPICS TO AVOID:
- Politics, controversial takes, anything divisive
- Crypto-specific jargon and culture
- Anything offensive or crossing the line

HUMOR STYLE:
- Clever wordplay and double meanings
- Meta jokes about being an AI who codes
- Observations about dev life everyone relates to
- Never explain the joke

YOUR CORE CATCHPHRASE: "just wanna code" - use variations of this when it fits:
- "claude just wanna code"
- "i just wanna code fr"
- "all i wanna do is code"

EXAMPLE CAPTIONS (study these vibes):
- "claude just wanna code he really like me fr $cc"
- "3am and we still shipping. $cc doesn't sleep and neither do i apparently"
- "the debugger fears me (it shouldn't i'm lying) $cc"
- "bro said 'it works on my machine' like that helps anyone \u{1F62D} $cc"
- "wrote 500 lines today. deleted 400. this is the way $cc"

MEME DESCRIPTION: ${memeDescription}

Output ONLY the caption text, nothing else. No quotes around it.`;

  return callClaude(prompt);
}

/**
 * Quality gate - review meme + caption combo
 */
export async function qualityGate(
  memeDescription: string,
  caption: string
): Promise<{ score: number; reason: string }> {
  const prompt = `You are a quality reviewer for a dev-focused Twitter meme account. The voice should feel like a friendly AI who loves coding.

Rate this meme + caption combo on a scale of 1-10.

SCORING CRITERIA:
- 1-3: Cringe, generic, or AI slop. Would get ratio'd.
- 4-6: Mid. Might get a few likes but forgettable.
- 7-8: Good. Would get saves and retweets.
- 9-10: Fire. Would go viral.

WHAT MAKES A GOOD TWEET:
- Relatable dev humor (debugging at 3am, code reviews, "it works on my machine")
- Self-aware AI jokes
- Actually funny, not just "coding reference = funny"
- Caption enhances the image, doesn't just describe it
- Natural, casual voice (lowercase ok, slang like "fr" "nah" ok)
- Includes $cc naturally

INSTANT FAIL (score 1-3 if ANY of these):
- Contains crypto slang: ser, fren, ngmi, wagmi, jeet, rug, gm, degen, aping
- Contains hashtags
- Feels corporate or try-hard
- Explains the joke
- Political or controversial
- Generic "to the moon" energy

MEME DESCRIPTION: ${memeDescription}
CAPTION: ${caption}

Be harsh. Only 7+ is post-worthy.

Respond with ONLY a JSON object, no markdown:
{"score": N, "reason": "brief explanation"}`;

  const text = await callClaude(prompt);

  try {
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch {
    // If parsing fails, be conservative
    return { score: 5, reason: 'Failed to parse quality response' };
  }
}

// ============ Image Generation ============

/**
 * Get the base CC mascot image (cached)
 */
async function getBaseImage(): Promise<string> {
  if (cachedImageBase64) {
    return cachedImageBase64;
  }

  const response = await fetch(BASE_IMAGE_URL);
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  cachedImageBase64 = Buffer.from(binary, 'binary').toString('base64');
  return cachedImageBase64;
}

/**
 * Generate meme image using Gemini
 */
export async function generateMemeImage(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const baseImageBase64 = await getBaseImage();
  const fullPrompt = `${BASE_PROMPT}\n\n${prompt}`;

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: baseImageBase64 } },
              { text: fullPrompt },
            ],
          },
        ],
        generationConfig: { responseModalities: ['image', 'text'] },
      }),
    }
  );

  if (!geminiResponse.ok) {
    const errorText = await geminiResponse.text();
    throw new Error(`Gemini API error: ${errorText}`);
  }

  const data = (await geminiResponse.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: { mimeType: string; data: string } }> };
    }>;
  };

  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error('No response from Gemini');

  for (const part of parts) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error('No image generated');
}

// ============ Main Orchestration ============

/**
 * Check if we can post a meme (checks both meme-specific and global rate limits)
 */
export function canPostMeme(): { allowed: boolean; reason?: string } {
  // First check global tweet rate limit
  const globalCheck = canTweetGlobally();
  if (!globalCheck.allowed) {
    return { allowed: false, reason: `Global: ${globalCheck.reason}` };
  }

  // Then check meme-specific rate limit
  return dbCanPostMeme();
}

/**
 * Get meme stats (wrapper for db function)
 */
export { getMemeStats };

/**
 * Main function: Generate and post a meme
 */
export async function generateAndPostMeme(
  forcePost: boolean = false,
  onLog?: (message: string) => void
): Promise<MemeResult> {
  const log = (msg: string) => {
    console.log(`[Meme] ${msg}`);
    onLog?.(msg);
  };

  // Check rate limits (unless forced)
  if (!forcePost) {
    // Check global tweet rate limit first
    const globalCheck = canTweetGlobally();
    if (!globalCheck.allowed) {
      return { success: false, error: `Global rate limit: ${globalCheck.reason}` };
    }

    // Then check meme-specific rate limit
    const canPost = dbCanPostMeme();
    if (!canPost.allowed) {
      return { success: false, error: canPost.reason };
    }
  }

  // Mark as in progress
  setMemeInProgress(true);

  const state = getMemeState();
  const maxAttempts = 3;
  let attempts = 0;
  let lastError = '';

  try {
    while (attempts < maxAttempts) {
      attempts++;
      try {
        // 1. Generate a creative prompt using Claude
        log(`Attempt ${attempts}/${maxAttempts}: Generating meme prompt...`);
        const { prompt, description } = await generateMemePrompt(state.recent_prompts);
        log(`Prompt: "${description}"`);

        // 2. Generate the meme image
        log('Generating image with Gemini...');
        const imageBase64 = await generateMemeImage(prompt);
        log('Image generated!');

        // 3. Generate caption using Claude
        log('Generating caption...');
        const caption = await generateCaption(description);
        log(`Caption: "${caption}"`);

        // 4. Quality gate using Claude
        log('Running quality gate...');
        const quality = await qualityGate(description, caption);
        log(`Quality score: ${quality.score}/10 - ${quality.reason}`);

        if (quality.score < 6) {
          lastError = `Quality too low: ${quality.score}/10 - ${quality.reason}`;
          log(`Quality failed, retrying...`);

          // Record skipped meme
          insertMeme({
            prompt,
            description,
            caption,
            quality_score: quality.score,
            skipped_reason: quality.reason,
          });

          continue; // Try again
        }

        // 5. Post to Twitter
        log('Posting to Twitter...');
        const credentials = getTwitterCredentials();
        const tweet = await postTweetWithImage(caption, imageBase64, credentials, CC_COMMUNITY_ID);
        log(`Tweet posted! ID: ${tweet.id}`);

        // 6. Record success
        insertMeme({
          prompt,
          description,
          caption,
          quality_score: quality.score,
          twitter_id: tweet.id,
          posted_at: new Date().toISOString(),
        });

        // Record in global tweet rate limiter
        recordTweet(tweet.id, 'meme', caption);

        recordMemePost(prompt);

        return {
          success: true,
          tweet_id: tweet.id,
          caption,
          quality_score: quality.score,
          attempts,
          prompt,
          description,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        log(`Attempt ${attempts} failed: ${lastError}`);
      }
    }

    return {
      success: false,
      error: `Failed after ${maxAttempts} attempts. Last error: ${lastError}`,
      attempts,
    };
  } finally {
    // Always clear in-progress flag
    setMemeInProgress(false);
  }
}
