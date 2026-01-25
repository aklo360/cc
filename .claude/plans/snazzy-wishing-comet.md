# Clipper Bot PRD v1.0

## Product Requirements Document
### AI-Powered Livestream Clip Extraction & Distribution System

---

## 1. Executive Summary

**Product Name:** Clipper Bot
**Codename:** `clipper`
**Purpose:** Autonomous system that extracts specific moments from livestream archives using natural language descriptions, edits them into platform-optimized clips with stream-derived graphics, and distributes to social platforms.

**Core Value Proposition:**
"Describe the moment, get the clip, post everywhere."

---

## 2. Problem Statement

### Current Pain Points
1. **Manual scrubbing** - Finding moments in 2-24hr streams requires hours of manual work
2. **Multi-platform friction** - Each platform needs different formats, separate uploads
3. **Delayed distribution** - By the time clips are made, the moment has lost virality
4. **Inconsistent quality** - Manual editing leads to variable output quality
5. **Context loss** - Generic templates don't capture the stream's unique energy

### Target Users
- Livestreamers wanting to repurpose content
- Community managers extracting highlights
- Content teams managing multi-platform presence
- Anyone with video archives needing clip extraction

---

## 3. Product Vision

### North Star
A single natural language command transforms any moment from any stream into a polished, platform-ready clip posted everywhere within minutes.

### Example Interaction
```
User: "Clip when we first deployed the 2D game and played it for the first time"
Source: https://twitter.com/i/broadcasts/1yNGaYvPqVzJj

Clipper:
├── Downloads stream (2hr 34min)
├── Transcribes full audio (Whisper large-v3)
├── Indexes 5,080 segments with timestamps
├── Searches: "deployed 2D game played first time"
├── Found 3 candidates:
│   ├── 1:23:45 - 1:24:52 (confidence: 94%) ← Selected
│   ├── 1:45:12 - 1:45:58 (confidence: 71%)
│   └── 2:01:33 - 2:02:15 (confidence: 43%)
├── Extracting clip: 67 seconds
├── Analyzing stream aesthetics...
│   ├── Dominant colors: #1a1a2e, #da7756, #00ff88
│   ├── Text style: JetBrains Mono, terminal aesthetic
│   ├── Energy level: High excitement (voice analysis)
│   └── Key frames extracted for motion graphics
├── Generating graphics from stream context...
├── Rendering 9:16 vertical (1080x1920)
├── Posting to:
│   ├── Twitter: ✓ Posted (https://twitter.com/...)
│   └── YouTube Shorts: ✓ Posted (https://youtube.com/shorts/...)
└── Complete in 4m 32s
```

---

## 4. Functional Requirements

### 4.1 Video Acquisition

#### 4.1.1 Supported Platforms
| Platform | URL Patterns | Archive Support | Live Support |
|----------|--------------|-----------------|--------------|
| Twitter/X | `twitter.com/i/broadcasts/*`, `x.com/*/status/*` | ✓ | Phase 2 |
| YouTube | `youtube.com/watch?v=*`, `youtu.be/*` | ✓ | Phase 2 |
| Twitch | `twitch.tv/videos/*` | ✓ | Phase 2 |
| Kick | `kick.com/video/*` | ✓ | Phase 2 |
| TikTok | `tiktok.com/@*/video/*` | ✓ | N/A |
| Instagram | `instagram.com/reel/*`, `/tv/*` | ✓ | N/A |
| Direct URL | Any `.mp4`, `.webm`, `.m3u8` | ✓ | ✓ |
| Local File | `/path/to/video.mp4` | ✓ | N/A |

#### 4.1.2 Download Engine
```typescript
interface AcquisitionConfig {
  url: string;
  outputPath: string;
  quality: 'best' | '1080p' | '720p' | '480p';
  format: 'mp4' | 'webm' | 'mkv';
  cookies?: string;           // For authenticated content
  rateLimit?: number;         // KB/s, for politeness
  resumable: boolean;         // Resume interrupted downloads
  timeout: number;            // Max download time (ms)
}

interface AcquisitionResult {
  localPath: string;
  duration: number;           // Total seconds
  resolution: { width: number; height: number };
  fps: number;
  fileSize: number;           // Bytes
  metadata: VideoMetadata;
}
```

**Implementation:** `yt-dlp` with custom wrapper
- Handles authentication cookies for private streams
- Automatic format selection (best audio + video)
- Progress streaming for long downloads
- Retry logic with exponential backoff

#### 4.1.3 Duration Handling
| Duration | Strategy | Est. Download | Est. Transcription |
|----------|----------|---------------|-------------------|
| < 10min | Full download, in-memory | 30s | 1-2min |
| 10min - 1hr | Full download, disk | 2-5min | 5-15min |
| 1hr - 4hr | Full download, disk | 10-20min | 30-60min |
| 4hr - 24hr | Chunked download, parallel | 30-60min | 2-4hr |

**24-Hour Stream Handling:**
```typescript
interface ChunkedProcessing {
  chunkDuration: 3600;        // 1 hour chunks
  parallelChunks: 4;          // Process 4 chunks simultaneously
  overlapSeconds: 30;         // Overlap for boundary moments
  indexMergeStrategy: 'concat' | 'interleave';
}
```

---

### 4.2 Transcription & Indexing

#### 4.2.1 Whisper Configuration
```typescript
interface TranscriptionConfig {
  model: 'tiny' | 'base' | 'small' | 'medium' | 'large-v3';
  language?: string;          // Auto-detect if not specified
  task: 'transcribe' | 'translate';
  wordTimestamps: true;       // CRITICAL: Need word-level timing
  vadFilter: true;            // Voice activity detection
  compression: 'none' | 'gzip';
}
```

**Model Selection Logic:**
```
if (duration < 10min) → large-v3 (best accuracy)
if (duration < 1hr) → large-v3 (best accuracy)
if (duration < 4hr) → medium (balance)
if (duration >= 4hr) → medium with parallel chunks
```

#### 4.2.2 Segment Structure
```typescript
interface TranscriptSegment {
  id: string;                 // UUID
  index: number;              // Sequential index
  startTime: number;          // Seconds from video start
  endTime: number;            // Seconds from video start
  duration: number;           // Segment duration
  text: string;               // Transcribed text
  words: Word[];              // Word-level timestamps
  confidence: number;         // 0-1 transcription confidence
  speaker?: string;           // Speaker diarization (Phase 2)
  embedding?: number[];       // Semantic embedding vector
}

interface Word {
  word: string;
  start: number;
  end: number;
  confidence: number;
}
```

#### 4.2.3 Chunking Strategy
```typescript
interface ChunkingConfig {
  targetDuration: 30;         // 30-second target chunks
  minDuration: 15;            // Never shorter than 15s
  maxDuration: 60;            // Never longer than 60s
  overlapDuration: 5;         // 5s overlap between chunks
  boundaryStrategy: 'sentence' | 'pause' | 'fixed';
}
```

