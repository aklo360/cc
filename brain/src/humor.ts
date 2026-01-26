/**
 * Humor - Memecoin dev personality for build logs
 *
 * Voice: lowercase, casual, crypto twitter slang, anti-hype, genuine vibes
 * Each category maps to a specific phase/action in the cycle
 */

// Humor organized by phase/action - NOT random, contextual to what's happening
const HUMOR = {
  // Phase starts - what we say when entering a phase
  planning: [
    "dev is thinking real hard...",
    "initiating vibe check",
    "the braincells are conferencing",
    "loading good ideas from cache...",
    "consulting the algo",
  ],
  building: [
    "dev is devving",
    "time to cook",
    "writing code (or trying to)",
    "entering the zone",
    "keyboard clacking intensifies",
    "fingers on keys, brain engaged",
  ],
  deploying: [
    "uploading vibes to the cloud",
    "pushing to prod (yolo)",
    "sending it to the internet",
    "cloudflare, take the wheel",
    "yeeting to production",
  ],
  verifying: [
    "does it actually work though?",
    "moment of truth",
    "running the gauntlet",
    "quality check incoming",
    "time to find out if we cooked or got cooked",
  ],
  testing: [
    "poking the feature to see if it's alive",
    "clicking all the buttons",
    "the feature is being judged",
    "ux police on patrol",
  ],
  recording: [
    "capturing the vibes",
    "making a movie",
    "lights camera action",
    "the feature's screen test",
  ],

  // Success messages - contextual to what just succeeded
  planSuccess: [
    "galaxy brain activated",
    "the vision is clear",
    "we know what we're building",
    "roadmap acquired",
  ],
  buildSuccess: [
    "it compiled (somehow)",
    "code goes brrrr",
    "dev shipped",
    "the code has been cooked",
    "feature materialized",
  ],
  deploySuccess: [
    "it's alive on the internet",
    "successfully yeeted to prod",
    "the cloud has accepted our offering",
    "live and in production",
  ],
  verifySuccess: [
    "it actually works lmao",
    "quality seal of approval",
    "the feature is not a scam",
    "passed the vibe check",
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
    "shipped and dipped",
    "productivity flex complete",
  ],

  // Failure/retry messages - contextual to what failed
  retrying: [
    "that didn't work, trying again",
    "round 2, fight",
    "computer said no, asking again",
    "persistence is key",
    "we go again",
  ],
  buildFailed: [
    "the code fought back",
    "skill issue detected",
    "build machine said no",
  ],
  deployFailed: [
    "the cloud rejected us",
    "prod said nah",
    "deployment chose violence",
  ],
  verifyFailed: [
    "404 vibes",
    "the internet isn't ready",
    "deployment ghost",
  ],
  testFailed: [
    "feature is broken fr",
    "ux crimes detected",
    "back to the drawing board",
  ],
  maxRetriesFailed: [
    "this one chose violence",
    "feature too complex, moving on",
    "ngmi (this feature at least)",
    "some ideas aren't meant to ship",
  ],
  cleanup: [
    "sweeping under the rug",
    "pretend that never happened",
    "the janitor has arrived",
    "cleaning up the crime scene",
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
    "art mode activated",
  ],
  memeSuccess: [
    "meme deployed to the timeline",
    "content created and shipped",
    "another banger posted",
    "the people have been blessed",
    "meme successfully landed",
  ],
  memeFailed: [
    "meme didn't pass the vibe check",
    "quality gate said no",
    "the meme wasn't ready",
    "content rejected, trying again",
  ],
  cooldownActive: [
    "claude is resting",
    "recharging creative energy",
    "meme mode activated",
    "generating memes until next build",
    "cooldown entertainment mode",
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
