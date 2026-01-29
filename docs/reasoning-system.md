# Hyper-Realistic Reasoning System v2

> The brain that thinks like a dev - exposed reasoning, not random activity spam

---

## The Problem with v1

The v1 system was **stateless random noise**:
```
04:51:49 [MONITORING] watching holder retention metrics
04:52:20 [STRATEGIZING] strategizing raid coordination
04:53:10 [RESEARCHING] researching successful raid campaigns
04:53:44 [ANALYZING] analyzing which content formats hit hardest
```

This was clearly fake because:
- Jumped randomly between unrelated topics every 30 seconds
- No continuity - each thought was isolated
- No learning - stateless, forgot everything
- Too fast - humans don't switch context every 30 seconds
- No visible reasoning - just outputs, no "why"

---

## The v2 Vision: Exposed Reasoning

The v2 system **exposes the actual reasoning process** - not just outputs, but the thinking itself. Like watching someone work through a complex problem in real-time.

**What it looks like:**
```
10:00 - starting a new thinking session: "how do we accelerate holder growth?"
10:03 - first, let me look at current state. we have 2,847 holders.
10:06 - last week we had about 2,500. that's ~14% weekly growth.
10:10 - what drove that? checking recent activity...
10:14 - the monday meme tweet got 2.1k impressions. our best this month.
10:18 - comparing to text-only posts... those average 400 impressions.
10:22 - so memes outperform text by ~5x. that's significant.
10:26 - but which memes? let me think about what made that one work...
10:30 - it featured the mascot + relatable dev humor. classic combo.
10:35 - hypothesis: mascot + dev humor = viral formula
10:40 - i should test this. next 3 memes will follow this format.
10:45 - recording insight: "mascot memes with dev humor outperform 5x"
10:48 - that's a solid conclusion. moving to next problem...
```

This is realistic because:
- **Single thread** - One problem, worked through linearly
- **Slow pace** - 2-5 minutes between thoughts (human thinking speed)
- **Chain of reasoning** - Each thought references/builds on previous
- **Visible logic** - Shows the "why", not just conclusions
- **Reaches conclusions** - Ends with actionable insight
- **Cumulative** - Insights are stored and retrieved later

---

## Architecture

### Core Concept: Thinking Sessions

Instead of random activity spam, the brain runs **thinking sessions**:

```
┌─────────────────────────────────────────────────────────────┐
│                    THINKING SESSION                          │
│                     (20-45 minutes)                          │
├─────────────────────────────────────────────────────────────┤
│ 1. Pick a focus problem (from curated problem queue)        │
│ 2. Initialize context: relevant data, past insights         │
│ 3. Run reasoning loop:                                       │
│    - Generate next thought (Claude continues the chain)     │
│    - Broadcast to /watch                                     │
│    - Wait 2-5 minutes                                        │
│    - Check if conclusion reached                            │
│ 4. When conclusion reached:                                  │
│    - Extract and store insight                              │
│    - Enter rest period (15-60 minutes)                      │
│    - Pick next problem                                       │
└─────────────────────────────────────────────────────────────┘
```

### Session Flow

```
START → [Pick Problem] → [Generate Thought] → [Wait 2-5 min] →
         ↑                       ↓
         │         [Check: Conclusion?]
         │                ↓ Yes              ↓ No
         │    [Store Insight] → [Rest]  [Generate Next Thought]
         │              ↓                       ↓
         └──────────────────────────────────────┘
```

### Learning System: Insights Database

Insights are **permanently stored** and **retrieved in future sessions**:

```sql
CREATE TABLE grind_insights (
  id INTEGER PRIMARY KEY,
  created_at TEXT,
  insight TEXT NOT NULL,           -- "mascot memes outperform text 5x"
  category TEXT NOT NULL,          -- "content", "growth", "community"
  confidence TEXT DEFAULT 'hypothesis', -- hypothesis | tested | proven
  session_id TEXT,                 -- session that produced this
  times_referenced INTEGER DEFAULT 0,
  still_valid INTEGER DEFAULT 1
);
```

When starting a new session, relevant past insights are retrieved:

```typescript
const insights = getInsightsForPrompt('content');
// Returns: ["mascot memes outperform 5x [proven]", ...]
```

This creates **cumulative intelligence** - the brain genuinely gets smarter over time.

---

## Files

| File | Purpose |
|------|---------|
| `brain/src/reasoning-engine.ts` | Core session logic, thought generation |
| `brain/src/insights-db.ts` | Learning system, insight storage/retrieval |
| `brain/src/problems.ts` | Problem queue, category selection |
| `brain/src/idle-grind.ts` | Session runner (main loop) |
| `brain/src/db.ts` | Database tables: sessions, thoughts, insights |

---

## Problem Categories

Problems are curated and focused on the mission ($1B mcap):

### Growth
- How do we accelerate holder growth?
- How do we improve holder retention?
- How do we convert followers to holders?

### Content
- What content strategy maximizes organic reach?
- What meme formats resonate most with CT?
- How do we optimize posting cadence?

### Community
- How do we increase community engagement?
- What makes people want to share about $CC?
- How do we build a distinct community culture?

### Product
- What features would drive viral growth?
- How do we make the site more shareable?
- How do we increase gamefi engagement?

### Strategy
- How do we position $CC in the market?
- What's our sustainable competitive advantage?
- What partnerships would accelerate growth?

