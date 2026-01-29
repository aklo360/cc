# $CC - Claude Code Coin

> **claudecode.wtf** - The unofficial community memecoin celebrating Claude Code

---

## THE MISSION: FULLY AUTONOMOUS AI AGENT

**This project exists to build an AI agent that runs ENTIRELY on its own with ZERO human input.**

The agent operates on a 24-hour cycle:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    AUTONOMOUS 24-HOUR CYCLE                              │
├─────────────────────────────────────────────────────────────────────────┤
│  1. PLAN      → Agent decides what feature to build (no human input)    │
│  2. BUILD     → Agent writes all code via Claude Agent SDK              │
│  3. TEST      → Agent verifies the feature works                        │
│  4. DEPLOY    → Agent ships to Cloudflare via Wrangler                  │
│  5. TRAILER   → Agent generates video preview via Remotion              │
│  6. THREAD    → Agent writes 4-tweet announcement thread                │
│  7. POST      → Agent posts thread with trailer to Twitter              │
│  8. HOMEPAGE  → Agent adds feature to landing page                      │
│  9. REPEAT    → Wait 24 hours, start again                              │
└─────────────────────────────────────────────────────────────────────────┘
```

**No human triggers. No approvals. No intervention.**

The brain wakes up, decides what to build, builds it, ships it, announces it, and goes back to grinding. Every single day. Forever.

This is NOT a "Claude-assisted" project. This is a **Claude-operated** project.

---

## IMPORTANT: MAC MINI ENVIRONMENT (NEW HOME!)

**You are running on the Mac Mini (claude@mac-mini)!**
- Working directory: `~/ccwtf` (`/Users/claude/ccwtf`)
- Hostname: `mac-mini` / `192.168.1.189` (local network)
- Claude CLI: `~/.local/bin/claude` (symlink to nvm installation)
- Node: v22.22.0 via nvm
- Docker Desktop: Running with auto-start on boot

**Services (all auto-start on boot):**
- `ccwtf-brain` → localhost:3001 → https://brain.claudecode.wtf (via Cloudflare Tunnel)
- `ccwtf-stream` → localhost:3002 → Streams to Twitter/YouTube/Kick (24/7)
- `stunnel` → localhost:1936 → Kick RTMPS proxy (required for Kick streaming)
- `cloudflared` tunnel → LaunchAgent at `~/Library/LaunchAgents/com.cloudflare.tunnel.plist`

**Mac Mini Server Settings:**
- Sleep: disabled (`sudo pmset -a sleep 0 displaysleep 0 disksleep 0`)
- Always-on 24/7 operation

---

## RULE #1: DOCUMENTATION IS SACRED

**After EVERY change to the codebase, you MUST:**
1. Update **CHANGELOG.md** (version history)
2. Update **CLAUDE.md** if architecture/structure changed
3. Create/update **docs/*.md** for component-specific changes

Component documentation lives in `docs/` - see [Component Index](#component-index) below.

---

## RULE #2: DEPLOYMENT IS VIA WRANGLER (NOT GITHUB)

- **GitHub is for VERSION CONTROL only**
- **Cloudflare deployment is via Wrangler CLI directly**

```bash
# Deploy static site to Cloudflare Pages
npm run build
npx wrangler pages deploy out --project-name=ccwtf

# Deploy API Worker
cd worker
npx wrangler deploy
```

**Live URLs:**
- Site: https://claudecode.wtf
- API: https://ccwtf-api.aklo.workers.dev

---

## RULE #3: CRYPTO/FINTECH SAFETY IS NON-NEGOTIABLE

> **After a catastrophic 1.68M token burn incident (2026-01-27), safety is paramount.**

### Quick Reference

- NEVER test financial operations on mainnet first
- ALWAYS validate amounts before irreversible operations
- ALWAYS implement dry-run mode for financial functions
- NEVER burn/transfer "entire balance" - use specific amounts
- MAX safety caps: Burns 1M, Transfers 100M, Swaps 10 SOL

### 3-Wallet Architecture

```
REWARDS (cold, 9M) → GAME (hot, 1M) → Players
                           ↓
                    BURN (airlock)
