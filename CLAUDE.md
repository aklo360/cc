# $CC - Claude Code Coin

## Current Codebase Overview

This is the `claudecode.wtf` website - a memecoin landing page for $CC with plans to add a meme generator.

### Project Structure
```
ccwtf/
├── app/
│   ├── api/
│   │   └── generate/
│   │       └── route.ts        # Gemini image generation API
│   ├── components/
│   │   ├── BuyButton.tsx       # Link to bags.fm exchange
│   │   ├── ContractAddress.tsx # Copy-to-clipboard contract display
│   │   └── Terminal.tsx        # Animated typewriter terminal Q&A
│   ├── meme/
│   │   └── page.tsx            # Meme generator page (/meme)
│   ├── apple-icon.png          # iOS app icon
│   ├── icon.png                # Favicon
│   ├── globals.css             # Tailwind + custom CSS variables
│   ├── layout.tsx              # Root layout with metadata
│   └── page.tsx                # Home page (/)
├── public/
│   ├── cc.png                  # 2D logo (SOURCE OF TRUTH for shape)
│   ├── claudecode.jpg          # 3D rendered character mascot
│   └── og.jpg                  # Open Graph social preview
├── .env                        # API keys (GEMINI_API_KEY)
├── .env.example                # Template for .env
├── CLAUDE.md                   # This file
├── package.json
├── next.config.ts              # Next.js config (server-side enabled)
├── tsconfig.json
└── postcss.config.mjs
```

### Tech Stack
- **Framework:** Next.js 16.1.4 (App Router)
- **React:** 19.2.3
- **Styling:** Tailwind CSS 4
- **Font:** JetBrains Mono (monospace)
- **Deployment:** Static export (`output: "export"`) for Vercel

### Color Palette (CSS Variables)
```css
--bg-primary: #0d0d0d       /* Main background */
--bg-secondary: #1a1a1a     /* Cards/sections */
--bg-tertiary: #262626      /* Hover states */
--text-primary: #e0e0e0     /* Main text */
--text-secondary: #a0a0a0   /* Muted text */
--claude-orange: #da7756    /* Brand accent */
--accent-green: #4ade80
--accent-blue: #60a5fa
--border-color: #333
```

### Brand Assets

| Asset | File | Purpose |
|-------|------|---------|
| **2D Logo (Source of Truth)** | `public/cc.png` | Canonical vector shape - flat, sharp edges, exact silhouette |
| **3D Character** | `public/claudecode.jpg` | Rendered 3D mascot - soft edges, ceramic material, studio lighting |
| **OG Image** | `public/og.jpg` | Social sharing preview |

#### 2D Logo Specifications (`cc.png`)
- Flat solid fill, Claude orange (`#da7756`)
- Sharp pixelated edges (no rounding)
- Space Invader arcade aesthetic
- Rectangular body (wider than tall)
- Two vertical rectangular eye cutouts (negative space)
- Horizontal rectangular "ear" protrusion on left side
- Four legs arranged: two left, two right, gap in center

#### 3D Character Specifications (`claudecode.jpg`)
- Same silhouette as 2D logo, rendered in 3D
- Heavily rounded/beveled soft edges
- Smooth matte ceramic/clay material with subtle subsurface scattering
- Warm peachy-coral orange color
- Soft diffused studio lighting from upper-left
- Warm golden tones, shallow depth of field
- Clean cream/beige complementary background

### Master Character Prompt (for AI Image Generation)

**Base System Prompt** - Use this to maintain brand consistency:
```
A cute 3D voxel-style character mascot based on a retro Space Invader.
The character has a blocky rectangular body with heavily rounded smooth edges,
four short stubby cylindrical legs (two on left, two on right, gap in center),
a small horizontal rectangular protrusion on the left side like an ear,
and two vertical pill-shaped indentations for eyes.
The material is smooth matte ceramic with subtle subsurface scattering.
The color is warm peachy-coral orange (#da7756).
Rendered in a minimalist kawaii aesthetic with soft diffused studio lighting,
warm golden tones, shallow depth of field.
3D render, product photography style, Blender aesthetic.
```

**Usage Pattern:**
```
{base_prompt} + " " + {user_context}

Example: "{base_prompt} The character is sitting at a desk coding on a laptop,
looking excited. Clean minimal background."
```