**Boundary Detection:**
1. Prefer sentence boundaries (period, question mark, exclamation)
2. Fall back to natural pauses (>500ms silence)
3. Last resort: fixed duration split

#### 4.2.4 Embedding Generation
```typescript
interface EmbeddingConfig {
  model: 'text-embedding-3-small' | 'text-embedding-3-large';
  dimensions: 1536;
  batchSize: 100;             // Embed 100 segments at once
  cache: true;                // Cache embeddings for re-queries
}
```

**Storage Format:**
```typescript
interface VideoIndex {
  videoId: string;
  sourceUrl: string;
  duration: number;
  createdAt: Date;
  segments: TranscriptSegment[];
  embeddings: Float32Array;   // Packed embedding matrix
  metadata: {
    title?: string;
    channel?: string;
    uploadDate?: Date;
    viewCount?: number;
  };
}
```

---

### 4.3 Moment Detection

#### 4.3.1 Search Pipeline
```
User Query
    │
    ▼
┌─────────────────────────────────────────────────┐
│  STAGE 1: Semantic Search                       │
│  ├─ Embed user query                            │
│  ├─ Cosine similarity against all segments      │
│  └─ Return top 20 candidates                    │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│  STAGE 2: Context Expansion                     │
│  ├─ For each candidate, fetch ±2 segments       │
│  └─ Build context windows (5 segments each)     │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│  STAGE 3: AI Ranking (Claude)                   │
│  ├─ Send all context windows to Claude          │
│  ├─ Claude scores each for relevance            │
│  ├─ Claude identifies exact moment boundaries   │
│  └─ Return ranked list with precise timestamps  │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│  STAGE 4: Visual Verification (Optional)        │
│  ├─ Extract keyframes at candidate timestamps   │
│  ├─ Send to Claude Vision for verification      │
│  └─ Confirm visual matches description          │
└─────────────────────────────────────────────────┘
```

#### 4.3.2 Claude Ranking Prompt
```typescript
const RANKING_PROMPT = `
You are analyzing a livestream transcript to find a specific moment.

USER'S REQUEST: "{query}"

Below are candidate segments from the transcript. Each candidate includes:
- Timestamp range
- Transcript text
- Surrounding context (2 segments before/after)

CANDIDATES:
{candidates}

For each candidate, evaluate:
1. RELEVANCE (0-100): How well does this match the user's request?
2. MOMENT_START: Exact second where the requested moment BEGINS
3. MOMENT_END: Exact second where the requested moment ENDS
4. CLIP_START: Recommended clip start (include 2-3s lead-in for context)
5. CLIP_END: Recommended clip end (include 1-2s of reaction/aftermath)
6. REASONING: Why this is/isn't the right moment

Return JSON:
{
  "rankings": [
    {
      "candidateId": "...",
      "relevance": 94,
      "momentStart": 5025.5,
      "momentEnd": 5067.2,
      "clipStart": 5022.0,
      "clipEnd": 5070.0,
      "clipDuration": 48,
      "reasoning": "This is when they run 'npm run deploy' and see the success message..."
    }
  ],
  "bestMatch": "candidate_id",
  "confidence": 0.94,
  "suggestedTitle": "First successful deployment!",
  "suggestedCaption": "The moment it all came together..."
}
`;
```

#### 4.3.3 Detection Result
```typescript
interface DetectionResult {
  query: string;
  processingTime: number;
  candidates: RankedCandidate[];
  bestMatch: {
    clipStart: number;        // Seconds
    clipEnd: number;          // Seconds
    clipDuration: number;     // Seconds
    confidence: number;       // 0-1
    transcript: string;       // Full transcript of clip
    suggestedTitle: string;
    suggestedCaption: string;
  };
  alternates: RankedCandidate[];  // Other good matches
}
```

---

### 4.4 Clip Extraction

#### 4.4.1 FFmpeg Extraction
```typescript
interface ExtractionConfig {
  inputPath: string;
  outputPath: string;
  startTime: number;
  endTime: number;
  // Quality settings
  videoCodec: 'libx264' | 'libx265' | 'copy';
  audioCodec: 'aac' | 'copy';
  videoBitrate: '8M' | '12M' | '20M';
  audioBitrate: '192k' | '256k' | '320k';
  // Processing
  deinterlace: boolean;
  denoise: boolean;
  stabilize: boolean;
}
```

**FFmpeg Command Template:**
```bash
ffmpeg -ss {startTime} -i {input} -t {duration} \
  -c:v libx264 -preset slow -crf 18 \
  -c:a aac -b:a 256k \
  -movflags +faststart \
  -y {output}
```

#### 4.4.2 Smart Boundary Adjustment
```typescript
interface BoundaryAdjustment {
  // Avoid cutting mid-word
  snapToSilence: boolean;
  silenceThreshold: -30;      // dB
  maxAdjustment: 0.5;         // Max 500ms adjustment

  // Avoid cutting mid-action
  sceneDetection: boolean;
  sceneThreshold: 0.3;        // Scene change threshold

  // Fade handling
  fadeIn: 0.3;                // 300ms fade in
  fadeOut: 0.5;               // 500ms fade out
}
```

---

### 4.5 Stream Aesthetic Analysis

**CRITICAL REQUIREMENT:** Graphics must be derived from the stream itself, not pre-made templates.

#### 4.5.1 Visual Analysis Pipeline
```
Extracted Clip
    │
    ▼
┌─────────────────────────────────────────────────┐
│  FRAME SAMPLING                                 │
│  ├─ Extract 1 frame per second                  │
│  ├─ Additional frames at scene changes          │
│  └─ Key moment frames (start, peak, end)        │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│  COLOR ANALYSIS                                 │
│  ├─ Dominant color extraction (k-means, k=5)    │
│  ├─ Color harmony detection                     │
│  ├─ Background vs foreground separation         │
│  └─ Accent color identification                 │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│  TYPOGRAPHY DETECTION                           │
│  ├─ OCR on UI elements                          │
│  ├─ Font style classification                   │
│  │   └─ Monospace / Sans / Serif / Display      │
│  ├─ Text size ratios                            │
│  └─ Text color patterns                         │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│  MOTION ANALYSIS                                │
│  ├─ Optical flow calculation                    │
│  ├─ Motion intensity over time                  │
│  ├─ Peak action moments                         │
│  └─ Camera movement patterns                    │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│  AUDIO ENERGY ANALYSIS                          │
│  ├─ Volume envelope                             │
│  ├─ Voice excitement detection                  │
│  ├─ Peak moments (cheers, reactions)            │
│  └─ Music presence detection                    │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│  CONTENT TYPE CLASSIFICATION                    │
│  ├─ Coding stream (IDE, terminal)               │
│  ├─ Gaming stream (game UI patterns)            │
│  ├─ Just chatting (face cam dominant)           │
│  ├─ Tutorial (slides, diagrams)                 │
│  └─ Mixed/Other                                 │
└─────────────────────────────────────────────────┘
```

