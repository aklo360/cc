# VJ Agent - Live Audio-Reactive Visual Generator

## Overview
A Claude Agent SDK-powered VJ that generates live visuals responsive to audio in real-time. Three visual engines, four visual styles, infinite generation.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VJ AGENT (/vj)                              │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐    ┌──────────────────────────────────────┐  │
│  │   AUDIO INPUT    │    │         CLAUDE AGENT                 │  │
│  │                  │    │   (Claude Agent SDK)                 │  │
│  │  getDisplayMedia │───▶│                                      │  │
│  │  + Web Audio API │    │  • Switch engines/styles on command  │  │
│  │                  │    │  • Generate new GLSL shaders         │  │
│  │  AnalyserNode    │    │  • Modify visual parameters          │  │
│  │  (FFT 60fps)     │    │  • Auto-detect music mood            │  │
│  │                  │    │                                      │  │
│  │  BPM Detection   │    └──────────────────────────────────────┘  │
│  │  (realtime-bpm)  │                     │                        │
│  └────────┬─────────┘                     │                        │
│           │                               │                        │
│           ▼                               ▼                        │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                    VISUAL ENGINES                           │   │
│  │                                                             │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │   │
│  │  │  ENGINE 1   │  │  ENGINE 2   │  │      ENGINE 3       │ │   │
│  │  │  Three.js   │  │   Hydra     │  │  Remotion Player    │ │   │
│  │  │             │  │             │  │     (hacked)        │ │   │
│  │  │ • Particles │  │ • Live GLSL │  │                     │ │   │
│  │  │ • Geometry  │  │ • Chained   │  │ • Frame-based with  │ │   │
│  │  │ • Shaders   │  │   functions │  │   live audio props  │ │   │
│  │  │ • 3D scenes │  │ • Feedback  │  │ • Existing scenes   │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘ │   │
│  └────────────────────────────────────────────────────────────┘   │
│                              │                                     │
│                              ▼                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                     VISUAL STYLES                           │   │
│  │  [Abstract]  [Branded $CC]  [Synthwave]  [Auto/AI-picked]  │   │
│  └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
ccwtf/
├── vj/                           # Standalone VJ project
│   ├── src/
│   │   ├── index.ts              # Main entry point
│   │   │
│   │   ├── audio/
│   │   │   ├── capture.ts        # getDisplayMedia + system audio
│   │   │   ├── analyzer.ts       # Web Audio API AnalyserNode (FFT)
│   │   │   └── beat.ts           # realtime-bpm-analyzer integration
│   │   │
│   │   ├── engines/
│   │   │   ├── types.ts          # Common engine interface
│   │   │   │
│   │   │   ├── threejs/          # ENGINE 1: Three.js
│   │   │   │   ├── index.ts      # Engine wrapper
│   │   │   │   ├── scenes/
│   │   │   │   │   ├── particles.ts    # Particle systems
│   │   │   │   │   ├── geometry.ts     # Reactive geometry
│   │   │   │   │   ├── tunnel.ts       # Classic VJ tunnel
│   │   │   │   │   └── waveform.ts     # 3D waveform
│   │   │   │   └── shaders/
│   │   │   │       ├── audio-reactive.frag
│   │   │   │       └── beat-pulse.frag
│   │   │   │
│   │   │   ├── hydra/            # ENGINE 2: Hydra live coding
│   │   │   │   ├── index.ts      # hydra-synth wrapper
│   │   │   │   ├── presets.ts    # Starting visual presets
│   │   │   │   └── audio-bindings.ts  # Map FFT → hydra params
│   │   │   │
│   │   │   └── remotion/         # ENGINE 3: Hacked Remotion
│   │   │       ├── index.ts      # Player with live audio props
│   │   │       └── LiveComposition.tsx # Audio-reactive composition
│   │   │
│   │   ├── styles/               # Visual style presets
│   │   │   ├── abstract.ts       # Geometry, particles, colors
│   │   │   ├── branded.ts        # $CC mascot, #da7756, token vibes
│   │   │   ├── synthwave.ts      # Purple/cyan/pink, grids, neon
│   │   │   └── auto.ts           # AI picks based on audio mood
│   │   │
│   │   └── agent/
│   │       └── index.ts          # Claude Agent SDK integration
│   │
│   ├── package.json              # Dependencies
│   └── tsconfig.json
│
├── app/vj/
│   └── page.tsx                  # Next.js page for VJ UI
```

## Key Dependencies

```json
{
  "dependencies": {
    "three": "^0.182.0",
    "@react-three/fiber": "^9.5.0",
    "hydra-synth": "^1.3.29",
    "realtime-bpm-analyzer": "^3.x",
    "@remotion/player": "^4.0.409",
    "@anthropic-ai/sdk": "latest"
  }
}
```

## Implementation Plan

### Phase 1: Audio Capture & Analysis
1. **capture.ts** - `getDisplayMedia({ audio: { systemAudio: 'include' } })`
2. **analyzer.ts** - Web Audio API AnalyserNode for 60fps FFT data
   - Frequency bands: bass (20-250Hz), mid (250-2000Hz), high (2000-20000Hz)
   - Amplitude envelope detection
3. **beat.ts** - `realtime-bpm-analyzer` for BPM detection
   - Beat onset detection for visual sync

### Phase 2: Engine 1 - Three.js
1. Create engine interface (`IVisualEngine`)
2. Implement particle system reactive to bass
3. Implement geometry morphing reactive to mids
4. Implement color shifts reactive to highs
5. Add shader-based post-processing (bloom, feedback)

### Phase 3: Engine 2 - Hydra
1. Integrate `hydra-synth` npm package
2. Create audio bindings (FFT → Hydra parameters)
3. Build preset library for each visual style
4. Enable Claude to write/modify Hydra code live

### Phase 4: Engine 3 - Remotion Player (Hacked)
1. Use `@remotion/player` in loop mode
2. Pass live audio data as props each frame
3. Create `LiveComposition` that reads audio props
4. Map FFT data to Remotion's interpolate functions

### Phase 5: Visual Styles
1. **Abstract**: Wireframe geometry, particle explosions, pure color
2. **Branded**: CC mascot morphing, orange (#da7756) pulses, coin particles
3. **Synthwave**: Neon grid, retro sun, chrome text, pink/cyan palette
4. **Auto**: Claude analyzes audio characteristics → picks appropriate style

### Phase 6: Claude Agent Integration
1. Claude Agent SDK setup with VJ-specific tools:
   - `switch_engine(engine: 'threejs' | 'hydra' | 'remotion')`
   - `switch_style(style: 'abstract' | 'branded' | 'synthwave' | 'auto')`
   - `modify_parameter(param: string, value: number)`
   - `write_hydra_code(code: string)` - live shader injection
   - `analyze_mood()` - detect music genre/energy
2. Voice command support (optional, via Web Speech API)

### Phase 7: UI (app/vj/page.tsx)
1. Full-screen canvas for visuals
2. Minimal overlay UI:
   - Engine selector (Three.js / Hydra / Remotion)
   - Style selector (Abstract / Branded / Synthwave / Auto)
   - Audio source button (triggers getDisplayMedia)
   - BPM display
   - FFT visualizer (small)
3. Chat interface for Claude agent commands

## Critical Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `vj/src/audio/capture.ts` | Create | System audio capture via getDisplayMedia |
| `vj/src/audio/analyzer.ts` | Create | Web Audio API FFT analysis |
| `vj/src/engines/threejs/index.ts` | Create | Three.js reactive visuals |
| `vj/src/engines/hydra/index.ts` | Create | Hydra live coding integration |
| `vj/src/engines/remotion/index.ts` | Create | Hacked Remotion Player |
| `vj/src/agent/index.ts` | Create | Claude Agent SDK VJ controller |
| `app/vj/page.tsx` | Create | Next.js VJ page |
| `CLAUDE.md` | Update | Add VJ documentation |

## Audio Data Flow

```
System Audio (YouTube, Spotify, etc.)
         │
         ▼
