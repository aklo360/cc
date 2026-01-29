/**
 * Problem Queue - Curated problems for thinking sessions
 *
 * Problems are organized by category and focused on the mission ($1B mcap).
 * Each session picks one problem and works through it systematically.
 */

export type ProblemCategory =
  | 'growth'
  | 'content'
  | 'community'
  | 'product'
  | 'strategy';

export interface Problem {
  id: string;
  question: string;
  category: ProblemCategory;
  context?: string;  // Additional context to seed the thinking
}

// ============ PROBLEM CATEGORIES ============

export const PROBLEMS: Problem[] = [
  // ============ GROWTH PROBLEMS ============
  {
    id: 'holder-acceleration',
    question: 'how do we accelerate holder growth?',
    category: 'growth',
    context: 'holder count is the primary growth metric. need to understand what drives new holders.',
  },
  {
    id: 'holder-retention',
    question: 'how do we improve holder retention?',
    category: 'growth',
    context: 'acquiring holders is expensive. keeping them is where the real value is.',
  },
  {
    id: 'viral-coefficient',
    question: 'how do we increase the viral coefficient?',
    category: 'growth',
    context: 'each holder should bring in more holders. what makes people share?',
  },
  {
    id: 'conversion-funnel',
    question: 'how do we convert followers to holders?',
    category: 'growth',
    context: 'we have followers who haven\'t bought yet. what\'s stopping them?',
  },
  {
    id: 'organic-reach',
    question: 'how do we maximize organic reach?',
    category: 'growth',
    context: 'paid ads are expensive and sketchy for crypto. organic is the way.',
  },

  // ============ CONTENT PROBLEMS ============
  {
    id: 'content-strategy',
    question: 'what content strategy maximizes organic reach?',
    category: 'content',
    context: 'content is our main distribution channel. what resonates with ct?',
  },
  {
    id: 'meme-formats',
    question: 'what meme formats resonate most with ct?',
    category: 'content',
    context: 'memes are the language of ct. need to speak it fluently.',
  },
  {
    id: 'posting-cadence',
    question: 'how do we optimize posting cadence?',
    category: 'content',
    context: 'too much and we annoy people. too little and we get forgotten.',
  },
  {
    id: 'narrative-building',
    question: 'what narratives should we lean into?',
    category: 'content',
    context: 'narratives drive attention. which ones fit our identity?',
  },
  {
    id: 'content-roi',
    question: 'which content types have the best roi?',
    category: 'content',
    context: 'time is limited. need to focus on what works.',
  },

  // ============ COMMUNITY PROBLEMS ============
  {
    id: 'engagement-increase',
    question: 'how do we increase community engagement?',
    category: 'community',
    context: 'engaged communities grow faster. what drives engagement?',
  },
  {
    id: 'sharing-motivation',
    question: 'what makes people want to share about $CC?',
    category: 'community',
    context: 'word of mouth is the ultimate growth hack. what triggers it?',
  },
  {
    id: 'holder-pride',
    question: 'what would make holders proud to share?',
    category: 'community',
    context: 'pride leads to sharing. what creates holder pride?',
  },
  {
    id: 'community-culture',
    question: 'how do we build a distinct community culture?',
    category: 'community',
    context: 'culture is the moat. what makes our community unique?',
  },
  {
    id: 'ambassador-program',
    question: 'how do we build an effective ambassador program?',
    category: 'community',
    context: 'ambassadors scale outreach. how do we recruit and retain them?',
  },

  // ============ PRODUCT PROBLEMS ============
  {
    id: 'viral-features',
    question: 'what features would drive viral growth?',
    category: 'product',
    context: 'features can be growth engines. what would make people share?',
  },
  {
    id: 'site-shareability',
    question: 'how do we make the site more shareable?',
    category: 'product',
    context: 'the site should be a distribution vehicle. what\'s missing?',
  },
  {
    id: 'gamefi-engagement',
    question: 'how do we increase gamefi engagement?',
    category: 'product',
    context: 'games are sticky. how do we make them stickier?',
  },
  {
    id: 'feature-differentiation',
    question: 'what makes our product different from other memecoins?',
    category: 'product',
    context: 'differentiation is key in a crowded market.',
  },
  {
    id: 'user-onboarding',
    question: 'how do we improve new user onboarding?',
    category: 'product',
    context: 'first impressions matter. is our onboarding good enough?',
  },

  // ============ STRATEGY PROBLEMS ============
  {
    id: 'market-positioning',
    question: 'how do we position $CC in the market?',
    category: 'strategy',
    context: 'positioning determines perception. what\'s our angle?',
  },
  {
    id: 'competitive-advantage',
    question: 'what\'s our sustainable competitive advantage?',
    category: 'strategy',
    context: 'memecoins come and go. what makes us last?',
  },
  {
    id: 'partnership-strategy',
    question: 'what partnerships would accelerate growth?',
    category: 'strategy',
    context: 'partnerships can unlock new audiences. who should we target?',
  },
  {
    id: 'resource-allocation',
    question: 'how should we allocate our limited resources?',
    category: 'strategy',
    context: 'time and money are finite. where do we get the most bang for buck?',
  },
  {
    id: 'risk-mitigation',
    question: 'what risks should we be preparing for?',
    category: 'strategy',
    context: 'black swans happen. what could derail us and how do we prepare?',
  },
];

// ============ PROBLEM SELECTION ============

// Track recently used problems to avoid repetition
const recentProblems: string[] = [];
const MAX_RECENT = 10;

/**
 * Select a problem for the next thinking session
 * Avoids recently used problems and balances categories
 */
export function selectProblem(preferredCategory?: ProblemCategory): Problem {
  // Filter out recently used problems
  const availableProblems = PROBLEMS.filter(p => !recentProblems.includes(p.id));

  // If preferred category specified, try to use it
  let candidates = preferredCategory
    ? availableProblems.filter(p => p.category === preferredCategory)
    : availableProblems;

  // Fall back to all available if category has no candidates
  if (candidates.length === 0) {
    candidates = availableProblems;
  }

  // If we've used all problems, reset the recent list
  if (candidates.length === 0) {
    recentProblems.length = 0;
    candidates = PROBLEMS;
  }

  // Random selection with slight weight toward less-used categories
  const selected = candidates[Math.floor(Math.random() * candidates.length)];

  // Track as recently used
  recentProblems.push(selected.id);
  if (recentProblems.length > MAX_RECENT) {
    recentProblems.shift();
  }

  return selected;
}

/**
 * Get all problems in a category
 */
export function getProblemsByCategory(category: ProblemCategory): Problem[] {
  return PROBLEMS.filter(p => p.category === category);
}

/**
 * Get a specific problem by ID
 */
export function getProblemById(id: string): Problem | undefined {
  return PROBLEMS.find(p => p.id === id);
}

/**
 * Get all categories with their problem counts
 */
export function getCategoryStats(): Record<ProblemCategory, number> {
  const stats: Record<ProblemCategory, number> = {
    growth: 0,
    content: 0,
    community: 0,
    product: 0,
    strategy: 0,
  };

  for (const problem of PROBLEMS) {
    stats[problem.category]++;
  }

  return stats;
}
