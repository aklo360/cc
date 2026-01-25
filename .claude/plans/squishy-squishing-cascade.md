# EXIT STRATEGY v2 — PRD Redesign Plan

## Goal
Redesign the game mechanics for faster engagement loops while keeping the 90-day overall arc. Transform 7 slow floors into 100 fast micro-floors.

---

## Key Changes from v1

| Aspect | v1 | v2 |
|--------|----|----|
| Floors | 7 (0-6) | 100 |
| Burn frequency | Every few days | Hourly → 72 hours (scaling) |
| Burn amount | 25K-1M per floor | 5K-50K per floor (progressive) |
| Total burn | ~2M | ~2M |
| SOL payments | Every floor | Per tier only (6 payments) |
| Cooldown | 24 hours | 5-15 minutes |
| Multipliers | 1x-5x across 7 floors | 1x-5x across 6 tiers |

---

## v2 Tier Structure

### Timing Math
- 90 days = 2,160 hours
- 99 floor burns needed (floor 100 is perpetual safety)

### The 6 Tiers

| Tier | Floors | Mult | Burn/Floor | Interval | Tier Duration | SOL Fee |
|------|--------|------|------------|----------|---------------|---------|
| **1 - BASEMENT** | 1-20 | 1x | 5,000 | 1 hour | 20 hrs (~1 day) | 0.2 SOL (entry) |
| **2 - GROUND** | 21-40 | 2x | 10,000 | 3 hours | 60 hrs (~2.5 days) | +0.3 SOL |
| **3 - LOWER** | 41-55 | 2.5x | 15,000 | 8 hours | 120 hrs (~5 days) | +0.3 SOL |
| **4 - MIDDLE** | 56-70 | 3x | 20,000 | 18 hours | 270 hrs (~11 days) | +0.4 SOL |
| **5 - UPPER** | 71-85 | 3.5x | 30,000 | 42 hours | 630 hrs (~26 days) | +0.5 SOL |
| **6 - PENTHOUSE** | 86-99 | 4x | 50,000 | 72 hours | 1,008 hrs (~42 days) | +0.7 SOL |
| **ROOF** | 100 | 5x | — | ∞ | Perpetual | +0.6 SOL |

### Totals
- **Total burn:** 100K + 200K + 225K + 300K + 450K + 700K = **1,975,000 ≈ 2M** ✓
- **Total SOL:** 0.2 + 0.3 + 0.3 + 0.4 + 0.5 + 0.7 + 0.6 = **3.0 SOL** ✓
- **Total time:** ~88-90 days ✓

---

## Cooldown Structure

| Tier | Cooldown |
|------|----------|
| 1 (floors 1-20) | 5 minutes |
| 2 (floors 21-40) | 5 minutes |
| 3 (floors 41-55) | 10 minutes |
| 4 (floors 56-70) | 10 minutes |
| 5 (floors 71-85) | 15 minutes |
| 6 (floors 86-99) | 15 minutes |

Players can burn ahead of the fire as fast as cooldowns allow.

---

## Fire Progression (Micro-Floor Burns)

### How It Works
- Fire burns 1 floor per interval
- Interval increases per tier
- If you're on or below the fire floor → eliminated (0 rewards)

### Fire Schedule (Cumulative)

| Floor # | Time Since Launch |
|---------|-------------------|
| 1 | 1 hour |
| 10 | 10 hours |
| 20 | 20 hours (~Day 1) |
| 30 | 50 hours (~Day 2) |
| 40 | 80 hours (~Day 3.5) |
| 50 | 160 hours (~Day 7) |
| 55 | 200 hours (~Day 8) |
| 65 | 380 hours (~Day 16) |
| 70 | 470 hours (~Day 20) |
| 80 | 890 hours (~Day 37) |
| 85 | 1,100 hours (~Day 46) |
| 95 | 1,820 hours (~Day 76) |
| 99 | 2,108 hours (~Day 88) |

---

## Gameplay Loop Comparison

### v1 (Slow)
```
Day 1: Enter → Day 3: Floor 0 burns → Day 9: Floor 1 burns → ...
(Days between actions)
```

### v2 (Fast)
```
Hour 1: Enter, burn 5K → Hour 2: Burn 5K → Hour 3: Burn 5K → ...
(Minutes/hours between actions - constant engagement)
```

### First 24 Hours in v2:
- 20 burns required just to stay alive
- 100,000 tokens burned
- Intense "day 1 survival" experience
- Then pace slows gradually

---

## Late Entry (Updated)

Late players pay cumulative SOL for all tiers below their entry floor, start at 1x multiplier.

| Entry Day | Fire Floor | Entry Floor | SOL Fee | Start Mult |
|-----------|------------|-------------|---------|------------|
| Day 1 | 0 | 1 | 0.2 SOL | 1x |
| Day 2 | ~20 | 21 | 0.5 SOL | 1x (can burn to 2x) |
| Day 4 | ~40 | 41 | 0.8 SOL | 1x (can burn to 2.5x) |
| Day 9 | ~55 | 56 | 1.2 SOL | 1x (can burn to 3x) |
| Day 20 | ~70 | 71 | 1.7 SOL | 1x (can burn to 3.5x) |
| Day 46 | ~85 | 86 | 2.3 SOL | 1x (can burn to 4x) |
| Day 90+ | 99 | 100 | 3.0 SOL | 1x (can burn to 5x) |

---

## Files to Update

1. **EXIT-STRATEGY-PRD.md** — Full rewrite with v2 mechanics
   - Section 2: Data structures (floor: u8 → u8 0-100)
   - Section 3: Entry & Upgrade (new tier system, micro-burns)
   - Section 4: Floor & Multiplier (100 floors, 6 tiers)
   - Section 5: Upgrade System (5-15min cooldowns, tier-based SOL)
   - Section 6: Fire Progression (hourly → 72hr scaling)
   - Section 11: Constants (all new values)
   - Section 12: Summary (updated metrics)
   - Section 13: Diagrams (new building visualization for 100 floors)

---

## Key Narrative Changes

### v1 Story
"Climb 7 floors over 90 days. Fire rises every few days."

### v2 Story
"100 floors. Fire rises EVERY HOUR at first. You have to burn constantly just to survive Day 1. Then it slows — but by then, how many made it?"

### Marketing Angle
- **Day 1 is survival mode** — 20 burns, 100K tokens, just to see Day 2
- **Natural selection** — impatient/underfunded players eliminated fast
- **Diamond hands rewarded** — if you survive the gauntlet, rewards compound
- **pumpfun attention span compatible** — constant dopamine hits early

---

## Verification

After updating PRD:
1. Verify all floor/tier math adds to 90 days
2. Verify total burn ≈ 2M tokens
3. Verify total SOL = 3.0
4. Verify late entry table is consistent
5. Update all diagrams/visuals
6. Check fire schedule cumulative hours

---

## Open Questions (Resolved)

- ✅ Burn scaling: Progressive (5K → 50K)
- ✅ SOL fees: Per tier only (6 payments)
- ✅ Cooldowns: 5-15 minutes
