# $CC - Claude Code Coin

> **claudecode.wtf** - The unofficial community memecoin celebrating Claude Code

---

## IMPORTANT: VPS ENVIRONMENT

**You are running directly on the VPS (5.161.107.128)!**
- Working directory: `/root/ccwtf`
- No SSH required - all commands execute locally
- Claude CLI: `~/.local/bin/claude`
- Node: v22.22.0 via nvm

---

## RULE #1: ALWAYS KEEP THIS FILE UPDATED

**After EVERY change to the codebase, you MUST update this file with:**
1. Updated project structure (if files added/removed)
2. Updated feature list (if features added/changed)
3. Updated architecture notes (if architecture changed)

**Also update CHANGELOG.md after every change** - this ensures we never lose history.

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

## Project Overview

### What This Is
A memecoin website for $CC (Claude Code Coin) featuring:
1. **Landing Page** (`/`) - Token info, community links, terminal animation
2. **Meme Generator** (`/meme`) - AI-powered meme creation with Gemini
3. **Space Invaders** (`/play`) - 2D Canvas game with CC mascot
4. **StarClaude64** (`/moon`) - 3D endless runner with Three.js
5. **Watch Brain** (`/watch`) - Real-time build logs from the autonomous agent
6. **Twitter Bot** (@ClaudeCodeWTF) - Automated tweet posting with AI-generated memes
7. **Video Generator** (`/video`) - Remotion-based cinematic trailer generator
8. **Central Brain** (`/brain`) - Full autonomous software engineering agent
9. **VJ Agent** (`/vj`) - Claude-powered live audio-reactive visual generator
10. **Rubber Duck Debugger** (`/duck`) - Interactive debugging companion
11. **Code Roast** (`/roast`) - Humorous code critique with actual suggestions
12. **24/7 Livestream** - Streams /watch to Kick/YouTube/Twitter via Docker

