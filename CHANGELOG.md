# Changelog

All notable changes to the $CC (claudecode.wtf) project.

---

## [Unreleased]

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
