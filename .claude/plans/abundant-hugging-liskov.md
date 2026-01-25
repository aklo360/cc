# LABYRINTH Prompts Revision Plan

## Problem
Current prompts are too clean/polished — missing the raw lo-fi magic of actual 1993-1997 demoscene and early PS1/N64 era. Also, Minotaur anatomy is wrong.

## Changes Required

### 1. Fix Minotaur Anatomy (all 6 prompts)
**Correct description:**
- Bull head (massive, horned)
- Bull upper torso/chest (muscular, fur-textured polygons)
- Human waist/hips
- Human legs
- **Greek sandals** (strapped leather, mythological)

The creature is a hybrid: beast above, man below — walking upright on human legs in ancient sandals. This grounds the mythology while trapped in digital infrastructure.

### 2. Add Lo-Fi Aesthetic Qualities (style_base + all prompts)

**ALL of these effects — maximum jank:**

**Texture Warping + Vertex Jitter (PS1 wobble):**
- Affine texture mapping — textures swim and warp incorrectly
- Vertex jitter — geometry shakes/wobbles at edges
- Texture seams visible on model UV boundaries
- Z-fighting / polygon clipping glitches

**VHS / CRT Grain:**
- Scan lines (interlaced display artifacts)
- VHS tracking errors / horizontal noise bands
- Phosphor glow bleeding on bright elements
- Analog color fringing / chroma bleed
- "Recorded off a CRT monitor" quality

**Heavy Fog + Dithering:**
- Aggressive fog hiding draw distance (Silent Hill style)
- Visible dither patterns in gradients (ordered/bayer dithering)
- Color banding / posterization from limited palettes
- Hard fog cutoff where geometry just disappears

**Compression Artifacts:**
- JPEG blocking / macro-blocking visible
- MPEG artifact halos around high-contrast edges
- 1997 CD-ROM FMV quality — crunchy, lossy
- Pre-rendered background compression grain

**Remove/tone down:**
- "Chrome" and "metallic" (too clean)
- "Cinematic" (too modern/Hollywood)
- "Lens flare" (replace with simpler additive glow)
- Anything suggesting smooth, polished, or high-fidelity

### 3. Reference Updates
Better references for the vibe:
- **Doom 64** (dark, oppressive, chunky sprites)
- **Silent Hill PS1** (fog, grain, psychological dread)
- **Quake 1** (brown, gritty, Lovecraftian geometry)
- **Resident Evil 1 PS1** (pre-rendered backgrounds + lo-fi 3D)
- **Tomb Raider 1** (angular Lara, texture warping)
- **Demoscene**: Second Reality, Unreal by Future Crew, State of the Art
- **Music videos**: Aphex Twin "Windowlicker", Chris Cunningham CGI

## Files to Modify
```
1_HOME/PROJECTS/labyrinth-assets/
├── labyrinth-prompts-master.json
├── prompt-01-cover-main.json
├── prompt-02-cover-escape.json
├── prompt-03-cover-theseus.json
├── prompt-04-cover-layers.json
├── prompt-05-cover-ariadne.json
└── prompt-06-cover-digital-prison.json
```

## Verification
- Review each updated JSON for correct Minotaur anatomy description
- Confirm lo-fi aesthetic language is present in style_base and each prompt
- Ensure negative_prompt excludes clean/modern qualities