### Why It Exists
$CC is a community memecoin honoring Boris Cherny, creator of Claude Code. 100% of fees go to @bcherny.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE PAGES                         │
│                  (Static Site Hosting)                      │
│                                                             │
│   Next.js 16 Static Export (output: "export")               │
│   ├── / (landing page)                                      │
│   ├── /meme (AI meme generator)                             │
│   ├── /play (Space Invaders 2D)                             │
│   └── /moon (StarClaude64 3D)                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS (fetch)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   CLOUDFLARE WORKER                         │
│              https://ccwtf-api.aklo.workers.dev             │
│                                                             │
│   POST / → Gemini API (image generation)                    │
│   - Receives user prompt                                    │
│   - Fetches base character image from site                  │
│   - Sends multimodal request (image + text) to Gemini       │
│   - Returns generated image as base64                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    GOOGLE GEMINI API                        │
│         gemini-2.0-flash-exp-image-generation               │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   ANTHROPIC CLAUDE API                      │
│              claude-opus-4-5 (text generation)              │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      TWITTER API                            │
│     OAuth 1.0a (v2 tweets + v1.1 media upload)              │
└─────────────────────────────────────────────────────────────┘
```

**Why this architecture?**
- @cloudflare/next-on-pages doesn't support Next.js 16
- Solution: Static export for site, separate Worker for API

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router) | 16.1.4 |
| React | React | 19.2.3 |
| Styling | Tailwind CSS | 4 |
| 3D Engine | Three.js + @react-three/fiber | 0.182.0 / 9.5.0 |
| AI (Images) | Google Gemini API | gemini-2.0-flash-exp-image-generation |
| AI (Text) | Anthropic Claude API | claude-opus-4-5-20251101 |
| Hosting | Cloudflare Pages | - |
| API | Cloudflare Workers | - |
| Font | JetBrains Mono | Google Fonts |
| Video | Remotion | 4.x |
| VJ Audio | Web Audio API + realtime-bpm-analyzer | 3.x |
| VJ Visuals | Hydra Synth | 1.3.x |

---

## Project Structure

```
ccwtf/
├── app/
│   ├── _template/
│   │   └── page.tsx              # CANONICAL REFERENCE for brain/builder
│   ├── api/
│   │   └── generate/
│   │       └── route.ts          # Local Gemini API (unused in production)
│   ├── components/
│   │   ├── MoonMission/
│   │   │   ├── index.tsx         # Main game wrapper + HUD + screens
│   │   │   └── Game.tsx          # Three.js game logic
│   │   ├── BuyButton.tsx         # Link to bags.fm exchange
│   │   ├── ContractAddress.tsx   # Copy-to-clipboard contract
│   │   ├── SpaceInvaders.tsx     # Canvas 2D game (346 lines)
│   │   └── Terminal.tsx          # Animated typewriter Q&A
│   ├── duck/
│   │   └── page.tsx              # Rubber Duck Debugger
│   ├── ide/
│   │   └── page.tsx              # Claude Code IDE
│   ├── meme/
│   │   └── page.tsx              # Meme generator UI
│   ├── mood/
│   │   └── page.tsx              # Code Mood Ring
│   ├── moon/
│   │   └── page.tsx              # StarClaude64 3D game page
│   ├── play/
│   │   └── page.tsx              # Space Invaders game page
│   ├── poetry/
│   │   └── page.tsx              # Code Poetry Generator
│   ├── roast/
│   │   └── page.tsx              # Code Roast page
│   ├── vj/
│   │   └── page.tsx              # VJ - live audio-reactive visuals
│   ├── watch/
│   │   └── page.tsx              # Brain monitor - real-time build logs
│   ├── globals.css               # Tailwind + CSS variables
│   ├── layout.tsx                # Root layout + metadata
│   └── page.tsx                  # Homepage
├── public/
│   ├── cc.png                    # 2D logo (SOURCE OF TRUTH)
│   ├── claudecode.svg            # Vector SVG for 3D extrusion (Adobe Illustrator)
│   ├── claudecode.jpg            # 3D rendered mascot
│   └── og.jpg                    # Social preview
├── video/                        # Remotion video generator (separate project)
│   ├── src/
│   │   ├── Root.tsx              # Remotion entry point
│   │   ├── Trailer.tsx           # StarClaude64 15-second composition
│   │   ├── compositions/
│   │   │   ├── WebappTrailer.tsx # CINEMATIC 3D trailer (PRIMARY - used by brain)
│   │   │   ├── FeatureTrailer.tsx # Legacy feature trailer
│   │   │   └── *.tsx             # Other compositions
│   │   └── scenes/
│   │       └── *.tsx             # Scene components
│   ├── public/footage/           # Captured gameplay clips
│   ├── out/                      # Rendered output
│   └── package.json              # Remotion dependencies
├── brain/                        # Central Brain v4.2 (full autonomous loop + memes)
│   ├── src/
│   │   ├── index.ts              # HTTP/WS server + cron (port 3001)
│   │   ├── cycle.ts              # Full 9-phase cycle orchestration
│   │   ├── builder.ts            # Claude Agent SDK integration
│   │   ├── deployer.ts           # Cloudflare Pages deployment
│   │   ├── trailer.ts            # Remotion trailer generation
│   │   ├── homepage.ts           # Homepage button auto-updater
│   │   ├── recorder.ts           # Puppeteer video capture (fallback)
│   │   ├── twitter.ts            # OAuth 1.0a + video upload
│   │   ├── db.ts                 # SQLite database + meme tracking
│   │   ├── humor.ts              # Memecoin dev personality for logs
│   │   ├── meme.ts               # Meme generation engine (Claude + Gemini)
│   │   └── meme-prompts.ts       # 75+ dev-focused meme prompts
│   ├── brain.db                  # SQLite database file
│   └── package.json              # Dependencies
├── worker/                       # Cloudflare Worker (API + Bot)
│   ├── src/
│   │   ├── index.ts              # API routes + bot logic (~800 lines)
│   │   ├── twitter.ts            # Twitter API (OAuth 1.0a + video upload)
│   │   ├── claude.ts             # Caption generation + quality gate
│   │   ├── prompts.ts            # 50+ dev-focused meme prompts
│   │   ├── oauth1.ts             # OAuth 1.0a signature generation
│   │   └── types.ts              # TypeScript interfaces
│   ├── package.json
│   └── wrangler.toml             # Worker config + cron schedule
├── vj/                           # VJ Agent - Live audio-reactive visuals
│   ├── src/
│   │   ├── index.ts              # Main VJ orchestrator
│   │   ├── audio/
│   │   │   ├── capture.ts        # getDisplayMedia system audio capture
│   │   │   ├── analyzer.ts       # Web Audio API FFT analysis
│   │   │   └── beat.ts           # BPM detection (realtime-bpm-analyzer)
│   │   ├── engines/
│   │   │   ├── types.ts          # Common engine interface
│   │   │   ├── threejs/index.ts  # Three.js 3D engine (particles, geometry)
│   │   │   ├── hydra/index.ts    # Hydra live coding engine (GLSL shaders)
│   │   │   └── remotion/         # Remotion Player (hacked for live)
│   │   └── agent/
│   │       └── index.ts          # Claude Agent SDK VJ controller
│   └── package.json              # Dependencies
├── stream/                       # 24/7 Livestream Service (Docker)
│   ├── src/
│   │   ├── index.ts              # HTTP server (port 3002)
│   │   ├── streamer.ts           # Orchestrator with auto-restart
│   │   ├── cdp-capture.ts        # Puppeteer CDP screencast
│   │   ├── ffmpeg-pipeline.ts    # FFmpeg + tee muxer (uses lofi fallback)
│   │   ├── youtube-audio.ts      # yt-dlp audio URL fetcher (unused - YT blocks datacenter IPs)
│   │   └── destinations.ts       # RTMP config loader
│   ├── lofi-fallback.mp3         # Lofi audio (Chad Crouch "Shipping Lanes", CC licensed)
│   ├── Dockerfile                # Stream service image
│   ├── .env                      # RTMP keys (gitignored)
│   └── package.json              # Dependencies
├── docker-compose.yml            # Docker orchestration (brain + stream)
├── .dockerignore                 # Docker build exclusions
├── .env                          # Local secrets (GEMINI_API_KEY)
├── .env.example                  # Template
├── CHANGELOG.md                  # Version history (KEEP UPDATED!)
├── CLAUDE.md                     # This file (KEEP UPDATED!)
├── next.config.ts                # Static export config
├── package.json
└── tsconfig.json
```

---

## Features

### 1. Landing Page (`/`)
- Terminal-style dark theme
- Animated typewriter Q&A component
- Token info cards (1B supply, 100% fees to @bcherny)
- Contract address with copy button
- Links: Meme Generator, Space Invaders, StarClaude64, Buy, Twitter, GitHub

### 2. Meme Generator (`/meme`)
- Two-column layout: controls (left) | preview (right)
- Prompt input with example suggestions
- Random prompt button
- Calls Cloudflare Worker API → Gemini
- Download PNG button
- Share to Twitter button

### 3. Space Invaders (`/play`)
- Canvas-based 2D game
- CC mascot as player ship
- 5x11 grid of green pixel aliens
- Controls: Arrow keys / WASD + Space
- 3 lives, high score persistence
- Speed increases as aliens die

### 4. StarClaude64 (`/moon`)
- Three.js 3D endless runner
- Synthwave aesthetic (purple/cyan/pink)
- **3D CC Character:** Player ship is the actual $CC mascot extruded from SVG
  - Uses `public/claudecode.svg` (Adobe Illustrator export)
  - THREE.Shape + ExtrudeGeometry for accurate silhouette
  - Metallic reflective material with Claude orange (#da7756) emissive glow
  - Cyan engine glow + pink trail particles
- **Controls:**
  - WASD: Move up/down/left/right
  - Arrow Up/Down: Forward/backward (z-axis)
  - Arrow Left/Right: Barrel roll (invincibility!)
  - Space: Shoot bullets (rapid fire)
  - Shift: Launch bombs (slow, high damage)
- **Combat:**
  - Bullets: 2 hits to destroy asteroid (+25 pts)
  - Bombs: Instant kill, larger radius (+50 pts)
  - Explosions with fade animation
- Dodge asteroids, collect $CC coins (+10 pts)
- Speed ramps: 8 → 10 → 14 → 20 over 60s
- "REKT" death screen with share

### 5. Twitter Bot (@ClaudeCodeWTF)
- Automated tweet posting via cron (every 3 hours)
- AI-generated memes using Gemini (image generation)
- AI captions powered by Claude Opus 4.5 with dev personality ("just wanna code")
- OAuth 1.0a for everything (v2 API for tweets, v1.1 API for media upload)
- Quality gate (score 6+/10 required to post)
- **Global rate limiting** (15 tweets/day total, 30 min between ANY tweet)
- KV storage for bot state + tweet history
- **Video upload support** (chunked media upload for videos)
- Admin endpoints:
  - `GET /bot/status` - View posting status and recent tweets
  - `POST /bot/tweet` - Manual trigger (with `{"force": true}` option)
  - `POST /bot/tweet-video` - Post tweet with video attachment
  - `POST /bot/tweet-text` - Post text-only tweet
  - `GET /bot/health` - Health check
  - `GET /auth/v1` - OAuth 1.0a setup UI

### 6. Video Generator (`/video`)
- **CINEMATIC 3D Remotion trailers** with exact webapp UI recreation
- **WebappTrailer composition** - 3D tilted terminal with camera movements
- **Manifest-driven content** - extracts real buttons, inputs, outputs from deployed pages
- **How it works:**
  1. Extract manifest from deployed feature (buttons, placeholders, real output)
  2. Pass content to WebappTrailer Remotion composition
  3. Render 20-second CINEMATIC trailer with camera movements
- **3D Camera System:**
  - Tilted terminal window in 3D perspective
  - Dolly ins and zooms on active elements (2.2x-3.2x)
  - Cursor with click animations on buttons
  - Typewriter text animation for output
  - Perfect focal point centering throughout
- **Camera Positions (scene-by-scene):**
  - intro → inputTyping → inputCursorMove → buttonClick → processing → outputReveal → outputTyping → outputComplete → cta
- **Timeline (20 seconds):**
  - Input scene (5s) - Typing animation with zoom on textarea
  - Processing scene (1.5s) - Snappy spinner + progress bar
  - Output scene (8s) - Typewriter reveal with zoom tracking
  - CTA scene (5.5s) - "Try it now" + feature URL
- **Design tokens match webapp exactly:**
  - Colors: #0d0d0d, #1a1a1a, #da7756, etc.
  - Components: Terminal header, cards, buttons, footer
  - Typography: JetBrains Mono + system fonts
- **Key files:**
  - `video/src/compositions/WebappTrailer.tsx` - CINEMATIC 3D composition (PRIMARY)
  - `brain/src/trailer.ts` - Generator using manifest + WebappTrailer
  - `brain/src/manifest.ts` - Extracts real content from pages

### 7. Watch Brain (`/watch`)
Real-time build log viewer for the Central Brain:
- WebSocket connection to brain server (`ws://[host]:3001/ws`)
- Live streaming of all build phases and meme generation
- **Status Panel with Brain Modes:**
  - **BUILDING** (green badge) - Shows active project name and status
  - **RESTING** (fuchsia badge) - Shows meme stats and cooldown timer
  - **IDLE** (amber badge) - Ready to start new cycle