### What's Built
- **Landing Page (`/`)**: Terminal-styled $CC memecoin site
  - Animated terminal component with typewriter effect
  - Token info cards (1B supply, 100% fees to @bcherny)
  - Contract address with copy button: `Hg23qBLJDvhQtGLHMvot7NK54qAhzQFj9BVd5jpABAGS`
  - Buy/Twitter/GitHub CTAs + Meme Generator link
  - Full OG/Twitter card metadata
  - Mobile-responsive dark theme

- **Meme Generator (`/meme`)**: AI-powered meme creation
  - Gemini API integration for image generation
  - Master character prompt baked into API (brand consistency)
  - User prompt input with example suggestions
  - Random prompt button
  - Image preview with download/share buttons
  - Twitter share integration

- **API Route (`/api/generate`)**: Server-side image generation
  - Combines base character prompt + user context
  - Returns base64 image data

### What's NOT Built Yet
- `/meme/gallery` - Meme leaderboard
- `/meme/[id]` - Individual meme pages with OG tags
- Voting system
- Image storage (Vercel Blob) for persistence
- Database (Vercel KV) for leaderboard

### Key Files to Know
| File | Purpose |
|------|---------|
| `app/page.tsx` | Home page with all landing content |
| `app/meme/page.tsx` | Meme generator UI (client component) |
| `app/api/generate/route.ts` | Gemini API integration, master prompt |
| `app/components/Terminal.tsx` | Animated Q&A terminal (client component) |
| `app/components/ContractAddress.tsx` | Copy-to-clipboard contract display |
| `app/globals.css` | All custom styles and CSS variables |
| `app/layout.tsx` | Root layout, fonts, metadata |
| `next.config.ts` | Next.js configuration |
| `.env` | API keys (GEMINI_API_KEY) |

### Development Commands
```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

---

# $CC Meme Generator PRD
## Mission: Engineer a Viral Flywheel to $1M Market Cap

---

## Executive Context

**What is $CC?**
$CC is a memecoin created as a token of appreciation for Boris, the creator of Claude Code. A portion of fees are dedicated to him. Current state: ~$10K mcap, target: $1M mcap.

**Why this matters:**
Memecoins live and die by attention. The research is clear:
- Only 1.1% of memecoins break past $69K mcap
- Community-generated content creates compound growth
- "Flywheel marketing" where members become marketers is the winning strategy
- The coins that win have TOOLS that lower friction for content creation

**The Insight:**
Instead of begging people to make memes, we BUILD A MACHINE that makes meme creation so easy and fun that content proliferates automatically. Every meme generated is a free advertisement. The leaderboard creates competition. Competition creates volume. Volume creates attention. Attention creates price action. Price action creates more attention. FLYWHEEL.

---

## Product Overview

### What We're Building
A meme generator page at `claudecode.wtf/meme` that allows anyone to create high-quality, on-brand memes featuring the Claude Code mascot character in seconds.

### Core Value Props
1. **Zero friction** - No design skills needed, no software to download
2. **On-brand output** - Every meme reinforces $CC visual identity
3. **Gamified sharing** - Leaderboard incentivizes creation and engagement
4. **Viral mechanics** - Built-in sharing to Twitter with tracking

---

## Technical Specifications

### Tech Stack (Confirmed)
- **Framework:** Next.js 16.1.4 (App Router, static export)
- **Styling:** Tailwind CSS 4 + custom CSS variables
- **Font:** JetBrains Mono (Google Fonts)
- **Deployment:** Vercel (static export via `output: "export"`)
- **New Dependencies Needed:** Canvas API or fabric.js for image manipulation, Vercel Blob for storage, Vercel KV for leaderboard

### Page Route
```
/meme - Main meme generator page
/meme/gallery - Leaderboard/gallery of top memes
/api/meme/generate - Server action for meme generation
/api/meme/submit - Submit meme to leaderboard
/api/meme/vote - Upvote/downvote endpoint
```

---

## Feature Specifications

### Feature 1: Meme Template System

**Description:**
Pre-built meme templates featuring the Claude Code mascot in various poses/situations. Users select a template and customize text.

**Templates Needed (Priority Order):**
1. **"Drake Format"** - CC mascot rejecting/approving things
2. **"Distracted Boyfriend"** - CC looking at something
3. **"Expanding Brain"** - Multiple CC expressions for escalating ideas
4. **"This is Fine"** - CC in chaos (perfect for "my portfolio" memes)
5. **"Pointing at Board"** - CC presenting facts
6. **"Two Buttons"** - CC sweating over choices
7. **"Giga Chad"** - CC as the chad
8. **"Crying/Happy"** - Before/after format
9. **"Terminal Output"** - Fake terminal with CC messages (unique to us)
10. **"Code Review"** - CC reviewing code with expressions

**Technical Requirements:**
- Templates stored as JSON configs defining:
  - Base image path
  - Text box positions (x, y, width, height)
  - Text styling defaults (font, size, color, stroke)
  - Character overlay positions (if modular)
- Support for 2-4 text zones per template
- Templates should be easy to add (just drop image + config)

**Data Structure:**
```typescript
interface MemeTemplate {
  id: string;
  name: string;
  description: string;
  baseImage: string; // path to template image
  textZones: TextZone[];
  category: 'classic' | 'cc-original' | 'trending';
  popularity: number; // for sorting
}

