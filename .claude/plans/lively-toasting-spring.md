# Animatic Coming Soon Splash Page — Implementation Plan

## Overview
Create a single-page, full-screen coming soon splash page for Animatic that combines vintage video production aesthetics (CRT glow, SMPTE color bars, VHS glitch, film grain) with modern Apple-like design polish. The page will be built with Next.js 15 + Tailwind CSS and include an email waitlist capture form.

## Design Concept

### Visual Hierarchy
1. **Hero CRT Screen** (center): Main focus with animated glow, scanlines, and the Animatic branding
2. **SMPTE Color Bars** (background/accent): Subtle animated bars that fade in/out or appear on state transitions
3. **Film Grain Overlay** (full-screen): Subtle texture layer that adds warmth
4. **VHS Glitch Effects** (periodic): Occasional chromatic aberration and tracking errors for character
5. **Email Capture Form** (bottom center): Clean, minimal input with glowing focus states

### Aesthetic Details
- **Typography**: SF Pro Display-inspired system font stack (clean, Apple-like)
- **Color Palette**:
  - Deep blacks (#0a0a0a) with warm undertones
  - Phosphor green/amber glow (#00ff41, #ffb627) for CRT elements
  - SMPTE bar colors (white, yellow, cyan, green, magenta, red, blue)
  - Subtle warm film grain tint
- **Animations**:
  - Breathing CRT glow (subtle pulse)
  - Scanline scrolling
  - Periodic glitch/distortion (every 8-12 seconds)
  - Film grain texture animation
  - Smooth fade-ins and micro-interactions
  - Color bar shimmer/rotation

### Interactions
- Email form with glowing focus state (CRT phosphor glow)
- Success state with glitch transition
- Hover states with VHS tracking distortion
- Smooth scrolling (if content exceeds viewport)

## Technical Architecture

### Framework & Tooling
- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS 4.0**
- **Cloudflare Pages** deployment-ready
- **Git Repository**: https://github.com/aklo360/animatic.git

### Project Structure
```
/animatic-splash/
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── app/
│   ├── layout.tsx          # Root layout with fonts + metadata
│   ├── page.tsx            # Main splash page component
│   ├── globals.css         # Tailwind imports + custom animations
│   ├── api/
│   │   └── waitlist/
│   │       └── route.ts    # Email capture endpoint (logs to console for MVP)
│   └── components/
│       ├── CRTScreen.tsx           # Central CRT monitor effect
│       ├── SMPTEBars.tsx          # Color bars background
│       ├── FilmGrain.tsx          # Film grain overlay
│       ├── GlitchEffect.tsx       # VHS glitch animation wrapper
│       ├── WaitlistForm.tsx       # Email capture form
│       └── AnimaticLogo.tsx          # Logo component
├── public/
│   ├── favicon.ico
│   └── images/
│       └── grain-texture.png      # Film grain texture
└── README.md
```

## Implementation Steps

### 1. Project Initialization
- Initialize git repository (already exists at https://github.com/aklo360/animatic.git)
- Initialize Next.js 15 with TypeScript and App Router
- Install Tailwind CSS 4.0 and configure
- Set up project structure and configuration files
- Configure TypeScript strict mode
- Initial git commit and push to remote

### 2. Core Layout & Styling Foundation
**Files**: `app/layout.tsx`, `app/globals.css`, `tailwind.config.ts`

- Create root layout with system font stack (SF Pro fallback)
- Configure Tailwind with custom colors, animations, and utilities
- Define custom CSS keyframe animations:
  - `scanline` (vertical scrolling scanline)
  - `glow-pulse` (CRT phosphor breathing effect)
  - `glitch-slide` (horizontal distortion)
  - `chromatic-aberration` (RGB channel split)
  - `grain-shift` (film grain texture movement)
  - `smpte-shimmer` (color bar rotation/fade)
- Set up viewport-height variables and full-screen base styles

### 3. Component Development

#### 3a. FilmGrain Component
**File**: `app/components/FilmGrain.tsx`
- Full-screen fixed overlay with grain texture
- CSS animation for subtle texture shift
- Low opacity (5-8%) for subtlety
- Pointer-events disabled

#### 3b. SMPTEBars Component
**File**: `app/components/SMPTEBars.tsx`
- Render classic SMPTE color bars (white, yellow, cyan, green, magenta, red, blue)
- Position as background layer or animated accent
- Shimmer/rotation animation with stagger delays
- Blend mode: overlay or screen for integration

#### 3c. CRTScreen Component
**File**: `app/components/CRTScreen.tsx`
- Central rounded-corner container with curved screen effect
- Animated phosphor glow (box-shadow pulse in green/amber)
- Horizontal scanlines (repeating-linear-gradient overlay)
- Subtle curvature (border-radius + perspective transform)
- Border glow with multiple box-shadows
- Contains logo and tagline

#### 3d. AnimaticLogo Component
**File**: `app/components/AnimaticLogo.tsx`
- Simple text logo with "VIBEO" branding
- Glowing text effect (text-shadow with phosphor colors)
- Optional: Monospace or display font for broadcast feel

#### 3e. GlitchEffect Component
**File**: `app/components/GlitchEffect.tsx`
- Wrapper component that applies periodic glitch
- Uses CSS animations: transform skew, chromatic aberration
- Triggered via state every 8-12 seconds (random interval)
- Wraps child content with glitch layers (RGB channel split effect)

#### 3f. WaitlistForm Component
**File**: `app/components/WaitlistForm.tsx`
- Clean email input with label
- Glowing focus state (phosphor green border + shadow)
- Submit button with hover/active states
- Form validation (basic email format check)
- Success/error states with smooth transitions
- Fetches to `/api/waitlist` endpoint

### 4. API Route for Email Capture
**File**: `app/api/waitlist/route.ts`
- POST endpoint accepting `{ email: string }`
- Basic email validation (regex)
- Log submission to console (MVP - no database yet)
- Return JSON response: `{ success: true }` or error
- CORS headers for Cloudflare Pages compatibility
- Rate limiting consideration (future enhancement)

### 5. Main Page Assembly
**File**: `app/page.tsx`
- Compose all components in layered structure:
  1. Background layer: `<SMPTEBars />` (subtle, behind everything)
  2. Film grain overlay: `<FilmGrain />` (full-screen fixed)
  3. Central content: `<GlitchEffect>` wrapping `<CRTScreen>` + `<WaitlistForm>`
- Center content vertically and horizontally (flexbox)
- Dark background base color (#0a0a0a)
- Full viewport height (100vh or 100dvh)
- Add tagline text: "The lovable for video content" or "AI video production, automated"
- Add subtle footer text: "Coming soon" or "Join the waitlist"

### 6. Metadata & SEO
**File**: `app/layout.tsx` (metadata export)
- Page title: "Animatic — Coming Soon"
- Meta description: "Professional AI video production. One prompt, end-to-end automation. Coming soon."
- Open Graph tags (og:image, og:title, og:description)
- Favicon setup
- Viewport configuration for mobile

### 7. Animations & Polish
**File**: `app/globals.css`
- Fine-tune animation durations and easing functions
- Ensure 60fps performance (use transform/opacity only)
- Add reduced-motion media query for accessibility
- Test glitch timing (random interval logic)
- Ensure scanline and grain are subtle, not overwhelming

### 8. Responsive Design
- Test on mobile (iPhone/Android), tablet, desktop, ultrawide
- Adjust CRT screen size (responsive scale)
- Stack or resize elements on narrow viewports
- Ensure form is usable on touch devices
- Test landscape and portrait orientations

### 9. Configuration for Cloudflare Pages
**File**: `next.config.ts`
- Configure static export (if needed) or edge runtime
- Optimize images and assets
- Set up environment variables (if any)
- Ensure output is compatible with Cloudflare Pages

### 10. Final Testing & Optimization
- Lighthouse audit (performance, accessibility, SEO)
- Cross-browser testing (Chrome, Safari, Firefox)
- Mobile device testing (iOS Safari, Chrome Android)
- Check animation performance (no jank)
- Validate email form submission flow
- Test accessibility (keyboard navigation, screen readers)
- Verify all visual effects render correctly

## Critical Files to Create

1. **Configuration**:
   - `package.json` — Dependencies and scripts
   - `next.config.ts` — Next.js configuration
   - `tailwind.config.ts` — Tailwind customization
   - `tsconfig.json` — TypeScript configuration
   - `.gitignore` — Exclude node_modules, .next, etc.

2. **App Core**:
   - `app/layout.tsx` — Root layout and metadata
   - `app/page.tsx` — Main splash page
   - `app/globals.css` — Global styles and animations

3. **Components**:
   - `app/components/FilmGrain.tsx`
   - `app/components/SMPTEBars.tsx`
   - `app/components/CRTScreen.tsx`
   - `app/components/AnimaticLogo.tsx`
   - `app/components/GlitchEffect.tsx`
   - `app/components/WaitlistForm.tsx`

4. **API**:
   - `app/api/waitlist/route.ts` — Email capture endpoint

5. **Assets**:
   - `public/favicon.ico`
   - `public/images/grain-texture.png` — Film grain texture (can be generated or sourced)

## Design Token Reference

### Colors (Tailwind config)
```js
colors: {
  'crt-glow': '#00ff41',      // Phosphor green
  'crt-amber': '#ffb627',     // Warm amber glow
  'deep-black': '#0a0a0a',    // Background
  'smpte-white': '#ffffff',
  'smpte-yellow': '#ffff00',
  'smpte-cyan': '#00ffff',
  'smpte-green': '#00ff00',
  'smpte-magenta': '#ff00ff',
  'smpte-red': '#ff0000',
  'smpte-blue': '#0000ff',
}
```

### Animations (Tailwind config)
```js
animation: {
  'scanline': 'scanline 8s linear infinite',
  'glow-pulse': 'glow-pulse 4s ease-in-out infinite',
  'glitch': 'glitch-slide 0.3s ease-in-out',
  'grain': 'grain-shift 0.5s steps(4) infinite',
  'smpte-shimmer': 'smpte-shimmer 10s ease-in-out infinite',
}
```

### Typography
- **Primary Font**: System UI stack (San Francisco Pro fallback)
  - `font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ...`
- **Monospace Font** (optional for logo/technical text):
  - `font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", ...`

## Verification & Testing

### End-to-End Testing Steps
1. **Local Development**:
   ```bash
   npm install
   npm run dev
   ```
   - Navigate to `http://localhost:3000`
   - Verify all visual effects render (CRT glow, scanlines, grain, SMPTE bars)
   - Check glitch effect triggers periodically
   - Test email form submission (check console logs)
   - Test success/error states

2. **Responsive Testing**:
   - Resize browser window (mobile, tablet, desktop, ultrawide)
   - Test in Chrome DevTools device emulation
   - Verify layout adapts gracefully
   - Check touch interactions on simulated mobile

3. **Performance**:
   - Run Lighthouse audit (aim for 90+ performance score)
   - Check for animation jank (60fps target)
   - Verify film grain and scanline overlays don't cause lag
   - Test on lower-end devices if possible

4. **Accessibility**:
   - Keyboard navigation (Tab through form, Enter to submit)
   - Screen reader testing (VoiceOver on macOS, NVDA on Windows)
   - Check color contrast (WCAG AA compliance)
   - Verify reduced-motion preferences are respected

5. **Cross-Browser**:
   - Test in Chrome, Safari, Firefox, Edge
   - Verify CSS animations work consistently
   - Check form submission on all browsers

6. **Deployment**:
   ```bash
   npm run build
   ```
   - Verify build succeeds without errors
   - Test production build locally:
     ```bash
     npm run start
     ```
   - Deploy to Cloudflare Pages and verify live site

### Success Criteria
- ✅ Page loads in <2s on 4G connection
- ✅ All visual effects (CRT, grain, scanlines, glitch, SMPTE bars) render correctly
- ✅ Email form submits successfully and shows confirmation
- ✅ Responsive design works on mobile, tablet, desktop
- ✅ Lighthouse score: Performance 90+, Accessibility 100, SEO 100
- ✅ No console errors or warnings
- ✅ Smooth 60fps animations
- ✅ Professional, polished "Apple-like" aesthetic achieved

## Future Enhancements (Out of Scope for MVP)
- Connect email capture to actual database (Neon Postgres)
- Add social media links/icons
- Implement proper form validation backend (rate limiting, spam prevention)
- Add Easter egg interactions (e.g., click to toggle SMPTE bars)
- Integrate analytics (Cloudflare Web Analytics)
- A/B test different taglines or visuals
- Add sound effects (optional CRT hum or glitch sounds on interaction)

---

## Summary
This plan delivers a stunning, full-screen coming soon splash page that combines vintage broadcast aesthetics (CRT glow, SMPTE bars, VHS glitch, film grain) with modern, Apple-inspired design polish. Built with Next.js 15 + Tailwind CSS, it's performant, responsive, and ready for Cloudflare Pages deployment. The email waitlist form provides a simple conversion mechanism, with the backend API logging to console for MVP (database integration deferred to later).

The page will be visually striking, technically solid, and set the perfect tone for the Animatic brand: professional video production meets cutting-edge AI automation.
