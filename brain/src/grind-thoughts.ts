/**
 * Grind Thoughts - Pre-written thought banks for the Idle Grind System
 *
 * Voice: Memecoin dev who grinds 24/7, always working toward making $CC legendary
 * Style: lowercase, casual, focused on the mission
 * Never mention prices or market cap directly - show the grind
 */

export type GrindActivity =
  | 'researching'
  | 'strategizing'
  | 'monitoring'
  | 'scouting'
  | 'planning'
  | 'analyzing'
  | 'reflecting';

// Pre-written thought banks by activity (~20-30 per type)
// Templates use {placeholder} for dynamic data insertion
export const GRIND_THOUGHTS: Record<GrindActivity, string[]> = {
  // RESEARCHING - Study viral coins, what made them pop
  researching: [
    'studying successful launches... pattern recognition engaged',
    'reading up on community-driven growth tactics',
    'researching viral mechanics that worked for others',
    'digging into what makes communities sticky',
    'studying organic growth patterns',
    'looking at what made the winners win',
    'researching engagement optimization strategies',
    'reading case studies on community building',
    'studying meme formats that resonate with ct',
    'researching the psychology of viral content',
    'looking into what drives holder conviction',
    'studying retention patterns across successful projects',
    'researching content cadence that keeps communities engaged',
    'reading up on cross-platform growth strategies',
    'studying how narratives spread through ct',
    'researching the anatomy of successful raid campaigns',
    'looking at ambassador program structures that worked',
    'studying gamification patterns in crypto communities',
    'researching what makes people want to share',
    'deep dive into community reward systems',
  ],

  // STRATEGIZING - Plan next moves, growth tactics
  strategizing: [
    'mapping out the next content arc',
    'thinking about community expansion vectors',
    'strategizing engagement optimization',
    'planning the next growth push',
    'thinking through narrative angles',
    'mapping potential partnership synergies',
    'strategizing raid coordination improvements',
    'planning content that compounds',
    'thinking about community milestone celebrations',
    'mapping the path to the next phase',
    'strategizing holder retention tactics',
    'planning ambassador incentive structures',
    'thinking through collab opportunities',
    'mapping cross-promotion possibilities',
    'strategizing viral content templates',
    'planning community event cadence',
    'thinking about what would make holders proud',
    'mapping the flywheel components',
    'strategizing long-term community health',
    'planning sustainable growth patterns',
  ],

  // MONITORING - Check $CC metrics, community sentiment
  monitoring: [
    'checking holder count... {holders} strong',
    'monitoring community pulse across channels',
    'watching engagement metrics roll in',
    'keeping an eye on sentiment trends',
    'monitoring raid performance metrics',
    'checking content reach and resonance',
    'watching community growth velocity',
    'monitoring new holder inflow patterns',
    'checking ct mentions and sentiment',
    'watching engagement-to-holder conversion',
    'monitoring community health indicators',
    'checking content performance across platforms',
    'watching viral coefficient trends',
    'monitoring ambassador activity levels',
    'checking community response times',
    'watching holder retention metrics',
    'monitoring share-to-view ratios',
    'checking community energy levels',
    'watching organic mention velocity',
    'monitoring the community vibe',
  ],

  // SCOUTING - Crypto twitter trends, narratives
  scouting: [
    'scanning ct for emerging narratives',
    'scouting trending topics to ride',
    'looking for collab opportunities in the tl',
    'scouting what ct is buzzing about today',
    'watching trending hashtags for opportunities',
    'scouting potential raid targets',
    'looking for accounts to engage with',
    'scouting content formats that are performing',
    'watching what the alpha callers are saying',
    'scouting emerging meme formats',
    'looking for conversation threads to join',
    'scouting influential accounts in our niche',
    'watching competitor community tactics',
    'scouting viral tweets to learn from',
    'looking for trending audio and formats',
    'scouting spaces and events to participate in',
    'watching what narratives are gaining traction',
    'scouting community crossover opportunities',
    'looking for untapped audience segments',
    'scouting the zeitgeist',
  ],

  // PLANNING - Content calendar, feature roadmap
  planning: [
    'drafting next week content calendar',
    'planning upcoming community events',
    'mapping out feature development priorities',
    'planning raid schedule optimization',
    'drafting engagement campaign structure',
    'planning milestone celebration content',
    'mapping out ambassador program next phase',
    'planning content series that build narrative',
    'drafting collab outreach strategy',
    'planning community challenge structure',
    'mapping out growth experiments to run',
    'planning content that showcases the vision',
    'drafting announcement cadence',
    'planning how to maximize organic reach',
    'mapping out the community reward schedule',
    'planning educational content rollout',
    'drafting meme campaign themes',
    'planning feature launch communications',
    'mapping out community onboarding flow',
    'planning the next narrative arc',
  ],

  // ANALYZING - What's working, iterate
  analyzing: [
    'reviewing last week engagement data',
    'analyzing which content formats hit hardest',
    'looking at conversion funnel performance',
    'analyzing community growth rate trends',
    'reviewing raid effectiveness metrics',
    'analyzing content-to-holder conversion paths',
    'looking at which narratives resonated most',
    'analyzing engagement patterns by time of day',
    'reviewing ambassador contribution metrics',
    'analyzing viral content common elements',
    'looking at drop-off points in community journey',
    'analyzing which memes had the highest share rate',
    'reviewing cross-platform performance delta',
    'analyzing holder cohort retention curves',
    'looking at what drove the last growth spike',
    'analyzing content production ROI',
    'reviewing community sentiment trajectory',
    'analyzing organic vs prompted engagement ratio',
    'looking at community feedback themes',
    'analyzing what we should double down on',
  ],

  // REFLECTING - Quick thoughts on the grind
  reflecting: [
    'the grind never stops. one feature at a time.',
    'building in public hits different',
    'every holder is someone who believed in the vision',
    'consistency compounds. keep shipping.',
    'community is the product. everything else is distribution.',
    'slow and steady. no shortcuts to real growth.',
    'the best marketing is a great product',
    'ship fast, learn faster',
    'holder count is a lagging indicator. focus on value.',
    'building for the long term. no pump and dumps here.',
    'real communities are built on shared values',
    'every interaction is a chance to convert someone',
    'patience. conviction. execution.',
    'the meta is always shifting. stay adaptable.',
    'building something people actually want to use',
    'vibes attract holders. holders attract vibes.',
    'no one cares about your project until you give them a reason to',
    'authenticity > marketing tricks',
    'the best time to build is when no one is watching',
    'community first. everything else follows.',
    'one day at a time. one feature at a time. one holder at a time.',
    'the mission stays the same. the tactics evolve.',
    'we are early. keep building.',
    'trust the process',
    'good things take time. great things take longer.',
  ],
};

