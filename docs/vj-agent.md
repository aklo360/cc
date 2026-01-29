# VJ Agent - Live Audio-Reactive Visuals

> Claude-powered live audio-reactive visual generator

---

## VJ v1 (`/vj`)

### Three Visual Engines

| Engine | Description |
|--------|-------------|
| **Three.js** | 3D particles, geometry, bloom post-processing |
| **Hydra** | Live coding GLSL shaders (like Resolume) |
| **Remotion** | Hacked Player with live audio props |

### Four Visual Styles

| Style | Description |
|-------|-------------|
| **Abstract** | Pure geometry, wireframes, particles |
| **Branded** | $CC orange (#da7756), mascot, token vibes |
| **Synthwave** | Neon 80s, pink/cyan, retro grids |
| **Auto** | Claude picks style based on music mood |

### Audio Capture

- `getDisplayMedia` for system audio (Chrome/Edge only)
- Web Audio API `AnalyserNode` for 60fps FFT
- `realtime-bpm-analyzer` for BPM/beat detection
- Frequency bands: bass (20-250Hz), mid (250-2kHz), high (2k-20kHz)

### Claude Agent Integration

- Tools: `switch_engine`, `switch_style`, `set_parameter`, `write_hydra_code`
- Can analyze music mood and auto-adjust visuals
- Quick commands: `three`, `hydra`, `synthwave`, `intensity 1.5`, etc.

### Keyboard Shortcuts (v1)

| Key | Action |
|-----|--------|
| H | Hide/show UI |
| F | Fullscreen |
| 1/2/3 | Switch engines |
| A/B/S/X | Switch styles (Abstract/Branded/Synthwave/Auto) |

---

## VJ v2 (`/vj` and `/vj-v2`)

Complete visual overhaul inspired by Beeple, Cyriak, and professional VJ techniques.

### Two Visual Engines (removed Remotion)

| Engine | Description |
|--------|-------------|
| **Three.js v2** | Non-repeating procedural evolution, tunnel zoom, drift, bloom |
| **Hydra v2** | 7 radically different visual modes with 28 scenes total |

### Seven Visual Modes + Auto

| Mode | Key | Description |
|------|-----|-------------|
| **SPIRAL** | S | Hypnotic spiraling, kaleidoscopic patterns |
| **MORPH** | M | Cyriak-inspired - Droste effect, melt, fracture, breathe |
| **DYSTOPIA** | D | Beeple-inspired - Monolith, corruption, emergence, eclipse |
| **GEOMETRY** | G | Mathematical - Voronoi, shatter, wireframe, tessellation |
| **WARP** | W | Hyperdrive/speed - Starfield, streak, vortex, hyperspace |
| **GLITCH** | X | Digital corruption - VHS, RGB split, tear, corrupt |
| **LIQUID** | L | Organic flow - Ripple, underwater, flow, mercury |
| **AUTO** | A | Random scene selection every 10 seconds |

### Design Principles

- Each mode RADICALLY different (not just "grids of mascots")
- Mix of single large mascot + abstracted/transformed scenes
- Inspired by Beeple (dystopian monoliths) and Cyriak (Droste/morphing)
- Scene changes every 10 seconds (auto randomizes)

### Post-Processing Chain

| Effect | Behavior |
|--------|----------|
| Bloom | Strength reacts to bass |
| Chromatic aberration | Reacts to high frequencies |
| Vortex | Three.js only |

### Assets

Located in `/public/vj/`:
- `mascot-3d.png` - 3D mascot render (717KB)
- `cc-logo.png` - Logo
- `ccbanner.png` - Wide banner
- `claude3.png` - Claude branding

### Keyboard Shortcuts (v2)

| Key | Action |
|-----|--------|
| H | Hide UI |
| F | Fullscreen |
| 1/2 | Engines (Three.js/Hydra) |
| S/M/D/G/W/X/L/A | Modes |

---

## Running Locally

```bash
cd vj
npm install
# Then visit /vj in the main Next.js app
```

---

## Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `app/vj/page.tsx` | Production VJ page | ~250 |
| `app/vj-v2/page.tsx` | Staging page with STAGING badge | ~270 |
| `vj/src/index.ts` | VJ orchestrator (v1) | ~280 |
| `vj/src/index-v2.ts` | VJ v2 orchestrator (trippy) | ~280 |
| `vj/src/audio/capture.ts` | System audio capture | ~85 |
| `vj/src/audio/analyzer.ts` | FFT analysis | ~150 |
| `vj/src/audio/beat.ts` | BPM detection | - |
| `vj/src/engines/types.ts` | Common engine interface | - |
| `vj/src/engines/threejs/index.ts` | Three.js engine (v1) | ~250 |
| `vj/src/engines/threejs-v2/index.ts` | Three.js v2 (trippy effects) | ~960 |
| `vj/src/engines/hydra/index.ts` | Hydra engine (v1) | ~200 |
| `vj/src/engines/hydra-v2/index.ts` | Hydra v2 (7 modes, 28 scenes) | ~1024 |
| `vj/src/agent/index.ts` | Claude Agent SDK VJ | ~300 |
