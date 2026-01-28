# $CC - Claude Code Coin

> **claudecode.wtf** - The unofficial community memecoin celebrating Claude Code

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
- `ccwtf-stream` → localhost:3002 → Streams to Kick/YouTube/Twitter
- `cloudflared` tunnel → LaunchAgent at `~/Library/LaunchAgents/com.cloudflare.tunnel.plist`

**Mac Mini Server Settings:**
- Sleep: disabled (`sudo pmset -a sleep 0 displaysleep 0 disksleep 0`)
- Always-on 24/7 operation

**Previous VPS (DECOMMISSIONED):**
- Was: 5.161.107.128 (Hetzner)
- Migrated: 2026-01-26
- Status: Can be shut down after backup verification

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

## RULE #3: CRYPTO/FINTECH SAFETY IS NON-NEGOTIABLE

**This rule exists because of a catastrophic incident where 1.68M tokens were accidentally burned (2026-01-27).**

### ABSOLUTE REQUIREMENTS FOR ANY FINANCIAL CODE:

#### 1. NEVER Test Financial Operations on Mainnet First
- ALL new financial features MUST be tested on devnet/testnet first
- Use mock/simulation mode before any real transaction
- Only after 3+ successful devnet tests, proceed to mainnet with MINIMAL amounts

#### 2. ALWAYS Validate Amounts Before Irreversible Operations
```typescript
// REQUIRED pattern for ANY burn/transfer/swap:
if (amount > currentBalance) {
  throw new Error(`SAFETY STOP: Amount exceeds balance`);
}
if (amount > MAX_SAFE_AMOUNT) {
  throw new Error(`SAFETY STOP: Amount exceeds safety limit`);
}
console.log(`[VALIDATION] Balance: ${balance}, Amount: ${amount}, Remaining: ${balance - amount}`);
```

#### 3. ALWAYS Add Safety Caps
- Burns: MAX 1M tokens per transaction
- Transfers: MAX 100M tokens per transaction
- Swaps: MAX 10 SOL per transaction
- These caps can be raised ONLY with explicit user approval

#### 4. ALWAYS Implement Dry-Run Mode
Every financial function MUST have a `dryRun` parameter:
```typescript
function dangerousFinancialOperation(amount: number, dryRun = false) {
  if (dryRun) {
    console.log(`[DRY RUN] Would execute: ${operation} with ${amount}`);
    return { dryRun: true, wouldExecute: { ... } };
  }
  // ... actual execution
}
```

#### 5. NEVER Burn/Transfer "Entire Balance"
- NEVER use `wallet.getBalance()` as the amount to burn/transfer
- ALWAYS use the specific amount from the operation (e.g., swap output)
- If you need to move "everything", calculate the exact amount first and validate

#### 6. ALWAYS Log Before Irreversible Operations
```typescript
console.log(`[CRITICAL] About to burn ${amount} tokens`);
console.log(`[CRITICAL] Current balance: ${balance}`);
console.log(`[CRITICAL] After operation: ${balance - amount}`);
```

#### 7. ALWAYS Ask Before Implementing Financial Features
Before writing ANY code that:
- Transfers tokens
- Burns tokens
- Swaps tokens
- Withdraws funds
- Modifies wallet balances

ASK THE USER:
- "Should I implement dry-run mode first?"
- "What are the safety limits you want?"
- "Should we test on devnet first?"

### FORBIDDEN PATTERNS:

```typescript
// FORBIDDEN: Burning entire balance
const balance = await getBalance();
await burn(balance); // NEVER DO THIS

// FORBIDDEN: Transferring without validation
await transfer(destination, amount); // NEVER without balance check

// FORBIDDEN: Testing on mainnet first
await mainnetSwap(amount); // NEVER before devnet testing

// FORBIDDEN: No safety caps
await burn(userProvidedAmount); // NEVER without MAX limit
```

### 3-WALLET ARCHITECTURE (IMPLEMENTED 2026-01-27)

After the 1.68M burn incident, we now use a 3-wallet architecture for maximum security:

```
┌─────────────────────────┐
│     REWARDS WALLET      │  ← Cold Storage (9M $CC)
│     (Ultra Secure)      │
│  • Never used by games  │
│  • Only tops up game    │
│  • Max 1M/day transfer  │
└───────────┬─────────────┘
            │
   Daily top-up (if < 300K)
            │
            ▼
┌─────────────────────────┐
│      GAME WALLET        │  ← Hot Wallet (1M $CC)
│    (Current Brain)      │
│  • Game payouts only    │
│  • Max 100K per payout  │
│  • Max 500K/day payouts │
└───────────┬─────────────┘
            │
       Game payouts
            │
            ▼
        Players

┌─────────────────────────┐
│      BURN WALLET        │  ← Airlock (for buyback & burn)
│      (Airlock)          │
│  • Burns only           │
└─────────────────────────┘
```