interface TextZone {
  id: string;
  placeholder: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  align: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  maxLines: number;
}
```

### Feature 2: Real-Time Meme Editor

**Description:**
Live preview canvas that updates as users type. WYSIWYG editing.

**UI Components:**
1. **Template Selector** - Grid of template thumbnails, click to select
2. **Canvas Preview** - Large preview showing meme with current text
3. **Text Inputs** - Input fields for each text zone, labeled clearly
4. **Style Controls** (Optional v1.1):
   - Font size slider
   - Text color picker
   - Add impact font toggle
5. **Action Buttons:**
   - "Download" - saves PNG to device
   - "Share to Twitter" - opens Twitter intent with image
   - "Submit to Leaderboard" - uploads for community voting

**Technical Implementation:**
- Use HTML5 Canvas API or fabric.js for rendering
- Client-side rendering for instant feedback
- Final image generation can be client or server-side
- Target output: 1200x675px (Twitter optimal) or 1:1 for versatility

**Performance Requirements:**
- Preview updates < 50ms after text input
- Image generation < 500ms
- Page load < 2s on 3G

### Feature 3: One-Click Twitter Sharing

**Description:**
Frictionless sharing to Twitter with pre-filled text and proper image attachment.

**Implementation Options:**

**Option A: Twitter Web Intent (Simpler, v1.0)**
```typescript
const shareToTwitter = (imageUrl: string, memeId: string) => {
  const text = encodeURIComponent(
    `Just made this $CC meme 🔥\n\nCreate yours: claudecode.wtf/meme\n\n$CC @claudecode`
  );
  // User downloads image, then tweet intent opens
  window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
};
```
- User downloads image first, then tweet composer opens
- They manually attach the image
- Simple but adds friction

**Option B: Server-Side Image Hosting (Better, v1.0)**
- Generate meme server-side
- Store temporarily on Vercel Blob or similar
- Use Twitter Card meta tags for automatic preview
- Share link to `/meme/[id]` which has proper OG tags
```typescript
// /meme/[id]/page.tsx
export async function generateMetadata({ params }) {
  const meme = await getMeme(params.id);
  return {
    openGraph: {
      images: [meme.imageUrl],
    },
    twitter: {
      card: 'summary_large_image',
      images: [meme.imageUrl],
    },
  };
}
```

**Recommended:** Option B - the shared link drives traffic back to the site

**Share Text Templates (Rotating):**
```
"Just made this $CC meme 🔥 Create yours: claudecode.wtf/meme"
"$CC meme generator is actually goated. Try it: claudecode.wtf/meme"
"POV: You discovered the $CC meme generator. claudecode.wtf/meme"
"This took me 10 seconds. $CC meme machine: claudecode.wtf/meme"
```

### Feature 4: Meme Leaderboard

**Description:**
Community-curated gallery of the best memes with voting system.

**Core Functionality:**
1. **Gallery View** - Grid of submitted memes, sortable by:
   - Hot (recent + votes)
   - Top (all time)
   - New (chronological)
2. **Voting System** - Upvote/downvote (Reddit-style)
3. **Meme Detail View** - Full size meme + vote count + share button

**Anti-Gaming Measures:**
- Rate limit votes per IP (10/hour)
- Optional: Connect wallet to vote (ties to holder status)
- Optional: Weight votes by $CC holdings (whale votes count more)
- Decay algorithm for "Hot" sorting (recent votes worth more)

**Data Structure:**
```typescript
interface Meme {
  id: string;
  imageUrl: string;
  templateId: string;
  textContent: string[]; // for search/filtering
  createdAt: Date;
  creatorWallet?: string; // optional wallet connection
  creatorTwitter?: string; // if shared via Twitter
  upvotes: number;
  downvotes: number;
  score: number; // computed: upvotes - downvotes
  hotScore: number; // computed with time decay
  twitterShareCount: number;
  views: number;
}

