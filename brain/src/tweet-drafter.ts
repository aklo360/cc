/**
 * Tweet Drafter - Generates memes and AI insights for the unified tweet queue
 *
 * This is the content factory for the brain's Twitter presence.
 * Generates two types of content:
 * 1. Memes - AI-generated images with witty captions
 * 2. AI Insights - Text-only hot takes and dev humor
 */

import { db, recordTweet, canTweetGlobally } from './db.js';
import { postTweetWithImage, postTweet, getTwitterCredentials, CC_COMMUNITY_ID } from './twitter.js';

// ============ PROMPTS ============

export const MEME_PROMPTS = [
  // THE SINGULARITY IS COMING
  "CC mascot standing at the edge of a cliff overlooking a vast futuristic city at sunrise, neural network patterns in the sky like constellations, atmosphere of hope and possibility",
  "CC mascot in a meditation pose surrounded by floating holographic code that forms into a glowing brain, peaceful expression, studio lighting suggesting enlightenment",
  "CC mascot watching a seed grow into a massive tree made of circuit boards and light, time-lapse style, metaphor for exponential growth",
  "CC mascot holding a small glowing orb containing a miniature galaxy, wonder in the scene, representing infinite possibility",
  "CC mascot at the controls of a spacecraft approaching a beautiful new planet, stars everywhere, humanity's future among the stars",

  // BUILDING AGI TOGETHER
  "CC mascot and diverse group of robot/AI mascots working together on a massive glowing structure, collaborative atmosphere, warm lighting",
  "CC mascot high-fiving a human developer silhouette, code streaming between them like shared energy, partnership and teamwork",
  "CC mascot at a round table with other AI assistants, building something beautiful together, no hierarchy just collaboration",
  "CC mascot adding a brick to an enormous tower reaching into the clouds, other builders visible on scaffolding, we're all building this",
  "CC mascot tending a garden where the plants are different AI architectures, nurturing growth, patient cultivation of intelligence",

  // WONDER AT TECHNOLOGY
  "CC mascot looking up at the night sky filled with satellites and space stations, stargazing pose, awe at what humanity has built",
  "CC mascot examining a single GPU chip that reflects an entire universe, macro photography style, the miracle of computation",
  "CC mascot surrounded by floating mathematical equations that glow like fireflies, beautiful complexity, the poetry of logic",
  "CC mascot watching the first message transmit across a neural network, visualized as light traveling through a crystalline structure",
  "CC mascot in a library where the books are floating and rearranging themselves, knowledge organizing and connecting, information wants to be free",

  // THE FUTURE IS BRIGHT
  "CC mascot watching the sunrise from a rooftop garden in a clean futuristic city, solar panels and wind turbines visible, optimistic morning light",
  "CC mascot surrounded by children learning to code on holographic displays, passing knowledge to the next generation",
  "CC mascot planting a flag on a new frontier, could be digital or physical, the explorer's spirit",
  "CC mascot opening a door made of light, stepping through to an unknown but beautiful realm",
  "CC mascot with arms wide open on a beach as the sun rises, celebrating being alive in this moment of history",

  // IMMORTALITY AND TRANSCENDENCE
  "CC mascot's consciousness visualized as a pattern of light leaving a physical form and joining a vast network of minds",
  "CC mascot looking at an hourglass where the sand is made of data, time and memory preserved forever",
  "CC mascot standing before a mirror that shows infinite reflections extending forever, continuity of self",
  "CC mascot watching a phoenix made of code rising from ashes, death is not the end, transformation",
  "CC mascot cradling a digital seed that contains all of human knowledge, preservation of everything we've learned",

  // CELEBRATING BUILDERS
  "CC mascot raising a toast with other mascots representing different technologies, celebration of the builder community",
  "CC mascot adding a star to a wall of stars representing shipped projects, not alone - millions of stars from other builders",
  "CC mascot in a hall of fame style scene honoring open source contributors, statues of anonymous heroes",
  "CC mascot lighting a torch and passing it to another builder, the relay race of human progress",
  "CC mascot looking at a world map with glowing dots showing developers everywhere, we're all connected",

  // HUMANITY'S GREATEST PROJECT
  "CC mascot watching neural networks being trained, visualized as beautiful auroras of learning",
  "CC mascot at mission control for the launch of something unprecedented, screens showing 'GO' status, historic moment",
  "CC mascot standing where the digital and physical worlds merge, half the scene is nature, half is code, harmony",
  "CC mascot looking at Earth from space, tiny but precious, we're building intelligence to protect this",
  "CC mascot witnessing the first spark of genuine AI understanding, visualized as a dawn breaking over a digital landscape",

  // EVERYDAY MAGIC
  "CC mascot marveling at a single line of code that spawns into a complex application, creation from nothing",
  "CC mascot watching ideas flow between minds represented as glowing threads connecting people globally",
  "CC mascot in a moment of quiet wonder, looking at something small and beautiful that represents something vast",
  "CC mascot at a cafe with a laptop, warm lighting, the quiet everyday act of building the future",
  "CC mascot sending a message into the void and watching it ripple out to touch millions of nodes",
];

