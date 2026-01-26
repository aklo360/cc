# Changelog

All notable changes to the $CC (claudecode.wtf) project.

---

## [Unreleased]

## [2026-01-26] - Stream Auto-Recovery (Comprehensive Health Monitoring)

### Added - Self-Healing Stream
The 24/7 livestream now automatically detects ALL failure modes and recovers without manual intervention.

**Chrome Crash Detection (`stream/src/cdp-capture.ts`):**
- Health check runs every 30 seconds
- Detects crash pages: "Aw, Snap!", "ERR_", "This page isn't working", "crashed"
- Triggers automatic restart when crash detected
- Checks if page is closed or disconnected

**RTMP Connection Monitoring (`stream/src/ffmpeg-pipeline.ts`):**
- Detects RTMP errors: connection refused, broken pipe, timeout, I/O error
- Tracks frame progression over time
- New methods: `isRtmpConnected()`, `checkFrameProgress()`

**Comprehensive 3-Minute Health Check (`stream/src/streamer.ts`):**
- Runs every 3 minutes (in addition to 30s Chrome check)
- Checks FFmpeg frame progress (detects silent stalls)
- Checks RTMP connection status
- Checks CDP capture is running
- Auto-restart if ANY check fails

**Never Give Up Recovery:**
- After 10 failed restarts, waits 60 seconds and resets counter (instead of giving up)
- Restart counter resets after 5 minutes of stable streaming
- Stream will recover indefinitely from any failure

**Why this matters:**
- Chrome crashes: detected in 30 seconds
- RTMP silent drops: detected in 3 minutes
- FFmpeg stalls: detected in 3 minutes
- No manual intervention needed - stream stays up 24/7

---

## [2026-01-26] - Global Twitter Rate Limiting

### Added - Respecting Twitter Free Tier Limits
Implemented global rate limiting across ALL tweet types to stay within Twitter's Free tier (17 tweets/24 hours).

