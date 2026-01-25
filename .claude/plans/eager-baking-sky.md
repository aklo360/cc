# Plan: VPS Claude — Autonomous AI Co-Founder

## Vision
Deploy Claude Code on a VPS as an autonomous agent that:
- Monitors email/calendar proactively
- Browses the web independently
- Communicates via Telegram/Email drafts (NEVER sends emails)
- Runs 24/7 without interrupting local work
- Supports screenshare/co-work sessions

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         VPS (Hetzner)                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  Claude Code    │  │  MCP Servers    │  │  Browser    │ │
│  │  CLI + Agent    │  │  Gmail/GCal/    │  │  Playwright │ │
│  │                 │  │  Docs/Slack     │  │  or Stagehand│ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘ │
│           │                    │                   │        │
│  ┌────────▼────────────────────▼───────────────────▼──────┐ │
│  │                    Orchestrator                         │ │
│  │  (Gmail Push/Pub/Sub + systemd + Telegram webhooks)    │ │
│  └────────┬───────────────────────────────────────────────┘ │
└───────────┼─────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────┐
│                    Communication Layer                     │
│     Telegram Bot    │    Email Drafts    │    Web UI     │
└───────────────────────────────────────────────────────────┘
            │
            ▼
        [ AKLO ]
```

---

## Recommended Stack

### 1. VPS Provider Comparison

| Provider | 16GB Plan | Price/mo | Pros | Cons |
|----------|-----------|----------|------|------|
| **Hetzner** | CPX31 | ~$20 | Best price/perf, EU privacy, 20TB bandwidth | EU-only datacenters |
| **Vultr** | 16GB High Freq | ~$48 | US/global DCs, fast NVMe | 2x price |
| **DigitalOcean** | Premium 16GB | ~$68 | Great docs, US-based | 3x price |
| **Linode** | 16GB | ~$96 | Reliable, Akamai network | 4x+ price |
| **Oracle Cloud** | **FREE ARM** | **$0** | 24GB RAM free forever | ARM (compatibility), Oracle |
| **Contabo** | VPS L | ~$12 | Ultra cheap | Slower support, oversold |

**Recommendations:**

1. **Hetzner CPX31** (~$20) — Best overall. EU location is fine for your use case.

2. **Oracle Cloud Free Tier** ($0) — 4 ARM cores + 24GB RAM + 200GB storage FREE forever. Catch: ARM architecture (most things work, but some Node packages need recompile). Oracle account can be annoying to set up.

3. **Vultr High Frequency** (~$48) — If you want US datacenter + fast NVMe. 2x Hetzner price.

*Avoid: Contabo (oversold), AWS/GCP (expensive + complex)*

---

**Selected: Oracle Cloud Free Tier** ($0/mo forever)
| Spec | Value |
|------|-------|
| CPU | 4 ARM cores (Ampere A1) |
| RAM | **24GB** |
| Storage | 200GB block storage |
| Bandwidth | 10TB/mo |
| Price | **FREE** |

**ARM Architecture Notes:**
- Node.js: ✅ Works natively on ARM
- Claude Code CLI: ✅ Should work (Node-based)
- Playwright: ✅ ARM builds available
- npm packages: 99% work, rare ones may need `npm rebuild`
- Chrome/Chromium: ✅ ARM builds available

**Oracle Cloud Setup Tips:**
- Use personal email (not work) for smoother signup
- Avoid VPN during signup (fraud detection)
- Pick region with capacity (US East Ashburn usually good)
- Create "Always Free" eligible VM (Ampere A1.Flex shape)

*Modular design: Bitcoin node + mempool.space = separate VPS later*

### 2. Core Runtime
- **Claude Code CLI** with your existing MCPs migrated
- **tmux/screen** for persistent sessions
- **Supervisor** or **systemd** for process management

### 3. MCP Servers (migrate from local)
- Gmail MCP (both accounts) — token files copied over
- Google Calendar MCP (both accounts)
- Google Docs MCP
- **NEW**: Slack MCP (for bidirectional comms)
- **NEW**: Browser MCP (Playwright or Stagehand)

### 4. Trigger Modes
| Mode | Tool | Use Case |
|------|------|----------|
| **Real-time email** | Gmail Push (Pub/Sub) | Instant triage as emails arrive |
| Scheduled | cron | Daily digest, calendar prep (8am) |
| Always-on | tmux session | You SSH in and work together |
| Manual | SSH + claude | Ad-hoc commands |

**Gmail Push Setup:**
- Enable Gmail API + Pub/Sub in GCP
- Create Pub/Sub topic + subscription
- VPS runs webhook endpoint to receive push notifications
- Instant processing: no polling, no delays

### 5. Communication Channels
| Channel | Tool | Use Case |
|---------|------|----------|
| **Telegram** | Telegram Bot API | Primary comms, instant alerts, bidirectional chat |
| Email (DRAFTS ONLY) | Gmail MCP `draft_email` | Prepare emails for your review — NEVER auto-send |
| Web UI | Simple dashboard | View logs, action history, status |

**Email Safety Rule:** Claude can ONLY use `draft_email` — never `send_email`. All outgoing emails require your manual review and send.

**Telegram Bot Setup:**
- Create bot via @BotFather (instant, free)
- Get bot token + your chat ID
- Claude sends messages via Telegram Bot API
- You can reply to Claude directly in Telegram

### 6. Browser Automation
- **Stagehand** (AI-native browser control) or
- **Playwright MCP** (programmatic browser)
- Use cases: Research, form filling, scraping, testing

### 7. Screenshare/Co-work
- **VS Code Remote SSH** — open VPS files in your local VS Code
- **ttyd** — web-based terminal, share a URL to watch Claude work
- **tmux attach** — SSH in and pair in the same terminal

---

## Implementation Phases

### Phase 1: Oracle Cloud Setup (Day 1)
1. Create Oracle Cloud account (personal email, no VPN)
2. Create Always Free VM: Ampere A1.Flex, 4 cores, 24GB RAM, Ubuntu 22.04
3. Configure VCN/subnet for SSH access (port 22)
4. Basic hardening (SSH keys, fail2ban, iptables)
5. Install Node.js (ARM build), npm, Claude Code CLI
6. Set up tmux + supervisor

### Phase 2: MCP Migration (Day 1-2)
1. Copy MCP configs + token files from local machine
2. Test each MCP works on VPS
3. Fix any path/permission issues

### Phase 3: Communication Layer (Day 2-3)
1. Create Telegram bot via @BotFather
2. Get bot token + your chat ID
3. Set up Telegram MCP or simple API wrapper
4. Test bidirectional messaging

### Phase 4: Gmail Push + Automation (Day 3-4)
1. Enable Pub/Sub API in GCP
2. Create topic + push subscription pointing to VPS webhook
3. Set up webhook endpoint on VPS (simple Express server)
4. Configure Gmail watch on both inboxes
5. Set up cron for daily digest (8am EST)

### Phase 5: Browser (Day 4-5)
1. Install Playwright + dependencies
2. Set up browser MCP or Stagehand
3. Test basic browsing tasks

### Phase 6: Polish (Day 5+)
1. Fine-tune alert thresholds
2. Build "daily briefing" routine
3. Document handoff protocols

---

## Future Modular Additions (Separate VPS)

- **Bitcoin Node VPS**: Bitcoin Core + mempool.space fork
- **Additional MCPs**: Notion, Linear, GitHub, etc.

---

## Files to Migrate

```
~/.claude/                    # Claude Code config
~/.claude/google-docs-mcp/    # Docs MCP + tokens
~/.gmail-mcp/                 # Gmail MCP credentials
~/.config/google-calendar-mcp/ # Calendar tokens
```

---

## Cost Estimate

| Item | Monthly Cost |
|------|-------------|
| Oracle Cloud Free Tier (24GB ARM) | **$0** |
| Telegram Bot | FREE |
| Domain (optional) | ~$1 |
| **Total** | **$0-1/mo** |

*Bitcoin node = separate VPS later (~€20-30/mo additional)*

---

## Security Considerations

- All API keys/tokens stored in encrypted env files
- SSH key-only auth (no passwords)
- Firewall: only 22 (SSH) + 443 (webhook endpoint)
- Consider: WireGuard VPN for extra security

---

## Verification

1. SSH into VPS, run `claude` — should have all MCPs working
2. Send test email to yourself → Gmail Push triggers → Telegram alert arrives
3. Message Claude via Telegram → Claude responds
4. Check Gmail drafts → Claude's draft reply is there (NOT sent)
5. Open VS Code Remote → see Claude's workspace
6. Run a browser task → completes and reports back via Telegram

---

## Day-1 Autonomous Routines

1. **Real-time Email Triage** (instant via Gmail Push)
   - As emails arrive → Claude reads and categorizes
   - Urgent (Merck/client) → Telegram alert + draft reply
   - Normal → queued for digest
   - Auto-bump Merck to #1 priority in vault

2. **Morning Digest** (8am EST via cron)
   - Summary of overnight emails
   - Today's calendar briefing
   - Conflicts/gaps analysis
   - Sent via Telegram

3. **Draft Preparation**
   - Claude drafts replies for your review
   - NEVER sends — only `draft_email`
   - You review + send manually

---

## Decisions Made

- **Real-time triggers**: Gmail Push (Pub/Sub) — no polling
- **Comms**: Telegram (free, instant, bidirectional)
- **Email rule**: DRAFTS ONLY — never auto-send
- **Provider**: Oracle Cloud Free Tier (4 ARM cores, 24GB RAM, $0/mo)
- **Architecture**: Modular — Bitcoin node on separate VPS later
