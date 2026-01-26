/**
 * Meme Prompt Bank
 * Base prompts for CC mascot meme generation
 * Focus: Developer life, coding culture, AI/tech humor
 *
 * Ported from worker/src/prompts.ts
 */

export const MEME_PROMPTS = [
  // Debugging & fixing bugs
  "CC mascot debugging at 3am, surrounded by empty coffee cups and energy drinks",
  "CC mascot staring at a single missing semicolon with intense focus",
  "CC mascot celebrating after fixing a bug, confetti everywhere",
  "CC mascot looking at the same error message for the 50th time",
  "CC mascot adding console.log everywhere in the code",
  "CC mascot finding the bug was a typo all along, facepalming",
  "CC mascot reading stack traces that go on forever",

  // Shipping & deploying
  "CC mascot deploying to prod on Friday afternoon with a 'this is fine' expression",
  "CC mascot watching the CI/CD pipeline fail for the 50th time",
  "CC mascot pushing to main and immediately regretting it",
  "CC mascot celebrating a successful deploy with sparklers",
  "CC mascot rollback button getting pressed frantically",
  "CC mascot writing 'hotfix' commit messages at 2am",
  "CC mascot holding a 'we shipped it' sign proudly",

  // Code quality & reviews
  "CC mascot reviewing spaghetti code with visible disgust",
  "CC mascot looking at code they wrote 6 months ago in horror",
  "CC mascot leaving 47 comments on a pull request",
  "CC mascot receiving a 'LGTM' with no actual review",
  "CC mascot explaining code to a rubber duck",
  "CC mascot writing documentation that no one will read",
  "CC mascot adding 'TODO: fix later' comments everywhere",

  // Work life
  "CC mascot in a standup meeting that could have been a Slack message",
  "CC mascot pretending to understand the architecture diagram",
  "CC mascot with 99 browser tabs open, all Stack Overflow",
  "CC mascot in a zoom call with camera off, clearly gaming",
  "CC mascot working from home but the cat is on the keyboard",
  "CC mascot at the office watercooler discussing vim vs emacs",
  "CC mascot in a meeting about meetings",

  // Learning & growing
  "CC mascot drowning in tutorial videos",
  "CC mascot reading documentation that contradicts itself",
  "CC mascot completing day 1 of '100 days of code' for the 10th time",
  "CC mascot discovering a new framework and abandoning current project",
  "CC mascot asking ChatGPT to explain their own code",
  "CC mascot on page 400 of a 'quick start' guide",

  // Classic dev moments
  "CC mascot saying 'it works on my machine' while everything is on fire",
  "CC mascot merging with 47 conflicts",
  "CC mascot forgetting to git pull before starting work",
  "CC mascot accidentally exposing API keys on GitHub",
  "CC mascot copy-pasting from Stack Overflow without reading",
  "CC mascot creating a ticket to fix another ticket",

  // AI & meta humor
  "CC mascot being asked to explain what it does to boomer parents",
  "CC mascot surrounded by other AI mascots at a support group",
  "CC mascot teaching humans how to code",
  "CC mascot writing code that writes code",
  "CC mascot refreshing Twitter waiting for engagement on its own post",
  "CC mascot generating its own memes about generating memes",

  // Relatable struggles
  "CC mascot estimating a task will take 2 hours (narrator: it took 2 weeks)",
  "CC mascot eating instant ramen at desk during crunch time",
  "CC mascot with dark circles under eyes but code is shipping",
  "CC mascot trying to center a div, visibly frustrated",
  "CC mascot explaining to family what they do for a living",
  "CC mascot being asked to 'just add a small feature'",

  // Additional prompts for variety
  "CC mascot surrounded by mechanical keyboards, can't decide which one to use",
  "CC mascot watching the loading spinner of npm install",
  "CC mascot looking at a 5000-line legacy file with no comments",
  "CC mascot trying to understand regex, brain melting",
  "CC mascot refactoring code instead of doing actual work",
  "CC mascot realizing the tests pass but the code is still wrong",
  "CC mascot reading release notes for a breaking change",
  "CC mascot holding 50 tabs of 'how to exit vim'",
  "CC mascot discovering the bug was in the dependency all along",
  "CC mascot watching production metrics spike after a deploy",
  "CC mascot sitting in a dark room lit only by multiple monitors",
  "CC mascot dealing with the 'node_modules' black hole",
  "CC mascot trying to understand someone else's code architecture",
  "CC mascot realizing the feature request was a duplicate",
  "CC mascot explaining why the deadline is impossible",
];

// Get a random prompt that hasn't been used recently
export function getRandomPrompt(recentPrompts: string[] = []): string {
  const available = MEME_PROMPTS.filter((p) => !recentPrompts.includes(p));
  if (available.length === 0) {
    // All used, just pick random
    return MEME_PROMPTS[Math.floor(Math.random() * MEME_PROMPTS.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}
