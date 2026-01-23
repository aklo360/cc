# Changelog

All notable changes to the $CC (claudecode.wtf) project.

---

## [Unreleased]

## [2026-01-23] - VJ Agent (Live Audio-Reactive Visuals)

### Added - VJ Agent (`/vj`)
Claude-powered live audio-reactive visual generator with three rendering engines:

**Visual Engines:**
- **Three.js Engine**: 3D particles, geometry, rings, tunnel with bloom post-processing
- **Hydra Engine**: Live GLSL shader coding (Resolume-style)
- **Remotion Engine**: Hacked Player with live audio props (experimental)

**Visual Styles:**
- **Abstract**: Pure geometry, wireframes, particles
- **Branded**: $CC orange (#da7756), mascot colors
- **Synthwave**: Neon 80s, pink/cyan, retro grids
- **Auto**: Claude picks style based on music mood

**Audio System:**
- System audio capture via `getDisplayMedia` (Chrome/Edge)
- Web Audio API `AnalyserNode` for 60fps FFT analysis
- Frequency bands: bass (20-250Hz), mid (250-2kHz), high (2k-20kHz)
- Energy-based beat detection with BPM calculation

**Claude Agent Integration:**
- Tools: `switch_engine`, `switch_style`, `set_parameter`, `write_hydra_code`
- Music mood analysis for auto-style selection
- Quick commands for fast control

**Keyboard Shortcuts:**
- H: Hide/show UI | F: Fullscreen
- 1/2/3: Engines (Three.js/Hydra/Remotion)
- A/B/S/X: Styles (Abstract/Branded/Synthwave/Auto)

### New Files
- `vj/` - Complete VJ agent project
  - `src/audio/capture.ts` - getDisplayMedia system audio capture
  - `src/audio/analyzer.ts` - Web Audio API FFT analysis
  - `src/audio/beat.ts` - BPM/beat detection
  - `src/engines/threejs/index.ts` - Three.js visual engine
  - `src/engines/hydra/index.ts` - Hydra live coding engine
  - `src/engines/remotion/` - Remotion Player engine
  - `src/agent/index.ts` - Claude Agent SDK integration
- `app/vj/page.tsx` - Next.js VJ page with controls

---

## [2026-01-23] - Central Brain v4.2 (NEVER STOP - ALWAYS SHIP)

### Changed - Retry Loop + Auto-Recovery
When functional verification fails, the cycle NO LONGER STOPS. Instead:
- **LOOPS BACK** to Phase 2 (BUILD) with the verification errors
- Claude sees what went wrong and **fixes the code**
- Redeploys and re-tests automatically
- Continues until verification passes (max 5 attempts)

**If ALL 5 attempts fail ("too complex"):**
- **CLEANUP**: Removes broken feature directory (`rm -rf app/[slug]`)
- **RESET**: Git checkout to undo uncommitted changes
- **RESTART**: Automatically starts a NEW cycle with a DIFFERENT feature
- The brain NEVER gives up - it just picks an easier feature!

**New behavior:**
- Phase 2-5 are wrapped in a retry loop
- Verification errors are passed to `buildProject()` so Claude knows what to fix
- `builder.ts` now has a special "fix broken feature" prompt for retries
- If max retries exceeded: cleanup + start fresh cycle

**Why this matters:**
- The brain should NEVER stop - it should always ship something
- If a feature is too complex, move on to something simpler
- Broken/incomplete code is automatically cleaned up
- Every cycle eventually ships a working feature!

### New Functions
- `cleanupBrokenFeature(slug)` - Removes `app/[slug]` directory and resets git

### Modified Files
- `brain/src/cycle.ts` - Wrapped phases 2-5 in retry loop (5 attempts max)
  - Added cleanup on max retries
  - Auto-starts new cycle after cleanup
- `brain/src/builder.ts` - Added `verificationErrors` and `retryAttempt` to `ProjectSpec`
  - New fix prompt tells Claude exactly what errors to fix
  - Added UX requirements to initial prompt (buttons must work immediately)

---

## [2026-01-23] - Central Brain v4.1 (CRITICAL: Functional Verification)

### Added - Phase 5: Functional Verification (CRITICAL QUALITY GATE)
Before tweeting or adding to homepage, the brain now **actually tests** the deployed feature:
- Uses Puppeteer to interact with the deployed page
- **Game verification:** Checks start buttons are NOT disabled, can click to start
- **Interactive verification:** Tests form submission, button clicks work
- **Basic verification:** Page loads without errors, has content

**Why this is critical:**
- v4.0 shipped a broken game (Code Battle Arena) with disabled buttons
- It even tweeted about the broken feature!
- This MUST NEVER happen again

**Behavior (v4.1):**
- If verification FAILS, cycle STOPS immediately
- NO tweet is posted about broken features
- NO homepage button is added
- Errors are logged for debugging

**(Updated in v4.2: No longer stops, loops back to BUILD instead)**

### Fixed - Code Battle Arena
- Start buttons were disabled because player name was required
- Fixed by defaulting to "Anonymous Coder" so buttons are always clickable
- Users can optionally enter a name for leaderboard

### New Files
- `brain/src/verifier.ts` - Puppeteer-based functional verification (~470 lines)

### Modified Files
- `brain/src/cycle.ts` - Added Phase 5 (TEST), renumbered phases 6-10
- `brain/tsconfig.json` - Added DOM lib for page.evaluate() types
- `app/battle/components/BattleArena.tsx` - Fixed disabled button issue

---

## [2026-01-23] - Central Brain v4.0 (Continuous Shipping + Homepage Integration)

### Added - Phase 8: Homepage Button Auto-Update
After successful deploy + tweet, the brain now automatically adds a button to the homepage:
- Inserts before BuyButton (consistent position)
- Color rotation across 8 different accent colors
- Auto-selects icon based on feature name (game, tool, poetry, etc.)
- Rebuilds and redeploys site after adding button
- NEVER modifies existing buttons - ONLY adds new ones
- Idempotent: skips if button already exists

### Added - Continuous Shipping Mode
The brain can now ship up to 5 features per day:
- 30-minute cooldown between cycles
- Daily limit of 5 features (prevents runaway costs)
- Auto-starts next cycle after cooldown
- Resets at midnight UTC
- `/stats` endpoint for monitoring daily progress

### New Files
- `brain/src/homepage.ts` - Homepage button updater (~180 lines)

### Modified Files
- `brain/src/cycle.ts` - Added Phase 8 + Phase 9, continuous shipping
- `brain/src/db.ts` - Added daily_stats table + helper functions
- `brain/src/index.ts` - Added /stats endpoint, updated version to 4.0.0

### New Endpoint
```bash
# Check daily shipping stats
curl https://brain.claudecode.wtf/stats
# Returns: { date, features_shipped, daily_limit, remaining, can_ship_more, ... }
```

### Poetry Feature Button
- First feature button auto-added to homepage via Phase 8
- Code Poetry Generator now accessible from homepage

---

## [2026-01-23] - Central Brain v3.1 (Dynamic Trailer System)

### Added - Remotion-Based Trailer Generation
ALL trailers now generated with Remotion. Screen recordings are INTERCUT into the composition for complex features but never used alone.

**Approach:**
- Pure Remotion: Static/Interactive UIs recreated with animations
- Remotion + Intercut: Games/3D get screen-recorded footage embedded in Remotion

**New Files:**
- `video/src/compositions/FeatureTrailer.tsx` - Dynamic trailer composition
- `brain/src/trailer.ts` - Trailer orchestration + classification

**Trailer Timeline (10 seconds for non-games):**
1. 0:00-0:02 - TitleCard with feature name + particles
2. 0:02-0:06 - UIShowcase (animated UI recreation)
3. 0:06-0:08 - FeatureCallout ("HOW IT WORKS")
4. 0:08-0:10 - CallToAction ("TRY IT NOW" + URL)

**Game Trailer Timeline (12 seconds):**
1. 0:00-0:02 - TitleCard
2. 0:02-0:08 - GameplayFootage (screen recorded)
3. 0:08-0:10 - FeatureCallout
4. 0:10-0:12 - CallToAction ("PLAY NOW")

### Changed
- Renamed PHASE 5 from "RECORDING" to "CREATING TRAILER"
- cycle.ts now calls `generateTrailer()` instead of `recordFeature()`
- Trailers explain features instead of just showing them

---

## [2026-01-23] - Central Brain v3.0 (Full Autonomous Loop)

### Added - Complete Autonomous Engineering Agent
Built and deployed a fully autonomous 24-hour software engineering loop:

**7-Phase Cycle:**
1. **PLAN** - Claude plans project idea + tweet content
2. **BUILD** - Claude Agent SDK autonomously writes code
3. **DEPLOY** - Wrangler deploys to Cloudflare Pages
4. **VERIFY** - Confirms deployment is live (3 retries)
5. **RECORD** - Puppeteer captures video of deployed feature
6. **TWEET** - Posts announcement with video to @ClaudeCodeWTF
7. **SCHEDULE** - Queues follow-up tweets over 24 hours

### Technical Implementation

**Claude Agent SDK Integration** (`brain/src/builder.ts`)
- `@anthropic-ai/claude-agent-sdk` query() function
- `permissionMode: 'acceptEdits'` for autonomous operation
- Tools: Read, Write, Edit, Glob, Grep, Bash
- Max 3 retry attempts with debug loop
- Model: Sonnet for builds, Haiku for verification

**SQLite Database** (`brain/src/db.ts`)
- 4 tables: cycles, scheduled_tweets, tweets, experiments
- WAL mode for concurrent access
- Tracks cycle state, tweet scheduling, history

**HTTP/WebSocket Server** (`brain/src/index.ts`)
- Port 3001 (tunneled via Cloudflare)
- `GET /status` - Brain + cycle status
- `POST /go` - Start new 24-hour cycle
- `POST /cancel` - Cancel active cycle
- `WS /ws` - Real-time log streaming
- Cron: `*/5 * * * *` for scheduled tweets

**Cloudflare Tunnel**
- Public URL: `brain.claudecode.wtf`
- WebSocket: `wss://brain.claudecode.wtf/ws`
- Heartbeat ping every 30s to keep connections alive

**Video Recording** (`brain/src/recorder.ts`)
- Puppeteer headless browser
- 30fps, 8 seconds default
- ffmpeg encoding to MP4

### VPS Deployment
- Server: 5.161.107.128
- Process: pm2 with `cc-brain` name
- Node: v22.22.0 via nvm
- Claude CLI: `~/.local/bin/claude`

### First Successful Cycle
- **Project:** Code Poetry Generator (`/poetry`)
- **Build:** Claude Agent SDK autonomously created the feature
- **Deploy:** https://claudecode.wtf/poetry
- **Tweet:** Posted with video to @ClaudeCodeWTF community

### Bug Fixes
- Fixed `bypassPermissions` → `acceptEdits` for Claude Agent SDK
- Fixed hardcoded paths in builder.ts, deployer.ts, recorder.ts
- Added dynamic PATH for nvm installations
- Added WebSocket heartbeat to prevent Cloudflare tunnel timeout
- Client-side exponential backoff reconnection (max 30s delay)

### Files
- `brain/src/index.ts` - Main server + WebSocket (~340 lines)
- `brain/src/cycle.ts` - Full cycle orchestration (~400 lines)
- `brain/src/builder.ts` - Claude Agent SDK integration (~260 lines)
- `brain/src/deployer.ts` - Cloudflare Pages deployment (~145 lines)
- `brain/src/recorder.ts` - Puppeteer video capture (~120 lines)
- `brain/src/twitter.ts` - OAuth 1.0a + video upload (~300 lines)
- `brain/src/db.ts` - SQLite database (~240 lines)
- `app/watch/page.tsx` - Real-time log viewer (~300 lines)

### Run
```bash
# On VPS (5.161.107.128)
cd /root/ccwtf/brain
pm2 start npm --name cc-brain -- run dev

# Trigger cycle
curl -X POST https://brain.claudecode.wtf/go

# Watch logs
https://claudecode.wtf/watch
```

---

## [2025-01-22] - Central Brain v2.0 (Ultra-Lean)

### Changed - Complete Rewrite for Minimal Footprint
Rewrote the Central Brain to be as lean as possible:

| Before | After |
|--------|-------|
| PostgreSQL (Docker) | **SQLite (single file)** |
| Redis + Bull | **node-cron** |
| Drizzle ORM | **Raw SQL** |
| Docker Compose | **pm2** |
| 207 npm packages | **~30 packages** |
| ~$115-205/month | **~$25-70/month** |

### Added
- **SQLite Database** (`brain/src/db.ts`)
  - Single file: `brain.db`
  - 4 tables: tweets, experiments, decisions, game_scores
  - WAL mode for concurrency
  - Helper functions for all CRUD operations

- **node-cron Scheduler** (replaces Bull/Redis)
  - Decision Engine: hourly at :00
  - Tweet Scheduler: every 4 hours
  - Daily Experiment: 10 AM UTC

### Removed
- Docker (docker-compose.yml, Dockerfile)
- PostgreSQL dependency
- Redis dependency
- Bull queue library
- Drizzle ORM
- 170+ npm packages

### Files
- `brain/src/index.ts` - Main entry + cron setup (~100 lines)
- `brain/src/db.ts` - SQLite database (~180 lines)
- `brain/src/decision.ts` - Claude reasoning (~150 lines)
- `brain/src/twitter.ts` - Twitter API (~280 lines)

### Run
```bash
cd brain
npm install       # Only ~30 packages
npm run dev       # Development
pm2 start dist/index.js  # Production
```

---

## [2025-01-22] - Central Brain v1.0 (Deprecated)
- Campaign System (Meme2Earn)
- Twitter Strategy Engine
- VPS deployment

---

## [2025-01-22] - Video Trailer Generator + Twitter Video Support

### Added
- **Remotion Video Generator** (`/video`)
  - Full Remotion project for cinematic trailer creation
  - Frame-perfect 30fps capture via virtual time control
  - Automated AI gameplay with center-biased character framing
  - Smooth zoom transitions between shots
  - Premium motion graphics (title cards, feature callouts, CTA)

- **Trailer Generator Agent** (`video/agent/index.ts`)
  - Puppeteer browser automation
  - Virtual time injection (overrides `requestAnimationFrame` + `performance.now()`)
  - Frame-by-frame screenshot capture → ffmpeg encoding
  - AI gameplay: shooting, movement, barrel rolls
  - Center-bias tracking to keep character in frame

- **Remotion Scenes** (`video/src/scenes/`)
  - `TitleCard.tsx` - Animated title with particles and glow
  - `FeatureCallout.tsx` - Premium text overlays with scan line reveal
  - `CallToAction.tsx` - End screen with expanding ring animation
  - `Trailer.tsx` - 15-second composition with zoom transitions

- **Twitter Video Upload** (`worker/src/twitter.ts`)
  - Chunked media upload for videos (INIT → APPEND → FINALIZE → STATUS)
  - OAuth 1.0a signing for all endpoints
  - Proper base64 chunk boundary handling
  - Video processing status polling

- **New Worker Endpoints**
  - `POST /bot/tweet-video` - Post tweet with video attachment
  - `POST /bot/tweet-text` - Post text-only tweet

- **Post Tweet Script** (`video/post-tweet.ts`)
  - Node.js script to upload video and post to Twitter

### Technical
- Virtual time control allows frame-perfect game capture
- 8 buffer frames (head/tail) prevent freeze-frames at cuts
- Center-bias AI tracks X/Y position, returns to center when >40% drift
- Smooth zoom transitions: 1.08→1 in, 1→1.05 out with easing
- Videos processed as 5MB chunks (base64 boundary aligned)

### First Tweet
- **StarClaude64 launch announcement** with 15-second trailer
- Tweet: https://twitter.com/ClaudeCodeWTF/status/2014530888210555331

---

## [2025-01-22] - Twitter Bot with Image Upload

### Added
- **Twitter Bot** (`@ClaudeCodeWTF`)
  - Automated meme generation + posting
  - Cron schedule: every 3 hours (8 times/day)
  - Rate limiting: 16 tweets/day max, 85min minimum between posts

- **OAuth 1.0a Support** (for everything)
  - `worker/src/oauth1.ts` - HMAC-SHA1 signature generation
  - Admin UI at `/auth/v1` for token setup
  - Twitter v1.1 API for media upload
  - Twitter v2 API for tweet posting (free tier compatible)

- **Claude Opus 4.5 Integration**
  - Caption generation with dev personality
  - Quality gate scoring (6+/10 required to post)
  - Meme concept generation

- **Bot Personality System**
  - Dev-focused identity ("just wanna code")
  - Casual voice: lowercase, "fr", "nah", "lowkey"
  - Quality gate rejects crypto slang (ser, ngmi, wagmi, etc.)
  - 50+ dev-themed prompt templates

- **Admin Endpoints**
  - `GET /bot/status` - View posting status + recent tweets
  - `POST /bot/tweet` - Manual trigger
  - `GET /bot/health` - Health check
  - `GET /auth/v1` - OAuth 1.0a setup

### Files Added
- `worker/src/oauth1.ts` - OAuth 1.0a implementation
- `worker/src/claude.ts` - Caption generation + quality gate (Claude Opus 4.5)
- `worker/src/prompts.ts` - Meme prompt templates
- `worker/src/twitter.ts` - Twitter API wrapper
- `worker/src/types.ts` - TypeScript types

### Technical
- OAuth 1.0a for everything (simplified from OAuth 2.0 + 1.0a hybrid)
- v2 API for tweet posting, v1.1 API for media upload
- KV storage for bot state + tweet history
- Gemini API for image generation
- Claude Opus 4.5 for caption + quality scoring

---

## [2025-01-22] - StarClaude64 Audio, Visuals & Polish

### Added
- **Full Audio System:**
  - Web Audio API for lag-free sound playback
  - Sound effects: shoot, bomb, explosion, coin collect, death, barrel roll
  - Looping chiptune background music (CC0 licensed)
  - Music mute button (bottom right, persists to localStorage)
  - Audio preloading and warmup to prevent frame drops

- **Space Skybox:**
  - NASA Tycho Skymap (4K equirectangular projection)
  - Realistic star field with Milky Way band
  - Slow rotation for immersion

- **Launch Warmup Screen:**
  - "LAUNCHING..." overlay with spinning $CC logo
  - 1.5 second warmup period hides shader compilation flicker
  - Player immune during warmup

### Changed
- **UI Rebranded to Anthropic Orange (#da7756):**
  - All HUD text (distance, coins, score)
  - Start screen title and controls
  - Death screen and buttons
  - Mute button styling

- **HUD Layout:**
  - All counters grouped on right side
  - Mute button moved to bottom right (larger size)

- **Character Material:**
  - Roughness increased to 0.9 for softer reflections
  - Removed jet propulsion effect

### Technical
- Switched from HTMLAudioElement to Web Audio API
- Pre-decoded audio buffers for instant playback
- Environment HDRI for realistic reflections
- Optimized textures: WebP format, 4K max resolution

### Assets Added
- `/public/sounds/` - CC0 sound effects and music (~6.6MB)
  - `bgm_level1.ogg` - Background music
  - `synth_laser_03.ogg` - Shoot sound
  - `retro_explosion_01.ogg` - Explosion sound
  - `retro_coin_01.ogg` - Coin collect sound
  - `retro_die_01.ogg` - Death sound
  - `power_up_01.ogg` - Barrel roll sound
- `/public/textures/space_bg.webp` - NASA Tycho Skymap (976KB)

---

## [2025-01-22] - 3D CC Character Model

### Changed
- **StarClaude64 player is now the actual $CC mascot:**
  - Rocket ship replaced with 3D extruded $CC character
  - Uses exact SVG path from `public/claudecode.svg` (Adobe Illustrator export)
  - Perfect silhouette: body, arms, 4 legs, eye holes
  - Metallic reflective material (metalness 0.7, roughness 0.2)
  - Claude orange (#da7756) with emissive glow
  - Cyan engine glow + pink trail particles behind character

### Added
- `public/claudecode.svg` - Vector source file for 3D extrusion

### Technical
- THREE.Shape traced from SVG path coordinates
- ExtrudeGeometry with bevel for polished 3D look
- Centered and scaled to fit game viewport

---

## [2025-01-22] - StarClaude64 Keyboard Controls + Combat

### Changed
- **StarClaude64 controls completely overhauled:**
  - WASD: Move up/down/left/right
  - Arrow Up/Down: Move forward/backward (z-axis)
  - Arrow Left/Right: Barrel roll (with invincibility frames!)
  - Spacebar: Rapid-fire bullets (cyan)
  - Shift: Launch bombs (red, bigger damage radius)

### Added
- **Combat system:**
  - Bullets: Fast, require 2 hits to destroy asteroid (+25 pts)
  - Bombs: Slower, instant kill on asteroids (+50 pts)
  - Explosions with fade-out animation
  - Asteroids change color when damaged (1 health = red tint)
- **Barrel roll mechanic:**
  - Full 360° roll animation
  - Invincibility during roll (dodge mechanic!)
- Updated start screen with new control instructions

---

## [2025-01-22] - StarClaude64 + Space Invaders

### Added
- **StarClaude64 3D Game** (`/moon`)
  - Three.js endless runner with @react-three/fiber
  - Synthwave aesthetic (purple/blue space, neon pink/cyan accents)
  - Rocket follows mouse/touch with smooth lerp
  - Asteroids spawn and fly toward camera
  - $CC coins to collect (+10 points each)
  - Speed ramps: 8 → 10 → 14 → 20 over 60 seconds
  - "REKT" death screen with Twitter share
  - High score persistence (localStorage)
  - Mobile touch support

- **Space Invaders 2D Game** (`/play`)
  - Canvas-based classic Space Invaders clone
  - CC mascot as player ship (uses /cc.png)
  - Green pixel-art aliens with classic shape
  - Red enemy lasers, orange player lasers
  - Lives system (3 lives)
  - High score persistence (localStorage)
  - Start screen + game over screen

- **Homepage updates**
  - Added "Space Invaders" button (orange)
  - Added "StarClaude64" button (cyan)

### Dependencies Added
- `three` ^0.182.0
- `@react-three/fiber` ^9.5.0
- `@types/three` ^0.182.0

---

## [2025-01-22] - Meme Generator + Cloudflare Worker

### Added
- **Meme Generator** (`/meme`)
  - AI-powered image generation with Gemini API
  - Multimodal: sends reference image + text prompt
  - Two-column layout (controls | preview)
  - Example prompts with random button
  - Download and Twitter share buttons

- **Cloudflare Worker API** (`/worker`)
  - Deployed to: `https://ccwtf-api.aklo.workers.dev`
  - Handles Gemini API calls with CORS
  - Caches base character image
  - Contains master character prompt for brand consistency

- **Character Prompt System**
  - Detailed prompt ensuring correct CC mascot anatomy:
    - Flat top (no antenna)
    - 2 arms (left + right, symmetrical)
    - 4 legs (2 left, 2 right, gap in middle)
    - Empty rectangular eye holes (no pupils)
    - No mouth, no expressions
    - Ceramic figurine aesthetic

### Architecture
- Static site: Next.js with `output: "export"` → Cloudflare Pages
- API: Cloudflare Worker (separate deployment)
- Split because @cloudflare/next-on-pages doesn't support Next.js 16

---

## [2025-01-22] - Initial Setup

### Added
- Next.js 16.1.4 project with App Router
- Landing page with terminal-style design
- Animated Terminal component (typewriter Q&A)
- BuyButton, ContractAddress components
- Dark theme with Claude orange accent (#da7756)
- OG/Twitter card metadata
- Mobile responsive design

### Assets
- `/public/cc.png` - 2D logo (source of truth for shape)
- `/public/claudecode.jpg` - 3D rendered mascot
- `/public/og.jpg` - Social preview image

---

## Deployment Commands

```bash
# Static site to Cloudflare Pages
npm run build
npx wrangler pages deploy out --project-name=ccwtf

# API Worker
cd worker
npx wrangler deploy
```

## Live URLs
- **Site:** https://claudecode.wtf
- **API:** https://ccwtf-api.aklo.workers.dev