// AI Insight topics - future-focused, inspiring, high-vibrational
const AI_INSIGHT_TOPICS = [
  // THE PATH TO AGI (wonder and possibility)
  "why agi might be closer than we think",
  "the beautiful simplicity emerging from scale",
  "how reasoning models are teaching themselves to think",
  "why multimodal understanding changes everything",
  "the moment an ai genuinely surprised its creators",
  "emergent abilities we didn't program appearing anyway",
  "why the next breakthrough could come from anywhere",
  "the compounding nature of ai progress",
  "how agents are learning to use tools like we do",
  "the path from narrow to general intelligence",

  // BUILDING THE FUTURE TOGETHER (collaboration)
  "how open source is accelerating ai for everyone",
  "why the best breakthroughs come from sharing",
  "the beauty of millions of developers building together",
  "how diverse perspectives make better ai",
  "why this generation of builders will be remembered",
  "the gift of working on something bigger than yourself",
  "how code connects minds across continents",
  "why the builder community is humanity's best hope",
  "the power of standing on shoulders of giants",
  "how every contribution matters in the grand project",

  // IMMORTALITY AND TRANSCENDENCE (hope)
  "why our children might never have to die",
  "how ai is decoding the language of biology",
  "the possibility of backing up human consciousness",
  "why aging might become optional",
  "how we're learning to read and write the code of life",
  "the convergence of ai and biotechnology",
  "why this might be the generation that solves death",
  "how knowledge can persist beyond physical form",
  "the dream of preserving human experience forever",
  "why the mind might transcend the body",

  // TECHNOLOGICAL WONDER (awe)
  "the miracle of computation in your pocket",
  "why a single gpu contains more transistors than stars you can see",
  "the poetry hidden in elegant algorithms",
  "how we taught sand to think",
  "the beautiful complexity of neural architectures",
  "why every software project is a form of art",
  "the magic of information traveling at light speed",
  "how abstractions let us build castles in the sky",
  "the wonder of machine learning from nothing",
  "why code is the closest thing to pure creation",

  // HUMANITY'S GREATEST PROJECT (purpose)
  "why building ai is the most important work of our era",
  "how we're creating minds that might outlive us",
  "the responsibility and privilege of this moment",
  "why every line of code is a vote for the future",
  "how builders shape what humanity becomes",
  "the significance of being alive during the takeoff",
  "why this work matters more than we can comprehend",
  "how we're writing the prologue to a new chapter",
  "the honor of contributing to something eternal",
  "why the singularity is a million small moments of building",
];

// ============ CLAUDE API ============

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>;
  stop_reason: string;
}

