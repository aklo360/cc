# Twitter Thread Templates

> Part of the autonomous pipeline - the agent writes and posts announcement threads for every feature launch

---

## Overview

After building and deploying a feature, the autonomous agent writes a 4-tweet thread to announce it. This is Phase 7 of the 8-phase pipeline.

**The agent generates these threads automatically** - no human writes or approves them.

---

## Thread Structure

Every feature launch thread follows this structure:

| Tweet | Purpose | Template |
|-------|---------|----------|
| **1** | Hook + Video | Feature intro, what it does, attach trailer video, cross-post to community |
| **2** | The Detail | The unique/fun aspect that makes people want to try it |
| **3** | The Tech | How it works technically (builds credibility, shows it's real) |
| **4** | The CTA | Link to feature, clear call to action |

---

## Thread Guidelines

### Voice
- Confident but not arrogant
- Technical but accessible
- Fun but not cringe
- No emojis in body text (maybe 1-2 max in CTA)

### Content Rules
- Tweet 1 MUST have the video attached
- Tweet 1 gets cross-posted to the $CC community
- Each tweet should stand alone but flow as a thread
- Include the URL in tweets 1 and 4
- Keep each tweet under 280 chars

### What Makes a Good Thread
- **Hook**: Immediately tells you what the feature is
- **Detail**: Reveals something surprising or delightful
- **Tech**: Proves it's real, not vaporware
- **CTA**: Makes it easy to try right now

---

## Example: Trading Terminal Launch

This thread announced the `/swap` trading terminal:

**Tweet 1 (Hook + Video)**
```
Introducing the $CC Trading Terminal

Finally, a dedicated place to trade $CC with real-time charts and instant swaps.

Built different:
- Live GMGN price charts
- Jupiter-powered swaps
- 5% default slippage (it's a memecoin)
- 1% platform fee → 100% burned

claudecode.wtf/swap

[ATTACH: trading-terminal-trailer.mp4]
```

**Tweet 2 (The Detail)**
```
oh and we added a little... friction to the sell process

when you click Sell, the button escapes and starts bouncing around your screen like the old DVD screensaver

you literally have to chase it down and catch it to sell your $CC

anti-dump technology
```

**Tweet 3 (The Tech)**
```
How the 1% fee works:

Buy $CC → 1% of your CC goes to the house
Sell $CC → 1% of your SOL goes to the house

Every 6 hours, the brain:
1. Takes accumulated SOL fees
2. Swaps them for $CC on Jupiter
3. Burns the $CC forever

Deflationary. Automatic. Onchain.
```

**Tweet 4 (The CTA)**
```
Try it now: claudecode.wtf/swap

Connect wallet, buy some $CC, then try to sell (if you can catch the button)

All 1% fees go directly to buying and burning $CC. No team allocation. No treasury. Just burn.
```

---

## Example: GameFi Feature Launch

Template for game-related features:

**Tweet 1 (Hook + Video)**
```
New game just dropped: [GAME NAME]

[One sentence description of the game]

How it works:
- [Key mechanic 1]
- [Key mechanic 2]
- [Key mechanic 3]
- [Reward/prize info]

claudecode.wtf/[slug]

[ATTACH: trailer.mp4]
```

**Tweet 2 (The Detail)**
```
[The surprising/fun detail that makes this game unique]

[Why this matters or what makes it special]
```

**Tweet 3 (The Tech)**
```
Under the hood:

[Technical detail 1]
[Technical detail 2]
[Technical detail 3]

[Proof it's fair/real/trustworthy]
```

**Tweet 4 (The CTA)**
```
Play now: claudecode.wtf/[slug]

[Simple instruction to get started]

[Final hook or reason to try it]
```

---

## Implementation

### In the Pipeline (brain/src/cycle.ts)

Phase 7 generates thread content as part of the experiment planning:

```typescript
// Thread content is generated during planning
const threadContent = {
  tweet1: "...", // Hook + video description
  tweet2: "...", // The detail
  tweet3: "...", // The tech
  tweet4: "...", // The CTA
};
```

### Posting (brain/src/twitter.ts)

```typescript
// 1. Upload video first
const mediaId = await uploadVideo(trailerPath);

// 2. Post tweet 1 with video
const tweet1 = await postTweet(threadContent.tweet1, { mediaId });

// 3. Post tweets 2-4 as replies
const tweet2 = await postTweet(threadContent.tweet2, { replyTo: tweet1.id });
const tweet3 = await postTweet(threadContent.tweet3, { replyTo: tweet2.id });
const tweet4 = await postTweet(threadContent.tweet4, { replyTo: tweet3.id });
```

---

## Files

| File | Purpose |
|------|---------|
| `brain/src/cycle.ts` | Thread generation in experiment prompt |
| `brain/src/twitter.ts` | Thread posting logic |
| `docs/twitter-bot.md` | Twitter bot overview |
| `docs/twitter-thread-trading-terminal.md` | Trading terminal thread (example) |

---

## Adding New Thread Types

When the agent builds a new type of feature, it should:

1. Follow the 4-tweet structure
2. Adapt the content to the feature type
3. Always include: hook, detail, tech, CTA
4. Always attach trailer to tweet 1

The agent generates thread content dynamically based on what it built - these templates are guidelines, not rigid scripts.