#### 4.5.2 Aesthetic Profile
```typescript
interface StreamAesthetic {
  // Color palette
  colors: {
    primary: string;          // Dominant color (hex)
    secondary: string;        // Second most common
    accent: string;           // High-contrast accent
    background: string;       // Background color
    text: string;             // Text color
    gradient?: [string, string]; // Detected gradient
  };

  // Typography
  typography: {
    detected: 'monospace' | 'sans-serif' | 'serif' | 'display';
    suggestedFont: string;    // Closest Google Font
    headingSize: number;      // Relative scale
    bodySize: number;
    textShadow: boolean;      // Uses text shadows?
  };

  // Visual style
  style: {
    category: 'coding' | 'gaming' | 'chatting' | 'tutorial' | 'mixed';
    aesthetic: 'minimal' | 'cyberpunk' | 'retro' | 'corporate' | 'organic';
    hasOverlays: boolean;     // Stream has overlays
    hasFacecam: boolean;      // Face camera present
    facecamPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  };

  // Motion
  motion: {
    averageIntensity: number; // 0-1
    peakMoments: number[];    // Timestamps of high motion
    suggestedPacing: 'slow' | 'medium' | 'fast';
  };

  // Audio
  audio: {
    hasMusic: boolean;
    musicGenre?: string;
    voiceExcitement: number;  // 0-1
    peakMoments: number[];    // Timestamps of audio peaks
  };

  // Key frames for graphics
  keyFrames: {
    timestamp: number;
    imagePath: string;
    useCase: 'intro' | 'peak' | 'outro' | 'background';
  }[];
}
```

#### 4.5.3 Claude Vision Analysis
For complex aesthetic decisions, send key frames to Claude Vision:

```typescript
const AESTHETIC_ANALYSIS_PROMPT = `
Analyze these frames from a livestream to determine the visual aesthetic.

The frames are from a clip where: "{clipDescription}"

For each frame, identify:
1. Color palette (primary, secondary, accent colors as hex)
2. Visual style (minimal, cyberpunk, retro, corporate, organic)
3. Content type (coding, gaming, chatting, tutorial)
4. Mood/energy (calm, focused, excited, chaotic)
5. Key visual elements that should be preserved/referenced in graphics

Then provide an overall aesthetic profile for generating graphics that match this stream's vibe.

Return JSON with the StreamAesthetic interface structure.
`;
```

---

### 4.6 Graphics Generation (Remotion)

#### 4.6.1 Graphics Philosophy
**RULE:** Every graphic element must be derived from or inspired by the source stream.

| Element | Derivation Method |
|---------|-------------------|
| Colors | Extracted from stream palette |
| Fonts | Match detected typography or closest Google Font |
| Motion | Match stream's energy/pacing |
| Shapes | Inspired by stream UI elements |
| Text | Generated captions + suggested title |

#### 4.6.2 Remotion Composition Structure
```typescript
// clipper/src/graphics/Composition.tsx

interface ClipCompositionProps {
  clipPath: string;           // Path to extracted clip
  aesthetic: StreamAesthetic; // Analyzed aesthetic
  transcript: TranscriptSegment[]; // For captions
  metadata: {
    title: string;
    caption: string;
    duration: number;
  };
  format: OutputFormat;
}

const ClipComposition: React.FC<ClipCompositionProps> = ({
  clipPath,
  aesthetic,
  transcript,
  metadata,
  format
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: aesthetic.colors.background }}>
      {/* Layer 1: Video */}
      <VideoLayer
        src={clipPath}
        format={format}
        facecamPosition={aesthetic.style.facecamPosition}
      />

      {/* Layer 2: Auto Captions */}
      <CaptionLayer
        transcript={transcript}
        colors={aesthetic.colors}
        typography={aesthetic.typography}
      />

      {/* Layer 3: Title Card (first 2 seconds) */}
      <Sequence from={0} durationInFrames={60}>
        <TitleCard
          title={metadata.title}
          aesthetic={aesthetic}
        />
      </Sequence>

      {/* Layer 4: Energy Accents (on audio peaks) */}
      <EnergyAccents
        peakMoments={aesthetic.audio.peakMoments}
        colors={aesthetic.colors}
        intensity={aesthetic.motion.averageIntensity}
      />

      {/* Layer 5: Outro Card (last 2 seconds) */}
      <Sequence from={metadata.duration * 30 - 60}>
        <OutroCard aesthetic={aesthetic} />
      </Sequence>
    </AbsoluteFill>
  );
};
```

#### 4.6.3 Video Layer with Smart Cropping
```typescript
interface VideoLayerProps {
  src: string;
  format: OutputFormat;
  facecamPosition?: string;
}

const VideoLayer: React.FC<VideoLayerProps> = ({ src, format, facecamPosition }) => {
  const { width, height } = format;
  const video = useVideoConfig();

  // Smart cropping logic
  const cropStrategy = useMemo(() => {
    if (format.aspectRatio === '9:16') {
      // Vertical format
      if (facecamPosition) {
        // Keep facecam in frame, crop around it
        return calculateFacecamCrop(facecamPosition, video);
      } else {
        // Center crop with slight zoom
        return { scale: 1.5, x: 'center', y: 'center' };
      }
    } else if (format.aspectRatio === '1:1') {
      // Square - center crop
      return { scale: 1.2, x: 'center', y: 'center' };
    } else {
      // 16:9 - no crop needed
      return { scale: 1.0, x: 'center', y: 'center' };
    }
  }, [format, facecamPosition]);

  return (
    <AbsoluteFill>
      <OffthreadVideo
        src={src}
        style={{
          transform: `scale(${cropStrategy.scale})`,
          objectFit: 'cover',
          objectPosition: `${cropStrategy.x} ${cropStrategy.y}`
        }}
      />
    </AbsoluteFill>
  );
};
```

#### 4.6.4 Auto Caption Layer
```typescript
interface CaptionLayerProps {
  transcript: TranscriptSegment[];
  colors: StreamAesthetic['colors'];
  typography: StreamAesthetic['typography'];
}

const CaptionLayer: React.FC<CaptionLayerProps> = ({
  transcript,
  colors,
  typography
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  // Find current word
  const currentSegment = transcript.find(
    s => currentTime >= s.startTime && currentTime <= s.endTime
  );

  if (!currentSegment) return null;

  // Word-by-word highlight
  const currentWord = currentSegment.words.find(
    w => currentTime >= w.start && currentTime <= w.end
  );

  return (
    <div style={{
      position: 'absolute',
      bottom: '15%',
      left: '5%',
      right: '5%',
      textAlign: 'center',
      fontFamily: typography.suggestedFont,
      fontSize: typography.bodySize * 1.5,
      color: colors.text,
      textShadow: `2px 2px 4px ${colors.background}`,
    }}>
      {currentSegment.words.map((word, i) => (
        <span
          key={i}
          style={{
            color: word === currentWord ? colors.accent : colors.text,
            fontWeight: word === currentWord ? 'bold' : 'normal',
            transition: 'all 0.1s ease',
          }}
        >
          {word.word}{' '}
        </span>
      ))}
    </div>
  );
};
```

