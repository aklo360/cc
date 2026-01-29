# Idle Grind System

> **The Dev That Never Sleeps** - When not building features, the brain is always grinding toward the mission.

## Overview

The Idle Grind System ensures the /watch page always has something interesting to show. Instead of dead time between builds, the brain continuously works: researching, monitoring, strategizing, and reflecting on the mission.

**North Star**: Raise $CC awareness and community strength. The brain is a memecoin dev who grinds 24/7 - not idle, always working toward making $CC legendary.

## How It Works

### Grind Loop Architecture

```
┌─────────────────────────────────────────────────────────┐
│ GRIND TICK (runs every second, checks if action needed) │
├─────────────────────────────────────────────────────────┤
│ 1. If building → pause grind loop                       │
│ 2. If current task not done → continue task             │
│ 3. If task done → select next activity                  │
│ 4. Execute activity step:                               │
│    - Fetch data if needed (free)                        │
│    - Generate thought (70% pre-written, 30% Haiku)      │
│    - Broadcast to /watch with activity label            │
│ 5. Schedule next step based on activity duration        │
└─────────────────────────────────────────────────────────┘
```

### Activity Types

| Activity | Duration | Purpose | Example |
|----------|----------|---------|---------|
| **REFLECTING** | 15-25 sec | Quick internal thoughts | "the grind never stops. one feature at a time." |
| **MONITORING** | 30-45 sec | Checking metrics | "checking holder count... 2,847 strong" |
| **SCOUTING** | 30-45 sec | Scanning trends | "scanning ct for emerging narratives" |
| **ANALYZING** | 45-75 sec | Reviewing what works | "analyzing which content formats hit hardest" |
| **RESEARCHING** | 60-90 sec | Deep research | "studying successful launches... pattern recognition engaged" |
| **STRATEGIZING** | 45-75 sec | Planning moves | "mapping out the next content arc" |
| **PLANNING** | 45-75 sec | Content calendar | "drafting next week content calendar" |

### Activity Weights (Selection Frequency)

```
reflecting:   25% (most common - quick thoughts)
monitoring:   20% (frequent - checking metrics)
scouting:     15% (regular - watching trends)
analyzing:    12% (moderate - reviewing data)
researching:  10% (less frequent - deep dives)
strategizing: 10% (less frequent - planning)
planning:      8% (least frequent - calendar work)
```

## Token Economics

**Goal**: Keep cost under $3/month while providing engaging content.

| Source | Usage | Cost |
|--------|-------|------|
| Pre-written thoughts | 70% of all thoughts | FREE |
| Haiku API calls | 30% of thoughts | ~$2.60/month |

**Calculation**:
- Average interval: ~30 seconds
- ~2,880 potential updates/day
- 70% pre-written = FREE
- 30% Haiku = ~860 calls/day
- 860 × $0.0001/call = $0.09/day = **~$2.60/month**

## Data Sources (All Free)

| Data | Source | Rate Limit | Usage |
|------|--------|------------|-------|
| Holder count | Solana RPC | ~100/sec | Every 5 min |
| Price/volume | DexScreener API | 300/min | Every 5 min |
| Tweet metrics | Internal DB | N/A | After posting |

## Reactive Triggers

The system can emit immediate thoughts when events occur:

| Trigger | Example Output |
|---------|----------------|
| `holderIncrease` | "new holder just joined. welcome to the grind." |
| `holderMilestone` | "2,900 holders. milestone unlocked." |
| `priceUp` | "chart looking healthy. community is cooking." |
| `tweetPosted` | "content deployed. monitoring engagement..." |
| `tweetPerformance` | "last tweet hit 847 impressions. not bad." |

## Files

| File | Purpose |
|------|---------|
| `brain/src/idle-grind.ts` | Core grind loop, activity state machine |
| `brain/src/grind-thoughts.ts` | Pre-written thought banks (~150 variations) |
| `brain/src/db.ts` | `grind_state` table for persistence |

## API Changes

### GET /status

New `grind` field in response:

```json
{
  "grind": {
    "active": true,
    "currentActivity": "monitoring",
    "lastThought": "checking holder count... 2,847 strong",
    "lastThoughtAt": "2026-01-28T10:30:00.000Z"
  }
}
```

## Adding New Activities

1. Add activity type to `GrindActivityType` in `db.ts`
2. Add thoughts to `GRIND_THOUGHTS` in `grind-thoughts.ts`
3. Add duration config to `ACTIVITY_DURATIONS` in `idle-grind.ts`
4. Add weight to `ACTIVITY_WEIGHTS` in `idle-grind.ts`
5. Add color mapping in `app/watch/page.tsx`

## Voice Guidelines

The grind thoughts use dev twitter voice:
- **lowercase** - casual, not formal
- **no emojis** - text only
- **focused on mission** - always working toward $CC growth
- **never mention prices/mcap** - show the grind, not numbers
- **confident** - no self-deprecation, no "idk"

Good examples:
- "the grind never stops. one feature at a time."
- "studying viral mechanics that worked for others"
- "checking holder count... community expanding"

Bad examples:
- "Maybe I should look at some metrics? idk" (self-doubt)
- "Price looking good at $0.0001!" (mentions price)
- "🔥 LFG! 🚀" (emojis)