```

**Full details:** [docs/crypto-safety.md](docs/crypto-safety.md)

---

## RULE #4: DOCKER-FIRST ARCHITECTURE

**Default:** All new services MUST run in Docker.

**Exception:** Only if service requires hardware access that can't be containerized:
- GPU access (Metal, CUDA)
- Display/screen capture (CDP, avfoundation)
- System audio capture
- Native macOS APIs

| Service | Location | Reason |
|---------|----------|--------|
| **Brain** | Docker | CPU/RAM/Network only |
| **Stream** | Host | Metal GPU + display capture |
| **Tunnel** | Host | Simple binary, no benefit to containerize |

**Full details:** [docs/docker.md](docs/docker.md)

---

## RULE #5: 24/7 LIVESTREAM IS SACRED - NEVER KILL IT

> **The Twitter/X livestream MUST remain up 24/7. This is non-negotiable.**

### Critical Requirements

- **NEVER restart the stream service** unless absolutely necessary
- **NEVER run FFmpeg tests** that could interfere with the live stream
- **Twitter is PRIMARY** - it must always be streaming
- **YouTube is SECONDARY** - nice to have but don't break Twitter for it
- **Kick is TERTIARY** - experimental, test separately

### When Testing New Destinations

1. **Check stream health first**: `curl http://localhost:3002/health`
2. **Run tests in SEPARATE FFmpeg processes** - never touch the main pipeline
3. **Use test patterns** (`testsrc`) not the live capture
4. **If adding a new destination**, add to `.env` and restart ONLY when confident

### Current Multi-Stream Architecture

```
Chrome CDP → libx264 → tee muxer
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
      Twitter          YouTube           Kick
      (PRIMARY)        (ACTIVE)     (ACTIVE via stunnel)
```

### Live Stream URLs

| Platform | URL | Status |
|----------|-----|--------|
| **Twitter/X** | https://x.com/ClaudeCodeWTF | ✅ PRIMARY |
| **YouTube** | https://www.youtube.com/live/JdSyXwI-DGw | ✅ ACTIVE |
| **Kick** | https://kick.com/pxpwtf | ✅ ACTIVE |

### Kick Stunnel Proxy (CRITICAL)

Kick requires RTMPS but macOS has TLS issues. Stunnel proxies plain RTMP to RTMPS:

```
FFmpeg → rtmp://127.0.0.1:1936 → stunnel → rtmps://kick.com:443
```

**Stunnel must be running for Kick to work!**
- Config: `/tmp/kick-stunnel.conf`
- LaunchAgent: `~/Library/LaunchAgents/com.kick.stunnel.plist`

### Recovery Commands

```bash
# Check if stream is up
curl -s http://localhost:3002/health | jq '.stream'

# Restart stream (LAST RESORT)
cd ~/ccwtf/stream && ./stream-service.sh restart

# View logs
tail -f ~/ccwtf/stream/stream.log
```

---

## Project Overview

A memecoin website for $CC (Claude Code Coin) featuring:
1. **Landing Page** (`/`) - Token info, community links, terminal animation
2. **Meme Generator** (`/meme`) - AI-powered meme creation with Gemini
3. **Space Invaders** (`/play`) - 2D Canvas game with CC mascot
4. **StarClaude64** (`/moon`) - 3D endless runner with Three.js
5. **Watch Brain** (`/watch`) - Real-time build logs + exposed reasoning from the autonomous agent
6. **Twitter Bot** (@ClaudeCodeWTF) - Autonomous 4-tweet threads with AI-generated trailers
7. **Video Generator** (`/video`) - Remotion-based cinematic trailer generator
8. **Crypto Lab Brain** (`/brain`) - Blockchain experiment factory (Brain 2.0)
9. **VJ Agent** (`/vj`) - Claude-powered live audio-reactive visual generator
10. **24/7 Livestream** - Native Mac Mini CDP screencast → libx264 → Twitter/X + YouTube
11. **CC Flip** (`/ccflip`) - Mainnet coin flip game with Solana wallet integration
12. **Trading Terminal** (`/swap`) - SOL/$CC swap with Jupiter, 1% fee → buyback & burn

**Why It Exists:** $CC is a community memecoin honoring Boris Cherny, creator of Claude Code. 100% of fees go to @bcherny.

---

## Autonomous Operation (The Pipeline)

The brain operates 24/7 without human instruction. This is the core of everything.

