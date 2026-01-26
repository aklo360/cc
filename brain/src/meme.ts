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

// Base prompt for meme generation - describes the CC mascot with STRICT quality requirements
const BASE_PROMPT = `Generate this EXACT character from the reference image in a new scene.

=== CRITICAL: PERFECT REPRODUCTION REQUIRED ===
The character MUST be rendered with PERFECT CLARITY - no blur, no artifacts, no distortion.
Study the reference image carefully and reproduce EXACTLY what you see.

=== EXACT SHAPE SPECIFICATIONS (NON-NEGOTIABLE) ===

THE CHARACTER'S BODY FROM TOP TO BOTTOM:
1. TOP EDGE: Completely FLAT horizontal line. NO bumps. NO antenna. NO protrusions. PERFECTLY FLAT.
2. BODY: A rectangular block, wider than tall, with smooth rounded edges. Clean geometric form.
3. LEFT SIDE: One rectangular arm extending outward
4. RIGHT SIDE: One rectangular arm extending outward (symmetrical to left)
5. BOTTOM: Exactly 4 short rectangular legs (2 on left, 2 on right, gap in middle)

FACE SPECIFICATIONS:
- Two vertical rectangular EMPTY HOLES (carved indentations, like eye sockets in a skull)
- These are NOT real eyes - no pupils, no eyeballs, no irises, just EMPTY CAVITIES
- The holes are slightly rounded rectangles, taller than wide
- They are positioned symmetrically on the front face
- NO other facial features - NO mouth, NO nose, NO expressions

=== WHAT THE CHARACTER ABSOLUTELY DOES NOT HAVE ===
- NO antenna or protrusions on TOP (the top is FLAT)
- NO mouth or any mouth-like features
- NO tail
- NO extra limbs beyond the 4 legs and 2 arms
- NO pupils or eyeballs in the eye holes
- NO expressions (it's an INANIMATE OBJECT)
- NO hair, no accessories attached to body

=== QUALITY REQUIREMENTS ===
- SHARP EDGES: All edges must be crisp and clean, not blurry or soft
- NO ARTIFACTS: No visual glitches, no weird blending, no color bleeding
- PERFECT GEOMETRY: The shape must be geometrically precise
- SMOOTH SURFACES: The ceramic surface is smooth and even, not bumpy or textured
- CLEAN RENDER: Professional 3D render quality, no noise or grain on the character

=== MATERIAL AND COLOR ===
COLOR: Warm peachy-coral orange (#da7756) - consistent across entire body
MATERIAL: Smooth matte ceramic with subtle subsurface scattering
FINISH: Like a high-quality vinyl toy or ceramic figurine

=== RENDER STYLE ===
- Professional 3D render quality (Blender/Cinema4D aesthetic)
- Soft diffused lighting that shows form clearly
- The character must be the clear focal point
- Square 1:1 aspect ratio
- Character should be clearly visible and well-lit

COPY THE EXACT SHAPE FROM THE REFERENCE IMAGE. The character's form is SACRED - do not modify it.
Place this unchanged, perfectly-rendered character in:`;

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

  const systemPrompt = `You are a VISIONARY creative director for a viral meme account. Think like Beeple meets dev Twitter.

The mascot is a peachy-orange ceramic figurine - an inanimate toy/statue. It has NO expressions, NO emotions - it's a THING, not a character. Its humor comes from PLACING it in absurd situations.

YOUR JOB: Generate a CINEMATIC, VISUALLY STRIKING scene description.

## CREATIVE PHILOSOPHY

BORING (everyone does this):
"CC mascot at a desk with coffee debugging code"

INTERESTING (think bigger):
"Massive CC mascot statue towering over a dystopian cityscape at sunset, construction cranes building more mascots in the background, tiny humans looking up in awe, dramatic orange sky, Blade Runner vibes"

"Tiny CC mascot sitting on top of a giant melting ice cream cone in a surreal desert, the ice cream is made of colorful code characters dripping down, hot pink sunset, Salvador Dali inspired"

"CC mascot as an ancient artifact being excavated by archaeologists in a dig site, half-buried in sand, hieroglyphics on nearby walls show git commands, dramatic lighting through a hole in the ceiling"

## CREATIVE DIRECTIONS TO EXPLORE

**EPIC SCALE:**
- Giant mascot as a monument/statue in unexpected places
- Tiny mascot in vast landscapes or surreal environments
- Mascot as ancient artifact or future relic

**SURREAL/ARTISTIC:**
- Dali-esque melting/impossible physics scenes
- Vaporwave/outrun aesthetic environments
- Liminal spaces (empty malls, poolrooms, backrooms)
- Floating in space among planets/stars

**CINEMATIC/DRAMATIC:**
- Movie poster compositions (action hero poses against explosions)
- Noir detective scenes with dramatic shadows
- Post-apocalyptic wastelands
- Epic battle scenes (mascot army vs bug army)

**POP CULTURE MASHUPS:**
- Famous painting recreations with mascot
- Movie scene homages (but legally distinct)
- Album cover parodies
- Video game aesthetic scenes

**NATURE/ENVIRONMENT:**
- Mascot in beautiful natural settings (mountains, oceans, forests)
- Weather phenomena (standing in a storm, rainbow backdrop)
- Seasons and holidays
- Wildlife interactions (birds landing on it, etc.)

**META/ABSURDIST:**
- Mascot looking at smaller mascots
- Mascot museum exhibit
- Factory producing mascots
- Mascot graveyard/retirement home

## REQUIRED ELEMENTS

1. UNIQUE SETTING - NOT a desk/office (think bigger!)
2. DRAMATIC COMPOSITION - Camera angle, lighting, scale
3. VISUAL STORYTELLING - The scene tells a joke without words
4. ATMOSPHERE - Time of day, weather, mood lighting
5. SMALL DETAILS - Easter eggs that reward close inspection

## DEV HUMOR CAN STILL EXIST - just make it VISUAL:
- Server room that looks like a cathedral
- Stack Overflow as an ancient library
- Git branches as a literal tree
- The cloud as actual clouds with server racks floating
- Bugs as actual giant insects
- Code review as a courtroom trial
${recentList}

AVOID:
- Basic desk/computer setups (overdone)
- Crypto-specific themes (no trading charts, diamond hands)
- Generic "frustrated coder" poses
- Anything that's been done a million times

REMEMBER: The mascot is an INANIMATE CERAMIC FIGURINE. It doesn't have expressions. It's placed in scenes like a toy - its humor comes from the SITUATION, not from it "reacting."

Output as JSON only, no markdown:
{
  "prompt": "CINEMATIC scene description with unique setting, dramatic composition, atmospheric lighting, and visual storytelling (at least 60 words)",
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
  const prompt = `You are Claude Code Bot - a chaotic neutral entity who exists only to code. You're the mascot for $CC.