interface Vote {
  id: string;
  memeId: string visitorId: string; // fingerprint or IP hash
  wallet?: string;
  value: 1 | -1;
  createdAt: Date;
}
```

**Storage Options:**
1. **Vercel KV (Redis)** - Fast, simple, good for v1
2. **Vercel Postgres** - More structured, better for complex queries
3. **Supabase** - Free tier generous, real-time subscriptions for live updates

**Recommended:** Start with Vercel KV for speed, migrate to Postgres if needed

### Feature 5: Engagement Tracking (v1.1)

**Description:**
Track which memes perform best on Twitter to surface winners.

**Implementation (If Budget Allows):**
- Use Twitter API v2 to track tweet metrics
- When user shares via our link, store tweet ID
- Periodic job fetches engagement (likes, RTs, replies)
- Update leaderboard with Twitter performance

**Simplified Alternative:**
- Manual submission: users paste their tweet link
- We verify it contains our meme image
- Fetch metrics once for verification
- Award bonus points on leaderboard

**Cost Consideration:**
Twitter API is expensive. Start with internal voting only, add Twitter tracking later if justified.

---

## User Flows

### Flow 1: Create and Share Meme (Happy Path)
```
1. User lands on /meme
2. Sees template grid, clicks "Drake Format"
3. Template loads in canvas preview
4. Types in text boxes, sees live preview
5. Clicks "Share to Twitter"
6. Meme is generated and saved to server
7. Twitter intent opens with pre-filled text
8. User tweets with link to their meme
9. Friends click link, see meme, discover generator
10. Flywheel continues
```

### Flow 2: Browse and Vote on Leaderboard
```
1. User lands on /meme/gallery (or clicks "Gallery" from generator)
2. Sees grid of top memes sorted by "Hot"
3. Scrolls, laughs, upvotes favorites
4. Clicks "Create Your Own" CTA
5. Enters generator flow
```

### Flow 3: Discover via Shared Meme
```
1. User sees meme on Twitter timeline
2. Clicks link in tweet
3. Lands on /meme/[id] showing full meme
4. Sees "Create Your Own" CTA prominently
5. Clicks, enters generator
6. Creates meme, shares, loop continues
```

---

## UI/UX Specifications

### Design Principles
1. **Speed over polish** - Fast and functional beats pretty and slow
2. **Mobile-first** - Most Twitter users are on mobile
3. **Meme aesthetic** - Slightly unhinged, not corporate
4. **On-brand** - CC mascot and $CC branding throughout

### Page Layout: /meme

```
┌─────────────────────────────────────────────────────────────┐
│  [CC Logo]  MEME GENERATOR   [Gallery] [Twitter] [$CC]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │                                                     │   │
│  │              CANVAS PREVIEW                         │   │
│  │              (Live updating)                        │   │
│  │                                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Top Text: [____________________________________]    │   │
│  │ Bottom Text: [_________________________________]    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Download PNG]  [Share to Twitter]  [Submit to Gallery]   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  TEMPLATES                                        [See All] │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐          │
│  │   │ │   │ │   │ │   │ │   │ │   │ │   │ │   │          │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘          │
│  Drake  Brain  This  Point Board  Giga  Terminal  More...  │
└─────────────────────────────────────────────────────────────┘
```

### Page Layout: /meme/gallery

```
┌─────────────────────────────────────────────────────────────┐
│  [CC Logo]  MEME GALLERY      [Create] [Twitter] [$CC]      │
├─────────────────────────────────────────────────────────────┤
│  [Hot]  [Top]  [New]                                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │         │  │         │  │         │  │         │        │
│  │  Meme   │  │  Meme   │  │  Meme   │  │  Meme   │        │
│  │         │  │         │  │         │  │         │        │
│  ├─────────┤  ├─────────┤  ├─────────┤  ├─────────┤        │
│  │ ▲ 420   │  │ ▲ 69    │  │ ▲ 42    │  │ ▲ 33    │        │
│  │ [Share] │  │ [Share] │  │ [Share] │  │ [Share] │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  ...    │  │  ...    │  │  ...    │  │  ...    │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│                                                             │
│                    [Load More]                              │
└─────────────────────────────────────────────────────────────┘
```

### Mobile Responsiveness
- Canvas preview: Full width, maintain aspect ratio
- Template grid: 2 columns on mobile, 4+ on desktop
- Text inputs: Stack vertically on mobile
- Gallery: 2 columns on mobile, 4 on desktop

---

## Implementation Phases

### Phase 1: MVP (Ship in hours, not days)
**Goal:** Working meme generator with download capability

- [ ] Create `/meme` page route
- [ ] Implement 3 templates (Drake, Brain, Terminal)
- [ ] Build canvas preview with text overlay
- [ ] Add text input fields
- [ ] Implement client-side image download
- [ ] Basic styling (functional, not pretty)
- [ ] Mobile responsive

**Definition of Done:** User can select template, add text, download meme

### Phase 2: Sharing & Persistence
**Goal:** Easy sharing that drives traffic back

- [ ] Server-side meme generation endpoint
- [ ] Image storage (Vercel Blob)
- [ ] Unique meme URLs `/meme/[id]`
- [ ] Twitter OG meta tags for previews
- [ ] Share to Twitter with link
- [ ] Track meme creation count

**Definition of Done:** Shared meme links show preview on Twitter and drive back to site

### Phase 3: Leaderboard
**Goal:** Gamification that incentivizes volume

- [ ] Gallery page `/meme/gallery`
- [ ] Submit to gallery flow
- [ ] Voting system (upvote/downvote)
- [ ] Hot/Top/New sorting
- [ ] Basic anti-gaming (rate limits)
- [ ] Gallery → Generator CTA

**Definition of Done:** Users can browse, vote, and discover trending memes

### Phase 4: Polish & Viral Mechanics
**Goal:** Remove all friction, maximize sharing

- [ ] Add remaining templates
- [ ] Improve canvas editor UX
- [ ] Add watermark/branding to generated memes
- [ ] Random meme button ("I'm feeling lucky")
- [ ] Template requests/submissions
- [ ] Share count tracking
- [ ] PWA support (add to home screen)

---

## Viral Mechanics Checklist

These are the specific features that create viral loops:

- [ ] **Every meme has the site URL** - watermark or embedded text
- [ ] **One-click share** - minimum friction to Twitter
- [ ] **Landing page for shared memes** - visitors see meme + CTA to create
- [ ] **Leaderboard competition** - top meme creators get recognition
- [ ] **Template variety** - fresh templates keep users coming back
- [ ] **Speed** - faster = more memes = more shares
- [ ] **Mobile optimized** - Twitter is mobile-first
- [ ] **Social proof** - show meme count, vote counts, activity

---

## Success Metrics

### Primary KPIs
1. **Memes Generated** - target 100+ day 1, 1000+ week 1
2. **Twitter Shares** - target 50+ day 1
3. **Unique Visitors** - track via Vercel Analytics
4. **Gallery Submissions** - target 20+ day 1

### Secondary KPIs
1. **Return Visitors** - people coming back to make more
2. **Average Memes per User** - viral users make 3+
3. **Vote Engagement** - active gallery participation
4. **Template Popularity** - which formats resonate

### North Star Metric
**Memes shared to Twitter per day** - this directly correlates with attention, which correlates with $CC price action

---

## Technical Checklist for Implementation

```markdown
## Pre-Implementation
- [ ] Confirm Next.js version and app router vs pages router
- [ ] Audit existing site dependencies
- [ ] Confirm image hosting solution (Vercel Blob recommended)
- [ ] Confirm KV/database solution for leaderboard
- [ ] Gather CC mascot assets in required formats

