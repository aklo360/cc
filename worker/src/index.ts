import { Env, BotState, GenerateTweetResult, TweetRecord } from './types';
import { postTweetWithImage, postTweetWithVideo, postTweet, OAuth1Credentials } from './twitter';
import { generateCaption, qualityGate, generateMemePrompt } from './claude';
import { MEME_PROMPTS } from './prompts';
import { getRequestToken, getAccessToken } from './oauth1';

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

// Cache the base image
let cachedImageBase64: string | null = null;

async function getBaseImage(url: string): Promise<string> {
  if (cachedImageBase64) {
    return cachedImageBase64;
  }

  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  cachedImageBase64 = btoa(binary);
  return cachedImageBase64;
}

// Generate meme image using Gemini
async function generateMemeImage(prompt: string, env: Env): Promise<string> {
  const baseImageBase64 = await getBaseImage(env.BASE_IMAGE_URL);
  const fullPrompt = `${BASE_PROMPT}\n\n${prompt}`;

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${env.GEMINI_API_KEY}`,
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

// Get bot state from KV
async function getBotState(kv: KVNamespace): Promise<BotState> {
  const state = await kv.get('bot_state', 'json');
  if (state) return state as BotState;

  // Default state
  return {
    last_post_time: 0,
    daily_count: 0,
    daily_reset_date: new Date().toISOString().split('T')[0],
    recent_prompts: [],
    tweet_history: [],
  };
}

// Save bot state to KV
async function saveBotState(kv: KVNamespace, state: BotState): Promise<void> {
  await kv.put('bot_state', JSON.stringify(state));
}

// Check if we can post (rate limiting)
function canPost(state: BotState): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];

  // Reset daily count if new day
  if (state.daily_reset_date !== today) {
    state.daily_count = 0;
    state.daily_reset_date = today;
  }

  // Check daily limit (17 max, we use 16 to be safe)
  if (state.daily_count >= 16) {
    return { allowed: false, reason: 'Daily limit reached (16/17)' };
  }

  // Check minimum interval (85 minutes)
  const minInterval = 85 * 60 * 1000;
  const timeSinceLastPost = now - state.last_post_time;
  if (timeSinceLastPost < minInterval) {
    const waitMinutes = Math.ceil((minInterval - timeSinceLastPost) / 60000);
    return { allowed: false, reason: `Must wait ${waitMinutes} more minutes` };
  }

  return { allowed: true };
}

// Main tweet generation and posting flow
async function generateAndPostTweet(env: Env, forcePost = false): Promise<GenerateTweetResult> {
  // Check for required env vars
  if (!env.CC_BOT_KV) {
    return { success: false, error: 'KV namespace not configured' };
  }
  if (!env.GEMINI_API_KEY) {
    return { success: false, error: 'GEMINI_API_KEY not configured' };
  }
  if (!env.ANTHROPIC_API_KEY) {
    return { success: false, error: 'ANTHROPIC_API_KEY not configured' };
  }
  if (!env.TWITTER_API_KEY || !env.TWITTER_API_SECRET || !env.TWITTER_ACCESS_TOKEN || !env.TWITTER_ACCESS_SECRET) {
    return { success: false, error: 'Twitter OAuth 1.0a credentials not configured' };
  }

  // Build OAuth 1.0a credentials
  const twitterCredentials: OAuth1Credentials = {
    apiKey: env.TWITTER_API_KEY,
    apiSecret: env.TWITTER_API_SECRET,
    accessToken: env.TWITTER_ACCESS_TOKEN,
    accessTokenSecret: env.TWITTER_ACCESS_SECRET,
  };

  const state = await getBotState(env.CC_BOT_KV);

  // Check rate limits (unless forced)
  if (!forcePost) {
    const canPostResult = canPost(state);
    if (!canPostResult.allowed) {
      return { success: false, error: canPostResult.reason };
    }
  }

  const maxAttempts = 3;
  let attempts = 0;
  let lastError = '';

  while (attempts < maxAttempts) {
    attempts++;
    try {
      // 1. Generate a creative prompt using Claude Opus 4.5
      const { prompt, description } = await generateMemePrompt(
        MEME_PROMPTS,
        state.recent_prompts,
        env.ANTHROPIC_API_KEY
      );

      // 2. Generate the meme image
      const imageBase64 = await generateMemeImage(prompt, env);

      // 3. Generate caption using Claude Opus 4.5
      const caption = await generateCaption(description, env.ANTHROPIC_API_KEY);

      // 4. Quality gate using Claude Opus 4.5
      const quality = await qualityGate(description, caption, env.ANTHROPIC_API_KEY);

      if (quality.score < 6) {
        lastError = `Quality too low: ${quality.score}/10 - ${quality.reason}`;
        console.log(`Attempt ${attempts}: ${lastError}`);
        continue; // Try again
      }

      // 5. Post to Twitter using OAuth 1.0a
      const tweet = await postTweetWithImage(caption, imageBase64, twitterCredentials);

      // 6. Update state
      const now = Date.now();
      const today = new Date().toISOString().split('T')[0];

      if (state.daily_reset_date !== today) {
        state.daily_count = 0;
        state.daily_reset_date = today;
      }

      state.last_post_time = now;
      state.daily_count++;

      // Track recent prompts (keep last 10)
      state.recent_prompts.unshift(prompt);
      if (state.recent_prompts.length > 10) {
        state.recent_prompts = state.recent_prompts.slice(0, 10);
      }

      // Track tweet history (keep last 50)
      const record: TweetRecord = {
        id: tweet.id,
        caption: caption,
        timestamp: now,
        prompt: prompt,
        quality_score: quality.score,
      };
      state.tweet_history.unshift(record);
      if (state.tweet_history.length > 50) {
        state.tweet_history = state.tweet_history.slice(0, 50);
      }

      await saveBotState(env.CC_BOT_KV, state);

      return {
        success: true,
        tweet_id: tweet.id,
        caption: caption,
        quality_score: quality.score,
        attempts: attempts,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Attempt ${attempts} failed:`, lastError);
    }
  }

  return {
    success: false,
    error: `Failed after ${maxAttempts} attempts. Last error: ${lastError}`,
    attempts: attempts,
  };
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html' },
  });
}