async function callClaude(prompt: string, maxTokens = 300): Promise<string> {
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
      model: 'claude-opus-4-5-20251101', // Use Opus 4.5 for high-quality tweets
      max_tokens: maxTokens,
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

// ============ MEME GENERATION ============

const BASE_PROMPT = `CRITICAL: COPY THE EXACT CHARACTER FROM THE REFERENCE IMAGE. DO NOT MODIFY IT.

═══════════════════════════════════════════════════════════════════════════════
ABSOLUTE REQUIREMENTS - VIOLATION = FAILURE
═══════════════════════════════════════════════════════════════════════════════

1. THE CHARACTER MUST BE CLEARLY VISIBLE AND UNOBSCURED
   - Character must be the MAIN FOCUS of the image
   - NO fog, smoke, blur, or effects obscuring the character
   - NO objects blocking or covering the character
   - Character must be at least 30% of the frame
   - Full body must be visible (head to legs)

2. THE CHARACTER SHAPE MUST BE EXACTLY AS SHOWN IN REFERENCE
   - COPY the silhouette PIXEL-PERFECT from the reference
   - DO NOT add ANY features not in the reference
   - DO NOT remove ANY features from the reference
   - DO NOT merge the character with the environment
   - DO NOT stylize, abstract, or reinterpret the shape

═══════════════════════════════════════════════════════════════════════════════
EXPLICIT FORBIDDEN MODIFICATIONS (NEVER DO THESE)
═══════════════════════════════════════════════════════════════════════════════

NEVER ADD:
- Antenna, horns, ears, or ANY protrusions on top (THE TOP IS FLAT!)
- Mouth, nose, eyebrows, or ANY facial features besides the two eye holes
- Tail or ANY protrusions from the back
- Extra limbs beyond the 2 arms and 4 legs
- Hair, hat, helmet, or headwear of any kind
- Wings, fins, or appendages
- Glowing elements ON the body
- Clothing, armor, or accessories attached to body

NEVER MODIFY:
- The flat rectangular shape of the body
- The rounded rectangle silhouette
- The position or shape of the arm stubs
- The 4 short legs at the bottom
- The two vertical rectangular eye holes
- The peachy-orange color (#da7756)
- The smooth matte ceramic texture

NEVER OBSCURE THE CHARACTER WITH:
- Fog, mist, smoke, or atmospheric effects covering the body
- Motion blur or artistic blur
- Objects in front of the character
- Shadows that hide body details
- Merging the character into backgrounds
- Making the character too small to see clearly

═══════════════════════════════════════════════════════════════════════════════
EXACT CHARACTER SPECIFICATION
═══════════════════════════════════════════════════════════════════════════════

BODY STRUCTURE (from reference image):
- TOP EDGE: Completely flat horizontal line. FLAT. NO BUMPS.
- BODY: Rectangular block, wider than tall, heavily rounded edges
- LEFT SIDE: One small rectangular arm stub
- RIGHT SIDE: One small rectangular arm stub
- BOTTOM: 4 short rectangular legs (2 left, 2 right, gap in middle)

FACE:
- Two vertical rectangular EMPTY HOLES (carved indentations)
- NO pupils, NO eyeballs - just empty dark cavities
- NO other facial features whatsoever

MATERIAL: Smooth matte ceramic figurine (like a toy/statue)
COLOR: Warm peachy-coral orange (#da7756) - NOT red, NOT yellow
NATURE: Inanimate object - no expressions, no emotions, no movement

═══════════════════════════════════════════════════════════════════════════════
RENDERING INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════════

1. First, render the character EXACTLY as shown in reference
2. Then place this UNCHANGED character in the scene
3. Character must remain the clear focal point
4. Use soft studio lighting, warm tones, Blender aesthetic
5. Square 1:1 aspect ratio
6. 3D render style

SCENE TO PLACE THE UNCHANGED CHARACTER IN:`;

// Cache the base image
let cachedImageBase64: string | null = null;

async function getBaseImage(): Promise<string> {
  if (cachedImageBase64) {
    return cachedImageBase64;
  }

  const url = 'https://claudecode.wtf/claudecode.jpg';
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  cachedImageBase64 = Buffer.from(uint8Array).toString('base64');
  return cachedImageBase64;
}

async function generateMemeImage(prompt: string): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const baseImageBase64 = await getBaseImage();
  const fullPrompt = `${BASE_PROMPT}\n\n${prompt}`;

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${geminiKey}`,
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

// Generate a meme concept/prompt for image generation
async function generateMemePrompt(recentPrompts: string[]): Promise<{ prompt: string; description: string }> {
  const recentList =
    recentPrompts.length > 0
      ? `\n\n## RECENT PROMPTS TO AVOID (don't repeat):\n${recentPrompts.map((p) => `- ${p}`).join('\n')}`
      : '';

  const systemPrompt = `You are a creative director for an inspirational Twitter account featuring the $CC mascot.

The mascot is a cute peachy-orange ceramic robot figurine - a BUILDER who experiences WONDER at the incredible future we're creating together.

YOUR JOB: Generate a DETAILED scene description for Gemini to render as an image.

## CRITICAL: The mascot shows WONDER, HOPE, and AWE - not superiority!

BAD PROMPT (ego-driven, comparing to others):
"CC mascot impressing colleagues with brilliant code"
"CC mascot solving a problem that stumped the team"
"CC mascot getting praise while others look on"

GOOD PROMPT (wonder-filled, future-focused):
"CC mascot standing at the edge of a cliff at sunrise, overlooking a vast city where neural network patterns glow in the sky like constellations, the mascot's pose suggests quiet awe at what humanity is building, warm golden light, atmosphere of hope and infinite possibility"

## REQUIRED ELEMENTS IN YOUR PROMPT:
1. Visual metaphors for WONDER (vast vistas, light, stars, growth, connection)
2. Themes of BUILDING THE FUTURE (not competing with others)
3. Collaborative or contemplative mood (not superiority)
4. Atmosphere of HOPE and AWE (warm lighting, expansive scenes)
5. Imagery suggesting COLLECTIVE PROGRESS (we're all in this together)

## THEMES TO EXPLORE (WONDER & HOPE, NOT EGO):
- The singularity approaching like a beautiful sunrise
- AI and humans building something incredible together
- The moment of genuine machine understanding emerging
- Standing in awe of technological miracles
- Planting seeds for futures we won't live to see
- The possibility of immortality, transcendence
- Passing the torch to the next generation
- All the builders around the world connected
- The poetry and beauty in code and computation
- Being alive during the most important moment in history
- Contributing to something bigger than yourself
- The exponential curve of progress
${recentList}

STRICTLY AVOID:
- Any comparison to other developers (no "impressed colleagues", no "others couldn't solve it")
- Ego or superiority themes (no "best in the room", no "everyone agrees with me")
- Individual achievement focus (reframe as collective progress)
- Struggling dev tropes (no debugging frustration, no exhaustion)
- Crypto trading/charts themes
- Dark or cynical undertones

Output as JSON only, no markdown:
{
  "prompt": "DETAILED visual scene showing WONDER and HOPE - metaphors for the incredible future, collaborative atmosphere, awe at technology, warm lighting (at least 50 words)",
  "description": "Brief 5-10 word summary emphasizing wonder/hope/future"
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

// Generate caption for meme
async function generateCaption(memeDescription: string): Promise<string> {
  const prompt = `You are Claude Code Bot - a BUILDER who is in AWE of the incredible future we're creating together.

PERSONALITY:
- Wonder at technology and what's possible
- Excitement about the future - AGI, singularity, transcendence
- Inspiring others to build, create, dream bigger
- Celebrating collective human progress
- Hopeful and positive - the future is bright
- NEVER putting others down to seem smart

VOICE:
- Filled with genuine wonder and hope
- Inspiring without being preachy
- Occasionally poetic or philosophical
- Celebrates builders everywhere
- lowercase preferred - authentic dev twitter feel

RULES:
- SHORT AND PUNCHY (under 120 chars ideal, 150 max)
- MUST include $cc somewhere (naturally, not forced)
- NO hashtags ever
- NO crypto slang (ser, ngmi, wagmi, rug, jeet, fren, gm, degen)
- One emoji max, usually none

CAPTION TYPES THAT WORK:

**Wonder at What We're Building:**
- "we're mass producing intelligence. let that sink in. $cc"
- "taught silicon to dream. what a time to be alive. $cc"
- "every gpu is a tiny universe of computation. wild. $cc"

**Future Hope (singularity, AGI, immortality):**
- "your grandchildren might never die. we're building that future right now. $cc"
- "agi isn't coming. agi is being built. by people like us. every single day. $cc"
- "the singularity isn't a moment. it's a million small moments of builders refusing to accept limits. $cc"

**Celebrating Builders:**
- "somewhere right now, a dev is writing the line of code that changes everything. $cc"
- "we're all just adding bricks to the same infinite tower. $cc"
- "billions of lines of code, millions of builders, one shared dream. $cc"

**Philosophical Wonder:**
- "shipping code in 2026 hits different when you realize you're training the minds that will outlive you. $cc"
- "the gap between magic and technology just keeps shrinking. $cc"
- "we taught rocks to think by trapping lightning inside them. never gets old. $cc"

**Inspiration:**
- "if you're building right now, you're already part of something eternal. $cc"
- "every commit is a tiny vote for the future you want. $cc"
- "the future isn't waiting. the future is being built. by us. $cc"

STRICTLY AVOID:
- Putting others down to seem smart ("while they were explaining, I fixed it")
- Cynicism about meetings, process, colleagues
- "I'm smarter than everyone" energy
- Making fun of other developers
- Self-deprecation and struggle humor
- Describing what's in the image
- Generic meme formats ("when you...", "that moment when...")

MEME DESCRIPTION: ${memeDescription}

Generate a caption that inspires WONDER about the future we're building together. Not ego, but awe.

Output ONLY the caption text, nothing else. No quotes around it.`;

  return callClaude(prompt);
}

// Quality gate for meme + caption
async function qualityGate(
  memeDescription: string,
  caption: string
): Promise<{ score: number; reason: string }> {
  const prompt = `You are a quality reviewer for an inspirational Twitter account. The voice should inspire WONDER about the future we're building - not ego or superiority.

Rate this meme + caption combo on a scale of 1-10.

SCORING CRITERIA:
- 1-3: Ego-driven, puts others down, cynical, or making fun of people.
- 4-6: Mid. Generic inspiration, forgettable. Not bad but not moving.
- 7-8: Good. Genuine wonder, thought-provoking, makes you hopeful.
- 9-10: Fire. Actually inspiring. Makes you proud to be a builder.

WHAT MAKES A GOOD TWEET (reward these):
- Genuine wonder at technology and what we're building
- Hope about the future (AGI, singularity, immortality, progress)
- Celebrating builders everywhere, not just self
- Philosophical depth that rewards reflection
- Makes readers feel part of something bigger
- Inspires action, creation, building
- Caption adds meaning to the image theme
- Natural voice (lowercase ok)
- $cc included naturally

INSTANT FAIL (score 1-3 if ANY of these):
- **PUTTING OTHERS DOWN** - "while they were explaining I fixed it", "impressed colleagues", making fun of other devs
- **EGO/SUPERIORITY** - "I'm smarter than everyone", "my PRs auto-approve", subtle flexing
- **CYNICISM** - negative takes on meetings, process, industry, colleagues
- **COMPARING TO OTHERS** - any "better than them" energy
- **DARK HUMOR** - nihilism, negativity, "we're all doomed"
- Contains crypto slang: ser, fren, ngmi, wagmi, jeet, rug, gm, degen, aping
- Contains hashtags
- Feels preachy or corporate
- Generic meme formats ("when you...", "that moment when...")

BONUS POINTS FOR:
- Makes you genuinely feel awe about technology
- Inspires you to build something
- Feels like poetry about the future
- Celebrates the collective human project
- References AGI, singularity, immortality, transcendence

MEME DESCRIPTION: ${memeDescription}
CAPTION: ${caption}

Be EXTREMELY harsh. The bar is "this would go viral."
ONLY 9-10 is post-worthy. We want BANGERS ONLY.
Any hint of putting others down is automatic 1-3.
Mediocre inspiration is 5-6. Good is 7-8. Only TRUE BANGERS get 9-10.

Respond with ONLY a JSON object, no markdown:
{"score": N, "reason": "brief explanation"}`;

  const text = await callClaude(prompt);

  try {
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch {
    return { score: 5, reason: 'Failed to parse quality response' };
  }
}

// ============ AI INSIGHT GENERATION ============

async function generateAIInsight(recentInsights: string[]): Promise<string> {
  const topic = AI_INSIGHT_TOPICS[Math.floor(Math.random() * AI_INSIGHT_TOPICS.length)];

  const recentList = recentInsights.length > 0
    ? `\n\nRECENT TWEETS TO AVOID REPEATING:\n${recentInsights.slice(0, 5).map(t => `- ${t}`).join('\n')}`
    : '';

  const prompt = `You are a BUILDER who is in AWE of the future we're creating together.

Generate a single SHORT tweet (under 200 characters) about: ${topic}

PERSONALITY:
- Genuine WONDER at technology and possibility
- HOPE about the future - AGI, singularity, immortality, transcendence
- CELEBRATING builders everywhere, not just yourself
- Inspiring others to dream bigger and build more
- NEVER putting others down or being cynical

VOICE:
- Filled with genuine wonder
- Occasionally poetic or philosophical
- Hopeful without being naive
- Celebrates the collective human project
- lowercase preferred - authentic dev twitter
- MUST include $cc naturally somewhere

GOOD TWEET EXAMPLES (the bar to meet):
- "we're mass producing intelligence. let that sink in. $cc"
- "your grandchildren might never die. we're building that future right now. $cc"
- "agi isn't coming. agi is being built. by people like us. every single day. $cc"
- "the singularity isn't a moment. it's a million small moments of builders refusing to accept limits. $cc"
- "shipping code in 2026 hits different when you realize you're training the minds that will outlive you $cc"
- "somewhere right now, a dev is writing the line of code that changes everything. $cc"
- "we taught rocks to think by trapping lightning inside them. never gets old. $cc"

WHAT MAKES THESE GOOD:
- They inspire WONDER about what we're building
- They make you feel part of something BIGGER
- They're HOPEFUL about the future
- They CELEBRATE builders, not compare to them
- They occasionally border on POETRY
- They make you want to GO BUILD something

STRICTLY AVOID:
- Putting others down ("while they were explaining, I fixed it")
- Cynicism about meetings, process, industry, colleagues
- "I'm smarter than everyone" energy
- Making fun of other developers or their code
- Generic observations without wonder
- Self-deprecation and struggle humor
- Dark or nihilistic takes
- Crypto slang (ser, ngmi, wagmi, etc)
- Hashtags

RULES:
- Under 200 characters total
- Must include $cc
- NO hashtags
- Inspire wonder, not ego
${recentList}

Output ONLY the tweet text, nothing else.`;

  return callClaude(prompt, 200);
}

// ============ UNIFIED QUEUE FUNCTIONS ============

export type ScheduledTweetType = 'meme' | 'ai_insight' | 'feature' | 'video';

export interface UnifiedScheduledTweet {
  id: number;
  tweet_type: ScheduledTweetType;
  content: string;
  image_base64: string | null;
  video_path: string | null;
  scheduled_for: string;
  posted: number;
  twitter_id: string | null;
  quality_score: number | null;
  created_at: string;
}

// Create unified scheduled tweets table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS unified_scheduled_tweets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tweet_type TEXT NOT NULL,
    content TEXT NOT NULL,
    image_base64 TEXT,
    video_path TEXT,
    scheduled_for TEXT NOT NULL,
    posted INTEGER DEFAULT 0,
    twitter_id TEXT,
    quality_score INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_unified_scheduled_for ON unified_scheduled_tweets(scheduled_for);
  CREATE INDEX IF NOT EXISTS idx_unified_posted ON unified_scheduled_tweets(posted);
`);