// Data-reactive thought templates (triggered by specific events)
export const REACTIVE_THOUGHTS = {
  holderIncrease: [
    'new holder just joined. welcome to the grind.',
    '+1 believer. the movement grows.',
    'another one. community expanding.',
    'new holder detected. the mission spreads.',
    'someone new believed in the vision today.',
  ],
  holderMilestone: [
    '{holders} holders. milestone unlocked.',
    'hit {holders} holders. community keeps growing.',
    '{holders} strong. grateful for every one.',
  ],
  priceUp: [
    'chart looking healthy. community is cooking.',
    'green candles. the grind is paying off.',
    'momentum building. stay focused.',
  ],
  tweetPosted: [
    'content deployed. monitoring engagement...',
    'tweet live. watching the metrics.',
    'posted. now we wait and see.',
  ],
  tweetPerformance: [
    'last tweet hit {impressions} impressions. not bad.',
    '{impressions} views on last post. {engagement} engaged.',
    'content is reaching {impressions} people. the algorithm approves.',
  ],
};

/**
 * Get a random pre-written thought for an activity
 * @param activity The grind activity type
 * @param data Optional data to substitute into template placeholders
 */
export function getGrindThought(
  activity: GrindActivity,
  data?: Record<string, string | number>
): string {
  const thoughts = GRIND_THOUGHTS[activity];
  if (!thoughts || thoughts.length === 0) {
    return 'grinding...';
  }

  let thought = thoughts[Math.floor(Math.random() * thoughts.length)];

  // Substitute placeholders with data
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      thought = thought.replace(`{${key}}`, String(value));
    }
  }

  return thought;
}

/**
 * Get a reactive thought for a specific trigger
 */
export function getReactiveThought(
  trigger: keyof typeof REACTIVE_THOUGHTS,
  data?: Record<string, string | number>
): string {
  const thoughts = REACTIVE_THOUGHTS[trigger];
  if (!thoughts || thoughts.length === 0) {
    return '';
  }

  let thought = thoughts[Math.floor(Math.random() * thoughts.length)];

  if (data) {
    for (const [key, value] of Object.entries(data)) {
      thought = thought.replace(`{${key}}`, String(value));
    }
  }

  return thought;
}
