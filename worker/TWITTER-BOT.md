# CC Twitter Bot - Technical Documentation

**Account:** [@ClaudeCodeWTF](https://x.com/ClaudeCodeWTF)
**API Endpoint:** https://ccwtf-api.aklo.workers.dev

---

## Overview

An autonomous Twitter bot that generates and posts AI-created memes for $CC (Claude Code Coin) every 90 minutes. The bot uses Gemini for image generation and caption writing, with a quality gate to filter out low-quality content.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   CLOUDFLARE WORKER                         │
│              https://ccwtf-api.aklo.workers.dev             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CRON TRIGGER (every 90 min)                                │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Generate meme prompt (Gemini)                    │   │
│  │ 2. Generate meme image (Gemini image model)         │   │
│  │ 3. Generate caption (Gemini)                        │   │
│  │ 4. Quality gate - score 1-10 (Gemini)               │   │
│  │ 5. If score >= 6, post to Twitter                   │   │
│  │ 6. Update KV state (track history, rate limits)     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   GEMINI API    │  │  TWITTER API    │  │  CLOUDFLARE KV  │
│  (text + image) │  │  (OAuth 2.0)    │  │  (bot state)    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## How It Works

### 1. Cron Trigger
The bot runs on a schedule defined in `wrangler.toml`:
```toml
[triggers]
crons = ["0 0,3,6,9,12,15,18,21 * * *", "30 1,4,7,10,13,16,19,22 * * *"]
```
This fires every 90 minutes: 0:00, 1:30, 3:00, 4:30, 6:00, etc.

### 2. Rate Limiting
Before posting, the bot checks:
- **Daily limit:** Max 16 tweets per day (Twitter free tier allows 17)
- **Minimum interval:** 85 minutes between posts
- State is stored in Cloudflare KV and persists across invocations

### 3. Meme Generation Pipeline

#### Step 1: Generate Prompt
Gemini creates a creative meme concept based on:
- A bank of 40+ base prompt ideas (CT culture, coding humor, market scenarios)
- Recent prompts to avoid (prevents repetition)

Output: `{ prompt: "scene description", description: "meme concept" }`

#### Step 2: Generate Image
Gemini's image model (`gemini-2.0-flash-exp-image-generation`) creates the meme:
- Uses a reference image of the CC mascot
- Detailed prompt ensures character consistency (flat top, no antenna, ceramic look)
- Output: Base64-encoded image

#### Step 3: Generate Caption
Gemini writes a CT-native caption:
- Max 200 characters (shorter preferred)
- Must include $CC
- No hashtags
- References CT culture (jeets, rugs, pumps, cope, ngmi, wagmi)

#### Step 4: Quality Gate
Gemini reviews the meme + caption combo:
- Scores 1-10 based on CT standards
- Score < 6 = rejected, try again (max 3 attempts)
- Score >= 6 = approved for posting

### 4. Twitter Posting
Uses OAuth 2.0 User Context:
- Uploads image via media endpoint
- Posts tweet with attached media
- Falls back to text-only if media upload fails

### 5. State Tracking
After successful post, updates KV with:
- `last_post_time` - for rate limiting
- `daily_count` - resets at midnight UTC
- `recent_prompts` - last 10 prompts (avoid repetition)
- `tweet_history` - last 50 tweets with metadata

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | POST | Original meme generator (for website) |
| `/bot/tweet` | POST | Manually trigger a tweet |
| `/bot/status` | GET | Check bot status, post count, history |
| `/bot/health` | GET | System health check |
| `/auth` | GET | OAuth 2.0 setup page |
| `/auth/start` | GET | Start OAuth flow |
| `/auth/callback` | GET | OAuth callback handler |

### Manual Tweet Trigger
```bash
# Normal (respects rate limits)
curl -X POST https://ccwtf-api.aklo.workers.dev/bot/tweet

# Force (bypass rate limits)
curl -X POST https://ccwtf-api.aklo.workers.dev/bot/tweet \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

### Check Status
```bash
curl -s https://ccwtf-api.aklo.workers.dev/bot/status | jq .
```

Response:
```json
{
  "can_post": true,
  "daily_count": 3,
  "daily_limit": 16,
  "last_post_time": "2026-01-22T22:58:00.000Z",
  "recent_tweets": [...]
}
```

---

## File Structure

```
worker/
├── src/
│   ├── index.ts      # Main worker: routes, cron handler, meme pipeline
│   ├── twitter.ts    # Twitter OAuth 2.0: auth, media upload, posting
│   ├── claude.ts     # Gemini API: captions, quality gate, prompt generation
│   ├── prompts.ts    # Meme prompt bank (40+ ideas)
│   └── types.ts      # TypeScript interfaces
├── wrangler.toml     # Worker config, KV binding, cron triggers
├── tsconfig.json     # TypeScript config
└── package.json      # Dependencies
```

---

## Environment Variables / Secrets

Stored in Cloudflare Worker secrets:

| Secret | Description |
|--------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key |
| `TWITTER_CLIENT_ID` | Twitter OAuth 2.0 Client ID |
| `TWITTER_CLIENT_SECRET` | Twitter OAuth 2.0 Client Secret |
| `TWITTER_ACCESS_TOKEN` | User access token (from OAuth flow) |
| `TWITTER_REFRESH_TOKEN` | Refresh token (for token renewal) |

Set via:
```bash
wrangler secret put SECRET_NAME
```

---

## Quality Gate Criteria

The quality gate scores memes 1-10:

| Score | Meaning |
|-------|---------|
| 1-3 | Cringe, generic, AI slop - would get ratio'd |
| 4-5 | Mid - forgettable |
| 6-7 | Good - would get engagement |
| 8-10 | Fire - viral potential |

**Rejection reasons:**
- Generic "to the moon" energy
- Trying too hard
- Explaining the joke
- Feels like corporate social media

**Approval criteria:**
- Insider CT humor
- Self-aware about crypto culture
- Caption enhances (not describes) the image
- Actually funny

---

## Prompt Bank Categories

The bot rotates through these themes:

1. **Market scenarios** - Charts pumping, diamond hands, buying dips, paper handing
2. **CT culture** - Rugging, degen apes, copium, touching grass, jeets
3. **Tech/coding** - Debugging at 3am, deploying on Friday, spaghetti code
4. **Absurdist** - Literal moon landing, McDonald's uniform, therapy sessions
5. **Self-aware/meta** - Looking at own memes, explaining crypto to boomers

---

## Deployment

```bash
cd /Users/aklo/dev/ccwtf/worker

# Deploy
wrangler deploy

# View logs
wrangler tail

# Check cron schedules
wrangler triggers list
```

---

## Monitoring

### View Recent Logs
```bash
wrangler tail --format pretty
```

### Check Bot Status
```bash
curl -s https://ccwtf-api.aklo.workers.dev/bot/status | jq .
```

### Health Check
```bash
curl -s https://ccwtf-api.aklo.workers.dev/bot/health | jq .
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "CreditsDepleted" error | Twitter account needs API credits (Basic tier $100/mo) |
| "Quality too low" repeated | Lower threshold in `index.ts` (currently 6) |
| Rate limit hit | Wait 85 minutes or use `{"force": true}` |
| Token expired | Re-run OAuth flow at `/auth` |
| Media upload fails | Bot falls back to text-only tweet |

---

## Cost Breakdown

| Service | Cost |
|---------|------|
| Cloudflare Workers | Free (100k req/day) |
| Cloudflare KV | Free (100k reads/day) |
| Gemini API | Free tier (with quota) |
| Twitter API | Basic tier ($100/mo) for reliable posting |

**Total: ~$100/month** (Twitter API)

---

## Future Improvements

- [ ] Token auto-refresh before expiry
- [ ] Engagement tracking (likes, RTs)
- [ ] Reply to mentions
- [ ] Trending topic integration
- [ ] A/B test caption styles
- [ ] Dashboard for monitoring
