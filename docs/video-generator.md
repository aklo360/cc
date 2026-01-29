# Video Generator (Remotion)

> CINEMATIC 3D Remotion trailers with exact webapp UI recreation

---

## Overview

- **WebappTrailer composition** - 3D tilted terminal with camera movements
- **Manifest-driven content** - extracts real buttons, inputs, outputs from deployed pages

### How It Works

1. Extract manifest from deployed feature (buttons, placeholders, real output)
2. Pass content to WebappTrailer Remotion composition
3. Render 20-second CINEMATIC trailer with camera movements

---

## 3D Camera System

- Tilted terminal window in 3D perspective
- Dolly ins and zooms on active elements (2.2x-3.2x)
- Cursor with click animations on buttons
- Typewriter text animation for output
- Perfect focal point centering throughout

### Camera Positions (scene-by-scene)

```
intro → inputTyping → inputCursorMove → buttonClick → processing → outputReveal → outputTyping → outputComplete → cta
```

### Timeline (20 seconds)

| Scene | Duration | Content |
|-------|----------|---------|
| Input | 5s | Typing animation with zoom on textarea |
| Processing | 1.5s | Snappy spinner + progress bar |
| Output | 8s | Typewriter reveal with zoom tracking |
| CTA | 5.5s | "Try it now" + feature URL |

---

## Design Tokens

Match webapp exactly:

| Token | Value |
|-------|-------|
| Background | #0d0d0d |
| Card | #1a1a1a |
| Orange | #da7756 |
| Components | Terminal header, cards, buttons, footer |
| Typography | JetBrains Mono + system fonts |

---

## Trailer Standards (CRITICAL)

**GameFiTrailer is the GOLD STANDARD template.** All future game trailers MUST:

1. Recreate the ACTUAL UI components (not generic input/output boxes)
2. Show the real user journey (e.g., connect → select → bet → flip → win)
3. Use 15-second duration (450 frames @ 30fps) - snappy, not slow
4. Include cursor with click animations tracking visual targets
5. Use smooth camera interpolation between focal points

### Template Hierarchy

| Template | Duration | Use For | Pattern |
|----------|----------|---------|---------|
| **GameFiTrailer** | 15s | GameFi games (coin flip, crash, jackpot, gacha) | UI recreation - GOLD STANDARD |
| **GameTrailer** | 20s | Arcade games (Space Invaders, etc.) | UI recreation |
| **WebappTrailer** | 20s | Text-based tools | Input/output flow |

---

## Key Design Principles

- Orange brand color coin (`#da7756` → `#b85a3a`)
- 3D coin with heads (👑) / tails (🛡️) visible during flip
- Confetti (50 particles) on win
- 8 camera positions with `interpolateCamera()`
- Cursor targets must match actual button positions
- Component-based architecture (Header, BetInput, Coin, ResultModal, etc.)
- Frame-based state calculation (no React state)

---

## GameFiTrailer Composition

- Recreates full CC Flip game UI with 3D camera movements
- Props: `featureName`, `featureSlug`, `network`, `betAmount`, `coinChoice`, `flipResult`
- 8-scene timeline: intro → connect → choice → bet → flip → result → balance → cta
- Cursor animations with click effects
- Win/lose result modal with confetti

### Render Command

```bash
npx remotion render src/index.ts GameFiTrailer out/ccflip.mp4 --props='...'
```

---

## Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `video/src/compositions/GameFiTrailer.tsx` | **GOLD STANDARD** - GameFi trailer template | ~1268 |
| `video/src/compositions/WebappTrailer.tsx` | Text-based tool trailers (non-games) | ~800 |
| `video/src/compositions/GameTrailer.tsx` | Arcade game trailer (follow GameFi pattern) | ~554 |
| `brain/src/trailer.ts` | Generator using manifest + WebappTrailer | - |
| `brain/src/manifest.ts` | Extracts real content from pages | - |
| `video/src/Trailer.tsx` | Main 15s composition | ~200 |
| `video/src/scenes/*.tsx` | Motion graphics scenes | ~230 |
| `video/agent/index.ts` | Autonomous trailer capture | ~300 |
| `video/post-tweet.ts` | Twitter video posting | ~35 |

---

## Reference Implementation

The template to copy for new trailers:
```
video/src/compositions/GameFiTrailer.tsx (~1268 lines)
```