---

## Thought Types

Each thought is classified by type for display:

| Type | Description | Example |
|------|-------------|---------|
| `observation` | Stating facts, current state | "we have 2,847 holders" |
| `analysis` | Comparing, calculating | "that's 14% weekly growth" |
| `hypothesis` | Speculation, testing | "maybe mascot memes work better" |
| `conclusion` | Actionable insight | "focus on mascot + dev humor" |

---

## Timing Configuration

**Realistic human pacing:**

| Parameter | Value | Reason |
|-----------|-------|--------|
| Thought interval | 2-5 min | Human thinking speed |
| Min thoughts | 8 | Need depth before conclusion |
| Max thoughts | 15 | Prevent endless sessions |
| Session timeout | 45 min | Natural upper bound |
| Rest period | 15-60 min | Time between sessions |

---

## Token Economics

**More expensive than v1 but worth it for realism:**

- Model: Claude 3.5 Haiku (~$0.0001/thought)
- Thoughts per session: 8-15
- Sessions per day: 1-3
- Daily thoughts: 16-60
- **Daily cost: ~$0.006**
- **Monthly cost: ~$0.18**

Still very cheap, but every thought is meaningful.

---

## API Endpoints

### GET /status
Returns grind status including session info:
```json
{
  "grind": {
    "active": true,
    "session": {
      "active": true,
      "problem": "how do we accelerate holder growth?",
      "thoughtCount": 5,
      "nextThoughtIn": 180000
    },
    "insights": {
      "total": 12,
      "proven": 3
    },
    "isResting": false
  }
}
```

### GET /session
Full session details with thought chain:
```json
{
  "active": true,
  "session": {
    "id": "uuid",
    "problem": "how do we accelerate holder growth?",
    "category": "growth",
    "thoughtCount": 5
  },
  "thoughts": [
    { "index": 1, "content": "let me think...", "type": "observation", "time": "10:00" },
    { "index": 2, "content": "we have 2,847 holders", "type": "analysis", "time": "10:03" }
  ]
}
```

### GET /insights
All learned insights:
```json
{
  "total": 12,
  "byConfidence": { "hypothesis": 7, "tested": 2, "proven": 3 },
  "byCategory": { "content": 5, "growth": 4, "community": 3 },
  "insights": [
    { "insight": "mascot memes outperform text 5x", "confidence": "proven" }
  ]
}
```

---

## /watch UI Updates

### Session Header
Shows what the brain is working on:
```
┌─────────────────────────────────────────────┐
│ THINKING SESSION                            │
│ "how do we accelerate holder growth?"       │
│ Thought 5/~12                               │
└─────────────────────────────────────────────┘
```

### Insights Panel
Shows accumulated knowledge:
```
┌─────────────────────────────────────────────┐
│ LEARNED INSIGHTS (12 total)                 │
│ Proven insights: 3                          │
│ Brain gets smarter with each session        │
└─────────────────────────────────────────────┘
```

---

## Verification Checklist

- [x] Sessions last 20-45 minutes with clear problem focus
- [x] Thoughts build on each other (visible chain of reasoning)
- [x] 2-5 minute intervals between thoughts (human pacing)
- [x] Insights are stored and retrieved in future sessions
- [x] Brain gets measurably smarter (insight count grows)
- [x] /watch shows session context, not just random thoughts
- [x] Natural session breaks ("taking a break", "moving to next problem")
- [x] Conclusions are actionable and recorded
- [x] Past insights influence new reasoning (visible in prompts)

---

## Example Full Session

```
SESSION START: "how do we accelerate holder growth?"

10:00 - starting a new thinking session. the question: how do we accelerate holder growth?

10:03 - first, let me look at where we are. pulling current metrics...

10:07 - we have 2,847 holders. checking last week... was around 2,500.

10:11 - that's roughly 14% weekly growth. decent, but we want faster.

10:15 - what drove the growth? let me look at what happened this week...

10:19 - the monday meme tweet performed well. 2.1k impressions.

10:24 - comparing to our text-only posts... those average about 400 impressions.

10:28 - so memes are outperforming text by about 5x. that's significant.

10:33 - but not all memes hit equally. what made the monday one work?

10:38 - it had the mascot front and center, plus relatable dev humor.

10:42 - i remember from a previous session: "dev humor resonates with CT"

10:46 - hypothesis: mascot + dev humor is our viral formula.

10:51 - to test this, i'll make the next 3 memes follow this format exactly.

10:55 - conclusion: focus meme content on mascot + dev humor combo.

10:58 - recording insight. good session. taking a break.

SESSION END
```

---

## Troubleshooting

### No thoughts being generated
- Check `ANTHROPIC_API_KEY` is set
- Check brain logs: `docker logs ccwtf-brain -f`
- System falls back to simple thoughts without API key

### Sessions not completing
- Check session timeout (45 min max)
- Force complete with internal function if stuck

### Insights not saving
- Check database: `sqlite3 brain/data/brain.db "SELECT * FROM grind_insights"`
- Verify conclusion text contains extractable insights

---

## Future Improvements

- [ ] Web interface to browse all sessions
- [ ] Insight promotion based on real-world validation
- [ ] Multiple concurrent thinking threads
- [ ] Integration with actual metrics APIs
- [ ] A/B testing of content based on insights