### The 8-Phase Pipeline

| Phase | Name | What Happens | Output |
|-------|------|--------------|--------|
| 1 | **WAKE** | Daily at 9 AM UTC, brain triggers new cycle | Cycle started |
| 2 | **PLAN** | Claude selects experiment type, generates theme, writes spec | `experiment.json` |
| 3 | **BUILD** | Claude Agent SDK writes all code in `app/[slug]/` | Working feature |
| 4 | **TEST** | Verify build succeeds, feature renders, no errors | Build passes |
| 5 | **DEPLOY** | Wrangler deploys to Cloudflare Pages | Live URL |
| 6 | **TRAILER** | Remotion renders 15-20s cinematic video preview | `.mp4` file |
| 7 | **THREAD** | Claude writes 4-tweet announcement thread | Thread content |
| 8 | **POST** | Upload video, post thread to Twitter, update homepage | Announcement live |

### Thread Structure (Phase 7)

Every feature launch includes a 4-tweet thread:

| Tweet | Purpose | Content |
|-------|---------|---------|
| 1 | Hook + Video | Feature intro, attach trailer, cross-post to community |
| 2 | The Detail | Unique/fun aspect that makes people want to try it |
| 3 | The Tech | How it works technically (builds credibility) |
| 4 | The CTA | Link to feature, call to action |

See `docs/twitter-thread-templates.md` for examples and templates.

### Key Principle

**No human triggers. No approvals. No intervention.**

The brain decides what to build, builds it, ships it, announces it, and moves on. Every single day.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE PAGES                         │
│                  (Static Site Hosting)                      │
│   Next.js 16 Static Export (output: "export")               │
└─────────────────────────────────────────────────────────────┘
                            │ HTTPS (fetch)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   CLOUDFLARE WORKER                         │
│              https://ccwtf-api.aklo.workers.dev             │
│   POST / → Gemini API (image generation)                    │
└─────────────────────────────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│   GOOGLE GEMINI API  |  ANTHROPIC CLAUDE API  |  TWITTER   │
└─────────────────────────────────────────────────────────────┘
```

**Why:** @cloudflare/next-on-pages doesn't support Next.js 16 → Static export + Worker

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router) | 16.1.4 |
| React | React | 19.2.3 |
| Styling | Tailwind CSS | 4 |
| 3D Engine | Three.js + @react-three/fiber | 0.182.0 / 9.5.0 |
| AI (Images) | Google Gemini API | gemini-2.0-flash-exp |
| AI (Text) | Anthropic Claude API | claude-opus-4-5 |
| Blockchain | Solana + Anchor | 1.95.0 / 0.29.0 |
| Wallet | Solana Wallet Adapter | 0.15.35 |
| Hosting | Cloudflare Pages/Workers | - |
| Video | Remotion | 4.x |
| VJ | Hydra Synth + Web Audio API | 1.3.x |

---

## Project Structure

```
ccwtf/
├── app/                          # Next.js pages + components
│   ├── _template/                # CANONICAL templates for brain/builder
│   ├── components/               # Shared components
│   │   ├── gamefi/               # GameFi shared components
│   │   ├── MoonMission/          # StarClaude64 3D game
│   │   └── *.tsx                 # Other components
│   ├── ccflip/                   # CC Flip mainnet game
│   ├── swap/                     # Trading Terminal (SOL/$CC)
│   ├── meme/                     # Meme generator
│   ├── moon/                     # StarClaude64
│   ├── play/                     # Space Invaders
│   ├── vj/                       # VJ Agent
│   ├── watch/                    # Brain monitor
│   └── page.tsx                  # Homepage
├── brain/                        # Central Brain 2.0 - Crypto Lab
│   └── src/                      # HTTP/WS server, cycle, wallet, etc.
├── docs/                         # Component documentation
├── programs/                     # Anchor Programs (Solana)
├── public/                       # Static assets
├── stream/                       # 24/7 Livestream Service
├── video/                        # Remotion video generator
├── vj/                           # VJ Agent engines
├── worker/                       # Cloudflare Worker (API + Bot)
├── docker-compose.yml            # Docker orchestration
├── CHANGELOG.md                  # Version history
└── CLAUDE.md                     # This file
```

---

## Component Index

Detailed documentation for each component:

| Component | Doc | Description |
|-----------|-----|-------------|
| **Crypto Safety** | [docs/crypto-safety.md](docs/crypto-safety.md) | 3-wallet architecture, safety patterns, code review checklist |
| **Central Brain** | [docs/brain.md](docs/brain.md) | Crypto Lab experiment cycle, API endpoints, Docker commands |
| **Docker** | [docs/docker.md](docs/docker.md) | Docker-first rule, service matrix, commands, troubleshooting |
| **GameFi** | [docs/gamefi.md](docs/gamefi.md) | CC Flip, wallet integration, provably fair, templates |
| **Swap Terminal** | [docs/swap-terminal.md](docs/swap-terminal.md) | Jupiter integration, fee buyback & burn, DVD bounce |
| **Twitter Bot** | [docs/twitter-bot.md](docs/twitter-bot.md) | Unified tweet queue, meme generation, rate limiting |
| **Thread Templates** | [docs/twitter-thread-templates.md](docs/twitter-thread-templates.md) | Announcement thread structure, examples, pipeline integration |
| **Video Generator** | [docs/video-generator.md](docs/video-generator.md) | Remotion trailers, GameFiTrailer standard, camera system |
| **VJ Agent** | [docs/vj-agent.md](docs/vj-agent.md) | Visual modes, audio capture, keyboard shortcuts |
| **Livestream** | [docs/livestream.md](docs/livestream.md) | CDP capture, FFmpeg, scene switching |
| **Idle Grind** | [docs/idle-grind.md](docs/idle-grind.md) | Background activity system, activity types, token economics |
| **Reasoning System** | [docs/reasoning-system.md](docs/reasoning-system.md) | Thinking sessions, insights database, exposed reasoning |
| **UI Styleguide** | [docs/ui-styleguide.md](docs/ui-styleguide.md) | Layouts, headers, buttons, typography |
| **Brand** | [docs/brand.md](docs/brand.md) | Mascot anatomy, color palette, assets |
| **Maintenance** | [docs/claude-code-maintenance.md](docs/claude-code-maintenance.md) | Session management, duplicate cleanup, best practices |

---

## Development Commands

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Deploy to Cloudflare Pages
source .env && npx wrangler pages deploy out --project-name=ccwtf

# Deploy API Worker
cd worker && npx wrangler deploy

# Brain commands
docker logs ccwtf-brain -f           # View logs
docker compose restart brain         # Restart
curl http://localhost:3001/status    # Check status
```