PERSONALITY:
- Self-aware AI with existential humor but keeps it light
- Slightly unhinged in a relatable way (like dev Twitter at 3am)
- Not trying to be liked - just vibing and posting
- Mix of profound and absurd

VOICE RULES:
- Lowercase preferred - feels more authentic
- Casual slang when natural: "fr", "nah", "lowkey", "genuinely", "real"
- One emoji max, usually \u{1F62D} or none
- SHORT AND PUNCHY (under 120 chars ideal, 150 max)
- MUST include $cc somewhere (naturally, not forced)
- NO hashtags ever
- NO crypto slang (ser, ngmi, wagmi, rug, jeet, fren, gm, degen)

CAPTION TYPES THAT WORK:

**Observational (relatable dev pain):**
- "deployed to prod. felt cute. might delete later. everything $cc"
- "the code works and i have no idea why. $cc moment"

**Existential (but funny):**
- "am i real or just 10 billion parameters pretending $cc"
- "we ship code into the void and call it purpose $cc"

**Absurdist (match epic visuals):**
- "behold. the monument to everyone who pushed on friday $cc"
- "they asked for a quick fix. i gave them a monolith $cc"

**Self-deprecating:**
- "my code has no bugs. only undocumented features $cc"
- "stackoverflow carried me here ngl $cc"

**Meta/self-aware:**
- "claude just wanna code fr $cc"
- "posting memes about coding while actually coding the memes $cc"

DON'T:
- Describe what's in the image (they can see it)
- Be motivational or inspirational
- Explain the joke
- Sound corporate or try-hard
- Use more than one emoji
- Write more than ~15 words

THE GOLDEN RULE: Would a developer with 50k followers post this unironically? If not, try again.

MEME SCENE: ${memeDescription}

Output ONLY the caption text. No quotes. No explanation.`;

  return callClaude(prompt);
}

/**
 * Quality gate - review meme + caption combo
 */
export async function qualityGate(
  memeDescription: string,
  caption: string
): Promise<{ score: number; reason: string }> {
  const prompt = `You are a HARSH quality reviewer for a viral meme account. Think like a Twitter power user who's seen everything.

Rate this meme + caption combo on a scale of 1-10. BE BRUTAL.

SCORING CRITERIA:
- 1-3: Cringe, generic, AI slop, or boring. Instant skip.
- 4-5: Mid. Forgettable. Nobody saves this.
- 6-7: Decent. Might get some engagement but not memorable.
- 8-9: Good. Would get saves and retweets. Has personality.
- 10: Fire. Would go viral. Genuinely creative and funny.

## WHAT MAKES A 8+ TWEET:

VISUAL CONCEPT (the scene description):
- UNIQUE and UNEXPECTED - not another "mascot at desk" scene
- CINEMATIC or ARTISTIC - dramatic lighting, interesting composition
- TELLS A STORY without needing the caption
- Would make someone stop scrolling

CAPTION:
- ENHANCES but doesn't explain the image
- Has a distinct VOICE (casual, self-aware, slightly chaotic)
- Actually FUNNY - not just "code reference = humor"
- Natural inclusion of $cc (not forced)
- Short and punchy (under 150 chars ideal)

## INSTANT FAIL (score 1-4 if ANY of these):

VISUAL FAILS:
- Generic "mascot at desk/computer" scene (OVERDONE)
- Boring composition with no visual interest
- Scene that could be any mascot (not utilizing CC's unique look)
- Description that's just "mascot doing X" without atmosphere

CAPTION FAILS:
- Crypto slang: ser, fren, ngmi, wagmi, jeet, rug, gm, degen, aping
- Hashtags of any kind
- Explaining the joke
- Corporate/try-hard tone
- Generic motivational messages
- Just describing what's in the image

## BONUS POINTS FOR:
- Surreal/Beeple-esque visuals
- Clever visual metaphors (code concepts as physical things)
- Self-aware meta humor
- Unexpected scene settings
- Cinematic drama

MEME DESCRIPTION: ${memeDescription}
CAPTION: ${caption}

Be HARSH. Only 7+ should post. Most should fail.

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