#### 4.6.5 Energy Accents
Visual flourishes that sync with audio peaks:

```typescript
interface EnergyAccentsProps {
  peakMoments: number[];
  colors: StreamAesthetic['colors'];
  intensity: number;
}

const EnergyAccents: React.FC<EnergyAccentsProps> = ({
  peakMoments,
  colors,
  intensity
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  // Check if we're near a peak moment
  const nearPeak = peakMoments.some(
    peak => Math.abs(currentTime - peak) < 0.5
  );

  if (!nearPeak) return null;

  // Generate accent based on stream aesthetic
  return (
    <>
      {/* Screen flash */}
      <AbsoluteFill
        style={{
          backgroundColor: colors.accent,
          opacity: interpolate(
            frame % 15,
            [0, 7, 15],
            [0.3, 0, 0]
          ),
          mixBlendMode: 'overlay',
        }}
      />

      {/* Edge glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          boxShadow: `inset 0 0 ${50 * intensity}px ${colors.accent}`,
          pointerEvents: 'none',
        }}
      />

      {/* Particles burst */}
      <ParticleBurst
        color={colors.accent}
        count={Math.floor(20 * intensity)}
        spread={100}
      />
    </>
  );
};
```

#### 4.6.6 Title Card
```typescript
const TitleCard: React.FC<{ title: string; aesthetic: StreamAesthetic }> = ({
  title,
  aesthetic
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animate in from 0-30 frames, hold, animate out 45-60 frames
  const opacity = interpolate(
    frame,
    [0, 15, 45, 60],
    [0, 1, 1, 0],
    { extrapolateRight: 'clamp' }
  );

  const scale = interpolate(
    frame,
    [0, 15],
    [0.8, 1],
    { extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      {/* Background blur/dim */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: aesthetic.colors.background,
          opacity: 0.7,
        }}
      />

      {/* Title text */}
      <h1
        style={{
          fontFamily: aesthetic.typography.suggestedFont,
          fontSize: aesthetic.typography.headingSize * 2,
          color: aesthetic.colors.text,
          textAlign: 'center',
          padding: '0 10%',
          textShadow: `0 0 20px ${aesthetic.colors.accent}`,
          zIndex: 1,
        }}
      >
        {title}
      </h1>

      {/* Accent line */}
      <div
        style={{
          width: interpolate(frame, [0, 30], [0, 200]),
          height: 4,
          backgroundColor: aesthetic.colors.accent,
          marginTop: 20,
          zIndex: 1,
        }}
      />
    </AbsoluteFill>
  );
};
```

---

### 4.7 Output Formats

#### 4.7.1 Format Specifications
```typescript
type AspectRatio = '9:16' | '16:9' | '1:1';

interface OutputFormat {
  name: string;
  aspectRatio: AspectRatio;
  width: number;
  height: number;
  maxDuration: number;        // Seconds
  fps: 30 | 60;
  codec: 'h264' | 'h265';
  container: 'mp4' | 'mov';
  audioBitrate: '128k' | '192k' | '256k';
  videoBitrate: '8M' | '12M' | '20M';
}

const FORMATS: Record<string, OutputFormat> = {
  'vertical': {
    name: 'Vertical (9:16)',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    maxDuration: 180,         // 3 min max for most platforms
    fps: 30,
    codec: 'h264',
    container: 'mp4',
    audioBitrate: '192k',
    videoBitrate: '12M',
  },
  'horizontal': {
    name: 'Horizontal (16:9)',
    aspectRatio: '16:9',
    width: 1920,
    height: 1080,
    maxDuration: 600,         // 10 min
    fps: 30,
    codec: 'h264',
    container: 'mp4',
    audioBitrate: '192k',
    videoBitrate: '12M',
  },
  'square': {
    name: 'Square (1:1)',
    aspectRatio: '1:1',
    width: 1080,
    height: 1080,
    maxDuration: 180,
    fps: 30,
    codec: 'h264',
    container: 'mp4',
    audioBitrate: '192k',
    videoBitrate: '12M',
  },
};
```

#### 4.7.2 Platform-Specific Constraints
| Platform | Max Duration | Aspect Ratio | Max File Size | Notes |
|----------|--------------|--------------|---------------|-------|
| YouTube Shorts | 60s | 9:16 | 256MB | Must be ≤60s for Shorts |
| TikTok | 180s | 9:16 | 287MB | 3min max |
| Instagram Reels | 90s | 9:16 | 650MB | 90s max |
| Twitter | 140s | Any | 512MB | 2:20 max |
| Standard YouTube | 12hr | 16:9 | 256GB | Regular upload |

#### 4.7.3 Format Selection Logic
```typescript
function selectFormat(
  clipDuration: number,
  userPreference?: AspectRatio,
  targetPlatforms: string[]
): OutputFormat {
  // User override
  if (userPreference) {
    return FORMATS[userPreference];
  }

  // If posting to Shorts/Reels/TikTok → vertical
  const shortFormPlatforms = ['youtube_shorts', 'tiktok', 'instagram'];
  if (targetPlatforms.some(p => shortFormPlatforms.includes(p))) {
    return FORMATS['vertical'];
  }

  // If only posting to YouTube (regular) → keep original
  if (targetPlatforms.length === 1 && targetPlatforms[0] === 'youtube') {
    return FORMATS['horizontal'];
  }

  // Default: vertical (works everywhere)
  return FORMATS['vertical'];
}
```

---

### 4.8 Platform Distribution

#### 4.8.1 Supported Platforms (Phase 1)
| Platform | API | Auth Method | Capabilities |
|----------|-----|-------------|--------------|
| Twitter/X | v2 + v1.1 | OAuth 1.0a | Video upload, tweet |
| YouTube | Data API v3 | OAuth 2.0 | Shorts upload, metadata |

#### 4.8.2 Twitter Integration
**Already implemented in existing codebase** (`worker/src/twitter.ts`)

```typescript
interface TwitterPostConfig {
  videoPath: string;
  text: string;
  replyTo?: string;           // Tweet ID to reply to
  quoteTweet?: string;        // Tweet ID to quote
}

async function postToTwitter(config: TwitterPostConfig): Promise<{
  tweetId: string;
  url: string;
}> {
  // 1. Upload video via chunked media upload (v1.1)
  const mediaId = await uploadVideo(config.videoPath);

  // 2. Wait for processing
  await waitForProcessing(mediaId);

  // 3. Post tweet with media (v2)
  const tweet = await postTweet({
    text: config.text,
    media: { media_ids: [mediaId] },
    reply: config.replyTo ? { in_reply_to_tweet_id: config.replyTo } : undefined,
  });

  return {
    tweetId: tweet.data.id,
    url: `https://twitter.com/i/status/${tweet.data.id}`,
  };
}
```

#### 4.8.3 YouTube Integration
```typescript
interface YouTubeUploadConfig {
  videoPath: string;
  title: string;
  description: string;
  tags: string[];
  categoryId: string;         // "22" for People & Blogs
  privacyStatus: 'public' | 'unlisted' | 'private';
  madeForKids: boolean;
  shorts: boolean;            // Mark as Shorts
}

