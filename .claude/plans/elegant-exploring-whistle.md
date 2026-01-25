# Claude Mascot Reaction GIF Plan

## Goal
Create 4 animated reaction GIFs (3-6 seconds each) using the claude3.png 3D mascot character, conveying:
1. **Angry** - rage, intensity
2. **Happy** - joy, celebration
3. **Sad** - melancholy, dejected
4. **Laughing** - hilarious, uncontrollable joy

## Specifications
- **Resolution**: 1080x1080 (square, social media friendly)
- **Background**: Animated gradient pulse matching each emotion's color
- **Duration**: 3-5 seconds per emotion
- **Style**: Smooth looping, no hard cuts

## Approach

Since the mascot is a static image with minimal features (two eye slots, blocky body), emotions will be conveyed through:
- **Motion** - shaking, bouncing, drooping
- **Color tints** - red for angry, blue for sad, bright yellow for happy
- **Scale/rotation** - pulsing, tilting, spinning
- **Particle effects** - steam, sparkles, tears, etc.

## Implementation

### New Files to Create

**`src/ClaudeReaction.tsx`** - Main component with emotion-specific animations:

```
Props: { emotion: 'angry' | 'happy' | 'sad' | 'laughing' }
```

Each emotion will have:
- Unique motion pattern (shake vs bounce vs droop)
- Color filter (hue-rotate, brightness, saturation)
- Particle/effect overlays
- Smooth looping (no hard cuts)

### Animation Specs per Emotion

| Emotion | Duration | Motion | Color | Background Gradient | Effects |
|---------|----------|--------|-------|---------------------|---------|
| Angry | 90 frames (3s) | Violent shake, pulse | Red tint | Pulsing red/dark red radial | Steam puffs above head |
| Happy | 120 frames (4s) | Bouncy spring, tilt | Yellow/gold | Warm yellow/orange pulse | Sparkles, hearts |
| Sad | 150 frames (5s) | Slow droop, shrink | Blue tint | Cool blue/purple pulse | Teardrops falling |
| Laughing | 120 frames (4s) | Rapid bounce + shake | Warm cycling | Cycling warm gradient | Tear trails, squash/stretch |

### Update Root.tsx

Add 4 new compositions (all 1080x1080 @ 30fps):
- `ClaudeAngry` (90 frames = 3s)
- `ClaudeHappy` (120 frames = 4s)
- `ClaudeSad` (150 frames = 5s)
- `ClaudeLaughing` (120 frames = 4s)

### Output

Render each to separate files:
- `out/claude-angry.mp4`
- `out/claude-happy.mp4`
- `out/claude-sad.mp4`
- `out/claude-laughing.mp4`

## Key Animation Techniques

### Angry
```tsx
// Shake + red pulse
const shake = Math.sin(frame * 2) * 8 + Math.cos(frame * 3) * 5;
const pulse = Math.sin(frame * 0.3) * 0.1 + 1;
filter: `hue-rotate(-20deg) saturate(1.8) brightness(${1 + Math.sin(frame * 0.2) * 0.2})`
// Steam particles rising above head
```

### Happy
```tsx
// Bouncy spring + sparkles
const bounce = spring({ frame, fps, config: { damping: 8, stiffness: 150 } });
const tilt = Math.sin(frame * 0.08) * 15;
filter: `hue-rotate(30deg) brightness(1.3) saturate(1.2)`
// Sparkle particles orbiting
```

### Sad
```tsx
// Slow droop + blue tint
const droop = Math.sin(frame * 0.03) * 20 + 10;
const shrink = 0.95 - Math.sin(frame * 0.02) * 0.05;
filter: `hue-rotate(180deg) saturate(0.6) brightness(0.75)`
// Teardrop particles falling from eyes
```

### Laughing
```tsx
// Rapid bounce + shake + color cycle
const bounce = Math.abs(Math.sin(frame * 0.15)) * 30;
const shake = Math.sin(frame * 0.8) * 12;
const hue = (frame * 3) % 60 - 30; // warm color cycling
filter: `hue-rotate(${hue}deg) brightness(1.2)`
// Squash and stretch effect
```

## File Changes Summary

| File | Action |
|------|--------|
| `src/ClaudeReaction.tsx` | Create (new) |
| `src/Root.tsx` | Edit (add 4 compositions) |
| `public/mascot-3d.png` | Already exists |

## Verification

1. Run `bun run dev` to preview in Remotion Studio
2. Check each emotion plays smoothly with no hard cuts
3. Verify looping feels natural (start/end states similar)
4. Render all 4: `bunx remotion render ClaudeAngry out/claude-angry.mp4` (repeat for each)
