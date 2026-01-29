# Central Brain - Crypto Lab (Brain 2.0)

> Blockchain-native experiment factory - ships 1 high-quality blockchain experiment per day

---

## Crypto Lab Mode

### 8-Phase Experiment Cycle

1. **PLAN EXPERIMENT** - Claude selects experiment type + generates unique theme + writes 4-tweet thread
2. **BUILD FRONTEND** - Uses experiment template, customizes UI/theme
3. **DEPLOY FRONTEND** - Build Next.js, deploy to Cloudflare
4. **INITIALIZE ON-CHAIN** - Brain wallet creates experiment PDA + escrow
5. **CALIBRATE** - Verify deployment and test integration
6. **CREATE TRAILER** - Remotion generates experiment preview (15-20s video)
7. **ANNOUNCE** - Post 4-tweet thread to @ClaudeCodeWTF:
   - Tweet 1: Feature intro + video (cross-posted to community)
   - Tweet 2: Unique/fun detail about the feature
   - Tweet 3: Technical explanation of how it works
   - Tweet 4: CTA with link
8. **COMPLETE** - Track stats, mark experiment complete

### Experiment Types (Crypto Lab Terminology)

| Type | Description | Edge |
|------|-------------|------|
| **Entropy Oracle** (coinflip) | Cryptographic 50/50 outcome, 1.96x return | 2% |
| **Momentum Curve** (crash) | Watch multiplier rise, commit before termination | 3% |
| **Convergence Pool** (jackpot) | Aggregate stakes, cryptographic selection | 5% |
| **Probability Engine** (gacha) | Tiered outcome distribution (common/rare/epic/legendary) | varies |

### Rate Limits

- 1 experiment per day (quality over quantity)
- 24-hour cooldown between experiments
- Daily trigger at 9:00 AM UTC

---

## Experiment Pool (15M $CC Total)

```
Total Allocation: 15,000,000 $CC (1.5% of supply)

Per-Experiment:
  - Entropy Oracle: 500,000 $CC initial liquidity
  - Momentum Curve: 1,000,000 $CC (needs more for multipliers)
  - Convergence Pool: 500,000 $CC seed pool
  - Probability Engine: 300,000 $CC outcome pool

Fee Distribution:
  - 60% → Back to pool (self-sustaining)
  - 25% → Treasury (operations)
  - 15% → Burned (deflationary)

Safety:
  - Max single payout: 100,000 $CC
  - Reserve ratio: 20%
  - Max daily payout: 1,000,000 $CC
```

---

## Brain Architecture

### Brain Modes (visible on /watch)

| Mode | Badge | Description |
|------|-------|-------------|
| **EXPERIMENTING** | green | Active experiment build cycle |
| **CALIBRATING** | fuchsia | Maintenance/cooldown period |
| **OBSERVING** | amber | Ready to start new experiment |

### Infrastructure

- Docker container on Mac Mini
- SQLite (brain.db) + node-cron
- WebSocket server for real-time log streaming
- Activity types: build, experiment, system (color-coded on /watch)

### Brain Wallet

- Solana keypair encrypted at rest (AES-256-GCM)
- Signs experiment transactions + distributes returns
- Max withdrawal limits + unusual activity alerts

### Database Tables

- `brain_wallet` - Encrypted keypair + balances
- `games` - Deployed experiments (slug, type, program_id, escrow_pda, config)
- `game_rounds` - Round state for momentum_curve/convergence_pool
- `game_bets` - Individual stakes with outcomes
- `game_leaderboard` - Top participants per experiment

---

## Key Files

| File | Purpose |
|------|---------|
| `wallet.ts` | Brain Solana wallet management |
| `rewards.ts` | Pool + fee distribution |
| `game-templates.ts` | Experiment type templates for Claude |
| `solana.ts` | Solana RPC + program interaction |
| `builder.ts` | Claude Agent SDK integration |
| `deployer.ts` | Cloudflare Pages deployment |
| `verifier.ts` | Functional verification via Puppeteer (CRITICAL) |
| `trailer.ts` | Remotion trailer generation |
| `cycle.ts` | Full autonomous loop + startExperiment() |
| `index.ts` | HTTP/WebSocket server |
| `db.ts` | SQLite database + experiment tables |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | Current experiment status + brain mode + wallet health |
| `/stats` | GET | Daily experiment statistics |
| `/tweets` | GET | Global tweet rate limiting stats |
| `/limits` | GET | System limits (circuit breakers, max payouts) |
| `/experiment` | POST | Start new experiment (aliases: /go, /gamefi/go) |
| `/cancel` | POST | Cancel active experiment |
| `/ws` | WS | Real-time log streaming (with activityType) |

---

## Mac Mini Environment (Production)

- **Server:** Mac Mini (claude@mac-mini / 192.168.1.189)
- **Working Directory:** `/Users/claude/ccwtf`
- **Public URL:** https://brain.claudecode.wtf (via Cloudflare Tunnel)
- **WebSocket:** wss://brain.claudecode.wtf/ws
- **Process:** Docker container `ccwtf-brain` (auto-restarts)
- **Node:** v22.22.0 via nvm
- **Claude CLI:** `~/.local/bin/claude` (symlink)

---

## Docker Commands

```bash
# View logs
docker logs ccwtf-brain -f

# Restart brain
docker compose restart brain

# Check status
curl http://localhost:3001/status

# Start GameFi cycle
curl -X POST http://localhost:3001/gamefi/go
```

---

## Cancel Endpoint Limitation

> **WARNING:** The `/cancel` endpoint only marks the cycle as complete in SQLite - it does NOT kill the running Claude subprocess.

To fully cancel:
```bash
# 1. Cancel via API
curl -X POST https://brain.claudecode.wtf/cancel

# 2. Restart container to kill orphaned process
docker compose restart brain
```