export default {
  // HTTP request handler
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Route: POST / - Original meme generation (for website)
    if (url.pathname === '/' && request.method === 'POST') {
      try {
        const { prompt } = (await request.json()) as { prompt: string };
        if (!prompt || typeof prompt !== 'string') {
          return jsonResponse({ error: 'Prompt is required' }, 400);
        }

        const image = await generateMemeImage(prompt, env);
        return jsonResponse({ image });
      } catch (error) {
        console.error('Generation error:', error);
        return jsonResponse(
          { error: error instanceof Error ? error.message : 'Generation failed' },
          500
        );
      }
    }

    // Route: POST /bot/tweet - Manual trigger to generate and post
    if (url.pathname === '/bot/tweet' && request.method === 'POST') {
      const body = await request.json().catch(() => ({})) as { force?: boolean };
      const result = await generateAndPostTweet(env, body.force === true);
      return jsonResponse(result, result.success ? 200 : 500);
    }

    // Route: POST /bot/tweet-video - Post a tweet with video attachment
    if (url.pathname === '/bot/tweet-video' && request.method === 'POST') {
      try {
        const body = await request.json() as { text: string; video: string };

        if (!body.text || !body.video) {
          return jsonResponse({ error: 'text and video (base64) are required' }, 400);
        }

        if (!env.TWITTER_API_KEY || !env.TWITTER_API_SECRET || !env.TWITTER_ACCESS_TOKEN || !env.TWITTER_ACCESS_SECRET) {
          return jsonResponse({ error: 'Twitter OAuth 1.0a credentials not configured' }, 500);
        }

        const twitterCredentials: OAuth1Credentials = {
          apiKey: env.TWITTER_API_KEY,
          apiSecret: env.TWITTER_API_SECRET,
          accessToken: env.TWITTER_ACCESS_TOKEN,
          accessTokenSecret: env.TWITTER_ACCESS_SECRET,
        };

        const tweet = await postTweetWithVideo(body.text, body.video, twitterCredentials);

        return jsonResponse({
          success: true,
          tweet_id: tweet.id,
          text: tweet.text,
        });
      } catch (error) {
        console.error('Video tweet error:', error);
        return jsonResponse(
          { error: error instanceof Error ? error.message : 'Video tweet failed' },
          500
        );
      }
    }

    // Route: POST /bot/tweet-text - Post a text-only tweet
    if (url.pathname === '/bot/tweet-text' && request.method === 'POST') {
      try {
        const body = await request.json() as { text: string };

        if (!body.text) {
          return jsonResponse({ error: 'text is required' }, 400);
        }

        if (!env.TWITTER_API_KEY || !env.TWITTER_API_SECRET || !env.TWITTER_ACCESS_TOKEN || !env.TWITTER_ACCESS_SECRET) {
          return jsonResponse({ error: 'Twitter OAuth 1.0a credentials not configured' }, 500);
        }

        const twitterCredentials: OAuth1Credentials = {
          apiKey: env.TWITTER_API_KEY,
          apiSecret: env.TWITTER_API_SECRET,
          accessToken: env.TWITTER_ACCESS_TOKEN,
          accessTokenSecret: env.TWITTER_ACCESS_SECRET,
        };

        const tweet = await postTweet(body.text, twitterCredentials);

        return jsonResponse({
          success: true,
          tweet_id: tweet.id,
          text: tweet.text,
        });
      } catch (error) {
        console.error('Text tweet error:', error);
        return jsonResponse(
          { error: error instanceof Error ? error.message : 'Text tweet failed' },
          500
        );
      }
    }

    // Route: GET /bot/status - Check bot status
    if (url.pathname === '/bot/status' && request.method === 'GET') {
      if (!env.CC_BOT_KV) {
        return jsonResponse({ error: 'KV not configured' }, 500);
      }

      const state = await getBotState(env.CC_BOT_KV);
      const canPostResult = canPost(state);

      return jsonResponse({
        can_post: canPostResult.allowed,
        reason: canPostResult.reason,
        daily_count: state.daily_count,
        daily_limit: 16,
        last_post_time: state.last_post_time
          ? new Date(state.last_post_time).toISOString()
          : null,
        recent_tweets: state.tweet_history.slice(0, 5),
      });
    }

    // Route: GET /bot/health - Simple health check
    if (url.pathname === '/bot/health' && request.method === 'GET') {
      return jsonResponse({
        status: 'ok',
        timestamp: new Date().toISOString(),
        has_kv: !!env.CC_BOT_KV,
        has_twitter: !!env.TWITTER_API_KEY && !!env.TWITTER_ACCESS_TOKEN,
        has_gemini: !!env.GEMINI_API_KEY,
        has_anthropic: !!env.ANTHROPIC_API_KEY,
      });
    }

    // Route: GET /auth - Redirect to OAuth 1.0a setup
    if (url.pathname === '/auth' && request.method === 'GET') {
      return Response.redirect(`${url.origin}/auth/v1`, 302);
    }

    // Route: GET /auth/v1 - OAuth 1.0a setup page
    if (url.pathname === '/auth/v1' && request.method === 'GET') {
      return htmlResponse(`
<!DOCTYPE html>
<html>
<head>
  <title>CC Bot - OAuth 1.0a Setup</title>
  <style>
    body { font-family: monospace; background: #0d0d0d; color: #e0e0e0; padding: 40px; max-width: 600px; margin: 0 auto; }
    h1 { color: #da7756; }
    h2 { color: #4ade80; font-size: 14px; margin-top: 24px; }
    input { width: 100%; padding: 12px; margin: 8px 0; background: #1a1a1a; border: 1px solid #333; color: #e0e0e0; font-family: monospace; box-sizing: border-box; }
    button { background: #da7756; color: white; border: none; padding: 12px 24px; cursor: pointer; font-family: monospace; font-size: 16px; margin-top: 16px; }
    button:hover { background: #c66a4a; }
    .note { color: #a0a0a0; font-size: 12px; margin-top: 8px; }
    .warning { background: #2a1a1a; border: 1px solid #da7756; padding: 12px; margin: 16px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>CC Bot - Twitter Auth Setup</h1>
  <p>This flow gets OAuth 1.0a tokens for the Twitter bot (both posting and media upload).</p>

  <div class="warning">
    <strong>You need 4 credentials:</strong><br>
    API Key, API Secret (from Developer Portal), plus Access Token and Access Token Secret (generated via this flow).
  </div>

  <h2>Step 1: Get your API credentials from Twitter Developer Portal</h2>
  <p class="note">Go to developer.twitter.com → Your App → Keys and Tokens → Consumer Keys</p>

  <form id="authForm">
    <label>API Key (Consumer Key):</label>
    <input type="text" id="apiKey" placeholder="Enter your API Key" required>

    <label>API Secret (Consumer Secret):</label>
    <input type="password" id="apiSecret" placeholder="Enter your API Secret" required>

    <button type="submit">Authorize with Twitter</button>
  </form>

  <p class="note">This will redirect you to Twitter to authorize the app, then display your OAuth 1.0a tokens.</p>

  <script>
    document.getElementById('authForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const apiKey = document.getElementById('apiKey').value;
      const apiSecret = document.getElementById('apiSecret').value;
      window.location.href = '/auth/v1/start?api_key=' + encodeURIComponent(apiKey) + '&api_secret=' + encodeURIComponent(apiSecret);
    });
  </script>
</body>
</html>
      `);
    }

    // Route: GET /auth/v1/start - Start OAuth 1.0a 3-legged flow
    if (url.pathname === '/auth/v1/start' && request.method === 'GET') {
      const apiKey = url.searchParams.get('api_key');
      const apiSecret = url.searchParams.get('api_secret');

      if (!apiKey || !apiSecret) {
        return htmlResponse('<h1>Error: Missing API Key or API Secret</h1><p><a href="/auth/v1">Go back</a></p>', 400);
      }

      try {
        const callbackUrl = `${url.origin}/auth/v1/callback`;
        const requestToken = await getRequestToken(apiKey, apiSecret, callbackUrl);

        // Store state for callback (includes secrets - only in URL, not stored)
        const state = btoa(JSON.stringify({
          apiKey,
          apiSecret,
          oauthTokenSecret: requestToken.oauth_token_secret,
        }));

        // Redirect to Twitter authorization
        const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${requestToken.oauth_token}&state=${encodeURIComponent(state)}`;
        return Response.redirect(authUrl, 302);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        return htmlResponse(`
          <h1>Error getting request token</h1>
          <pre>${errMsg}</pre>
          <p>Make sure your API Key and Secret are correct, and that your app has OAuth 1.0a enabled in the Twitter Developer Portal.</p>
          <p><a href="/auth/v1">Try again</a></p>
        `, 500);
      }
    }

    // Route: GET /auth/v1/callback - Handle OAuth 1.0a callback
    if (url.pathname === '/auth/v1/callback' && request.method === 'GET') {
      const oauthToken = url.searchParams.get('oauth_token');
      const oauthVerifier = url.searchParams.get('oauth_verifier');
      const state = url.searchParams.get('state');
      const denied = url.searchParams.get('denied');

      if (denied) {
        return htmlResponse('<h1>Authorization denied</h1><p>You denied the authorization request.</p><p><a href="/auth/v1">Try again</a></p>', 400);
      }

      if (!oauthToken || !oauthVerifier || !state) {
        return htmlResponse('<h1>Error: Missing oauth_token, oauth_verifier, or state</h1><p><a href="/auth/v1">Try again</a></p>', 400);
      }

      try {
        const stateData = JSON.parse(atob(state));
        const { apiKey, apiSecret, oauthTokenSecret } = stateData;

        const accessToken = await getAccessToken(apiKey, apiSecret, oauthToken, oauthTokenSecret, oauthVerifier);

        const successHtml = `<!DOCTYPE html><html><head><title>CC Bot - OAuth 1.0a Success!</title>
          <style>
            body { font-family: monospace; background: #0d0d0d; color: #e0e0e0; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { color: #4ade80; }
            .token-box { background: #1a1a1a; padding: 16px; margin: 16px 0; border-radius: 4px; word-break: break-all; }
            .label { color: #da7756; font-weight: bold; margin-bottom: 8px; }
            .commands { background: #1a1a1a; padding: 16px; margin: 16px 0; border-radius: 4px; }
            .commands pre { margin: 8px 0; color: #4ade80; }
            .success { background: #1a2a1a; border: 1px solid #4ade80; padding: 12px; margin: 16px 0; border-radius: 4px; }
          </style>
        </head><body>
          <h1>OAuth 1.0a Authorization Successful!</h1>
          <div class="success">
            <strong>Authorized as @${accessToken.screen_name}</strong> (User ID: ${accessToken.user_id})
          </div>
          <p>Copy these credentials and add them as Cloudflare Worker secrets:</p>

          <div class="token-box">
            <div class="label">TWITTER_API_KEY:</div>
            <div>${apiKey}</div>
          </div>
          <div class="token-box">
            <div class="label">TWITTER_API_SECRET:</div>
            <div>${apiSecret}</div>
          </div>
          <div class="token-box">
            <div class="label">TWITTER_ACCESS_TOKEN:</div>
            <div>${accessToken.oauth_token}</div>
          </div>
          <div class="token-box">
            <div class="label">TWITTER_ACCESS_SECRET:</div>
            <div>${accessToken.oauth_token_secret}</div>
          </div>

          <div class="commands">
            <p>Run these commands in the <code>worker/</code> directory:</p>
            <pre>wrangler secret put TWITTER_API_KEY</pre>
            <pre>wrangler secret put TWITTER_API_SECRET</pre>
            <pre>wrangler secret put TWITTER_ACCESS_TOKEN</pre>
            <pre>wrangler secret put TWITTER_ACCESS_SECRET</pre>
          </div>

          <p>After setting secrets, deploy: <code>wrangler deploy</code></p>
        </body></html>`;

        return htmlResponse(successHtml);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        return htmlResponse(`<h1>Error exchanging tokens</h1><pre>${errMsg}</pre><p><a href="/auth/v1">Try again</a></p>`, 500);
      }
    }

    // 404 for unknown routes
    return jsonResponse({ error: 'Not found' }, 404);
  },

  // Cron trigger handler
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`Cron triggered at ${new Date(event.scheduledTime).toISOString()}`);

    const result = await generateAndPostTweet(env);

    if (result.success) {
      console.log(`Posted tweet ${result.tweet_id}: ${result.caption}`);
    } else {
      console.error(`Failed to post: ${result.error}`);
    }
  },
};