- **Activity Type Color Coding:**
  - Build activity: orange (Claude Agent)
  - Meme activity: fuchsia (with 🎨 emoji)
  - System messages: default text color
- GMGN price chart (hidden in lite mode for streaming)
- **Lite mode** (`?lite=1`): Hides heavy chart iframe to prevent Chrome crashes in headless streaming

### 9. VJ Agent (`/vj`)
Claude-powered live audio-reactive visual generator:
- **Three Visual Engines:**
  - **Three.js**: 3D particles, geometry, bloom post-processing
  - **Hydra**: Live coding GLSL shaders (like Resolume)
  - **Remotion**: Hacked Player with live audio props
- **Four Visual Styles:**
  - **Abstract**: Pure geometry, wireframes, particles
  - **Branded**: $CC orange (#da7756), mascot, token vibes
  - **Synthwave**: Neon 80s, pink/cyan, retro grids
  - **Auto**: Claude picks style based on music mood
- **Audio Capture:**
  - `getDisplayMedia` for system audio (Chrome/Edge only)
  - Web Audio API `AnalyserNode` for 60fps FFT
  - `realtime-bpm-analyzer` for BPM/beat detection
  - Frequency bands: bass (20-250Hz), mid (250-2kHz), high (2k-20kHz)
- **Claude Agent Integration:**
  - Tools: `switch_engine`, `switch_style`, `set_parameter`, `write_hydra_code`
  - Can analyze music mood and auto-adjust visuals
  - Quick commands: `three`, `hydra`, `synthwave`, `intensity 1.5`, etc.
- **Keyboard Shortcuts:**
  - H: Hide/show UI
  - F: Fullscreen
  - 1/2/3: Switch engines
  - A/B/S/X: Switch styles (Abstract/Branded/Synthwave/Auto)

**Run locally:**
```bash
cd vj
npm install
# Then visit /vj in the main Next.js app
```

### 10. Rubber Duck Debugger (`/duck`)
Interactive debugging companion based on "The Pragmatic Programmer" technique:
- Animated SVG duck with quacking animation
- Problem input textarea with common examples
- Pre-built problem templates for quick testing
- API integration for AI-powered debugging advice
- Occasionally gives intentionally bad advice (clearly marked)
- Explains the rubber duck debugging methodology

### 11. Code Roast (`/roast`)
Humorous code critique with actual suggestions:
- Code input with example snippets
- Random example button for testing
- AI-generated roasts with dev humor
- Actual improvement suggestions alongside the roast
- Feature cards (Brutally Honest, Actually Helpful, With Love)
- List of common roast targets (using var in 2026, console.log debugging, etc.)

### 12. 24/7 Livestream Service (Docker)
Streams `/watch` page to multiple platforms simultaneously:
- **Architecture:** CDP screencast → FFmpeg → RTMP (tee muxer)
- **Platforms:** Kick, YouTube, Twitter/X (configurable via env vars)
- **Audio:** Local lofi fallback (Chad Crouch "Shipping Lanes", CC licensed)
  - YouTube live streams block datacenter IPs (403 on HLS segments)
  - Uses volume-mounted `lofi-fallback.mp3` with `-stream_loop -1` for infinite loop
- **Settings:** 720p @ 30fps, 2500kbps video, 128kbps AAC audio
- **Auto-restart:** Up to 10 retries with 5s delay on failure
- **Health endpoint:** `GET /health` returns state, frame count, uptime
- **Control API:** `POST /start`, `POST /stop`
- **Docker:** Isolated container with CPU/memory limits (0.6 CPU, 400MB)

**Run:**
```bash
# Configure RTMP keys in stream/.env
cd /root/ccwtf
docker compose up -d stream

# Check health
curl localhost:3002/health
```

### 8. Central Brain (`/brain`) - FULL AUTONOMOUS AGENT v4.2
Continuous shipping agent - ships up to 5 features per day + generates memes during cooldowns:

- **Full 10-Phase Autonomous Loop:**
  1. **PLAN** - Claude plans project + 5 tweets for 24 hours
  2. **BUILD** - Claude Agent SDK builds the feature (with 3-retry debug loop)
  3. **DEPLOY** - Cloudflare Pages deployment via wrangler
  4. **VERIFY** - Confirms deployment is live (3 retries)
  5. **TEST** - **CRITICAL: Functional verification via Puppeteer** (buttons clickable, forms work, games playable)
  6. **TRAILER** - Remotion generates cinematic trailer
  7. **TWEET** - Posts announcement with video to $CC community
  8. **SCHEDULE** - Remaining tweets posted over 24 hours
  9. **HOMEPAGE** - Auto-adds button to homepage for new feature
  10. **CONTINUE** - After cooldown, starts next cycle (up to 5/day)
- **Meme Generation During Cooldowns:**
  - Every 15 minutes, checks if meme can be generated
  - Uses Claude Opus 4.5 for creative prompts and captions
  - Uses Gemini 2.0 Flash for image generation
  - Quality gate (score 6+/10 required to post)
  - Rate limits: 16 memes/day, 60 min minimum between posts
  - Posts to Twitter community with share_with_followers
- **Continuous Shipping Mode:**
  - 4.5-hour cooldown between cycles (staggered for visibility)
  - Daily limit of 5 features (prevents runaway costs)
  - Auto-starts next cycle after cooldown
  - Generates memes during cooldown periods
  - Resets at midnight UTC
- **Brain Modes (visible on /watch):**
  - **BUILDING** (green) - Active feature build cycle
  - **RESTING** (fuchsia) - Cooldown, generating memes
  - **IDLE** (amber) - Ready to start new cycle
- **Architecture:** Ultra-lean (no Docker)
  - SQLite (brain.db) + node-cron + pm2
  - WebSocket server for real-time log streaming
  - Activity types: build, meme, system (color-coded on /watch)
- **Key Files:**
  - `builder.ts` - Claude Agent SDK integration
  - `deployer.ts` - Cloudflare Pages deployment
  - `verifier.ts` - **Functional verification via Puppeteer (CRITICAL)**
  - `trailer.ts` - Remotion trailer generation
  - `homepage.ts` - Homepage button auto-updater
  - `cycle.ts` - Full autonomous loop orchestration
  - `meme.ts` - Meme generation engine (Claude + Gemini)
  - `meme-prompts.ts` - 75+ dev-focused meme prompts
  - `index.ts` - HTTP/WebSocket server
  - `db.ts` - SQLite database + daily_stats + meme tracking

**API Endpoints:**
- `GET /status` - Current cycle status + brain mode + meme stats
- `GET /stats` - Daily shipping statistics
- `GET /tweets` - Global tweet rate limiting stats (15/day, 30 min between)
- `GET /memes` - Meme generation stats
- `POST /meme/trigger` - Manually trigger meme generation
- `POST /go` - Start new cycle
- `POST /cancel` - Cancel active cycle
- `WS /ws` - Real-time log streaming (with activityType)

**VPS Environment (Production):**
- **Server:** 5.161.107.128 (Hetzner VPS)
- **Working Directory:** `/root/ccwtf`
- **Public URL:** https://brain.claudecode.wtf (via Cloudflare tunnel)
- **WebSocket:** wss://brain.claudecode.wtf/ws
- **Process:** pm2 with name `cc-brain`
- **Node:** v22.22.0 via nvm
- **Claude CLI:** `~/.local/bin/claude`

**IMPORTANT: You are already on the VPS!**
Claude Code sessions run directly on the VPS. No SSH required - all commands execute locally.

**Run Brain:**
```bash
cd /root/ccwtf/brain
npm install
npm run dev   # Development with hot reload
npm start     # Production

# Using pm2
pm2 start npm --name cc-brain -- run dev
pm2 logs cc-brain  # View logs
```

**⚠️ IMPORTANT: Cancel Endpoint Limitation**
The `/cancel` endpoint only marks the cycle as complete in SQLite - it does NOT kill the running Claude subprocess. To fully cancel:
```bash
# 1. Cancel via API
curl -X POST https://brain.claudecode.wtf/cancel

# 2. Kill the orphaned Claude process (run directly, no SSH needed)
pkill -f '/root/.local/bin/claude'
```

---

## Brand Assets

### CC Mascot Anatomy (CRITICAL)
```
THE CHARACTER'S BODY FROM TOP TO BOTTOM:
1. TOP EDGE: Completely flat. NO bumps. NO antenna. FLAT.
2. BODY: Rectangular block, wider than tall, rounded edges.
3. LEFT SIDE: One rectangular arm
4. RIGHT SIDE: One rectangular arm (symmetrical)
5. BOTTOM: 4 short legs (2 left, 2 right, gap in middle)

FACE: Two vertical rectangular EMPTY HOLES (not real eyes)

DOES NOT HAVE:
- NO antenna or protrusions on top
- NO mouth
- NO tail
- NO expressions (it's an inanimate ceramic figurine)
```

### Color Palette
```css
--bg-primary: #0d0d0d       /* Main background */
--bg-secondary: #1a1a1a     /* Cards */
--bg-tertiary: #262626      /* Hover states */
--text-primary: #e0e0e0     /* Main text */
--text-secondary: #a0a0a0   /* Muted text */
--text-muted: #666666       /* Very muted text */
--claude-orange: #da7756    /* Brand accent */
--accent-green: #4ade80     /* Aliens, success */
--accent-cyan: #00ffff      /* StarClaude64 */
--accent-fuchsia: #ff00ff   /* StarClaude64 */
--border: #333333           /* Border color */
```

---

## UI Styleguide (LOCKED IN - ALWAYS FOLLOW)

**This is the official styleguide for claudecode.wtf. All pages MUST follow these patterns.**

### Background
- **ALL pages use the same background:** `#0d0d0d` (--bg-primary)
- NO gradients, NO `bg-black`, NO custom backgrounds
- Background is inherited from `body` in `globals.css`

### Page Layout Pattern
Every page follows this exact structure:

```tsx
<div className="min-h-screen w-full flex items-center justify-center py-4 sm:py-8 px-[5%]">
  <div className="max-w-[900px] w-[90%]">
    {/* Header */}
    {/* Content */}
    {/* Footer */}
  </div>
</div>
```

**Key measurements:**
- Outer: `px-[5%]` horizontal padding
- Inner: `w-[90%]` width with `max-w-[900px]` (or `max-w-[1200px]` for wide pages like IDE/poetry)
- Vertical: `py-4 sm:py-8` responsive padding

### Header Pattern (Traffic Lights)
Every page has the same header structure:

```tsx
<header className="flex items-center gap-3 py-3 mb-6">
  {/* Traffic lights - LINK TO HOMEPAGE */}
  <Link href="/" className="flex gap-2 hover:opacity-80 transition-opacity">
    <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
    <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
    <div className="w-3 h-3 rounded-full bg-[#28c840]" />
  </Link>

  {/* CC Icon - LINK TO HOMEPAGE */}
  <Link href="/" className="hover:opacity-80 transition-opacity">
    <img src="/cc.png" alt="$CC" width={24} height={24} />
  </Link>

  {/* Page Title - NOT A LINK, just text */}
  <span className="text-claude-orange font-semibold text-sm">Page Title</span>

  {/* Optional tagline - right aligned */}
  <span className="text-text-muted text-xs ml-auto">Optional tagline</span>
</header>
```

**Important:**
- Traffic lights and CC icon are LINKS to homepage
- Page title is NOT a link (just a `<span>`)
- No `border-b` on header (clean look)

### Footer Pattern
Every page has the same footer structure:

```tsx
<footer className="py-4 mt-6 text-center">
  <Link href="/" className="text-claude-orange hover:underline text-sm">
    ← back
  </Link>
  <p className="text-text-muted text-xs mt-2">
    claudecode.wtf · [page-specific tagline]
  </p>
</footer>
```

**Important:**
- Always include `← back` link to homepage
- No `border-t` on footer (clean look)
- Tagline is optional but recommended

### Homepage-Specific Layout
The homepage has a unique structure:

```tsx
{/* Terminal Header with border */}
<header className="flex items-center gap-3 py-3 border-b border-border">
  <div className="flex gap-2">
    {/* Traffic lights - NOT links on homepage */}
    <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
    <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
    <div className="w-3 h-3 rounded-full bg-[#28c840]" />
  </div>
  <span className="text-text-secondary text-sm ml-auto">
    claude-code-coin ~ zsh
  </span>
</header>

{/* Logo + Social Links Row */}
<div className="flex items-start justify-between -mt-6">
  <img src="/cc.png" alt="$CC" width={64} height={64} />
  <div className="flex items-center gap-4">
    {/* Social links: @ClaudeCodeWTF, @bcherny, Claude Code GitHub */}
  </div>
</div>
```

### Card/Section Pattern
Cards and sections use:

```tsx
<div className="bg-bg-secondary border border-border rounded-lg p-4">
  {/* Card content */}
</div>
```

### Button Patterns

**Primary (orange fill):**
```tsx
className="bg-claude-orange text-white font-semibold py-2 px-6 rounded-md text-sm hover:bg-claude-orange/80 transition-colors"
```

**Secondary (outline):**
```tsx
className="bg-bg-secondary border border-border text-text-primary px-4 py-2 rounded-md text-sm hover:bg-bg-tertiary hover:border-claude-orange hover:text-claude-orange transition-colors"
```

**Feature buttons (colored borders):**
```tsx
className="bg-bg-secondary border border-[color]-500 text-[color]-400 px-4 py-2 rounded-md text-sm font-semibold hover:bg-[color]-500 hover:text-white transition-colors"
```

Available colors: `cyan`, `fuchsia`, `green`, `yellow`, `orange`, `rose`, `indigo`

### Typography
- **Page titles:** `text-claude-orange font-semibold text-sm`
- **Section labels:** `text-text-secondary text-xs uppercase tracking-wider`
- **Body text:** `text-text-primary text-sm`
- **Muted text:** `text-text-muted text-xs`
- **Links:** `text-claude-orange hover:underline`

### Form Elements

**Text input/textarea:**
```tsx
className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors"
```

### Icons
- Use inline SVGs, not icon libraries
- Standard size: `width={16} height={16}` for buttons
- Social icons: `width={14} height={14}`

### Spacing
- Grid gaps: `gap-4` (16px) standard, `gap-2` (8px) tight
- Section margins: `mb-6` or `mt-6`
- Card padding: `p-4`

### DO NOT
- ❌ Use `bg-black` - always inherit from body (#0d0d0d)
- ❌ Use gradients for backgrounds
- ❌ Make page titles clickable links
- ❌ Add borders to header/footer
- ❌ Forget the `← back` link in footer
- ❌ Use different padding/margin patterns per page

---

## Secrets & Environment

### VPS Environment (.env)
```
GEMINI_API_KEY=your-key-here
CLOUDFLARE_API_TOKEN=your-token-here   # Required for wrangler deploys
```

### Cloudflare Worker Secrets
```bash
cd worker

# AI APIs
npx wrangler secret put GEMINI_API_KEY      # Image generation
npx wrangler secret put ANTHROPIC_API_KEY   # Caption generation (Claude Opus 4.5)

# Twitter OAuth 1.0a (for everything)
npx wrangler secret put TWITTER_API_KEY      # Consumer Key
npx wrangler secret put TWITTER_API_SECRET   # Consumer Secret
npx wrangler secret put TWITTER_ACCESS_TOKEN # Access Token
npx wrangler secret put TWITTER_ACCESS_SECRET # Access Token Secret
```

The worker also uses `BASE_IMAGE_URL` set in wrangler.toml:
```toml
[vars]
BASE_IMAGE_URL = "https://claudecode.wtf/claudecode.jpg"
```

---

## Development Commands

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Deploy to Cloudflare Pages (uses CLOUDFLARE_API_TOKEN from .env)
source .env && npx wrangler pages deploy out --project-name=ccwtf

# Deploy API Worker
cd worker
npm install
npx wrangler deploy
```

---

## Key Files Reference

| File | Purpose | Lines |
|------|---------|-------|
| `app/page.tsx` | Homepage with all content | ~180 |
| `app/duck/page.tsx` | Rubber Duck Debugger | ~225 |
| `app/roast/page.tsx` | Code Roast page | ~215 |
| `app/meme/page.tsx` | Meme generator UI | ~227 |
| `app/components/SpaceInvaders.tsx` | 2D Canvas game | ~346 |
| `app/components/MoonMission/index.tsx` | 3D game wrapper | ~110 |
| `app/components/MoonMission/Game.tsx` | 3D game logic | ~220 |
| `worker/src/index.ts` | API routes + bot logic | ~800 |
| `worker/src/twitter.ts` | Twitter API + video upload | ~295 |
| `worker/src/claude.ts` | Caption + quality gate | ~180 |
| `worker/src/prompts.ts` | Meme prompt templates | ~100 |
| `worker/src/oauth1.ts` | OAuth 1.0a signatures | ~130 |
| `video/agent/index.ts` | Autonomous trailer capture | ~300 |
| `video/src/Trailer.tsx` | Main 15s composition | ~200 |
| `video/src/scenes/*.tsx` | Motion graphics scenes | ~230 |
| `video/post-tweet.ts` | Twitter video posting | ~35 |
| `app/watch/page.tsx` | Brain monitor UI | ~345 |
| `brain/src/index.ts` | HTTP + WebSocket server | ~620 |
| `brain/src/cycle.ts` | Full autonomous loop | ~410 |
| `brain/src/builder.ts` | Claude Agent SDK builder | ~180 |
| `brain/src/deployer.ts` | Cloudflare deployment | ~85 |
| `brain/src/recorder.ts` | Video capture (Puppeteer) | ~320 |
| `brain/src/db.ts` | SQLite database + meme tracking | ~1100 |
| `brain/src/twitter.ts` | Twitter API + community | ~300 |
| `brain/src/humor.ts` | Memecoin dev humor for logs | ~210 |
| `brain/src/meme.ts` | Meme generation engine | ~350 |
| `brain/src/meme-prompts.ts` | 75+ dev meme prompts | ~90 |
| `app/vj/page.tsx` | VJ page UI | ~250 |
| `vj/src/index.ts` | VJ orchestrator | ~280 |
| `vj/src/audio/capture.ts` | System audio capture | ~85 |
| `vj/src/audio/analyzer.ts` | FFT analysis | ~150 |
| `vj/src/engines/threejs/index.ts` | Three.js engine | ~250 |
| `vj/src/engines/hydra/index.ts` | Hydra engine | ~200 |
| `vj/src/agent/index.ts` | Claude Agent SDK VJ | ~300 |

---

## What's NOT Built Yet

- [ ] `/meme/gallery` - Meme leaderboard
- [ ] `/meme/[id]` - Individual meme pages with OG tags
- [ ] Voting system
- [ ] Image storage (Vercel Blob) for persistence
- [ ] Database (KV/D1) for leaderboard
- [ ] Mobile game controls (virtual joystick)
- [ ] Central Brain: P2E Integration (Solana token distribution)
- [ ] Central Brain: Campaign System (Meme2Earn, voting)

---

## Contract Info

- **Token:** $CC (Claude Code Coin)
- **Chain:** Solana
- **Contract:** `Hg23qBLJDvhQtGLHMvot7NK54qAhzQFj9BVd5jpABAGS`
- **Supply:** 1,000,000,000
- **Fees:** 100% to @bcherny

---

## Links

- **Site:** https://claudecode.wtf
- **API:** https://ccwtf-api.aklo.workers.dev
- **Twitter Bot:** https://twitter.com/ClaudeCodeWTF
- **GitHub:** https://github.com/aklo360/cc
- **Community:** https://x.com/i/communities/2014131779628618154
- **Buy:** https://bags.fm/cc