**New: Global Rate Limiter**
- Conservative limit: 15 tweets/day (vs Twitter's 17)
- Minimum 30 minutes between any tweets
- All tweet types share the same global pool

**Database Changes (`brain/src/db.ts`):**
- Added `tweet_rate_limit` singleton table (daily count, last tweet time)
- Added `tweet_log` table (records all tweets with type and content)
- New functions: `canTweetGlobally()`, `recordTweet()`, `getGlobalTweetStats()`
- Tweet types: 'meme' | 'announcement' | 'scheduled' | 'video'

**Modified Files:**
- `brain/src/meme.ts` - Checks global limit before posting, records in limiter
- `brain/src/cycle.ts` - Announcement + scheduled tweets respect global limits, post ONE at a time
- `brain/src/video-scheduler.ts` - Video tweets respect global limits, post ONE at a time
- `brain/src/index.ts` - Added `GET /tweets` endpoint for global stats

**New Endpoint:**
```bash
# Check global tweet rate limiting stats
curl https://brain.claudecode.wtf/tweets
# Returns: { daily_count, daily_limit, remaining, can_tweet, recent_tweets, ... }
```

### Rate Limits Summary
| Type | Daily Limit | Min Interval |
|------|-------------|--------------|
| **Global (all tweets)** | 15/day | 30 min |
| Memes | 16/day | 60 min |
| Features | 5/day | 4.5 hours |

---

## [2026-01-26] - Unified Central Brain + Meme Generation

### Added - Meme Generation During Cooldowns
The Central Brain now generates memes during cooldown periods between feature builds, consolidating the previous Cloudflare Worker meme bot into the brain.

**New Files:**
- `brain/src/meme.ts` - Meme generation engine (~350 lines)
  - Uses Claude Opus 4.5 for creative prompts and captions
  - Uses Gemini 2.0 Flash for image generation
  - Quality gate (score 6+/10 required to post)
  - Posts to Twitter community with share_with_followers
- `brain/src/meme-prompts.ts` - 75+ dev-focused meme prompts
  - Debugging, shipping, code reviews, work life, learning, AI humor
  - Same prompts from worker/src/prompts.ts

**Modified: `brain/src/db.ts`**
- Added `memes` table for tracking generated memes
- Added `meme_state` singleton for rate limiting
- Added `activity_type` column to build_logs (build/meme/system)
- New helper functions: getMemeState, updateMemeState, insertMeme, getRecentMemes, getMemeStats, canPostMeme, recordMemePost

**Modified: `brain/src/index.ts`**
- Added meme cron job (every 15 minutes during cooldown)
- Added `GET /memes` endpoint for meme stats
- Added `POST /meme/trigger` endpoint for manual triggering
- Modified broadcastLog to include activityType
- Updated /status endpoint with brain mode (building/resting/idle)

**Modified: `brain/src/humor.ts`**
- Added meme-related humor categories: memeStart, memeSuccess, memeFailed, cooldownActive

**Modified: `app/watch/page.tsx`**
- Added brain mode status badges (BUILDING/RESTING/IDLE)
- Added meme activity styling (fuchsia color)
- Added activityType handling in WebSocket messages
- Shows meme count during RESTING mode

### Rate Limits
- Features: 5/day, 4.5h between cycles (unchanged)
- Memes: 16/day, 60 min minimum between posts
- Quality gate: Score 6+ required to post (3 retries on failure)

### Brain Modes (visible on /watch)
- **BUILDING** (green) - Active feature build cycle
- **RESTING** (fuchsia) - Cooldown, generating memes
- **IDLE** (amber) - Ready to start new cycle

---

## [2026-01-26] - Stream Infrastructure & Bug Fixes

### Added
- Git + CA certificates installed in brain Docker container for Claude agent git operations
- Git config mounted (`/root/.gitconfig`) so commits have correct author
- Lofi fallback audio for 24/7 stream (YouTube blocks datacenter IPs)
  - Uses Chad Crouch "Shipping Lanes" (CC licensed, royalty-free)
  - Loops infinitely via FFmpeg `-stream_loop -1`
  - Volume mounted from `stream/lofi-fallback.mp3`
- Lite mode for /watch page (`?lite=1`) - hides GMGN chart (fallback option)

### Changed
- GMGN price chart on /watch changed to 1h candles with 1d range (1s/5m were crashing Chrome)
- Stream service simplified to always use local lofi audio (YouTube HLS segments return 403 from datacenter IPs)
- Brain container now fully self-contained with PROJECT_ROOT and CLAUDE_PATH env vars
- Removed hardcoded nvm paths from deployer.ts (Docker uses /usr/local/bin)

### Fixed
- Orphaned cycle cleanup when brain container restarts
- Chrome crashes in stream container caused by fast chart updates (now using hourly candles)
- Git push failures in brain container (added CA certificates for HTTPS)
- Brain cycle containerization (paths, env vars, and tool access)

---

## [2026-01-25] - Memecoin Dev Humor in Build Logs

### Added - Dev Personality for Central Brain
Sprinkled crypto Twitter / memecoin dev humor throughout build logs:

**New File: `brain/src/humor.ts`**
- Contextual humor organized by phase/action (not random)
- Categories: planning, building, deploying, verifying, testing, recording, tweeting, homepage, waiting, cleanup
- Success messages: planSuccess, buildSuccess, deploySuccess, verifySuccess, testSuccess, trailerSuccess, cycleComplete, tweetSuccess, homepageSuccess
- Failure messages: retrying, buildFailed, deployFailed, verifyFailed, testFailed, maxRetriesFailed
- Voice: lowercase, casual, crypto twitter slang ("dev is devving", "time to cook", "yeeting to prod")

**Modified: `brain/src/cycle.ts`**
- Added humor at each phase start (PLANNING, BUILDING, DEPLOYING, etc.)
- Added humor after successes and failures
- Added humor during retries and cleanup
- Added humor for cooldown/waiting periods

**Modified: `brain/src/builder.ts`**
- Added humor after successful builds

**Modified: `brain/src/index.ts`**
- Added contextual startup humor

**Example Output:**
```
▸ PHASE 1: PLANNING
   💭 dev is thinking real hard...
✅ Plan generated
   💭 galaxy brain activated
▸ PHASE 2: BUILDING
   💭 time to cook
✅ Build successful
   💭 dev shipped
```

---

## [2026-01-25] - CINEMATIC 3D Trailer System

### Changed - Trailer Generation (MAJOR UPGRADE)
Complete overhaul to use cinematic 3D trailers with camera movements:

**brain/src/trailer.ts:**
- Now uses `WebappTrailer` composition (3D tilted terminal)
- Replaced `FeatureTrailer` with cinematic 3D version
- Props: featureName, featureSlug, tagline, inputPlaceholder, inputContent, buttonText, outputLines, outputStyle
- Smart output style detection: poetry, code, or text
- Default content generation for all feature types

**video/src/compositions/WebappTrailer.tsx:**
- 3D perspective with tilted terminal window
- Cinematic camera movements (dolly ins, zooms, rotations)
- Cursor with click animations on buttons
- Typewriter text animation for output reveal
- Camera tracks focal points with perfect centering
- Extreme zooms (2.2x-3.2x) on active elements
- Scene-by-scene camera positions: intro, inputTyping, inputCursorMove, buttonClick, processing, outputReveal, outputTyping, outputComplete, cta

**Camera Rules (locked in forever):**
- Active element MUST be perfectly centered in frame
- translateY: positive = view moves UP, negative = view moves DOWN
- translateX: positive = view moves LEFT, negative = view moves RIGHT
- At higher zoom (scale), smaller translate values have bigger effect

---

## [2026-01-25] - WebappTrailer System

### Added - Exact UI Recreation Trailers
Complete overhaul of trailer generation to look EXACTLY like the real webapp:

**New Files:**
- `video/src/compositions/WebappTrailer.tsx` - Remotion composition matching webapp UI
- `brain/src/trailer-webapp.ts` - Generator using manifest content
- `brain/src/capture.ts` - Page capture utilities (alternative approach)

**WebappTrailer Features:**
- Uses exact design tokens from webapp (colors, fonts, spacing)
- Components match real UI: terminal header, cards, buttons, footer
- Manifest-driven: extracts REAL content from deployed pages
- 20-second timeline: Input (5s) → Processing (1.5s) → Output (8s) → CTA (5.5s)
- Processing scene is snappy (1.5s) not slow

**Manifest Integration:**
- Extracts real button text from deployed page
- Captures actual input placeholder
- Records REAL output after clicking action button
- Passes all content to Remotion for authentic recreation

### Changed - manifest.ts
- Added more action keywords: refactor, roast, review, debug, convert
- Better button detection for features like "🪄 Refactor Code"

---

## [2026-01-25] - Brain Brand Enforcement Update

### Added
- **app/_template/page.tsx** - Canonical reference template for brain/builder
  - Well-commented file showing correct header/footer patterns
  - Brain reads this before building any new page

### Changed - brain/src/builder.ts
- Fixed header template: traffic lights + icon as Links, title as plain text
- Fixed footer template: added "← back" link, removed border-t
- Changed reference from missing `app/review/page.tsx` to new `app/_template/page.tsx`
- Added new rejection criteria:
  - Missing "← back" link in footer
  - Page title wrapped in Link (must be plain text)
  - border-b on header or border-t on footer
  - max-width over 1200px
  - Emojis in headings/paragraphs
  - Flowery copy

### Changed - brain/src/verifier.ts
- Added CHECK 7: Back link in footer (required)
- Added CHECK 8: Layout width (flags max-w-[1400px]+)
- Added CHECK 9: Header should NOT have border-b
- Added CHECK 10: Footer should NOT have border-t

### Fixed - Existing Pages
- **app/ide/page.tsx**: Changed `bg-[#0d0d0d]` to `bg-bg-primary`
- **app/poetry/page.tsx**: Removed border-b from header, border-t from footer
- **app/mood/page.tsx**: Removed border-b from header, border-t from footer

---

## [2026-01-25] - UI Styleguide Locked In

### Added - Official UI Styleguide
Documented and locked in the consistent UI patterns across all pages:

**Page Layout:**
- All pages use `#0d0d0d` background (inherited from body)
- Standard margins: `px-[5%]` outer, `w-[90%]` inner
- Max widths: `max-w-[900px]` standard, `max-w-[1200px]` for wide pages

**Header Pattern (All Pages):**
- Traffic lights (red/yellow/green) → Link to homepage
- CC icon (24x24) → Link to homepage
- Page title as plain text (NOT a link)
- Optional right-aligned tagline
- No border on header

**Footer Pattern (All Pages):**
- `← back` link to homepage (required)
- Optional site tagline
- No border on footer

**Homepage-Specific:**
- Larger CC logo (64x64) with social links row
- Social links top-right: @ClaudeCodeWTF, @bcherny, Claude Code GitHub
- Terminal header with border (unique to homepage)

**Buy Links:**
- $CC on Bags (with Bags favicon)
- Buy on GMGN (with referral)
- Buy on Photon (with referral)
- Buy on Axiom (with referral)

### Changed - Homepage Layout
- Moved social links (@ClaudeCodeWTF, @bcherny, GitHub) to top right
- CC logo enlarged to 64x64, top-aligned with social links
- Renamed Buy button to "$CC on Bags" with Bags logo

### Standardized - All Pages
Updated all pages to follow the styleguide:
- `/watch` - Restyled with traffic light header, proper footer
- `/meme` - Changed "Powered by Gemini" to "Powered by Nano Banana Pro"
- `/play` - Removed borders, changed tagline to "Classic Arcade Style"
- `/duck` - Removed common problems section, expanded textarea
- `/poetry` - Added 10% margins
- `/ide` - Footer moved outside container
- `/moon` - Back button moved to bottom center

### Documentation
- Added comprehensive "UI Styleguide" section to CLAUDE.md
- Includes code examples for headers, footers, buttons, forms
- Lists DO NOT rules to prevent style drift

---

## [2026-01-25] - VPS Migration Complete

### Changed - Claude Code Now Runs Directly on VPS
The entire project has been migrated to run directly on the VPS (5.161.107.128):

- **No more SSH required** - Claude Code sessions execute locally on the VPS
- **Working directory:** `/root/ccwtf`
- **All commands run directly** - no need to prefix with `ssh root@...`

### Updated Documentation
- Added "VPS ENVIRONMENT" section at top of CLAUDE.md
- Updated all command examples to remove SSH prefixes
- Clarified that Claude runs directly on the server

### Changed - Homepage Layout
- Moved "Watch Brain" button up next to "Join the Community" in hero section
- Renamed button to "Watch Dev Cook"
- Moved Contract Address inside Terminal component (below "claude ~ $CC" bar, above Q&A)
- Standardized section spacing to consistent `my-6` and `gap-3`

### Modified Files
- `app/page.tsx` - Layout changes, removed standalone ContractAddress section
- `app/components/Terminal.tsx` - Added ContractAddress inside terminal

---

## [2026-01-25] - Source Code Sync + VPS Cleanup

### Added - Recovered Pages from Deployment
Synced pages that existed in Cloudflare deployment but not in source repo:

- **`/duck`** - Rubber Duck Debugger
  - Interactive debugging companion
  - Animated SVG duck with quacking animation
  - Common problem templates
  - API integration for AI-powered advice
  - Based on "The Pragmatic Programmer" debugging technique

- **`/roast`** - Code Roast (Claude's Code Critique Corner)
  - Paste code for a humorous roast
  - Example code snippets with random selector
  - AI-generated roasts with actual suggestions
  - Feature cards and roast targets list

### Removed - Incomplete Features from VPS
Cleaned up half-finished features from cancelled brain cycles:
- `/commit` - Removed from VPS
- `/confess` - Removed from VPS
- `/review` - Removed from VPS and source
- `/time` - Removed from VPS
- `/translate` - Removed from VPS

### Fixed - Cancel Endpoint Subprocess Handling
The brain's `/cancel` endpoint only marked the cycle as complete in SQLite but didn't kill the running Claude subprocess. The fix requires explicitly killing the process:
```bash
# Kill orphaned Claude process after cancel (run directly on VPS)
pkill -f '/root/.local/bin/claude'
```

### Changed - Watch Page UI
- Centered the watch page UI both horizontally and vertically
- Better visual balance for the brain monitor interface

### New Files
- `app/duck/page.tsx` - Rubber Duck Debugger (~225 lines)
- `app/roast/page.tsx` - Code Roast page (~215 lines)

---

## [2026-01-24] - Trailer System Overhaul + Duplicate Prevention

### Changed - Universal 20-Second Trailer Format
ALL trailers now use the same 20-second format with WebGL detection:

**Timeline:**
1. 0:00-0:04 - TitleCard with particles and glow
2. 0:04-0:14 - Feature content (static image OR WebGL live render)
3. 0:14-0:18 - FeatureCallout with scan-line reveal
4. 0:18-0:20 - CallToAction with URL

**WebGL Detection:**
- Features with WebGL (Three.js, canvas games) get live Puppeteer capture
- Static features use screenshot with Ken Burns zoom effect
- Automatic classification based on feature type

### Added - Duplicate Feature Prevention System
Brain now checks for existing features before building:

```typescript
const EXISTING_FEATURES = [
  '/poetry', '/haiku', '/battle', '/type', '/duck', '/roast', ...
];
```

- Planning phase explicitly excludes existing features
- Prevents brain from rebuilding same feature twice
- List updated in `brain/src/cycle.ts`

### Fixed - Git Push Before Deploy
Added `git push origin main` to deployment flow:
- Code pushed to GitHub BEFORE Cloudflare deploy
- Ensures source repo stays in sync with production
- Modified `brain/src/deployer.ts`

### Changed - Staggered Shipping Timing
- Changed from 30min to 4.5h between feature cycles
- Gives more time for each feature to get visibility
- Daily limit remains at 5 features

---

## [2026-01-23] - VJ Agent (Live Audio-Reactive Visuals)

### Added - VJ Agent (`/vj`)
Claude-powered live audio-reactive visual generator with three rendering engines:

**Visual Engines:**
- **Three.js Engine**: 3D particles, geometry, rings, tunnel with bloom post-processing
- **Hydra Engine**: Live GLSL shader coding (Resolume-style)
- **Remotion Engine**: Hacked Player with live audio props (experimental)

**Visual Styles:**
- **Abstract**: Pure geometry, wireframes, particles
- **Branded**: $CC orange (#da7756), mascot colors
- **Synthwave**: Neon 80s, pink/cyan, retro grids
- **Auto**: Claude picks style based on music mood

**Audio System:**
- System audio capture via `getDisplayMedia` (Chrome/Edge)
- Web Audio API `AnalyserNode` for 60fps FFT analysis
- Frequency bands: bass (20-250Hz), mid (250-2kHz), high (2k-20kHz)
- Energy-based beat detection with BPM calculation

**Claude Agent Integration:**
- Tools: `switch_engine`, `switch_style`, `set_parameter`, `write_hydra_code`
- Music mood analysis for auto-style selection
- Quick commands for fast control

**Keyboard Shortcuts:**
- H: Hide/show UI | F: Fullscreen
- 1/2/3: Engines (Three.js/Hydra/Remotion)
- A/B/S/X: Styles (Abstract/Branded/Synthwave/Auto)

### New Files
- `vj/` - Complete VJ agent project
  - `src/audio/capture.ts` - getDisplayMedia system audio capture
  - `src/audio/analyzer.ts` - Web Audio API FFT analysis
  - `src/audio/beat.ts` - BPM/beat detection
  - `src/engines/threejs/index.ts` - Three.js visual engine
  - `src/engines/hydra/index.ts` - Hydra live coding engine
  - `src/engines/remotion/` - Remotion Player engine
  - `src/agent/index.ts` - Claude Agent SDK integration
- `app/vj/page.tsx` - Next.js VJ page with controls

---

## [2026-01-23] - Central Brain v4.2 (NEVER STOP - ALWAYS SHIP)

### Changed - Retry Loop + Auto-Recovery
When functional verification fails, the cycle NO LONGER STOPS. Instead:
- **LOOPS BACK** to Phase 2 (BUILD) with the verification errors
- Claude sees what went wrong and **fixes the code**
- Redeploys and re-tests automatically
- Continues until verification passes (max 5 attempts)

**If ALL 5 attempts fail ("too complex"):**
- **CLEANUP**: Removes broken feature directory (`rm -rf app/[slug]`)
- **RESET**: Git checkout to undo uncommitted changes
- **RESTART**: Automatically starts a NEW cycle with a DIFFERENT feature
- The brain NEVER gives up - it just picks an easier feature!

**New behavior:**
- Phase 2-5 are wrapped in a retry loop
- Verification errors are passed to `buildProject()` so Claude knows what to fix
- `builder.ts` now has a special "fix broken feature" prompt for retries
- If max retries exceeded: cleanup + start fresh cycle

**Why this matters:**
- The brain should NEVER stop - it should always ship something
- If a feature is too complex, move on to something simpler
- Broken/incomplete code is automatically cleaned up
- Every cycle eventually ships a working feature!

### New Functions
- `cleanupBrokenFeature(slug)` - Removes `app/[slug]` directory and resets git

### Modified Files
- `brain/src/cycle.ts` - Wrapped phases 2-5 in retry loop (5 attempts max)
  - Added cleanup on max retries
  - Auto-starts new cycle after cleanup
- `brain/src/builder.ts` - Added `verificationErrors` and `retryAttempt` to `ProjectSpec`
  - New fix prompt tells Claude exactly what errors to fix
  - Added UX requirements to initial prompt (buttons must work immediately)

---

## [2026-01-23] - Central Brain v4.1 (CRITICAL: Functional Verification)

### Added - Phase 5: Functional Verification (CRITICAL QUALITY GATE)
Before tweeting or adding to homepage, the brain now **actually tests** the deployed feature:
- Uses Puppeteer to interact with the deployed page
- **Game verification:** Checks start buttons are NOT disabled, can click to start
- **Interactive verification:** Tests form submission, button clicks work
- **Basic verification:** Page loads without errors, has content

**Why this is critical:**
- v4.0 shipped a broken game (Code Battle Arena) with disabled buttons
- It even tweeted about the broken feature!
- This MUST NEVER happen again

**Behavior (v4.1):**
- If verification FAILS, cycle STOPS immediately
- NO tweet is posted about broken features
- NO homepage button is added
- Errors are logged for debugging

**(Updated in v4.2: No longer stops, loops back to BUILD instead)**

### Fixed - Code Battle Arena
- Start buttons were disabled because player name was required
- Fixed by defaulting to "Anonymous Coder" so buttons are always clickable
- Users can optionally enter a name for leaderboard

### New Files
- `brain/src/verifier.ts` - Puppeteer-based functional verification (~470 lines)

### Modified Files
- `brain/src/cycle.ts` - Added Phase 5 (TEST), renumbered phases 6-10
- `brain/tsconfig.json` - Added DOM lib for page.evaluate() types
- `app/battle/components/BattleArena.tsx` - Fixed disabled button issue

---

## [2026-01-23] - Central Brain v4.0 (Continuous Shipping + Homepage Integration)

### Added - Phase 8: Homepage Button Auto-Update
After successful deploy + tweet, the brain now automatically adds a button to the homepage:
- Inserts before BuyButton (consistent position)
- Color rotation across 8 different accent colors
- Auto-selects icon based on feature name (game, tool, poetry, etc.)
- Rebuilds and redeploys site after adding button
- NEVER modifies existing buttons - ONLY adds new ones
- Idempotent: skips if button already exists

### Added - Continuous Shipping Mode
The brain can now ship up to 5 features per day:
- 30-minute cooldown between cycles
- Daily limit of 5 features (prevents runaway costs)
- Auto-starts next cycle after cooldown
- Resets at midnight UTC
- `/stats` endpoint for monitoring daily progress

### New Files
- `brain/src/homepage.ts` - Homepage button updater (~180 lines)

### Modified Files
- `brain/src/cycle.ts` - Added Phase 8 + Phase 9, continuous shipping
- `brain/src/db.ts` - Added daily_stats table + helper functions
- `brain/src/index.ts` - Added /stats endpoint, updated version to 4.0.0

### New Endpoint
```bash
# Check daily shipping stats
curl https://brain.claudecode.wtf/stats
# Returns: { date, features_shipped, daily_limit, remaining, can_ship_more, ... }
```

### Poetry Feature Button
- First feature button auto-added to homepage via Phase 8
- Code Poetry Generator now accessible from homepage

---

## [2026-01-23] - Central Brain v3.1 (Dynamic Trailer System)

### Added - Remotion-Based Trailer Generation
ALL trailers now generated with Remotion. Screen recordings are INTERCUT into the composition for complex features but never used alone.

**Approach:**
- Pure Remotion: Static/Interactive UIs recreated with animations
- Remotion + Intercut: Games/3D get screen-recorded footage embedded in Remotion

**New Files:**
- `video/src/compositions/FeatureTrailer.tsx` - Dynamic trailer composition
- `brain/src/trailer.ts` - Trailer orchestration + classification

**Trailer Timeline (10 seconds for non-games):**
1. 0:00-0:02 - TitleCard with feature name + particles
2. 0:02-0:06 - UIShowcase (animated UI recreation)
3. 0:06-0:08 - FeatureCallout ("HOW IT WORKS")
4. 0:08-0:10 - CallToAction ("TRY IT NOW" + URL)

**Game Trailer Timeline (12 seconds):**
1. 0:00-0:02 - TitleCard
2. 0:02-0:08 - GameplayFootage (screen recorded)
3. 0:08-0:10 - FeatureCallout
4. 0:10-0:12 - CallToAction ("PLAY NOW")

### Changed
- Renamed PHASE 5 from "RECORDING" to "CREATING TRAILER"
- cycle.ts now calls `generateTrailer()` instead of `recordFeature()`
- Trailers explain features instead of just showing them

---

## [2026-01-23] - Central Brain v3.0 (Full Autonomous Loop)

### Added - Complete Autonomous Engineering Agent
Built and deployed a fully autonomous 24-hour software engineering loop:

**7-Phase Cycle:**
1. **PLAN** - Claude plans project idea + tweet content
2. **BUILD** - Claude Agent SDK autonomously writes code
3. **DEPLOY** - Wrangler deploys to Cloudflare Pages
4. **VERIFY** - Confirms deployment is live (3 retries)
5. **RECORD** - Puppeteer captures video of deployed feature
6. **TWEET** - Posts announcement with video to @ClaudeCodeWTF
7. **SCHEDULE** - Queues follow-up tweets over 24 hours

### Technical Implementation

**Claude Agent SDK Integration** (`brain/src/builder.ts`)
- `@anthropic-ai/claude-agent-sdk` query() function
- `permissionMode: 'acceptEdits'` for autonomous operation
- Tools: Read, Write, Edit, Glob, Grep, Bash
- Max 3 retry attempts with debug loop
- Model: Sonnet for builds, Haiku for verification

**SQLite Database** (`brain/src/db.ts`)
- 4 tables: cycles, scheduled_tweets, tweets, experiments
- WAL mode for concurrent access
- Tracks cycle state, tweet scheduling, history

**HTTP/WebSocket Server** (`brain/src/index.ts`)
- Port 3001 (tunneled via Cloudflare)
- `GET /status` - Brain + cycle status
- `POST /go` - Start new 24-hour cycle
- `POST /cancel` - Cancel active cycle
- `WS /ws` - Real-time log streaming
- Cron: `*/5 * * * *` for scheduled tweets

**Cloudflare Tunnel**
- Public URL: `brain.claudecode.wtf`
- WebSocket: `wss://brain.claudecode.wtf/ws`
- Heartbeat ping every 30s to keep connections alive

**Video Recording** (`brain/src/recorder.ts`)
- Puppeteer headless browser
- 30fps, 8 seconds default
- ffmpeg encoding to MP4

### VPS Deployment
- Server: 5.161.107.128
- Process: pm2 with `cc-brain` name
- Node: v22.22.0 via nvm
- Claude CLI: `~/.local/bin/claude`

### First Successful Cycle
- **Project:** Code Poetry Generator (`/poetry`)
- **Build:** Claude Agent SDK autonomously created the feature
- **Deploy:** https://claudecode.wtf/poetry
- **Tweet:** Posted with video to @ClaudeCodeWTF community

### Bug Fixes
- Fixed `bypassPermissions` → `acceptEdits` for Claude Agent SDK
- Fixed hardcoded paths in builder.ts, deployer.ts, recorder.ts
- Added dynamic PATH for nvm installations
- Added WebSocket heartbeat to prevent Cloudflare tunnel timeout
- Client-side exponential backoff reconnection (max 30s delay)

### Files
- `brain/src/index.ts` - Main server + WebSocket (~340 lines)
- `brain/src/cycle.ts` - Full cycle orchestration (~400 lines)
- `brain/src/builder.ts` - Claude Agent SDK integration (~260 lines)
- `brain/src/deployer.ts` - Cloudflare Pages deployment (~145 lines)
- `brain/src/recorder.ts` - Puppeteer video capture (~120 lines)
- `brain/src/twitter.ts` - OAuth 1.0a + video upload (~300 lines)
- `brain/src/db.ts` - SQLite database (~240 lines)
- `app/watch/page.tsx` - Real-time log viewer (~300 lines)

### Run
```bash
# Run brain (directly on VPS)
cd /root/ccwtf/brain
pm2 start npm --name cc-brain -- run dev

# Trigger cycle
curl -X POST https://brain.claudecode.wtf/go

# Watch logs
https://claudecode.wtf/watch
```

---

## [2025-01-22] - Central Brain v2.0 (Ultra-Lean)

### Changed - Complete Rewrite for Minimal Footprint
Rewrote the Central Brain to be as lean as possible:

| Before | After |
|--------|-------|
| PostgreSQL (Docker) | **SQLite (single file)** |
| Redis + Bull | **node-cron** |
| Drizzle ORM | **Raw SQL** |
| Docker Compose | **pm2** |
| 207 npm packages | **~30 packages** |
| ~$115-205/month | **~$25-70/month** |

### Added
- **SQLite Database** (`brain/src/db.ts`)
  - Single file: `brain.db`
  - 4 tables: tweets, experiments, decisions, game_scores
  - WAL mode for concurrency
  - Helper functions for all CRUD operations

- **node-cron Scheduler** (replaces Bull/Redis)
  - Decision Engine: hourly at :00
  - Tweet Scheduler: every 4 hours
  - Daily Experiment: 10 AM UTC

### Removed
- Docker (docker-compose.yml, Dockerfile)
- PostgreSQL dependency
- Redis dependency
- Bull queue library
- Drizzle ORM
- 170+ npm packages

### Files
- `brain/src/index.ts` - Main entry + cron setup (~100 lines)
- `brain/src/db.ts` - SQLite database (~180 lines)
- `brain/src/decision.ts` - Claude reasoning (~150 lines)
- `brain/src/twitter.ts` - Twitter API (~280 lines)

### Run
```bash
cd brain
npm install       # Only ~30 packages
npm run dev       # Development
pm2 start dist/index.js  # Production
```

---

## [2025-01-22] - Central Brain v1.0 (Deprecated)
- Campaign System (Meme2Earn)
- Twitter Strategy Engine
- VPS deployment

---

## [2025-01-22] - Video Trailer Generator + Twitter Video Support

### Added
- **Remotion Video Generator** (`/video`)
  - Full Remotion project for cinematic trailer creation
  - Frame-perfect 30fps capture via virtual time control
  - Automated AI gameplay with center-biased character framing
  - Smooth zoom transitions between shots
  - Premium motion graphics (title cards, feature callouts, CTA)

- **Trailer Generator Agent** (`video/agent/index.ts`)
  - Puppeteer browser automation
  - Virtual time injection (overrides `requestAnimationFrame` + `performance.now()`)
  - Frame-by-frame screenshot capture → ffmpeg encoding
  - AI gameplay: shooting, movement, barrel rolls
  - Center-bias tracking to keep character in frame

- **Remotion Scenes** (`video/src/scenes/`)
  - `TitleCard.tsx` - Animated title with particles and glow
  - `FeatureCallout.tsx` - Premium text overlays with scan line reveal
  - `CallToAction.tsx` - End screen with expanding ring animation
  - `Trailer.tsx` - 15-second composition with zoom transitions

- **Twitter Video Upload** (`worker/src/twitter.ts`)
  - Chunked media upload for videos (INIT → APPEND → FINALIZE → STATUS)
  - OAuth 1.0a signing for all endpoints
  - Proper base64 chunk boundary handling
  - Video processing status polling

- **New Worker Endpoints**
  - `POST /bot/tweet-video` - Post tweet with video attachment
  - `POST /bot/tweet-text` - Post text-only tweet

- **Post Tweet Script** (`video/post-tweet.ts`)
  - Node.js script to upload video and post to Twitter

### Technical
- Virtual time control allows frame-perfect game capture
- 8 buffer frames (head/tail) prevent freeze-frames at cuts
- Center-bias AI tracks X/Y position, returns to center when >40% drift
- Smooth zoom transitions: 1.08→1 in, 1→1.05 out with easing
- Videos processed as 5MB chunks (base64 boundary aligned)

### First Tweet
- **StarClaude64 launch announcement** with 15-second trailer
- Tweet: https://twitter.com/ClaudeCodeWTF/status/2014530888210555331

---

## [2025-01-22] - Twitter Bot with Image Upload

### Added
- **Twitter Bot** (`@ClaudeCodeWTF`)
  - Automated meme generation + posting
  - Cron schedule: every 3 hours (8 times/day)
  - Rate limiting: 16 tweets/day max, 85min minimum between posts

- **OAuth 1.0a Support** (for everything)
  - `worker/src/oauth1.ts` - HMAC-SHA1 signature generation
  - Admin UI at `/auth/v1` for token setup
  - Twitter v1.1 API for media upload
  - Twitter v2 API for tweet posting (free tier compatible)

- **Claude Opus 4.5 Integration**
  - Caption generation with dev personality
  - Quality gate scoring (6+/10 required to post)
  - Meme concept generation

- **Bot Personality System**
  - Dev-focused identity ("just wanna code")
  - Casual voice: lowercase, "fr", "nah", "lowkey"
  - Quality gate rejects crypto slang (ser, ngmi, wagmi, etc.)
  - 50+ dev-themed prompt templates

- **Admin Endpoints**
  - `GET /bot/status` - View posting status + recent tweets
  - `POST /bot/tweet` - Manual trigger
  - `GET /bot/health` - Health check
  - `GET /auth/v1` - OAuth 1.0a setup

### Files Added
- `worker/src/oauth1.ts` - OAuth 1.0a implementation
- `worker/src/claude.ts` - Caption generation + quality gate (Claude Opus 4.5)
- `worker/src/prompts.ts` - Meme prompt templates
- `worker/src/twitter.ts` - Twitter API wrapper
- `worker/src/types.ts` - TypeScript types

### Technical
- OAuth 1.0a for everything (simplified from OAuth 2.0 + 1.0a hybrid)
- v2 API for tweet posting, v1.1 API for media upload
- KV storage for bot state + tweet history
- Gemini API for image generation
- Claude Opus 4.5 for caption + quality scoring

---

## [2025-01-22] - StarClaude64 Audio, Visuals & Polish

### Added
- **Full Audio System:**
  - Web Audio API for lag-free sound playback
  - Sound effects: shoot, bomb, explosion, coin collect, death, barrel roll
  - Looping chiptune background music (CC0 licensed)
  - Music mute button (bottom right, persists to localStorage)
  - Audio preloading and warmup to prevent frame drops

- **Space Skybox:**
  - NASA Tycho Skymap (4K equirectangular projection)
  - Realistic star field with Milky Way band
  - Slow rotation for immersion

- **Launch Warmup Screen:**
  - "LAUNCHING..." overlay with spinning $CC logo
  - 1.5 second warmup period hides shader compilation flicker
  - Player immune during warmup

### Changed
- **UI Rebranded to Anthropic Orange (#da7756):**
  - All HUD text (distance, coins, score)
  - Start screen title and controls
  - Death screen and buttons
  - Mute button styling

- **HUD Layout:**
  - All counters grouped on right side
  - Mute button moved to bottom right (larger size)

- **Character Material:**
  - Roughness increased to 0.9 for softer reflections
  - Removed jet propulsion effect

### Technical
- Switched from HTMLAudioElement to Web Audio API
- Pre-decoded audio buffers for instant playback
- Environment HDRI for realistic reflections
- Optimized textures: WebP format, 4K max resolution

### Assets Added
- `/public/sounds/` - CC0 sound effects and music (~6.6MB)
  - `bgm_level1.ogg` - Background music
  - `synth_laser_03.ogg` - Shoot sound
  - `retro_explosion_01.ogg` - Explosion sound
  - `retro_coin_01.ogg` - Coin collect sound
  - `retro_die_01.ogg` - Death sound
  - `power_up_01.ogg` - Barrel roll sound
- `/public/textures/space_bg.webp` - NASA Tycho Skymap (976KB)

---

## [2025-01-22] - 3D CC Character Model

### Changed
- **StarClaude64 player is now the actual $CC mascot:**
  - Rocket ship replaced with 3D extruded $CC character
  - Uses exact SVG path from `public/claudecode.svg` (Adobe Illustrator export)
  - Perfect silhouette: body, arms, 4 legs, eye holes
  - Metallic reflective material (metalness 0.7, roughness 0.2)
  - Claude orange (#da7756) with emissive glow
  - Cyan engine glow + pink trail particles behind character

### Added
- `public/claudecode.svg` - Vector source file for 3D extrusion

### Technical
- THREE.Shape traced from SVG path coordinates
- ExtrudeGeometry with bevel for polished 3D look
- Centered and scaled to fit game viewport

---

## [2025-01-22] - StarClaude64 Keyboard Controls + Combat

### Changed
- **StarClaude64 controls completely overhauled:**
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

## [2025-01-22] - StarClaude64 + Space Invaders

### Added
- **StarClaude64 3D Game** (`/moon`)
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
  - Added "StarClaude64" button (cyan)

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