async function uploadToYouTube(config: YouTubeUploadConfig): Promise<{
  videoId: string;
  url: string;
}> {
  const oauth2Client = await getYouTubeAuth();
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  // Upload video
  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: config.title,
        description: config.description,
        tags: config.tags,
        categoryId: config.categoryId,
      },
      status: {
        privacyStatus: config.privacyStatus,
        selfDeclaredMadeForKids: config.madeForKids,
      },
    },
    media: {
      body: fs.createReadStream(config.videoPath),
    },
  });

  const videoId = response.data.id!;

  // For Shorts, the URL format is different
  const url = config.shorts
    ? `https://youtube.com/shorts/${videoId}`
    : `https://youtube.com/watch?v=${videoId}`;

  return { videoId, url };
}
```

#### 4.8.4 Platform Posting Flow
```
Rendered Clip
    │
    ▼
┌─────────────────────────────────────────────────┐
│  POST ORCHESTRATOR                              │
│  ├─ Generate platform-specific text             │
│  ├─ Parallel upload to all platforms            │
│  └─ Collect results and URLs                    │
└─────────────────────────────────────────────────┘
    │
    ├─────────────────┬─────────────────┐
    ▼                 ▼                 ▼
┌─────────┐    ┌─────────────┐    ┌─────────────┐
│ Twitter │    │   YouTube   │    │  (Phase 2)  │
│         │    │   Shorts    │    │ TikTok, IG  │
└─────────┘    └─────────────┘    └─────────────┘
    │                 │                 │
    ▼                 ▼                 ▼
┌─────────────────────────────────────────────────┐
│  RESULT AGGREGATION                             │
│  {                                              │
│    twitter: { url: "...", id: "..." },          │
│    youtube: { url: "...", id: "..." },          │
│  }                                              │
└─────────────────────────────────────────────────┘
```

---

### 4.9 Storage & Caching

#### 4.9.1 Storage Structure
```
clipper-data/
├── downloads/                # Downloaded source videos
│   └── {videoId}/
│       ├── source.mp4
│       └── metadata.json
├── transcripts/              # Cached transcriptions
│   └── {videoId}/
│       ├── transcript.json
│       ├── segments.json
│       └── embeddings.bin
├── clips/                    # Extracted raw clips
│   └── {clipId}/
│       ├── raw.mp4
│       ├── aesthetic.json
│       └── keyframes/
├── renders/                  # Final rendered outputs
│   └── {clipId}/
│       ├── vertical.mp4
│       ├── horizontal.mp4
│       └── square.mp4
└── posts/                    # Post records
    └── {clipId}/
        └── posts.json
```

#### 4.9.2 Caching Strategy
```typescript
interface CachePolicy {
  downloads: {
    ttl: '7d';                // Keep downloads for 7 days
    maxSize: '100GB';         // Max total size
    eviction: 'lru';          // Least recently used
  };
  transcripts: {
    ttl: '30d';               // Keep transcripts for 30 days
    maxSize: '10GB';
  };
  clips: {
    ttl: '24h';               // Keep raw clips for 24 hours
    maxSize: '50GB';
  };
  renders: {
    ttl: '7d';                // Keep renders for 7 days
    maxSize: '100GB';
  };
}
```

#### 4.9.3 Index Reuse
When clipping multiple moments from the same video:
1. Check if transcript exists in cache
2. If yes, skip download + transcription (saves 80% of time)
3. Go directly to moment detection

```typescript
async function getOrCreateIndex(videoUrl: string): Promise<VideoIndex> {
  const videoId = hashUrl(videoUrl);
  const cachePath = `clipper-data/transcripts/${videoId}`;

  // Check cache
  if (await exists(cachePath)) {
    const age = await getAge(cachePath);
    if (age < CACHE_TTL) {
      return loadIndex(cachePath);
    }
  }

  // Create new index
  const videoPath = await downloadVideo(videoUrl);
  const transcript = await transcribeVideo(videoPath);
  const index = await createIndex(transcript);

  // Cache it
  await saveIndex(cachePath, index);

  return index;
}
```

---

## 5. Technical Architecture

### 5.1 System Overview
```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIPPER BOT                                   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  CLI / API INTERFACE                                                    │
│  ├─ clipper clip "description" --url <url>                              │
│  ├─ clipper index <url>                                                 │
│  ├─ clipper search <query> --index <indexId>                            │
│  └─ POST /api/clip { url, query, platforms }                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  ORCHESTRATOR                                                           │
│  ├─ Job queue management                                                │
│  ├─ Pipeline coordination                                               │
│  ├─ Progress tracking                                                   │
│  └─ Error handling + retries                                            │
└─────────────────────────────────────────────────────────────────────────┘
         │              │              │              │              │
         ▼              ▼              ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  ACQUIRE    │ │ TRANSCRIBE  │ │   DETECT    │ │   RENDER    │ │    POST     │
│             │ │             │ │             │ │             │ │             │
│  yt-dlp     │ │  Whisper    │ │  Embeddings │ │  Remotion   │ │  Twitter    │
│  ffmpeg     │ │  OpenAI     │ │  Claude     │ │  FFmpeg     │ │  YouTube    │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
         │              │              │              │              │
         └──────────────┴──────────────┴──────────────┴──────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STORAGE                                                                │
