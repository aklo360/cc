# VanityZo.com Speedrun Plan

**Timeline:** Tonight, 5-6 hours
**Stack:** Next.js + Cloudflare Pages
**Aesthetic:** Authentic 80s Andy Warhol pop art collage (Grace Jones / Janet Jackson energy)

---

## Site Structure (Single Page Scroll)

1. **Hero / Latest Release** — Full viewport, video/single artwork with ripped paper frame
2. **Music Player** — DistroKid embed with collage treatment
3. **Shows / Events** — Upcoming performances (Feb 7 release party)
4. **About** — Artist bio with portrait
5. **Contact** — Booking/inquiries
6. **Footer** — Social links, copyright

---

## Authentic Warhol Aesthetic Execution

### Visual Elements Needed
- [ ] **Ripped paper edge PNGs** — AKLO to provide or we source/create
- [ ] **Halftone dot overlay** — SVG pattern or PNG texture (larger dots for vintage feel)
- [ ] **Drop shadows** — Realistic paper shadows (soft, angled, ~8-15px blur)
- [ ] **Bold typography** — Condensed sans-serif or display font (Helvetica Neue Bold, Futura, or custom)
- [ ] **Color palette** — High contrast Warhol colors (hot pink, electric blue, yellow, black, white)

### CSS Techniques
- `box-shadow` with multiple layers for paper depth
- PNG overlays for torn edges (not CSS border-image hacks)
- SVG halftone filter or background pattern
- Slight transform rotations on "cut out" elements (1-3deg)
- Optional: color registration offset (duplicate layer shifted 2-3px)

### Asset Checklist (from AKLO)
- [ ] VanityZo logo
- [ ] Artist photos (1-3 key shots)
- [ ] Latest release artwork
- [ ] Music video embed URL or DistroKid player link
- [ ] Social links (IG, TikTok, Spotify, Apple Music, etc.)
- [ ] Show details (Feb 7 — Ki Smith Gallery)
- [ ] Bio text
- [ ] Contact method (email or form destination)
- [ ] Halftone/paper texture assets (if already created)

---

## Speedrun Timeline (5-6 hours)

### Hour 1: Setup + Asset Prep
- [ ] Init Next.js project
- [ ] Configure Tailwind CSS
- [ ] Collect all assets from AKLO
- [ ] Set up basic file structure
- [ ] Create/source ripped paper edge PNGs
- [ ] Create halftone pattern (SVG or PNG)

### Hour 2: Layout + Structure
- [ ] Build single-page layout with all sections
- [ ] Responsive grid structure
- [ ] Import fonts
- [ ] Set color palette as CSS variables

### Hour 3: Hero + Music Sections
- [ ] Hero section with latest release
- [ ] Ripped paper frame around video/artwork
- [ ] DistroKid player embed with collage treatment
- [ ] Halftone background application

### Hour 4: Shows + About + Contact
- [ ] Events section (Feb 7 release party featured)
- [ ] About section with bio + portrait
- [ ] Contact section
- [ ] Apply collage aesthetic to all sections

### Hour 5: Polish + Shadows + Details
- [ ] Realistic drop shadows on all "cut out" elements
- [ ] Fine-tune spacing and typography
- [ ] Mobile responsiveness pass
- [ ] Hover states and micro-interactions

### Hour 6: Deploy + QA
- [ ] Build and test locally
- [ ] Deploy to Cloudflare Pages
- [ ] Connect vanityzo.com domain
- [ ] Cross-browser/device QA
- [ ] Final tweaks

---

## Technical Setup

```
vanityzo-website/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── Hero.tsx
│   ├── MusicPlayer.tsx
│   ├── Shows.tsx
│   ├── About.tsx
│   ├── Contact.tsx
│   └── Footer.tsx
├── public/
│   ├── images/
│   │   ├── logo.png
│   │   ├── portrait.jpg
│   │   └── release-artwork.jpg
│   └── textures/
│       ├── torn-edge-top.png
│       ├── torn-edge-bottom.png
│       ├── torn-edge-left.png
│       ├── torn-edge-right.png
│       └── halftone-pattern.svg
├── tailwind.config.ts
└── next.config.js
```

---

## Verification

1. Run `npm run dev` — site loads locally
2. All sections render and scroll smoothly
3. Collage aesthetic is authentic (paper edges, halftone, shadows)
4. Mobile responsive (iPhone, iPad breakpoints)
5. DistroKid player functions
6. Deploy to Cloudflare Pages succeeds
7. vanityzo.com resolves and loads

---

## Decisions Made

- **Textures:** AKLO has some assets, we'll source/create additional as needed
- **Contact:** Simple email link (mailto:)
- **Fonts:** We'll pick — recommendations:
  - **Headlines:** Bebas Neue or Archivo Black (bold, condensed, Warhol-era feel)
  - **Body:** Space Grotesk or Inter (clean, modern, readable)

---

## Ready to Execute

All key decisions made. 5-6 hour speedrun starting now.
