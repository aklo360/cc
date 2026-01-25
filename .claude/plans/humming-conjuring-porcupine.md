# Comprehensive Security Audit Plan

## Executive Summary

This audit identified **critical security issues** that need immediate attention before production deployment. The most severe findings relate to API key exposure, weak authorization, and an open RPC proxy.

---

## Master Security Checklist

### CRITICAL (Must Fix Before Production)

- [ ] **1. Exposed API Keys in Frontend** - Helius RPC API key exposed via `NEXT_PUBLIC_*` variables
  - Files: `.env.local` lines 1-2, `.env` lines 11-14
  - Issue: API keys bundled into client JavaScript, visible to anyone
  - Fix: Remove `NEXT_PUBLIC_SOLANA_RPC_URL`, use `/rpc` proxy instead

- [ ] **2. Wallet Private Key in Environment** - `BUYBACK_WALLET_SECRET` contains full Solana keypair
  - File: `.env` line 49
  - Risk: If .env leaks or was ever committed, wallet is compromised
  - Fix: Use Cloudflare Workers Secrets (`wrangler secret put`), rotate the key

- [ ] **3. Default-Allow Authorization Bug** - Buyback endpoints allow all requests if token not configured
  - File: [buyback.ts:1388](apps/api/src/buyback.ts#L1388)
  - Code: `if (!config.triggerToken) return true;`
  - Fix: Change to `return false` when token not configured

- [ ] **4. Open RPC Proxy** - `/rpc` endpoint proxies all requests to private Solana RPC without auth
  - File: [index.ts:26-40](apps/api/src/index.ts#L26-L40)
  - Risk: Anyone can use your RPC quota, potential for abuse
  - Fix: Add authentication or rate limiting, or remove if not needed in production

- [ ] **5. No Rate Limiting** - All API endpoints vulnerable to abuse/DDoS
  - Files: All route handlers in `routes.ts`
  - Fix: Implement Cloudflare Rate Limiting or custom per-IP limits

### HIGH PRIORITY

- [ ] **6. No CSRF Protection on POST Endpoints**
  - Files: [profiles/route.ts:603-786](apps/ui/src/app/api/tapestry/profiles/route.ts#L603-L786)
  - Fix: Add origin validation, SameSite=Strict cookies

- [ ] **7. No Authentication on Profile API**
  - Issue: Anyone can create/update profiles for any wallet address
  - Fix: Require wallet signature verification on POST

- [ ] **8. API Key in URL Parameters**
  - File: [client.ts:48](apps/ui/src/server/tapestry/client.ts#L48)
  - Issue: Tapestry API key added to URL, visible in logs
  - Fix: Use `Authorization: Bearer` header instead

- [ ] **9. Missing Security Headers**
  - Issue: No CSP, X-Frame-Options, HSTS headers
  - Fix: Add security headers in Next.js config or middleware

- [ ] **10. Sensitive Error Details Exposed**
  - File: [routes.ts:69-71, 157-164, 247-250](apps/api/src/routes.ts#L69-L71)
  - Issue: Raw error messages from upstream services returned to client
  - Fix: Return generic error messages, log details server-side only

### MEDIUM PRIORITY

- [ ] **11. Input Validation Gaps**
  - Files: [routes.ts:98-165](apps/api/src/routes.ts#L98-L165), [profiles/route.ts:603-623](apps/ui/src/app/api/tapestry/profiles/route.ts#L603-L623)
  - Missing: Solana address format validation, string length limits, numeric bounds
  - Fix: Add validation library (zod) or manual checks

- [ ] **12. CSS Injection via Avatar URL**
  - File: [profile/page.tsx:443](apps/ui/src/app/profile/page.tsx#L443)
  - Issue: `backgroundImage: url(${avatarUrl})` without validation
  - Fix: Validate URL format or use CSS.escape()

- [ ] **13. Verbose Console Logging**
  - File: [routes.ts:104-111](apps/api/src/routes.ts#L104-L111)
  - Issue: Config details logged (wsUrl, regions)
  - Fix: Remove or reduce logging in production

- [ ] **14. Missing Content-Type Validation**
  - Issue: POST endpoints don't check Content-Type header
  - Fix: Validate `Content-Type: application/json` on POST

- [ ] **15. Unvalidated External Images**
  - File: [profile/page.tsx:550, 619](apps/ui/src/app/profile/page.tsx#L550)
  - Fix: Add `referrerpolicy="no-referrer"` to img tags

### LOW PRIORITY (Defense in Depth)

- [ ] **16. Timing Attack on Token Comparison**
  - File: [buyback.ts:1392](apps/api/src/buyback.ts#L1392)
  - Fix: Use constant-time comparison for token validation

- [ ] **17. No Key Rotation Mechanism**
  - Issue: No automated rotation for API keys
  - Fix: Document key rotation procedure, implement if possible

- [ ] **18. Cron Job Monitoring**
  - File: [wrangler.toml:22](apps/api/wrangler.toml#L22)
  - Issue: Failed crons fail silently
  - Fix: Add alerting/monitoring

---

## Implementation Plan

### Phase 1: Critical Fixes (Immediate)

1. **Remove exposed API keys from frontend**
   - Delete `NEXT_PUBLIC_SOLANA_RPC_URL` and `NEXT_PUBLIC_SOLANA_WS_URL` from `.env.local`
   - Ensure frontend uses `/rpc` proxy route

2. **Fix authorization default-allow bug**
   - Edit [buyback.ts:1388](apps/api/src/buyback.ts#L1388)
   - Change `if (!config.triggerToken) return true;` to `return false;`

3. **Secure RPC proxy**
   - Option A: Add authentication check to `/rpc` endpoint
   - Option B: Remove `/rpc` endpoint for production (keep for dev only)
   - Option C: Add rate limiting via Cloudflare

4. **Move secrets to Cloudflare Workers Secrets**
   - Run `wrangler secret put BUYBACK_WALLET_SECRET`
   - Run `wrangler secret put TITAN_TOKEN`
   - Run `wrangler secret put ME_API_KEY`
   - Remove from `.env` / wrangler.toml

5. **Rotate compromised credentials**
   - Generate new Helius API key
   - Generate new Tapestry API key
   - Regenerate buyback wallet if it was ever committed

### Phase 2: High Priority Fixes

6. **Add rate limiting**
   - Enable Cloudflare Rate Limiting on the worker
   - Or implement custom rate limiting with KV storage

7. **Add security headers**
   - Create `middleware.ts` in Next.js app
   - Add CSP, X-Frame-Options, HSTS headers

8. **Fix Tapestry API key exposure**
   - Move API key from URL param to Authorization header
   - Update [client.ts](apps/ui/src/server/tapestry/client.ts)

9. **Sanitize error responses**
   - Create error wrapper that logs details but returns generic messages

### Phase 3: Medium Priority Fixes

10. **Add input validation**
    - Install zod
    - Create validation schemas for all endpoints
    - Validate Solana addresses, lengths, numeric ranges

11. **Add wallet signature verification**
    - Require signature on profile POST endpoints
    - Use `@solana/web3.js` for verification

---

## Verification Steps

1. **Test API key exposure**
   - Build frontend: `cd apps/ui && npm run build`
   - Search bundle for API keys: `grep -r "helius" .next/`
   - Should find NO matches

2. **Test authorization**
   - Call POST `/api/frogx/buyback/execute` without token
   - Should return 401/403 (not 200)

3. **Test RPC proxy**
   - If removed: Call `/rpc` should return 404
   - If protected: Call without auth should return 401

4. **Run security scanner**
   - `npm audit` in all packages
   - Consider running OWASP ZAP or similar

5. **Check git history**
   - VERIFIED: Only `.env.example` was committed (contains placeholders)
   - Real `.env` files were never committed to git history
   - No credential rotation needed due to git exposure

---

## Files to Modify

| File | Changes |
|------|---------|
| `apps/api/src/buyback.ts` | Fix authorization, improve error handling |
| `apps/api/src/index.ts` | Secure or remove RPC proxy |
| `apps/api/src/routes.ts` | Add input validation, sanitize errors |
| `apps/ui/src/app/api/tapestry/profiles/route.ts` | Add auth, input validation |
| `apps/ui/src/server/tapestry/client.ts` | Move API key to header |
| `apps/ui/src/app/profile/page.tsx` | Fix CSS injection |
| `apps/ui/src/middleware.ts` | Create for security headers |
| `.env.local` | Remove NEXT_PUBLIC API keys |
| `wrangler.toml` | Remove secrets from vars |