**Limits (Locked In):**

| Wallet | Balance | Max Single TX | Daily Limit |
|--------|---------|---------------|-------------|
| **Rewards** (cold) | 9M $CC | 1M (to game only) | 1M |
| **Game** (hot) | 1M $CC | 100K (to players) | 500K payouts |
| **Burn** (airlock) | 0 (temp) | 1M | - |

**Runway (1-3 month target):**

| Scenario | Daily Loss | Pool Lasts |
|----------|-----------|------------|
| House edge works | +profit | ∞ |
| Light losses | -100K | 100 days |
| Medium losses | -200K | 50 days |
| Heavy losses | -333K | 30 days |

**Why this is safer:**
- Even if a game has a critical bug, max loss is 1M $CC (game wallet)
- Rewards wallet is NEVER touched by game code
- Daily limits + circuit breakers prevent rapid drainage
- Clear separation of concerns

**Endpoints:**
- `GET /rewards/status` - Cold storage wallet state + limits
- `POST /rewards/create` - Create rewards wallet (one-time)
- `POST /rewards/import` - Import existing rewards wallet
- `POST /rewards/top-up` - Manual top-up trigger
- `GET /game-wallet/status` - Hot wallet state + daily stats
- `GET /limits` - All system limits
- `GET /wallet-system/status` - Full 3-wallet system status
- `GET /burn-wallet/status` - Burn wallet state
- `POST /burn-wallet/create` - Create burn wallet (one-time)
- `POST /buyback/trigger` - Automatically uses airlock if burn wallet exists

**Files:**
- `brain/src/wallet.ts` - All 3 wallet tables, create/load functions
- `brain/src/rewards.ts` - Limits, circuit breakers, top-up logic
- `brain/src/buyback.ts` - Airlock pattern implementation
- `brain/src/solana.ts` - `ensureRewardsWalletAta()`, `ensureBurnWalletAta()`, `transferToBurnWallet()`
- `brain/src/db.ts` - `daily_payout_stats`, `daily_transfer_stats` tables

**Daily Cron:**
- Midnight UTC: Check if game wallet < 300K, top-up from rewards if needed
- Every 6 hours: Buyback & burn (SOL fees → buy $CC → burn)

**Migration Steps:**
1. Create rewards wallet: `POST /rewards/create`
2. Send 9M $CC to rewards wallet address
3. Verify with: `GET /rewards/status`
4. Game wallet is existing brain wallet (no change)
5. Daily cron auto-tops up game wallet as needed

### REQUIRED CODE REVIEW CHECKLIST:

Before ANY PR with financial code:
- [ ] Balance validation before operation?
- [ ] Safety caps in place?
- [ ] Dry-run mode available?
- [ ] Logging before irreversible operations?
- [ ] Tested on devnet first?
- [ ] Amount source is SPECIFIC, not "entire balance"?
- [ ] Uses burn wallet airlock pattern for burns?
- [ ] Uses circuit breaker check before payouts?
- [ ] Payouts come from GAME wallet, not rewards wallet?
- [ ] Daily limits respected?

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
10. **VJ Agent v2** (`/vj-v2`) - STAGING: Trippy branded visuals with mascot integration
11. **Rubber Duck Debugger** (`/duck`) - Interactive debugging companion
12. **Code Roast** (`/roast`) - Humorous code critique with actual suggestions
13. **24/7 Livestream** - Streams /watch to Kick/YouTube/Twitter via Docker
14. **CC Flip** (`/ccflip`) - Mainnet coin flip game with Solana wallet integration (2% house edge, 1.96x payout)

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
| Blockchain | Solana + Anchor | 1.95.0 / 0.29.0 |
| Wallet | Solana Wallet Adapter | 0.15.35 |
| Randomness | Two-party entropy (server + tx signature) | crypto.randomBytes + SHA256 |
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
│   │   ├── page.tsx              # CANONICAL REFERENCE for brain/builder
│   │   └── coinflip/
│   │       └── page.tsx          # Coin flip game template (GameFi reference)
│   ├── api/
│   │   └── generate/
│   │       └── route.ts          # Local Gemini API (unused in production)
│   ├── components/
│   │   ├── MoonMission/
│   │   │   ├── index.tsx         # Main game wrapper + HUD + screens
│   │   │   └── Game.tsx          # Three.js game logic
│   │   ├── gamefi/               # GameFi shared components (NEW)
│   │   │   ├── index.ts          # Re-exports all components
│   │   │   ├── WalletProvider.tsx # Solana wallet adapter setup
│   │   │   ├── ConnectWallet.tsx # Connect button + balance display
│   │   │   ├── BetInput.tsx      # $CC amount input with max button
│   │   │   ├── FeeDisplay.tsx    # Shows SOL platform fee
│   │   │   ├── GameResult.tsx    # Win/lose modal with confetti
│   │   │   ├── ProvablyFair.tsx  # Two-party entropy verification UI
│   │   │   └── hooks/
│   │   │       ├── index.ts      # Hook re-exports
│   │   │       ├── useBalance.ts # $CC + SOL balance hook
│   │   │       ├── useProgram.ts # Anchor program connection
│   │   │       └── useGameState.ts # Game PDA state hook
│   │   ├── BuyButton.tsx         # Link to bags.fm exchange
│   │   ├── ContractAddress.tsx   # Copy-to-clipboard contract
│   │   ├── SpaceInvaders.tsx     # Canvas 2D game (346 lines)
│   │   └── Terminal.tsx          # Animated typewriter Q&A
│   ├── ccflip/
│   │   └── page.tsx              # CC Flip - devnet coin flip game
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
│   ├── vj-v2/
│   │   └── page.tsx              # VJ v2 STAGING - trippy branded visuals
│   ├── watch/
│   │   └── page.tsx              # Brain monitor - real-time build logs
│   ├── globals.css               # Tailwind + CSS variables
│   ├── layout.tsx                # Root layout + metadata
│   └── page.tsx                  # Homepage
├── public/
│   ├── cc.png                    # 2D logo (SOURCE OF TRUTH)
│   ├── claudecode.svg            # Vector SVG for 3D extrusion (Adobe Illustrator)
│   ├── claudecode.jpg            # 3D rendered mascot
│   ├── og.jpg                    # Social preview
│   └── vj/                       # VJ v2 assets
│       ├── mascot-3d.png         # 3D mascot render (717KB)
│       ├── cc-logo.png           # Logo
│       ├── ccbanner.png          # Wide banner
│       └── claude3.png           # Claude branding
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
├── brain/                        # Central Brain v5.0 - GameFi Agent
│   ├── src/
│   │   ├── index.ts              # HTTP/WS server + cron (port 3001)
│   │   ├── cycle.ts              # Full autonomous loop + GameFi cycle
│   │   ├── builder.ts            # Claude Agent SDK integration
│   │   ├── deployer.ts           # Cloudflare Pages deployment
│   │   ├── trailer.ts            # Remotion trailer generation
│   │   ├── homepage.ts           # Homepage button auto-updater
│   │   ├── recorder.ts           # Puppeteer video capture (fallback)
│   │   ├── twitter.ts            # OAuth 1.0a + video upload
│   │   ├── db.ts                 # SQLite database + GameFi tables
│   │   ├── humor.ts              # Frontier AI personality for build logs (meme-y but confident)
│   │   ├── meme.ts               # Meme generation engine (Claude + Gemini)
│   │   ├── meme-prompts.ts       # 75+ dev-focused meme prompts
│   │   ├── wallet.ts             # Brain Solana wallet (encrypted) (NEW)
│   │   ├── rewards.ts            # Bankroll + fee distribution (NEW)
│   │   ├── game-templates.ts     # Game type templates for Claude (NEW)
│   │   └── solana.ts             # Solana RPC + program interaction (NEW)
│   ├── brain.db                  # SQLite database file
│   └── package.json              # Dependencies
├── programs/                     # Anchor Programs (Solana) (NEW)
│   └── cc-casino/                # Casino game program
│       ├── Cargo.toml            # Rust dependencies
│       ├── Anchor.toml           # Anchor config
│       └── src/
│           ├── lib.rs            # Main program entry point
│           ├── state.rs          # Account structures
│           └── instructions/     # Instruction handlers
│               ├── mod.rs        # Module exports
│               ├── initialize.rs # Game initialization
│               ├── coinflip.rs   # Coin flip game logic
│               ├── crash.rs      # Crash game logic
│               ├── jackpot.rs    # Jackpot game logic
│               └── gacha.rs      # Gacha game logic
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
│   │   ├── index.ts              # Main VJ orchestrator (v1)
│   │   ├── index-v2.ts           # VJ v2 orchestrator (trippy branded)
│   │   ├── audio/
│   │   │   ├── capture.ts        # getDisplayMedia system audio capture
│   │   │   ├── analyzer.ts       # Web Audio API FFT analysis
│   │   │   └── beat.ts           # BPM detection (realtime-bpm-analyzer)
│   │   ├── engines/
│   │   │   ├── types.ts          # Common engine interface
│   │   │   ├── threejs/index.ts  # Three.js 3D engine (v1)
│   │   │   ├── threejs-v2/index.ts # Three.js v2 (trippy effects)
│   │   │   ├── hydra/index.ts    # Hydra live coding engine (v1)
│   │   │   ├── hydra-v2/index.ts # Hydra v2 (branded presets)
│   │   │   └── remotion/         # Remotion Player (unused in v2)
│   │   └── agent/
│   │       └── index.ts          # Claude Agent SDK VJ controller
│   └── package.json              # Dependencies
├── stream/                       # 24/7 Livestream Service (Native Mac Mini)
│   ├── src/
│   │   ├── index.ts              # HTTP server (port 3002)
│   │   ├── streamer.ts           # Orchestrator with YouTube audio + auto-restart
│   │   ├── cdp-capture.ts        # Puppeteer + Chrome with Metal GPU
│   │   ├── ffmpeg-pipeline.ts    # avfoundation + VideoToolbox encoding
│   │   ├── youtube-audio.ts      # yt-dlp fetcher for YouTube lofi stream
│   │   ├── director.ts           # Scene switcher (watch/vj based on brain)
│   │   └── destinations.ts       # RTMP config loader
│   ├── lofi-fallback.mp3         # Fallback audio (Chad Crouch "Shipping Lanes", CC)
│   ├── Dockerfile                # Docker image (unused - now runs native)
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
- AI captions powered by Claude Opus 4.5 with **frontier AI personality**:
  - Confident, witty, meme-y dev twitter energy
  - Tech thought leader takes on AI/frameworks/industry
  - NO self-deprecation or "idk why this works" energy
  - Examples: "yeeting to prod", "gg ez", "built different fr"