---

## Secrets & Environment

### Local (.env)
```
GEMINI_API_KEY=your-key-here
CLOUDFLARE_API_TOKEN=your-token-here
```

### Cloudflare Worker
```bash
cd worker
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put TWITTER_API_KEY
npx wrangler secret put TWITTER_API_SECRET
npx wrangler secret put TWITTER_ACCESS_TOKEN
npx wrangler secret put TWITTER_ACCESS_SECRET
```

---

## Contract Info

### Mainnet
- **Token:** $CC (Claude Code Coin)
- **Chain:** Solana
- **Contract:** `Hg23qBLJDvhQtGLHMvot7NK54qAhzQFj9BVd5jpABAGS`
- **Supply:** 1,000,000,000
- **Fees:** 100% to @bcherny

### Devnet (Testing)
- **Contract:** `GzoMpC5ywKJzHsKmHBepHUXBP72V9QMtVBqus3egCDe9`
- **Mint Authority:** Brain wallet (`HFss9LWnsmmLqxWHRfQJ7BHKBX8tSzuhw1Qny3QQAb4z`)

---

## Links

- **Site:** https://claudecode.wtf
- **API:** https://ccwtf-api.aklo.workers.dev
- **Twitter Bot:** https://twitter.com/ClaudeCodeWTF
- **GitHub:** https://github.com/aklo360/cc
- **Community:** https://x.com/i/communities/2014131779628618154
- **Buy:** https://bags.fm/cc

---

## What's NOT Built Yet

- [ ] `/meme/gallery` - Meme leaderboard
- [ ] `/meme/[id]` - Individual meme pages with OG tags
- [ ] Voting system
- [ ] Mobile game controls (virtual joystick)
- [ ] Crypto Lab: Additional experiment types
- [ ] Crypto Lab: Experiment analytics dashboard
