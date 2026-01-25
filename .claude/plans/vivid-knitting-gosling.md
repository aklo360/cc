# Cloudflare Pages Deployment Plan

## Overview
Reconfigure this Lovable/Vite React SPA for Cloudflare Pages deployment and deploy via wrangler CLI using direct upload.

## Current State
- **Project Type**: React 18.3.1 + Vite 5.4.19 + TypeScript SPA
- **Routing**: React Router DOM with BrowserRouter (client-side routing)
- **Build Output**: `dist/` directory (Vite default)
- **Build Command**: `npm run build`
- **No existing deployment config**: Currently set up for Lovable platform deployment only

## Required Changes

### 1. Create `_redirects` file for SPA routing
**File**: `public/_redirects`
```
/*    /index.html   200
```
**Why**: Cloudflare Pages needs this to handle client-side routing. All routes should serve index.html so React Router can handle navigation.

### 2. Create `wrangler.toml` configuration (Optional but recommended)
**File**: `wrangler.toml` (root directory)
```toml
name = "animatic-launchpad"
compatibility_date = "2026-01-10"
pages_build_output_dir = "dist"
```
**Why**: Provides explicit configuration for Cloudflare Pages deployment via wrangler CLI. Not strictly required for `wrangler pages deploy` but good for documentation and future automation.

### 3. Update `.gitignore` (if needed)
Ensure `.gitignore` includes:
```
dist
.wrangler
```
**Why**: Don't commit build artifacts or Cloudflare wrangler cache.

### 4. Add deployment script to `package.json`
Add to scripts section:
```json
"deploy": "vite build && wrangler pages deploy dist --project-name=animatic-launchpad"
```
**Why**: Single command to build and deploy. User can also deploy manually with separate commands.

## Deployment Steps

### Step 1: Create SPA redirect file
Create `public/_redirects` with the content above. This file will be copied to `dist/` during build.

### Step 2: Create wrangler configuration
Create `wrangler.toml` in root directory with the configuration above.

### Step 3: Update package.json
Add the deploy script to package.json.

### Step 4: Build the project
Run `npm run build` to generate production build in `dist/` directory.

### Step 5: Deploy to Cloudflare Pages
Run `wrangler pages deploy dist --project-name=animatic-launchpad`

This will:
- Upload the contents of `dist/` to Cloudflare Pages
- Create a new project named "animatic-launchpad" (if it doesn't exist)
- Deploy to production
- Provide a URL like `https://animatic-launchpad.pages.dev`

### Step 6: Verify deployment
- Visit the provided `*.pages.dev` URL
- Test client-side routing by navigating to different routes
- Verify all assets load correctly (fonts, images, etc.)

## Critical Files to Modify
1. `public/_redirects` (create new)
2. `wrangler.toml` (create new)
3. `package.json` (add deploy script)
4. `.gitignore` (verify/update)

## Configuration Details

### Build Settings
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Node version**: Use default (18+ recommended)
- **Install command**: `npm install`

### Cloudflare Pages Settings
- **Framework preset**: None (Vite handles everything)
- **Root directory**: `/` (project root)
- **Environment variables**: None required currently

### SPA Routing Handling
The `_redirects` file with `/* /index.html 200` ensures:
- All routes return index.html with 200 status
- React Router handles client-side navigation
- Direct URL access works (e.g., visiting `/pricing` directly)
- 404 handling delegated to React Router (NotFound component)

## Post-Deployment Verification

### Test checklist:
1. **Homepage loads**: Visit `https://animatic-launchpad.pages.dev/`
2. **Client-side routing works**: Navigate through the site
3. **Direct URL access**: Try visiting `https://animatic-launchpad.pages.dev/*` (should not 404)
4. **Static assets load**: Check fonts, images, CSS
5. **404 handling**: Visit non-existent route - should show NotFound component
6. **Dark mode works**: Toggle theme if applicable

### Commands for testing:
```bash
# Local preview of production build
npm run build && npm run preview

# Check build output
ls -la dist/
```

## Rollback Plan
If deployment fails or has issues:
1. Previous deployments remain accessible via Cloudflare dashboard
2. Can rollback to previous deployment in Cloudflare Pages dashboard
3. Can redeploy with `wrangler pages deploy dist --project-name=animatic-launchpad`

## Notes
- No backend or API routes - pure static SPA
- No environment variables currently in use
- Build time: ~30-60 seconds typically
- Deploy time: ~1-2 minutes typically
- No breaking changes to existing code - all changes are additive configuration files