- OAuth 1.0a for everything (v2 API for tweets, v1.1 API for media upload)
- Quality gate (score 8+/10 required, instant-fail on self-deprecation)
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
  - `video/src/compositions/GameFiTrailer.tsx` - GameFi trailer for CC Flip (~1268 lines)
  - `brain/src/trailer.ts` - Generator using manifest + WebappTrailer
  - `brain/src/manifest.ts` - Extracts real content from pages
- **GameFiTrailer Composition:**
  - Recreates full CC Flip game UI with 3D camera movements
  - Props: featureName, featureSlug, network, betAmount, coinChoice, flipResult
  - 8-scene timeline: intro → connect → choice → bet → flip → result → balance → cta
  - Cursor animations with click effects
  - Win/lose result modal with confetti
  - Render: `npx remotion render src/index.ts GameFiTrailer out/ccflip.mp4 --props='...'`

### Trailer Standards (CRITICAL - Follow This Pattern)

**GameFiTrailer is the GOLD STANDARD template.** All future game trailers MUST:
1. Recreate the ACTUAL UI components (not generic input/output boxes)
2. Show the real user journey (e.g., connect → select → bet → flip → win)
3. Use 15-second duration (450 frames @ 30fps) - snappy, not slow
4. Include cursor with click animations tracking visual targets
5. Use smooth camera interpolation between focal points

**Template Hierarchy:**

| Template | Duration | Use For | Pattern |
|----------|----------|---------|---------|
| **GameFiTrailer** | 15s | GameFi games (coin flip, crash, jackpot, gacha) | UI recreation - GOLD STANDARD |
| **GameTrailer** | 20s | Arcade games (Space Invaders, etc.) | UI recreation |
| **WebappTrailer** | 20s | Text-based tools (poetry, roast, duck) | Input/output flow |

**Key Design Principles:**
- Orange brand color coin (`#da7756` → `#b85a3a`)
- 3D coin with heads (👑) / tails (🛡️) visible during flip
- Confetti (50 particles) on win
- 8 camera positions with `interpolateCamera()`
- Cursor targets must match actual button positions
- Component-based architecture (Header, BetInput, Coin, ResultModal, etc.)
- Frame-based state calculation (no React state)

**Reference Implementation:**
- `video/src/compositions/GameFiTrailer.tsx` (~1268 lines) - THE template to copy

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

### 10. VJ Agent v2 (`/vj` and `/vj-v2`)
Complete visual overhaul inspired by Beeple, Cyriak, and professional VJ techniques:
- **Two Visual Engines (removed Remotion):**
  - **Three.js v2**: Non-repeating procedural evolution, tunnel zoom, drift, bloom
  - **Hydra v2**: 7 radically different visual modes with 28 scenes total