│  ├─ Local filesystem (downloads, clips, renders)                        │
│  ├─ SQLite (job state, post history)                                    │
│  └─ Vector DB (transcript embeddings) - SQLite + sqlite-vss             │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Directory Structure
```
clipper/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── api.ts                # HTTP API server (optional)
│   ├── orchestrator.ts       # Pipeline orchestration
│   │
│   ├── acquire/
│   │   ├── index.ts          # Video acquisition orchestrator
│   │   ├── ytdlp.ts          # yt-dlp wrapper
│   │   ├── platforms.ts      # Platform-specific handlers
│   │   └── chunked.ts        # Chunked download for long videos
│   │
│   ├── transcribe/
│   │   ├── index.ts          # Transcription orchestrator
│   │   ├── whisper.ts        # Whisper integration
│   │   ├── chunker.ts        # Segment chunking logic
│   │   └── embeddings.ts     # Embedding generation
│   │
│   ├── detect/
│   │   ├── index.ts          # Detection orchestrator
│   │   ├── search.ts         # Semantic search
│   │   ├── ranking.ts        # Claude ranking
│   │   └── visual.ts         # Visual verification (optional)
│   │
│   ├── extract/
│   │   ├── index.ts          # Extraction orchestrator
│   │   ├── ffmpeg.ts         # FFmpeg wrapper
│   │   └── boundaries.ts     # Smart boundary adjustment
│   │
│   ├── aesthetic/
│   │   ├── index.ts          # Aesthetic analysis orchestrator
│   │   ├── colors.ts         # Color extraction
│   │   ├── typography.ts     # Font detection
│   │   ├── motion.ts         # Motion analysis
│   │   ├── audio.ts          # Audio energy analysis
│   │   └── vision.ts         # Claude Vision integration
│   │
│   ├── render/
│   │   ├── index.ts          # Render orchestrator
│   │   ├── composition.tsx   # Main Remotion composition
│   │   ├── layers/
│   │   │   ├── VideoLayer.tsx
│   │   │   ├── CaptionLayer.tsx
│   │   │   ├── TitleCard.tsx
│   │   │   ├── OutroCard.tsx
│   │   │   └── EnergyAccents.tsx
│   │   └── formats.ts        # Output format configs
│   │
│   ├── post/
│   │   ├── index.ts          # Post orchestrator
│   │   ├── twitter.ts        # Twitter API
│   │   ├── youtube.ts        # YouTube API
│   │   └── captions.ts       # Platform-specific text generation
│   │
│   ├── storage/
│   │   ├── index.ts          # Storage manager
│   │   ├── cache.ts          # Cache management
│   │   └── db.ts             # SQLite database
│   │
│   └── utils/
│       ├── logger.ts         # Logging
│       ├── progress.ts       # Progress reporting
│       └── errors.ts         # Error types
│
├── remotion/
│   ├── remotion.config.ts    # Remotion configuration
│   ├── Root.tsx              # Remotion entry point
│   └── package.json          # Remotion dependencies
│
├── data/                     # Local data storage
│   ├── downloads/
│   ├── transcripts/
│   ├── clips/
│   ├── renders/
│   └── clipper.db            # SQLite database
│
├── package.json
├── tsconfig.json
└── README.md
```

### 5.3 Dependencies
```json
{
  "dependencies": {
    // Core
    "commander": "^12.0.0",           // CLI framework
    "zod": "^3.23.0",                  // Schema validation
    "winston": "^3.13.0",              // Logging

    // Video processing
    "fluent-ffmpeg": "^2.1.3",         // FFmpeg wrapper

    // AI/ML
    "@anthropic-ai/sdk": "^0.27.0",    // Claude API
    "openai": "^4.58.0",               // Embeddings + Whisper

    // Database
    "better-sqlite3": "^11.3.0",       // SQLite
    "sqlite-vss": "^0.1.0",            // Vector search extension

    // Platform APIs
    "googleapis": "^140.0.0",          // YouTube API
    "twitter-api-v2": "^1.17.0",       // Twitter API

    // Remotion
    "@remotion/cli": "^4.0.0",
    "@remotion/renderer": "^4.0.0",
    "remotion": "^4.0.0",
    "react": "^18.3.0",

    // Utilities
    "ora": "^8.0.0",                   // Spinners
    "chalk": "^5.3.0",                 // Colors
    "p-queue": "^8.0.0",               // Queue management
    "got": "^14.4.0",                  // HTTP client
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/fluent-ffmpeg": "^2.1.25",
    "typescript": "^5.6.0",
    "tsx": "^4.19.0",
    "vitest": "^2.1.0"
  }
}
```

### 5.4 External Dependencies (System)
```bash
# Required system installations
brew install ffmpeg          # Video processing
brew install yt-dlp          # Video downloading

# Whisper options:
# Option A: OpenAI API (recommended for simplicity)
# Option B: Local whisper.cpp (faster, no API costs)
brew install whisper-cpp     # Local Whisper (optional)
```

---

## 6. User Interface

### 6.1 CLI Interface
```bash
# Primary command: clip a moment
clipper clip "when we first deployed the 2D game" \
  --url "https://twitter.com/i/broadcasts/123" \
  --format vertical \
  --post twitter,youtube \
  --title "First Deploy!" \
  --duration 60

# Index a video for multiple clips
clipper index "https://youtube.com/watch?v=abc123"
# Returns: Index ID: idx_abc123

# Search without clipping
clipper search "deployment moment" --index idx_abc123

# List cached indexes
clipper list

# Interactive mode
clipper interactive

# Status check
clipper status <jobId>

# Re-post existing clip
clipper repost <clipId> --platforms tiktok,instagram
```

### 6.2 CLI Output Example
```
$ clipper clip "when we first deployed the 2D game" \
    --url "https://twitter.com/i/broadcasts/1yNGaYvPqVzJj"

╭─────────────────────────────────────────────────────────────╮
│  CLIPPER BOT v1.0                                           │
│  "Describe the moment, get the clip, post everywhere."      │
╰─────────────────────────────────────────────────────────────╯

[1/6] Acquiring video...
      Source: Twitter Broadcast
      Duration: 2h 34m 12s
      ✓ Downloaded (1.2GB)

[2/6] Transcribing...
      Model: whisper-large-v3
      ████████████████████████████████████████ 100%
      ✓ 5,080 segments indexed

[3/6] Detecting moment...
      Query: "when we first deployed the 2D game"
      Searching 5,080 segments...

      Found 3 candidates:
      ┌────┬──────────────┬────────────┬─────────────────────────────────┐
      │ #  │ Timestamp    │ Confidence │ Preview                         │
      ├────┼──────────────┼────────────┼─────────────────────────────────┤
      │ 1  │ 1:23:45      │ 94%        │ "...npm run deploy and it's..." │
      │ 2  │ 1:45:12      │ 71%        │ "...deploy the second time..."  │
      │ 3  │ 2:01:33      │ 43%        │ "...deploying again after..."   │
      └────┴──────────────┴────────────┴─────────────────────────────────┘

      ✓ Selected #1 (1:23:45 - 1:24:52, 67s)

[4/6] Analyzing aesthetic...
      ┌─────────────────────────────────────────────────────────┐
      │  Colors: ██ #1a1a2e  ██ #da7756  ██ #00ff88             │
      │  Style:  Coding stream, cyberpunk aesthetic             │
      │  Font:   JetBrains Mono (detected)                      │
      │  Energy: High (voice excitement: 0.87)                  │
      └─────────────────────────────────────────────────────────┘

[5/6] Rendering...
      Format: 9:16 vertical (1080x1920)
      ████████████████████████████████████████ 100%
      ✓ Rendered (45MB)

[6/6] Posting...
      Twitter: ████████████████████████████████████████ 100%
               ✓ https://twitter.com/ClaudeCodeWTF/status/123456

      YouTube: ████████████████████████████████████████ 100%
               ✓ https://youtube.com/shorts/abc123

╭─────────────────────────────────────────────────────────────╮
│  ✓ COMPLETE                                                 │
│                                                             │
│  Clip: First Deploy!                                        │
│  Duration: 67 seconds                                       │
│  Posted to: Twitter, YouTube Shorts                         │
│  Total time: 4m 32s                                         │
│                                                             │
│  Twitter:  https://twitter.com/ClaudeCodeWTF/status/123456  │
│  YouTube:  https://youtube.com/shorts/abc123                │
╰─────────────────────────────────────────────────────────────╯
```

