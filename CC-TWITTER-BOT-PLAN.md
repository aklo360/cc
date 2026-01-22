# CC Twitter Bot - Implementation Plan

**Goal:** Autonomous meme bot posting high-quality $CC content every ~90 minutes.

**Constraints (Free Tier):**
- 17 tweets per 24 hours max
- No read access (can't reply to mentions)
- Minimum interval: ~90 minutes

---

## Phase 0: Account Setup (Manual Steps)

### 0.1 Create Email
- [ ] Create `bot@claudecode.wtf` or `cc@claudecode.wtf` via domain provider (Cloudflare Email Routing or Google Workspace)

### 0.2 Create Twitter/X Account
- [ ] Go to https://x.com/i/flow/signup
- [ ] Sign up with the new email
- [ ] Username suggestions: `@ClaudeCodeBot`, `@CCMemeBot`, `@ClaudeCodeCoin`
- [ ] Set profile pic to `cc.png`, banner to something on-brand
- [ ] Bio: "Autonomous meme machine for $CC | Built by Claude Code | claudecode.wtf"

### 0.3 Get API Access
- [ ] Go to https://developer.x.com/en/portal/petition/essential/basic-info
- [ ] Apply for Free tier access
- [ ] Create a new App in the Developer Portal
- [ ] Generate these credentials:
  - API Key (Consumer Key)
  - API Secret (Consumer Secret)
  - Access Token
  - Access Token Secret
- [ ] Set app permissions to **Read and Write**

### 0.4 Store Secrets in Cloudflare
```bash
cd /Users/aklo/dev/ccwtf/worker
wrangler secret put TWITTER_API_KEY
wrangler secret put TWITTER_API_SECRET
wrangler secret put TWITTER_ACCESS_TOKEN
wrangler secret put TWITTER_ACCESS_SECRET
wrangler secret put ANTHROPIC_API_KEY
```

---

## Phase 1: Worker Architecture Update

### File Structure (after implementation)
```
worker/
├── src/
│   ├── index.ts           # Main router + existing meme endpoint
│   ├── twitter.ts         # Twitter OAuth 1.0a + posting logic
│   ├── caption.ts         # Claude API for caption generation
│   ├── quality-gate.ts    # Claude API for quality review
│   ├── prompts.ts         # Meme prompt bank
│   └── types.ts           # TypeScript interfaces
├── wrangler.toml          # Add cron + KV binding
└── package.json           # Add dependencies
```

### New Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | POST | Existing meme generation |
| `/bot/tweet` | POST | Manual trigger: generate + post |
| `/bot/status` | GET | Check last post, daily count |
| `/bot/health` | GET | System health check |

### Cron Trigger
Fires every 90 minutes automatically:
```
0,30 */3 * * *  → 00:00, 00:30, 03:00, 03:30, 06:00...
```
This gives ~16 posts per day, safely under the 17 limit.

---

## Phase 2: Implementation Details

### 2.1 Twitter OAuth 1.0a
Twitter API v2 requires OAuth 1.0a for posting. We need to sign requests with HMAC-SHA1.

**Dependencies:** None (we'll implement signing manually for Cloudflare Workers compatibility)

### 2.2 Tweet Flow
```
CRON TRIGGER
     │
     ▼
┌─────────────────────────────────────────┐
│ 1. Check KV: last_post_time             │
│    - If < 85 min ago, skip              │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ 2. Select prompt from bank              │
│    - Rotate through topics              │
│    - Track used prompts in KV           │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ 3. Generate meme (existing Gemini flow) │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ 4. Generate caption (Claude API)        │
│    - CT-native humor                    │
│    - Under 200 chars                    │
│    - Include $CC                        │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ 5. Quality gate (Claude API)            │
│    - Score 1-10                         │
│    - If < 7, regenerate (max 3 tries)   │
│    - If still < 7, skip this cycle      │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ 6. Post to Twitter                      │
│    - Upload media first                 │
│    - Create tweet with media_id         │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ 7. Update KV                            │
│    - last_post_time                     │
│    - daily_count                        │
│    - tweet_history                      │
└─────────────────────────────────────────┘
```

### 2.3 Prompt Bank (Rotating Topics)
```typescript
const MEME_PROMPTS = [
  // Market scenarios
  "CC mascot watching charts pump, looking smug",
  "CC mascot in a lambo with 'NGMI' license plate",
  "CC mascot diamond hands during a dip",
  "CC mascot as a whale splashing in money",

  // CT culture
  "CC mascot rugging someone (pulling a rug)",
  "CC mascot as a degen ape",
  "CC mascot copium inhaler",
  "CC mascot touching grass reluctantly",

  // Tech/coding
  "CC mascot debugging at 3am, coffee everywhere",
  "CC mascot deploying to prod on Friday",
  "CC mascot reviewing spaghetti code",
  "CC mascot shipping features while sleeping",

  // Absurdist
  "CC mascot on the moon, very literal",
  "CC mascot in a McDonald's uniform (part-time)",
  "CC mascot as a financial advisor (not financial advice)",
  "CC mascot in a therapist chair discussing bags",
];
```

### 2.4 Caption Generation Prompt
```
You are a crypto Twitter meme account for $CC (Claude Code Coin).

Generate a short, punchy caption for this meme image.

RULES:
- Max 200 characters (shorter is better)
- Be funny, not cringe
- Reference CT culture: jeets, rugs, pumps, cope, ngmi, wagmi, gm (only if ironic)
- Self-deprecating > try-hard
- MUST include $CC somewhere
- No hashtags (they're cringe)
- Can use emojis sparingly

MEME CONTEXT: [description of what's in the image]

Output ONLY the caption, nothing else.
```

### 2.5 Quality Gate Prompt
```
You are a quality reviewer for a crypto Twitter meme account.

Rate this meme + caption combo on a scale of 1-10.

CRITERIA:
- Would a CT degen actually laugh or save this? (not just smile)
- Is the caption clever or just generic?
- Does it feel like AI slop or genuine humor?
- Would this get engagement or get ratio'd?

MEME: [image]
CAPTION: [caption]

Respond with ONLY a JSON object:
{"score": N, "reason": "brief explanation"}

Be harsh. CT has high standards. 7+ means post-worthy.
```

### 2.6 KV Schema
```typescript
interface BotState {
  last_post_time: number;      // Unix timestamp
  daily_count: number;         // Reset at midnight UTC
  daily_reset_date: string;    // "2024-01-22"
  last_prompt_index: number;   // Rotate through prompts
  tweet_history: {             // Last 50 tweets
    id: string;
    caption: string;
    timestamp: number;
    prompt: string;
  }[];
}
```

---

## Phase 3: wrangler.toml Updates

```toml
name = "ccwtf-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
BASE_IMAGE_URL = "https://claudecode.wtf/claudecode.jpg"

# Cron: every 90 minutes (0, 90, 180, 270 min = 0:00, 1:30, 3:00, 4:30...)
[triggers]
crons = ["0 */3 * * *", "30 1,4,7,10,13,16,19,22 * * *"]

# KV for bot state
[[kv_namespaces]]
binding = "CC_BOT_KV"
id = "create-this-namespace"
preview_id = "create-this-namespace"
```

Create KV namespace:
```bash
wrangler kv:namespace create "CC_BOT_KV"
wrangler kv:namespace create "CC_BOT_KV" --preview
```

---

## Phase 4: Testing Checklist

- [ ] Manual trigger `/bot/tweet` works
- [ ] Quality gate rejects bad memes
- [ ] Twitter OAuth signing works
- [ ] Media upload works
- [ ] Tweet posts successfully
- [ ] KV state updates correctly
- [ ] Cron trigger fires
- [ ] Rate limiting prevents > 17/day
- [ ] Prompts rotate correctly

---

## Phase 5: Monitoring

### Alerts to Set Up
- [ ] Tweet post failures (Cloudflare Worker error logs)
- [ ] Rate limit approaching (> 15 tweets in day)
- [ ] Quality gate rejecting > 50% of attempts

### Daily Check
- Review tweets for quality
- Check engagement metrics
- Adjust prompts based on what hits

---

## Cost Estimate

| Service | Cost |
|---------|------|
| Twitter API | $0 (Free tier) |
| Cloudflare Workers | $0 (Free tier: 100k req/day) |
| Cloudflare KV | $0 (Free tier: 100k reads/day) |
| Claude API | ~$0.50-2/day (depends on retries) |
| Gemini API | Free (with quota) |

**Total: ~$15-60/month** (mostly Claude API)

---

## Implementation Order

1. **Manual steps first** (email, Twitter account, API keys)
2. **Twitter OAuth module** (hardest part - signing is tricky)
3. **Caption generation** (Claude integration)
4. **Quality gate** (Claude integration)
5. **Prompt bank** (static list)
6. **Main tweet flow** (tie it together)
7. **KV state management** (tracking)
8. **Cron trigger** (automation)
9. **Testing + monitoring**
10. **Deploy + verify**

---

## Ready to Build?

Once you've completed Phase 0 (account setup), respond with the API credentials (or confirm they're in wrangler secrets) and I'll implement the worker code.