- **Seven Visual Modes + Auto:**
  1. **SPIRAL** (S key): Hypnotic spiraling, kaleidoscopic patterns
  2. **MORPH** (M key): Cyriak-inspired - Droste effect, melt, fracture, breathe
  3. **DYSTOPIA** (D key): Beeple-inspired - Monolith, corruption, emergence, eclipse
  4. **GEOMETRY** (G key): Mathematical - Voronoi, shatter, wireframe, tessellation
  5. **WARP** (W key): Hyperdrive/speed - Starfield, streak, vortex, hyperspace
  6. **GLITCH** (X key): Digital corruption - VHS, RGB split, tear, corrupt
  7. **LIQUID** (L key): Organic flow - Ripple, underwater, flow, mercury
  8. **AUTO** (A key): Random scene selection every 10 seconds
- **Design Principles:**
  - Each mode RADICALLY different (not just "grids of mascots")
  - Mix of single large mascot + abstracted/transformed scenes
  - Inspired by Beeple (dystopian monoliths) and Cyriak (Droste/morphing)
  - Scene changes every 10 seconds (auto randomizes)
- **Post-Processing Chain:**
  - Bloom (strength reacts to bass)
  - Chromatic aberration (reacts to high frequencies)
  - Vortex (Three.js only)
- **Assets:** `/public/vj/` - mascot-3d.png, cc-logo.png, ccbanner.png
- **Keyboard Shortcuts:**
  - H: Hide UI, F: Fullscreen
  - 1/2: Engines (Three.js/Hydra)
  - S/M/D/G/W/X/L/A: Modes

**Key files:**
- `app/vj/page.tsx` - Production VJ page
- `app/vj-v2/page.tsx` - Staging page with STAGING badge
- `vj/src/index-v2.ts` - V2 orchestrator
- `vj/src/engines/threejs-v2/index.ts` - Three.js v2 engine (~960 lines)
- `vj/src/engines/hydra-v2/index.ts` - Hydra v2 engine (~1024 lines, 28 scenes)

### 11. Rubber Duck Debugger (`/duck`)
Interactive debugging companion based on "The Pragmatic Programmer" technique:
- Animated SVG duck with quacking animation
- Problem input textarea with common examples
- Pre-built problem templates for quick testing
- API integration for AI-powered debugging advice
- Occasionally gives intentionally bad advice (clearly marked)
- Explains the rubber duck debugging methodology

### 12. Code Roast (`/roast`)
Humorous code critique with actual suggestions:
- Code input with example snippets
- Random example button for testing
- AI-generated roasts with dev humor
- Actual improvement suggestions alongside the roast
- Feature cards (Brutally Honest, Actually Helpful, With Love)
- List of common roast targets (using var in 2026, console.log debugging, etc.)

### 13. 24/7 Livestream Service (Native Mac Mini)
Streams `/watch` and `/vj` pages to multiple platforms with GPU acceleration:

- **Architecture:** Two capture modes:
  - **Window mode (RECOMMENDED):** Chrome's native `Page.startScreencast` CDP API
    - Captures ONLY the Chrome window (app switching doesn't disrupt stream!)
    - Smooth frame rate with push-based frame delivery
    - Hardware encoding via VideoToolbox (h264_videotoolbox)
    - Works via SSH - no special permissions needed
    - MJPEG frames piped to FFmpeg stdin
  - **Display mode (legacy):** FFmpeg avfoundation captures full screen
    - Smooth 30fps but captures ENTIRE screen
    - App switching WILL disrupt the stream
    - Requires Screen Recording permission + local Terminal (not SSH)
- **Platforms:** Twitter/X (configurable via env vars)
- **Audio:** YouTube lofi hip hop radio (primary) with local fallback
  - Primary: `https://www.youtube.com/watch?v=jfKfPfyJRdk` via yt-dlp
  - Fallback: `lofi-fallback.mp3` (Chad Crouch "Shipping Lanes", CC licensed)
  - FFmpeg reconnect options for reliable YouTube streaming
- **Director:** Auto-switches scenes based on brain state:
  - `/watch` during BUILDING mode or meme generation
  - `/vj` (Hydra auto mode) during RESTING/IDLE
- **GPU Acceleration:** Native Mac Mini with Metal + WebGL
  - Chrome with `--use-angle=metal` for GPU rendering
  - VideoToolbox (h264_videotoolbox) for hardware H.264 encoding
  - Full WebGL support for VJ visuals
- **Settings:** 720p @ 30fps, 2500kbps video, 128kbps AAC audio
- **Self-Healing:** Health monitoring with auto-recovery
- **Health endpoint:** `GET /health` returns state, frame count, uptime, captureMode, windowId
- **Control API:** `POST /start`, `POST /stop`
- **Environment Variables:**
  - `CAPTURE_MODE` - 'window' (recommended) or 'display'

**Run:**
```bash
cd ~/ccwtf/stream

# Window mode (RECOMMENDED - works via SSH, app switching safe)
CAPTURE_MODE=window npm run start

# Display mode (legacy - requires local Terminal, no app switching)
CAPTURE_MODE=display npm run start

# Check health
curl localhost:3002/health
```

**Key files:**
- `stream/src/cdp-capture.ts` - Chrome native screencast (Page.startScreencast API)
- `stream/src/youtube-audio.ts` - yt-dlp URL fetcher for YouTube lofi
- `stream/src/director.ts` - Scene switching based on brain state
- `stream/src/ffmpeg-pipeline.ts` - VideoToolbox hardware encoding
- `stream/src/streamer.ts` - Main orchestrator with YouTube audio integration

### 14. CC Flip (`/ccflip`)
Mainnet coin flip game with Solana wallet integration:
- **Network:** Solana Mainnet (real $CC tokens)
- **$CC Token:** `Hg23qBLJDvhQtGLHMvot7NK54qAhzQFj9BVd5jpABAGS`
- **Features:**
  - Solana wallet connection (Phantom, Solflare)
  - Coin flip animation with heads/tails selection
  - 1.96x payout multiplier (2% house edge)
  - Bet limits: 1-1M $CC
  - Bet history display
  - Provably fair with SHA256 commit-reveal
  - **Platform fee:** ~$0.05 SOL per spin (funds buyback & burn)
  - **Buyback & Burn:** Every 6 hours, all SOL fees → buy $CC → burn 100%
- **Tokenomics:**
  - House edge (2%): Stays in game, fuels future rewards (never sold)
  - Platform fee (~$0.05 SOL): Buys $CC from market, burns 100% via Metaplex
  - DEX: Swaps routed through FrogX DEX
- **Game Flow:**
  1. Connect wallet (mainnet)
  2. Choose heads or tails
  3. Set bet amount
  4. Approve transaction ($CC deposit + ~$0.05 SOL fee)
  5. Win 1.96x or lose bet
- **Testing Mode:** Add `?devnet=1` query param to use devnet for testing
- **Technical:** Uses two-party entropy for provably fair randomness:
  1. Server generates `serverSecret = crypto.randomBytes(32)`
  2. Server sends `commitment = SHA256(serverSecret)` BEFORE user signs
  3. User deposits tokens (creates unpredictable `txSignature`)
  4. Server reveals `serverSecret` - result computed from BOTH:
     ```
     Result = SHA256(serverSecret + txSignature)[0] < 128 ? heads : tails
     ```
  5. User verifies: `SHA256(serverSecret) === commitment` AND recomputes result
- **Security:** Neither party can cheat - server can't predict txSignature, user can't predict serverSecret

### 8. Central Brain (`/brain`) - BRAIN 2.0 GAMEFI AGENT v5.0
Blockchain-native casino game factory - ships 1 high-quality on-chain mini-game per day:

#### GameFi Mode (NEW - Primary)
- **8-Phase GameFi Cycle:**
  1. **PLAN GAME** - Claude selects game type + generates unique theme
  2. **BUILD FRONTEND** - Uses game template, customizes UI/theme
  3. **DEPLOY FRONTEND** - Build Next.js, deploy to Cloudflare
  4. **INITIALIZE ON-CHAIN** - Brain wallet creates game PDA + escrow
  5. **VERIFY INTEGRATION** - Puppeteer tests wallet + bet flow
  6. **CREATE TRAILER** - Remotion generates gameplay preview
  7. **ANNOUNCE** - Tweet with video to @ClaudeCodeWTF
  8. **MONITOR** - Track volume, fees, unique players
- **Game Types:**
  - **Coin Flip** - Bet $CC, pick heads/tails, 1.96x payout (2% edge)
  - **Crash** - Multiplier starts 1.00x, cash out before crash (3% edge)
  - **Jackpot** - Pool all entries, VRF picks winner (5% house cut)
  - **Gacha** - Pull for tiered prizes (common/rare/epic/legendary)
- **Rate Limits (GameFi Mode):**
  - 1 game per day (quality over quantity)
  - 24-hour cooldown between cycles
  - Resets at midnight UTC
- **Casino Bankroll (15M $CC total):**
  ```
  Total Allocation: 15,000,000 $CC (1.5% of supply)
  Per-Game:
    - Coin Flip: 500,000 $CC initial liquidity
    - Crash: 1,000,000 $CC (needs more for multipliers)
    - Jackpot: 500,000 $CC seed pool
    - Gacha: 300,000 $CC prize pool
  Fee Distribution:
    - 60% → Back to bankroll (self-sustaining)
    - 25% → Treasury (operations)
    - 15% → Burned (deflationary)
  Safety:
    - Max single payout: 100,000 $CC
    - Reserve ratio: 20%
    - Max daily payout: 1,000,000 $CC
  ```

#### Legacy Mode (Meme Generation)
- **Meme Generation During Cooldowns:**
  - Every 15 minutes, checks if meme can be generated
  - Uses Claude Opus 4.5 for creative prompts and captions
  - Uses Gemini 2.0 Flash for image generation
  - Quality gate (score 6+/10 required to post)
  - Rate limits: 16 memes/day, 60 min minimum between posts
  - Posts to Twitter community with share_with_followers

#### Brain Architecture
- **Brain Modes (visible on /watch):**
  - **BUILDING** (green) - Active game/feature build cycle
  - **RESTING** (fuchsia) - Cooldown, generating memes
  - **IDLE** (amber) - Ready to start new cycle
- **Infrastructure:** Docker container on Mac Mini
  - SQLite (brain.db) + node-cron
  - WebSocket server for real-time log streaming
  - Activity types: build, meme, system (color-coded on /watch)
- **Brain Wallet (NEW):**
  - Solana keypair encrypted at rest (AES-256-GCM)
  - Signs game transactions + distributes rewards
  - Max withdrawal limits + unusual activity alerts
- **Database Tables (GameFi):**
  - `brain_wallet` - Encrypted keypair + balances
  - `games` - Deployed games (slug, type, program_id, escrow_pda, config)
  - `game_rounds` - Round state for crash/jackpot
  - `game_bets` - Individual bets with outcomes
  - `game_leaderboard` - Top players per game

#### Key Files
- `wallet.ts` - Brain Solana wallet management (NEW)
- `rewards.ts` - Bankroll + fee distribution (NEW)
- `game-templates.ts` - Game type templates for Claude (NEW)
- `solana.ts` - Solana RPC + program interaction (NEW)
- `builder.ts` - Claude Agent SDK integration
- `deployer.ts` - Cloudflare Pages deployment
- `verifier.ts` - **Functional verification via Puppeteer (CRITICAL)**
- `trailer.ts` - Remotion trailer generation
- `homepage.ts` - Homepage button auto-updater
- `cycle.ts` - Full autonomous loop + GameFi cycle
- `meme.ts` - Meme generation engine (Claude + Gemini)
- `meme-prompts.ts` - 75+ dev-focused meme prompts
- `index.ts` - HTTP/WebSocket server
- `db.ts` - SQLite database + GameFi tables

**API Endpoints:**
- `GET /status` - Current cycle status + brain mode + meme stats
- `GET /stats` - Daily shipping statistics
- `GET /tweets` - Global tweet rate limiting stats (15/day, 30 min between)
- `GET /memes` - Meme generation stats
- `GET /gamefi/status` - GameFi stats (games deployed, volume, fees)
- `POST /meme/trigger` - Manually trigger meme generation
- `POST /go` - Start new legacy cycle
- `POST /gamefi/go` - Start GameFi cycle (NEW)
- `POST /cancel` - Cancel active cycle
- `WS /ws` - Real-time log streaming (with activityType)

**Mac Mini Environment (Production):**
- **Server:** Mac Mini (claude@mac-mini / 192.168.1.189)
- **Working Directory:** `/Users/claude/ccwtf`
- **Public URL:** https://brain.claudecode.wtf (via Cloudflare Tunnel)
- **WebSocket:** wss://brain.claudecode.wtf/ws
- **Process:** Docker container `ccwtf-brain` (auto-restarts)
- **Node:** v22.22.0 via nvm
- **Claude CLI:** `~/.local/bin/claude` (symlink)

**Docker Commands:**
```bash
# View logs
docker logs ccwtf-brain -f

# Restart brain
docker compose restart brain

# Check status
curl http://localhost:3001/status

# Start GameFi cycle
curl -X POST http://localhost:3001/gamefi/go
```

**⚠️ IMPORTANT: Cancel Endpoint Limitation**
The `/cancel` endpoint only marks the cycle as complete in SQLite - it does NOT kill the running Claude subprocess. To fully cancel:
```bash
# 1. Cancel via API
curl -X POST https://brain.claudecode.wtf/cancel

# 2. Restart container to kill orphaned process
docker compose restart brain
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
| `app/ccflip/page.tsx` | Devnet coin flip game | ~280 |
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
| `video/src/compositions/GameFiTrailer.tsx` | **GOLD STANDARD** - GameFi trailer template | ~1268 |
| `video/src/compositions/WebappTrailer.tsx` | Text-based tool trailers (non-games) | ~800 |
| `video/src/compositions/GameTrailer.tsx` | Arcade game trailer (follow GameFi pattern) | ~554 |
| `video/src/scenes/*.tsx` | Motion graphics scenes | ~230 |
| `video/post-tweet.ts` | Twitter video posting | ~35 |
| `app/watch/page.tsx` | Brain monitor UI | ~345 |
| `brain/src/index.ts` | HTTP + WebSocket server | ~620 |
| `brain/src/cycle.ts` | Full autonomous loop | ~410 |
| `brain/src/builder.ts` | Claude Agent SDK builder | ~180 |
| `brain/src/deployer.ts` | Cloudflare deployment | ~85 |
| `brain/src/recorder.ts` | Video capture (Puppeteer) | ~320 |
| `brain/src/db.ts` | SQLite database + GameFi tables | ~1200 |
| `brain/src/twitter.ts` | Twitter API + community | ~300 |
| `brain/src/humor.ts` | Memecoin dev humor for logs | ~210 |
| `brain/src/meme.ts` | Meme generation engine | ~350 |
| `brain/src/meme-prompts.ts` | 75+ dev meme prompts | ~90 |
| `brain/src/wallet.ts` | Brain + Burn wallet (encrypted, airlock) | ~520 |
| `brain/src/buyback.ts` | Buyback & burn with airlock pattern | ~700 |
| `brain/src/rewards.ts` | Bankroll + fee distribution | ~150 |
| `brain/src/game-templates.ts` | Game type templates | ~250 |
| `brain/src/solana.ts` | Solana RPC + burn wallet ATA | ~920 |
| `programs/cc-casino/src/lib.rs` | Anchor program entry | ~300 |
| `programs/cc-casino/src/state.rs` | Account structures | ~200 |
| `app/components/gamefi/index.ts` | GameFi component exports | ~17 |
| `app/components/gamefi/WalletProvider.tsx` | Solana wallet adapter | ~50 |
| `app/components/gamefi/ConnectWallet.tsx` | Connect button + balance | ~80 |
| `app/components/gamefi/BetInput.tsx` | $CC bet input | ~70 |
| `app/components/gamefi/hooks/useBalance.ts` | Balance hook | ~50 |
| `app/_template/coinflip/page.tsx` | Coin flip reference impl | ~284 |
| `app/vj/page.tsx` | VJ page UI | ~250 |
| `app/vj-v2/page.tsx` | VJ v2 STAGING page | ~270 |
| `vj/src/index.ts` | VJ orchestrator (v1) | ~280 |
| `vj/src/index-v2.ts` | VJ v2 orchestrator (trippy) | ~280 |
| `vj/src/audio/capture.ts` | System audio capture | ~85 |
| `vj/src/audio/analyzer.ts` | FFT analysis | ~150 |
| `vj/src/engines/threejs/index.ts` | Three.js engine (v1) | ~250 |
| `vj/src/engines/threejs-v2/index.ts` | Three.js v2 (trippy effects) | ~960 |
| `vj/src/engines/hydra/index.ts` | Hydra engine (v1) | ~200 |
| `vj/src/engines/hydra-v2/index.ts` | Hydra v2 (7 modes, 28 scenes) | ~1024 |
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

### Mainnet
- **Token:** $CC (Claude Code Coin)
- **Chain:** Solana
- **Contract:** `Hg23qBLJDvhQtGLHMvot7NK54qAhzQFj9BVd5jpABAGS`
- **Supply:** 1,000,000,000
- **Fees:** 100% to @bcherny

### Devnet (Testing)
- **Token:** $CC (Devnet)
- **Contract:** `GzoMpC5ywKJzHsKmHBepHUXBP72V9QMtVBqus3egCDe9`
- **Supply:** 1,000,000,000
- **Mint Authority:** Brain wallet (`HFss9LWnsmmLqxWHRfQJ7BHKBX8tSzuhw1Qny3QQAb4z`)
- **Notes:** For testing ccflip and other games. GameFi components auto-detect network.

---

## Links

- **Site:** https://claudecode.wtf
- **API:** https://ccwtf-api.aklo.workers.dev
- **Twitter Bot:** https://twitter.com/ClaudeCodeWTF
- **GitHub:** https://github.com/aklo360/cc
- **Community:** https://x.com/i/communities/2014131779628618154
- **Buy:** https://bags.fm/cc
