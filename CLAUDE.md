# $CC - Claude Code Coin

> **claudecode.wtf** - The unofficial community memecoin celebrating Claude Code

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
4. **Moon Mission** (`/moon`) - 3D endless runner with Three.js

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
│   └── /moon (Moon Mission 3D)                               │
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
| AI | Google Gemini API | gemini-2.0-flash-exp-image-generation |
| Hosting | Cloudflare Pages | - |
| API | Cloudflare Workers | - |
| Font | JetBrains Mono | Google Fonts |

---

## Project Structure

```
ccwtf/
├── app/
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
│   ├── meme/
│   │   └── page.tsx              # Meme generator UI
│   ├── moon/
│   │   └── page.tsx              # Moon Mission 3D game page
│   ├── play/
│   │   └── page.tsx              # Space Invaders game page
│   ├── globals.css               # Tailwind + CSS variables
│   ├── layout.tsx                # Root layout + metadata
│   └── page.tsx                  # Homepage
├── public/
│   ├── cc.png                    # 2D logo (SOURCE OF TRUTH)
│   ├── claudecode.jpg            # 3D rendered mascot
│   └── og.jpg                    # Social preview
├── worker/                       # Cloudflare Worker (API)
│   ├── src/
│   │   └── index.ts              # Gemini API handler
│   ├── package.json
│   └── wrangler.toml             # Worker config
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
- Links: Meme Generator, Space Invaders, Moon Mission, Buy, Twitter, GitHub

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

### 4. Moon Mission (`/moon`)
- Three.js 3D endless runner
- Synthwave aesthetic (purple/cyan/pink)
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
--claude-orange: #da7756    /* Brand accent */
--accent-green: #4ade80     /* Aliens, success */
--accent-cyan: #00ffff      /* Moon Mission */
--accent-fuchsia: #ff00ff   /* Moon Mission */
```

---

## Secrets & Environment

### Local Development (.env)
```
GEMINI_API_KEY=your-key-here
```

### Cloudflare Worker Secrets
```bash
cd worker
npx wrangler secret put GEMINI_API_KEY
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

# Deploy to Cloudflare Pages
npx wrangler pages deploy out --project-name=ccwtf

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
| `app/meme/page.tsx` | Meme generator UI | ~227 |
| `app/components/SpaceInvaders.tsx` | 2D Canvas game | ~346 |
| `app/components/MoonMission/index.tsx` | 3D game wrapper | ~110 |
| `app/components/MoonMission/Game.tsx` | 3D game logic | ~220 |
| `worker/src/index.ts` | Cloudflare Worker API | ~187 |

---

## What's NOT Built Yet

- [ ] `/meme/gallery` - Meme leaderboard
- [ ] `/meme/[id]` - Individual meme pages with OG tags
- [ ] Voting system
- [ ] Image storage (Vercel Blob) for persistence
- [ ] Database (KV/D1) for leaderboard
- [ ] Sound effects for games
- [ ] Mobile game controls (virtual joystick)

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
- **GitHub:** https://github.com/aklo360/cc
- **Community:** https://x.com/i/communities/2014131779628618154
- **Buy:** https://bags.fm/cc
