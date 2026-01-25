# Plan: Remove Duplicate /review Feature

## Changes

1. **Delete** `app/review/` directory
2. **Edit** `app/page.tsx` - Remove the /review button
3. **Edit** `brain/src/cycle.ts` - Remove `/review` from EXISTING FEATURES list

Keep /roast link on homepage (brain might build it later).

## Verification
- `npm run build` succeeds
- Deploy to Cloudflare