### 6.3 Interactive Mode
```
$ clipper interactive

╭─────────────────────────────────────────────────────────────╮
│  CLIPPER BOT - Interactive Mode                             │
╰─────────────────────────────────────────────────────────────╯

Enter video URL: https://twitter.com/i/broadcasts/1yNGaYvPqVzJj

Indexing video... ████████████████████████████████████████ Done!
Ready. Describe moments to clip.

> clip when we first deployed the 2D game

Searching... Found match at 1:23:45 (94% confidence)
Preview transcript:
  "...okay here we go, npm run deploy... and... YES! It's live!
   Look at that, we actually did it! Let me refresh... oh my god
   it actually works!"

? Accept this clip? (Y/n) y
? Clip duration? (67s)
? Output format? (Use arrow keys)
❯ Vertical (9:16) - YouTube Shorts, TikTok, Reels
  Horizontal (16:9) - YouTube, Twitter
  Square (1:1) - Instagram Feed

? Post to which platforms? (Press space to select)
❯ ◉ Twitter
  ◉ YouTube Shorts
  ◯ TikTok (coming soon)
  ◯ Instagram (coming soon)

? Custom title? (First Deploy!)

Rendering... ████████████████████████████████████████ Done!
Posting... Done!

✓ Posted to Twitter: https://twitter.com/...
✓ Posted to YouTube: https://youtube.com/shorts/...

> clip another moment from the same stream
> ...
```

---

## 7. API Design (Optional HTTP Interface)

### 7.1 Endpoints
```typescript
// POST /api/clip - Create a new clip
interface CreateClipRequest {
  url: string;                // Video URL
  query: string;              // Natural language description
  format?: '9:16' | '16:9' | '1:1';
  maxDuration?: number;       // Max clip duration in seconds
  platforms?: ('twitter' | 'youtube')[];
  title?: string;             // Override auto-generated title
  caption?: string;           // Override auto-generated caption
  dryRun?: boolean;           // Don't actually post
}

interface CreateClipResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  estimatedTime?: number;     // Seconds
}

// GET /api/clip/:jobId - Get clip status
interface ClipStatus {
  jobId: string;
  status: 'queued' | 'downloading' | 'transcribing' | 'detecting' |
          'extracting' | 'analyzing' | 'rendering' | 'posting' |
          'completed' | 'failed';
  progress: number;           // 0-100
  currentStep?: string;
  result?: {
    clipPath: string;
    posts: {
      platform: string;
      url: string;
      id: string;
    }[];
  };
  error?: string;
}

// GET /api/index/:videoId - Get cached index info
// DELETE /api/index/:videoId - Remove cached index
// GET /api/clips - List recent clips
```

### 7.2 WebSocket for Real-Time Progress
```typescript
// Connect: ws://localhost:3002/ws/clip/:jobId

interface ProgressMessage {
  type: 'progress';
  jobId: string;
  step: string;
  progress: number;
  message: string;
}

interface CompleteMessage {
  type: 'complete';
  jobId: string;
  result: ClipStatus['result'];
}

interface ErrorMessage {
  type: 'error';
  jobId: string;
  error: string;
}
```

---

## 8. Database Schema

```sql
-- Jobs table
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,       -- queued, processing, completed, failed
  source_url TEXT NOT NULL,
  query TEXT NOT NULL,
  format TEXT DEFAULT '9:16',
  platforms TEXT,             -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  error TEXT,
  result TEXT                 -- JSON result
);

-- Video indexes (cached transcriptions)
CREATE TABLE video_indexes (
  id TEXT PRIMARY KEY,
  source_url TEXT NOT NULL UNIQUE,
  duration INTEGER NOT NULL,
  segment_count INTEGER NOT NULL,
  transcript_path TEXT NOT NULL,
  embeddings_path TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
  file_size INTEGER
);

-- Clips
CREATE TABLE clips (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES jobs(id),
  video_index_id TEXT REFERENCES video_indexes(id),
  start_time REAL NOT NULL,
  end_time REAL NOT NULL,
  duration REAL NOT NULL,
  title TEXT,
  caption TEXT,
  aesthetic TEXT,             -- JSON aesthetic profile
  raw_path TEXT,
  render_paths TEXT,          -- JSON map of format -> path
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Posts
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  clip_id TEXT REFERENCES clips(id),
  platform TEXT NOT NULL,
  platform_id TEXT,           -- Twitter tweet ID, YouTube video ID
  url TEXT,
  posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending'
);

-- Vector search extension table
CREATE VIRTUAL TABLE segment_embeddings USING vss0(
  embedding(1536)
);

CREATE TABLE segments (
  id INTEGER PRIMARY KEY,
  video_index_id TEXT REFERENCES video_indexes(id),
  segment_index INTEGER,
  start_time REAL,
  end_time REAL,
  text TEXT,
  embedding_rowid INTEGER
);
```

---

## 9. Error Handling

### 9.1 Error Categories
```typescript
enum ErrorCategory {
  ACQUISITION = 'acquisition',
  TRANSCRIPTION = 'transcription',
  DETECTION = 'detection',
  EXTRACTION = 'extraction',
  RENDERING = 'rendering',
  POSTING = 'posting',
  AUTHENTICATION = 'authentication',
  RATE_LIMIT = 'rate_limit',
  QUOTA = 'quota',
}

interface ClipperError {
  category: ErrorCategory;
  code: string;
  message: string;
  retryable: boolean;
  retryAfter?: number;        // Seconds
  details?: Record<string, unknown>;
}
```

### 9.2 Retry Strategy
```typescript
const RETRY_CONFIG: Record<ErrorCategory, RetryConfig> = {
  [ErrorCategory.ACQUISITION]: {
    maxRetries: 3,
    backoff: 'exponential',
    initialDelay: 5000,
    maxDelay: 60000,
  },
  [ErrorCategory.TRANSCRIPTION]: {
    maxRetries: 2,
    backoff: 'linear',
    initialDelay: 10000,
    maxDelay: 30000,
  },
  [ErrorCategory.POSTING]: {
    maxRetries: 3,
    backoff: 'exponential',
    initialDelay: 5000,
    maxDelay: 300000,         // 5 min max for rate limits
  },
  // ... etc
};
```