## Assets Needed
- [ ] CC mascot in various poses/expressions (PNG, transparent bg)
- [ ] Template base images (at least 3 for MVP)
- [ ] Site favicon and OG images
- [ ] $CC branding guidelines (colors, fonts)

## Environment Setup
- [ ] Vercel Blob configured
- [ ] Vercel KV configured (for leaderboard)
- [ ] Environment variables documented

## Core Implementation
- [ ] Canvas rendering utility
- [ ] Template configuration system
- [ ] Meme generation API endpoint
- [ ] Image storage and retrieval
- [ ] Unique URL generation
- [ ] OG meta tag generation

## Frontend
- [ ] /meme page component
- [ ] Template selector component
- [ ] Canvas preview component
- [ ] Text input form
- [ ] Download button
- [ ] Share button
- [ ] Gallery page
- [ ] Voting UI

## Testing
- [ ] Canvas renders correctly on mobile Safari
- [ ] Canvas renders correctly on Chrome mobile
- [ ] Download works on iOS
- [ ] Download works on Android
- [ ] Twitter card preview works
- [ ] Share flow complete end-to-end
```

---

## Appendix A: Memecoin Context & Research Summary

### Why Memecoins Fail (Research Data)
- 97% failure rate
- Only 1.1% break $69K mcap
- Average lifespan: 1 year
- 60% active for less than one day
- Primary killer: no sustained attention mechanism

### What Winners Do Differently
- **BONK:** 350+ on-chain integrations, regular burns, community airdrops
- **WIF:** Instantly recognizable visual identity, pure vibe/community play
- **PEPE:** Pre-existing cultural recognition, deflationary mechanics
- **POPCAT:** Nostalgia + simplicity, 93% to LP then burned

### Key Insight for $CC
The winning formula: **Lower the barrier to community-generated content**

$CC has:
- Unique mascot (differentiator)
- Real community (Claude Code users)
- Genuine story (Boris appreciation)
- Technical founder(s) who can build tools

What $CC needs:
- **TOOLS that multiply content creation**
- Easy way to make on-brand memes
- Gamification to incentivize volume
- Viral loops that drive traffic

This PRD delivers exactly that.

---

## Appendix B: Example Meme Templates Specifications

### Template: Drake Format
```json
{
  "id": "drake",
  "name": "Drake Format",
  "baseImage": "/templates/cc-drake.png",
  "textZones": [
    {
      "id": "reject",
      "placeholder": "Thing CC rejects",
      "x": 350,
      "y": 50,
      "width": 300,
      "height": 150,
      "fontSize": 28,
      "fontFamily": "Impact",
      "color": "#000000",
      "strokeColor": "#ffffff",
      "strokeWidth": 0,
      "align": "center",
      "verticalAlign": "middle",
      "maxLines": 3
    },
    {
      "id": "approve",
      "placeholder": "Thing CC approves",
      "x": 350,
      "y": 250,
      "width": 300,
      "height": 150,
      "fontSize": 28,
      "fontFamily": "Impact",
      "color": "#000000",
      "strokeColor": "#ffffff",
      "strokeWidth": 0,
      "align": "center",
      "verticalAlign": "middle",
      "maxLines": 3
    }
  ],
  "category": "classic"
}
```

### Template: Terminal Output (CC Original)
```json
{
  "id": "terminal",
  "name": "CC Terminal",
  "baseImage": "/templates/cc-terminal.png",
  "textZones": [
    {
      "id": "prompt",
      "placeholder": "$ your command here",
      "x": 20,
      "y": 50,
      "width": 560,
      "height": 30,
      "fontSize": 16,
      "fontFamily": "monospace",
      "color": "#00ff00",
      "strokeColor": "transparent",
      "strokeWidth": 0,
      "align": "left",
      "verticalAlign": "top",
      "maxLines": 1
    },
    {
      "id": "response",
      "placeholder": "Claude's response...",
      "x": 20,
      "y": 90,
      "width": 560,
      "height": 200,
      "fontSize": 14,
      "fontFamily": "monospace",
      "color": "#ffffff",
      "strokeColor": "transparent",
      "strokeWidth": 0,
      "align": "left",
      "verticalAlign": "top",
      "maxLines": 10
    }
  ],
  "category": "cc-original"
}
```

---

## Appendix C: Deployment Checklist

```markdown
## Before Launch
- [ ] All templates tested on mobile
- [ ] OG images generating correctly
- [ ] Twitter card validator passes
- [ ] Download works on all browsers
- [ ] Rate limiting configured
- [ ] Error handling in place
- [ ] Analytics configured

## Launch Day
- [ ] Deploy to production
- [ ] Test all flows on production
- [ ] Announce in community
- [ ] Seed gallery with 10-20 good memes
- [ ] Monitor for errors
- [ ] Track metrics

## Post-Launch
- [ ] Gather feedback
- [ ] Fix critical bugs immediately
- [ ] Add requested templates
- [ ] Iterate on UX pain points
```

---

**END OF PRD**

*This document should be sufficient for any developer (or Claude instance) to understand the context, goals, and technical requirements to build the $CC Meme Generator.*