getDisplayMedia({ audio: { systemAudio: 'include' } })
         │
         ▼
MediaStream → AudioContext.createMediaStreamSource()
         │
         ▼
AnalyserNode.getFloatFrequencyData() @ 60fps
         │
         ├──▶ Bass (20-250Hz)   → scale, pulse, kick
         ├──▶ Mids (250-2kHz)   → color, morph, texture
         ├──▶ Highs (2k-20kHz)  → sparkle, detail, shimmer
         │
         ▼
realtime-bpm-analyzer
         │
         ▼
BPM + Beat onsets → sync animations to beat
```

## Verification

1. **Audio capture works**: Open YouTube, start VJ, select tab with audio → see FFT responding
2. **Each engine renders**: Switch between Three.js/Hydra/Remotion → visuals change
3. **Audio reactivity**: Bass hits → visuals pulse in sync
4. **Style switching**: Change styles → visual aesthetic transforms
5. **Claude agent**: Type "make it more intense" → parameters adjust

## Sources
- [Hydra Synth](https://github.com/hydra-synth/hydra) - Live coding visuals
- [Remotion Audio Visualization](https://www.remotion.dev/docs/audio/visualization) - Pre-rendered audio viz
- [realtime-bpm-analyzer](https://github.com/dlepaux/realtime-bpm-analyzer) - BPM detection
- [getDisplayMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia) - System audio capture
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) - Audio analysis