### 9.3 Common Errors & Solutions
| Error | Cause | Solution |
|-------|-------|----------|
| `ACQUISITION_PRIVATE` | Video is private | Request auth cookies |
| `ACQUISITION_UNAVAILABLE` | Video deleted/unavailable | Fail with message |
| `TRANSCRIPTION_TOO_LONG` | Video > 24hr | Use chunked processing |
| `DETECTION_NO_MATCH` | Query doesn't match content | Suggest alternatives |
| `POSTING_RATE_LIMIT` | Platform rate limit | Wait and retry |
| `POSTING_AUTH_EXPIRED` | OAuth token expired | Refresh token |

---

## 10. Security Considerations

### 10.1 API Key Storage
```typescript
// Required environment variables
interface RequiredEnv {
  // AI APIs
  ANTHROPIC_API_KEY: string;  // Claude
  OPENAI_API_KEY: string;     // Whisper + Embeddings

  // Platform APIs
  TWITTER_API_KEY: string;
  TWITTER_API_SECRET: string;
  TWITTER_ACCESS_TOKEN: string;
  TWITTER_ACCESS_SECRET: string;

  YOUTUBE_CLIENT_ID: string;
  YOUTUBE_CLIENT_SECRET: string;
  YOUTUBE_REFRESH_TOKEN: string;
}
```

### 10.2 Content Validation
- Validate video URLs against allowlist of platforms
- Scan downloaded content for malware (optional)
- Rate limit API endpoints
- Validate clip duration limits

### 10.3 Storage Security
- Don't store credentials in database
- Encrypt sensitive fields if needed
- Auto-expire old files per cache policy
- Sanitize filenames from user input

---

## 11. Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Index creation (1hr video) | < 15 min | Whisper large-v3 |
| Index creation (4hr video) | < 45 min | Parallel chunking |
| Moment detection | < 30 sec | Semantic search + Claude |
| Clip extraction | < 10 sec | FFmpeg, SSD storage |
| Aesthetic analysis | < 20 sec | Local + Claude Vision |
| Rendering (60s clip) | < 2 min | Remotion |
| Total (cached index) | < 5 min | Detection → Post |
| Total (new video, 1hr) | < 20 min | Full pipeline |

---

## 12. Cost Estimates

### 12.1 Per-Clip Costs (1hr source video)
| Service | Usage | Cost |
|---------|-------|------|
| OpenAI Whisper | 60 min audio | $0.36 |
| OpenAI Embeddings | ~120 segments | $0.01 |
| Claude Opus | ~2K tokens | $0.10 |
| Claude Vision (optional) | 5 images | $0.05 |
| **Total per clip** | | **~$0.52** |

### 12.2 Cached Index Reuse
| Service | Usage | Cost |
|---------|-------|------|
| Claude Opus | ~2K tokens | $0.10 |
| **Total per additional clip** | | **~$0.10** |

### 12.3 Monthly Projections
| Volume | New Videos | Clips/Video | Monthly Cost |
|--------|------------|-------------|--------------|
| Light | 10 | 3 | $15.60 |
| Medium | 30 | 5 | $54.00 |
| Heavy | 100 | 10 | $570.00 |

---

## 13. Phase 1 Scope (MVP)

### Included
- [x] CLI interface
- [x] Twitter/X video download
- [x] YouTube video download
- [x] Whisper transcription (via OpenAI API)
- [x] Semantic search with embeddings
- [x] Claude moment detection
- [x] FFmpeg clip extraction
- [x] Basic aesthetic analysis (colors, energy)
- [x] Remotion rendering with auto-captions
- [x] 9:16 vertical format
- [x] 16:9 horizontal format
- [x] 1:1 square format
- [x] Twitter posting
- [x] YouTube Shorts posting
- [x] SQLite storage + caching
- [x] Videos up to 4 hours

### Excluded (Phase 2+)
- [ ] TikTok posting
- [ ] Instagram posting
- [ ] Videos > 4 hours (24hr support)
- [ ] Live stream clipping
- [ ] Twitch/Kick platform support
- [ ] Speaker diarization
- [ ] Web UI
- [ ] HTTP API
- [ ] Claude Vision visual verification
- [ ] Advanced motion graphics
- [ ] Batch processing queue

---

## 14. Success Metrics

### 14.1 Quality Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Moment accuracy | > 90% | User confirms correct clip |
| Aesthetic match | > 80% | Graphics feel native to stream |
| Caption accuracy | > 95% | Whisper WER |
| Post success rate | > 99% | Posts complete without error |

### 14.2 Performance Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to clip (cached) | < 5 min | End-to-end |
| Time to clip (new, 1hr) | < 20 min | End-to-end |
| Index reuse rate | > 70% | Cached vs new transcriptions |

### 14.3 Usage Metrics
| Metric | Track |
|--------|-------|
| Clips created per day | Volume |
| Unique videos indexed | Coverage |
| Platform distribution | Where clips go |
| Average clip duration | Content type |

---

## 15. Open Questions

1. **Whisper deployment:** OpenAI API vs local whisper.cpp?
   - API: Simpler, ~$0.36/hr of audio
   - Local: Faster, no cost, requires GPU

2. **Embedding model:** OpenAI vs local?
   - OpenAI: text-embedding-3-small, simple
   - Local: sentence-transformers, no cost

3. **Long video strategy:** How to handle 8-24hr streams?
   - Chunked parallel processing?
   - User provides approximate timestamp range?

4. **Multi-language support:** Priority?
   - Whisper supports 100+ languages
   - Captions in original language or translate?

5. **Facecam handling:** How smart should cropping be?
   - Always keep face visible?
   - Focus on screen content?
   - User preference?

---

## 16. Timeline Estimate

**Phase 1 MVP:** Core functionality
- Video acquisition (Twitter, YouTube)
- Transcription + indexing
- Moment detection
- Clip extraction + rendering
- Twitter + YouTube posting

**Phase 2:** Extended platforms
- TikTok, Instagram posting
- Twitch, Kick video support
- 24-hour video support

**Phase 3:** Advanced features
- Web UI
- HTTP API
- Live stream clipping
- Advanced motion graphics

---

## 17. Appendix

### A. Example Prompts for Testing
```
"clip when we first deployed the 2D game and played it"
"the moment the build finally passed after 3 hours of debugging"
"when chat went crazy about the new feature"
"the bug that took us 2 hours to find was a typo"
"celebrating hitting 1000 viewers"
"the part where I explain how the architecture works"
"when the API rate limit hit and everything broke"
"the reveal of the new UI design"
```

### B. Platform API Documentation
- Twitter: https://developer.twitter.com/en/docs
- YouTube: https://developers.google.com/youtube/v3
- TikTok: https://developers.tiktok.com/
- Instagram: https://developers.facebook.com/docs/instagram-api

### C. Related Tools
- yt-dlp: https://github.com/yt-dlp/yt-dlp
- Whisper: https://github.com/openai/whisper
- Remotion: https://remotion.dev
- FFmpeg: https://ffmpeg.org

---

*PRD Version: 1.0*
*Last Updated: 2026-01-23*
*Author: Claude + Human*