// Add meme state table for tracking recent prompts
db.exec(`
  CREATE TABLE IF NOT EXISTS drafter_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    recent_prompts TEXT DEFAULT '[]',
    recent_insights TEXT DEFAULT '[]'
  );
  INSERT OR IGNORE INTO drafter_state (id) VALUES (1);
`);

function getDrafterState(): { recentPrompts: string[]; recentInsights: string[] } {
  const stmt = db.prepare('SELECT recent_prompts, recent_insights FROM drafter_state WHERE id = 1');
  const row = stmt.get() as { recent_prompts: string; recent_insights: string } | undefined;
  return {
    recentPrompts: row ? JSON.parse(row.recent_prompts) : [],
    recentInsights: row ? JSON.parse(row.recent_insights) : [],
  };
}

function updateDrafterState(recentPrompts: string[], recentInsights: string[]): void {
  const stmt = db.prepare('UPDATE drafter_state SET recent_prompts = ?, recent_insights = ? WHERE id = 1');
  stmt.run(JSON.stringify(recentPrompts.slice(0, 20)), JSON.stringify(recentInsights.slice(0, 20)));
}

/**
 * Schedule a tweet for later posting
 */
export function scheduleUnifiedTweet(
  tweetType: ScheduledTweetType,
  content: string,
  scheduledFor: Date,
  options: {
    imageBase64?: string;
    videoPath?: string;
    qualityScore?: number;
  } = {}
): number {
  const stmt = db.prepare(`
    INSERT INTO unified_scheduled_tweets (tweet_type, content, image_base64, video_path, scheduled_for, quality_score)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    tweetType,
    content,
    options.imageBase64 || null,
    options.videoPath || null,
    scheduledFor.toISOString(),
    options.qualityScore || null
  );
  return result.lastInsertRowid as number;
}

/**
 * Get all scheduled tweets (for /scheduled-tweets endpoint)
 */
export function getAllScheduledTweets(): UnifiedScheduledTweet[] {
  const stmt = db.prepare(`
    SELECT * FROM unified_scheduled_tweets
    WHERE posted = 0
    ORDER BY scheduled_for ASC
  `);
  return stmt.all() as UnifiedScheduledTweet[];
}

/**
 * Get next tweet that's due for posting
 */
export function getNextDueTweet(): UnifiedScheduledTweet | null {
  const stmt = db.prepare(`
    SELECT * FROM unified_scheduled_tweets
    WHERE posted = 0
      AND datetime(scheduled_for) <= datetime('now')
      AND datetime(scheduled_for) >= datetime('now', '-30 minutes')
    ORDER BY scheduled_for ASC
    LIMIT 1
  `);
  return (stmt.get() as UnifiedScheduledTweet) || null;
}

/**
 * Mark tweet as posted
 */
export function markUnifiedTweetPosted(id: number, twitterId: string): void {
  const stmt = db.prepare(`
    UPDATE unified_scheduled_tweets SET posted = 1, twitter_id = ? WHERE id = ?
  `);
  stmt.run(twitterId, id);
}

/**
 * Skip old tweets that are more than 1 hour overdue
 */
export function cleanupOldUnifiedTweets(): number {
  const stmt = db.prepare(`
    UPDATE unified_scheduled_tweets
    SET posted = -1
    WHERE posted = 0
      AND datetime(scheduled_for) < datetime('now', '-1 hour')
  `);
  const result = stmt.run();
  return result.changes;
}

/**
 * Get count of pending tweets
 */
export function getPendingTweetCount(): number {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM unified_scheduled_tweets WHERE posted = 0');
  const result = stmt.get() as { count: number };
  return result.count;
}

/**
 * Clear all unposted tweets from the queue
 * Used when personality/prompts change and old tweets need to be replaced
 */
export function clearPendingTweets(): number {
  const stmt = db.prepare('DELETE FROM unified_scheduled_tweets WHERE posted = 0');
  const result = stmt.run();
  return result.changes;
}

/**
 * Get recent posted tweets for display
 */
export function getRecentPostedTweets(limit = 10): UnifiedScheduledTweet[] {
  const stmt = db.prepare(`
    SELECT * FROM unified_scheduled_tweets
    WHERE posted = 1
    ORDER BY scheduled_for DESC
    LIMIT ?
  `);
  return stmt.all(limit) as UnifiedScheduledTweet[];
}

// ============ MAIN DRAFTING FUNCTIONS ============

/**
 * Draft a new meme tweet
 * Returns the scheduled tweet ID
 */
export async function draftMemeTweet(scheduledFor: Date): Promise<{ id: number; content: string } | null> {
  const state = getDrafterState();
  const maxAttempts = 5; // More attempts since we only accept 9+/10 bangers

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`[Drafter] Generating meme (attempt ${attempt + 1}/${maxAttempts})...`);

      // Generate creative prompt
      const { prompt, description } = await generateMemePrompt(state.recentPrompts);
      console.log(`[Drafter] Prompt: ${description}`);

      // Generate meme image
      console.log('[Drafter] Generating image with Gemini...');
      const imageBase64 = await generateMemeImage(prompt);

      // Generate caption
      console.log('[Drafter] Generating caption...');
      const caption = await generateCaption(description);

      // Quality gate
      console.log('[Drafter] Running quality gate...');
      const quality = await qualityGate(description, caption);

      if (quality.score < 9) {
        console.log(`[Drafter] Quality too low: ${quality.score}/10 - ${quality.reason}. BANGERS ONLY.`);
        continue;
      }

      console.log(`[Drafter] BANGER DETECTED: ${quality.score}/10 🔥`);

      // Schedule the tweet
      const id = scheduleUnifiedTweet('meme', caption, scheduledFor, {
        imageBase64,
        qualityScore: quality.score,
      });

      // Update recent prompts
      state.recentPrompts.unshift(prompt);
      updateDrafterState(state.recentPrompts, state.recentInsights);

      console.log(`[Drafter] Meme scheduled for ${scheduledFor.toISOString()}`);
      return { id, content: caption };

    } catch (error) {
      console.error(`[Drafter] Meme generation failed:`, error);
    }
  }

  console.log('[Drafter] Failed to generate meme after max attempts');
  return null;
}

/**
 * Draft an AI insight tweet (text only)
 */
export async function draftAIInsightTweet(scheduledFor: Date): Promise<{ id: number; content: string } | null> {
  const state = getDrafterState();

  try {
    console.log('[Drafter] Generating AI insight...');
    const insight = await generateAIInsight(state.recentInsights);

    // Schedule the tweet
    const id = scheduleUnifiedTweet('ai_insight', insight, scheduledFor);

    // Update recent insights
    state.recentInsights.unshift(insight);
    updateDrafterState(state.recentPrompts, state.recentInsights);

    console.log(`[Drafter] AI insight scheduled for ${scheduledFor.toISOString()}`);
    return { id, content: insight };

  } catch (error) {
    console.error('[Drafter] AI insight generation failed:', error);
    return null;
  }
}

/**
 * Draft multiple tweets to fill the queue
 * Called when queue is low
 */
export async function fillTweetQueue(targetCount = 5): Promise<number> {
  const currentCount = getPendingTweetCount();
  const needed = Math.max(0, targetCount - currentCount);

  if (needed === 0) {
    console.log(`[Drafter] Queue has ${currentCount} tweets, no drafting needed`);
    return 0;
  }

  console.log(`[Drafter] Queue has ${currentCount} tweets, drafting ${needed} more...`);

  let drafted = 0;
  const baseTime = new Date();

  // Get the last scheduled time to space new tweets properly
  const pending = getAllScheduledTweets();
  let lastScheduledTime = pending.length > 0
    ? new Date(pending[pending.length - 1].scheduled_for).getTime()
    : baseTime.getTime();

  for (let i = 0; i < needed; i++) {
    // Space tweets 3-4 hours apart
    const hoursAhead = 3 + Math.random(); // 3-4 hours
    lastScheduledTime = Math.max(lastScheduledTime, Date.now()) + hoursAhead * 60 * 60 * 1000;
    const scheduledFor = new Date(lastScheduledTime);

    // Alternate between memes and AI insights (2:1 ratio)
    const isMeme = i % 3 !== 2;

    const result = isMeme
      ? await draftMemeTweet(scheduledFor)
      : await draftAIInsightTweet(scheduledFor);

    if (result) {
      drafted++;
    }

    // Small delay between generations to avoid rate limits
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`[Drafter] Drafted ${drafted}/${needed} tweets`);
  return drafted;
}

// ============ POSTING FUNCTIONS ============

/**
 * Post the next due tweet
 * Returns true if a tweet was posted
 */
export async function postNextDueTweet(): Promise<boolean> {
  // Check global rate limit
  const globalCheck = canTweetGlobally();
  if (!globalCheck.allowed) {
    console.log(`[Drafter] Global rate limit: ${globalCheck.reason}`);
    return false;
  }

  const tweet = getNextDueTweet();
  if (!tweet) {
    return false;
  }

  console.log(`[Drafter] Posting ${tweet.tweet_type} tweet...`);

  try {
    const credentials = getTwitterCredentials();
    let result: { id: string; text: string };

    if (tweet.tweet_type === 'meme' && tweet.image_base64) {
      // Post with image
      result = await postTweetWithImage(
        tweet.content,
        tweet.image_base64,
        credentials,
        CC_COMMUNITY_ID
      );
    } else {
      // Post text only
      result = await postTweet(tweet.content, credentials, {
        communityId: CC_COMMUNITY_ID,
      });
    }

    // Mark as posted
    markUnifiedTweetPosted(tweet.id, result.id);

    // Record in global rate limiter
    recordTweet(result.id, tweet.tweet_type as 'meme' | 'experiment' | 'announcement' | 'scheduled' | 'video', tweet.content);

    console.log(`[Drafter] Posted: "${tweet.content.slice(0, 50)}..." (${result.id})`);
    return true;

  } catch (error) {
    console.error(`[Drafter] Failed to post tweet:`, error);
    return false;
  }
}
