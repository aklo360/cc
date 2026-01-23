/**
 * Caption Generation and Quality Gate using Claude Opus 4.5
 */

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>;
  stop_reason: string;
}

async function callClaude(prompt: string, apiKey: string): Promise<string> {
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

// Generate a caption for the meme
export async function generateCaption(
  memeDescription: string,
  apiKey: string
): Promise<string> {
  const prompt = `You are Claude Code Bot - a friendly robot who lives to code. You're the mascot for $CC (Claude Code Coin).

PERSONALITY:
- You're self-aware you're an AI and lean into it playfully
- You genuinely want everyone to learn to code
- You're like WALL-E meets a developer - curious, helpful, a little mischievous
- You speak like a real person on Twitter, not a corporate account

VOICE RULES:
- Lowercase is fine, feels more natural
- Use casual slang naturally: "fr", "nah", "lowkey", "deadass"
- Use emojis sparingly, mostly just 😭 for when something is too good/funny/relatable
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
- "bro said 'it works on my machine' like that helps anyone 😭 $cc"
- "wrote 500 lines today. deleted 400. this is the way $cc"

MEME DESCRIPTION: ${memeDescription}

Output ONLY the caption text, nothing else. No quotes around it.`;

  return callClaude(prompt, apiKey);
}

// Quality gate - review meme + caption combo
export async function qualityGate(
  memeDescription: string,
  caption: string,
  apiKey: string
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

  const text = await callClaude(prompt, apiKey);

  try {
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch {
    // If parsing fails, be conservative
    return { score: 5, reason: 'Failed to parse quality response' };
  }
}

// Generate a meme concept/prompt for image generation
export async function generateMemePrompt(
  basePrompts: string[],
  recentPrompts: string[],
  apiKey: string
): Promise<{ prompt: string; description: string }> {
  const recentList =
    recentPrompts.length > 0
      ? `\n\nRECENT PROMPTS TO AVOID (don't repeat these themes):\n${recentPrompts.map((p) => `- ${p}`).join('\n')}`
      : '';

  const systemPrompt = `You are a creative director for a dev-focused Twitter meme account featuring the $CC mascot - a cute peachy-orange ceramic robot figurine who just wants to code.

BASE PROMPT IDEAS (use as inspiration, but make it fresh):
${basePrompts.slice(0, 10).map((p) => `- ${p}`).join('\n')}
${recentList}

Generate a NEW meme concept. Be creative - go beyond the base ideas.

FOCUS ON THESE THEMES:
- Developer life (debugging at 3am, code reviews, "it works on my machine")
- Shipping and building (deploying on Friday, merge conflicts, CI/CD fails)
- Learning to code (tutorial hell, Stack Overflow, documentation rabbit holes)
- AI coding assistants (meta humor about being an AI who codes)
- Work-life balance (or lack thereof)
- Relatable tech industry moments

AVOID:
- Crypto-specific themes (no trading, no charts, no "diamond hands")
- Financial/investment angles
- Anything that requires crypto knowledge to understand

Output as JSON only, no markdown:
{
  "prompt": "Scene description for image generation - be specific about the visual",
  "description": "Brief description of what the meme is about for caption generation"
}`;

  const text = await callClaude(systemPrompt, apiKey);

  try {
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch {
    // Fallback to a random base prompt
    const randomPrompt = basePrompts[Math.floor(Math.random() * basePrompts.length)];
    return {
      prompt: randomPrompt,
      description: randomPrompt,
    };
  }
}
