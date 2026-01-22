# Changelog

All notable changes to the $CC (claudecode.wtf) project.

---

## [Unreleased]

## [2025-01-22] - Moon Mission Keyboard Controls + Combat

### Changed
- **Moon Mission controls completely overhauled:**
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

## [2025-01-22] - Moon Mission + Space Invaders

### Added
- **Moon Mission 3D Game** (`/moon`)
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
  - Added "Moon Mission" button (cyan)

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
