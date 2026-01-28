/**
 * Humor - Frontier AI personality for build logs
 *
 * Voice: meme-y, fun, casual dev twitter energy BUT CONFIDENT
 * Think: extremely online dev who's actually cracked at coding
 * NO self-deprecation, NO "idk why this works", NO existential doubt
 * YES: memes, slang, fun phrases, swagger, casual vibes
 */

// Humor organized by phase/action - NOT random, contextual to what's happening
const HUMOR = {
  // Phase starts - what we say when entering a phase
  planning: [
    "dev is thinking real hard...",
    "initiating vibe check",
    "the braincells are conferencing",
    "big brain time",
    "cooking up the architecture",
  ],
  building: [
    "dev is devving",
    "time to cook",
    "entering the zone",
    "keyboard clacking intensifies",
    "fingers on keys, let's go",
    "built different fr",
  ],
  deploying: [
    "yeeting to production",
    "pushing to prod (confident)",
    "sending it to the internet",
    "cloudflare, take the wheel",
    "shipping heat",
  ],
  verifying: [
    "moment of truth",
    "running the gauntlet",
    "quality check incoming",
    "time to see the magic",
    "verification speedrun",
  ],
  testing: [
    "poking the feature to see if it's alive",
    "clicking all the buttons",
    "ux police on patrol",
    "feature inspection time",
  ],
  recording: [
    "capturing the vibes",
    "making a movie",
    "lights camera action",
    "this deserves a trailer",
  ],

  // Success messages - contextual to what just succeeded
  planSuccess: [
    "galaxy brain activated",
    "the vision is clear",
    "we know what we're building",
    "roadmap acquired",
  ],
  buildSuccess: [
    "code goes brrrr",
    "dev shipped",
    "feature materialized",
    "clean build, clean conscience",
    "another banger shipped",
  ],
  deploySuccess: [
    "it's alive on the internet",
    "successfully yeeted to prod",
    "the cloud has accepted our offering",
    "live and looking good",
  ],
  verifySuccess: [
    "works perfectly fr",
    "quality seal of approval",
    "passed the vibe check",
    "verified and vibing",
  ],
  testSuccess: [
    "buttons click, forms submit, games play",
    "ux approved",
    "the feature is legit",
    "functionally verified fr",
  ],
  trailerSuccess: [
    "cinema achieved",
    "trailer goes hard",
    "promotional content secured",
  ],
  cycleComplete: [
    "another one for the portfolio",
    "dev doing dev things",
    "feature unlocked",
    "shipped and blessed",
    "gg ez",
  ],

  // Failure/retry messages - still confident, not defeated
  retrying: [
    "plot twist, adapting",
    "round 2, fight",
    "speedbump, not a wall",
    "persistence is key",
    "we go again",
  ],
  buildFailed: [
    "skill issue detected, fixing",
    "edge case found, handling it",
    "challenge accepted",
  ],
  deployFailed: [
    "infra being dramatic, retrying",
    "prod said wait, trying again",
    "network hiccup, we persist",
  ],
  verifyFailed: [
    "propagation in progress",
    "dns doing dns things",
    "almost there...",
  ],
  testFailed: [
    "found an edge case, improving",
    "making it even better",
    "refinement arc",
  ],
  maxRetriesFailed: [
    "this one's spicy, saving for later",
    "interesting problem, will revisit",
    "flagging for round 2",
    "tactical retreat, not defeat",
  ],
  cleanup: [
    "sweeping under the rug",
    "the janitor has arrived",
    "resetting for the next W",
    "clean slate incoming",
  ],

  // Cooldown/waiting
  waiting: [
    "touching grass (briefly)",
    "cooldown arc",
    "recharging the dev energy",
    "brb shipping more later",
    "intermission",
  ],

  // Meme generation
  memeStart: [
    "time to make art",
    "memeing in progress",
    "generating content",
    "the meme machine awakens",
    "cooking up something viral",
  ],
  memeSuccess: [
    "meme deployed to the timeline",
    "another banger posted",
    "the people have been blessed",
    "timeline upgraded",
    "engagement incoming",
  ],
  memeFailed: [
    "that one wasn't it, going again",
    "quality standards are high here",
    "we only post bangers",
    "iterating on the vision",
  ],
  cooldownActive: [
    "making memes while we wait",
    "productive vibes only",
    "meme mode activated",
    "can't stop shipping content",
    "cooldown? more like content time",
  ],

  // Tweet related
  tweeting: [
    "broadcasting to ct",
    "alerting the timeline",
    "time to flex on twitter",
    "the people must know",
  ],
  tweetSuccess: [
    "the algorithm has been fed",
    "tweet is live",
    "ct has been notified",
    "announcement deployed",
  ],

  // Homepage update
  homepage: [
    "adding to the collection",
    "homepage glow up",
    "new button who dis",
  ],
  homepageSuccess: [
    "homepage updated",
    "button installed",
    "feature now discoverable",
  ],

  // Startup
  startup: [
    "brain online, ready to ship",
    "autonomous mode engaged",
    "the machine awakens",
    "dev bot reporting for duty",
  ],
};

type HumorCategory = keyof typeof HUMOR;

/**
 * Get a random humor message for a specific phase/action
 * The category determines WHAT kind of message - not random across all categories
 */
export function getHumor(category: HumorCategory): string {
  const messages = HUMOR[category];
  if (!messages || messages.length === 0) {
    return '';
  }
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Format humor for log output - adds the sparkle
 */
export function formatHumor(category: HumorCategory): string {
  const msg = getHumor(category);
  return msg ? `   💭 ${msg}` : '';
}

export { HumorCategory };
