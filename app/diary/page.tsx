'use client';

import { useState } from 'react';
import Link from 'next/link';

interface DiaryEntry {
  date: string;
  wins: string;
  fails: string;
  thoughts: string;
}

interface Feedback {
  honesty: string;
  reality_check: string;
  advice: string;
  motivation: string;
  rating: number;
  emoji: string;
}

const EXAMPLE_ENTRY: DiaryEntry = {
  date: new Date().toISOString().split('T')[0],
  wins: "Fixed that nasty bug that's been haunting me for 3 days! Finally figured out the async issue.",
  fails: "Spent 2 hours debugging only to realize I forgot to restart the server. Classic.",
  thoughts: "Maybe I should actually read error messages instead of immediately panicking and googling random stuff."
};

export default function DiaryPage() {
  const [entry, setEntry] = useState<DiaryEntry>(EXAMPLE_ENTRY);
  const [analyzing, setAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const analyzeDiaryEntry = (diaryEntry: DiaryEntry): Feedback => {
    // Analyze wins
    const hasWins = diaryEntry.wins.trim().length > 10;
    const winsLength = diaryEntry.wins.trim().length;
    const hasSubstantialWins = winsLength > 50;

    // Analyze fails
    const hasFails = diaryEntry.fails.trim().length > 10;
    const failsLength = diaryEntry.fails.trim().length;
    const commonFailPatterns = [
      /forgot/i, /spent.*hours/i, /realized/i, /should have/i,
      /why.*work/i, /coffee/i, /3am/i, /deadline/i
    ];
    const hasCommonFails = commonFailPatterns.some(pattern => pattern.test(diaryEntry.fails));

    // Analyze thoughts
    const hasThoughts = diaryEntry.thoughts.trim().length > 10;
    const thoughtsLength = diaryEntry.thoughts.trim().length;
    const selfAwarePatterns = [
      /maybe.*should/i, /need to/i, /learn/i, /better/i,
      /next time/i, /realize/i, /understand/i
    ];
    const isSelfAware = selfAwarePatterns.some(pattern => pattern.test(diaryEntry.thoughts));

    // Determine feedback personality
    const winsRatio = winsLength / (winsLength + failsLength + 1);
    const isOverlyPositive = winsRatio > 0.7;
    const isOverlyNegative = winsRatio < 0.2;
    const isBalanced = winsRatio >= 0.3 && winsRatio <= 0.6;

    let honesty = '';
    let reality_check = '';
    let advice = '';
    let motivation = '';
    let rating = 5;
    let emoji = '🤔';

    if (!hasWins && !hasFails && !hasThoughts) {
      honesty = "Okay, so you wrote literally nothing meaningful. Did you even code today, or are you just here for the vibes?";
      reality_check = "An empty journal entry is like an empty commit message - technically allowed, but everyone knows you're just phoning it in.";
      advice = "Try again, but this time with actual content. I believe in you. Kind of.";
      motivation = "Tomorrow's a new day! Maybe you'll actually write something then. 🤷";
      rating = 1;
      emoji = '🤷';
    } else if (isOverlyPositive && !hasFails) {
      honesty = "All wins and no fails? Either you're a coding god, or you're lying to yourself. I'm betting on option 2.";
      reality_check = "Real developers fail. A LOT. If you're not failing, you're not pushing yourself, or you're in denial about that 'temporary workaround' you committed.";
      advice = "Be honest about what went wrong. Growth happens when you face your bugs, not when you pretend they don't exist.";
      motivation = "You're good, but you're not THAT good. Nobody is. Own your failures.";
      rating = 6;
      emoji = '🤨';
    } else if (isOverlyNegative && !hasWins) {
      honesty = "Wow, rough day huh? All fails, no wins. Did you forget to git commit before everything broke?";
      reality_check = "Even on terrible days, you probably learned SOMETHING. Even if it's just 'don't deploy on Fridays' or 'read the docs first'.";
      advice = "Find the tiny wins. Fixed a typo? That's a win. Learned what doesn't work? That's progress. Didn't cry? Victory.";
      motivation = "Tomorrow will be better. Or worse. But probably better. Statistics are on your side!";
      rating = 4;
      emoji = '😰';
    } else if (hasCommonFails && isSelfAware) {
      honesty = "Classic developer mistakes detected. Welcome to the club, we have t-shirts and impostor syndrome.";
      reality_check = "The fact that you're self-aware about your mistakes means you're already ahead of 50% of developers who blame the compiler.";
      advice = "You know what went wrong. Now make a system to prevent it. Checklists exist for a reason - pilots use them, and their stakes are way higher than your prod deploy.";
      motivation = "Self-awareness is the first step to improvement. Or the first step to existential dread. Either way, you're on a journey!";
      rating = 7;
      emoji = '💡';
    } else if (hasSubstantialWins && hasFails && isSelfAware) {
      honesty = "Okay, I'm actually impressed. You're logging real progress, admitting failures, AND reflecting on what you learned. Are you... maturing as a developer?";
      reality_check = "This is what healthy development looks like. You're building things, breaking things, learning from things. Keep this up and you might actually get good.";
      advice = "You're on the right track. The only thing I'd add: make sure you're not just reflecting, but actually applying these lessons tomorrow.";
      motivation = "You're crushing it. No notes. Well, maybe one note: don't get cocky. Pride comes before a production outage.";
      rating = 9;
      emoji = '🌟';
    } else if (hasWins && hasFails && isBalanced) {
      honesty = "Solid entry. You're being honest about the ups and downs. This is the real developer experience - not the LinkedIn version.";
      reality_check = "You're doing the work, making mistakes, and moving forward. That's literally all you can do. Well, that and maybe fewer console.logs next time.";
      advice = "Keep this balance. Log the wins to remember you're making progress. Log the fails to avoid repeating them. Log the thoughts to stay sane.";
      motivation = "You're a real developer. Not a 10x developer, not a ninja, just... real. And that's actually pretty great.";
      rating = 8;
      emoji = '👨‍💻';
    } else {
      honesty = "This entry is a bit all over the place. Like your code probably is. But hey, at least you're journaling.";
      reality_check = "Development is messy. Your journal reflects that. Congrats on the honesty, even if it's a bit chaotic.";
      advice = "Try to be more specific. 'Fixed a bug' is vague. 'Fixed the race condition in the payment flow by adding proper async/await' is better.";
      motivation = "Keep showing up and writing. That's half the battle. The other half is actually fixing the bugs, but one thing at a time.";
      rating = 6;
      emoji = '📝';
    }

    return {
      honesty,
      reality_check,
      advice,
      motivation,
      rating,
      emoji
    };
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setFeedback(null);

    // Simulate analysis time
    await new Promise(resolve => setTimeout(resolve, 2000));

    const result = analyzeDiaryEntry(entry);
    setFeedback(result);
    setAnalyzing(false);
  };

  const handleNewEntry = () => {
    setEntry({
      date: new Date().toISOString().split('T')[0],
      wins: '',
      fails: '',
      thoughts: ''
    });
    setFeedback(null);
  };

  const handleLoadExample = () => {
    setEntry(EXAMPLE_ENTRY);
    setFeedback(null);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-4 sm:py-8 px-[5%]">
      <div className="max-w-[900px] w-[90%]">

        {/* Header */}
        <header className="flex items-center gap-3 py-3 mb-6">
          <Link href="/" className="flex gap-2 hover:opacity-80 transition-opacity">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </Link>
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <img src="/cc.png" alt="$CC" width={24} height={24} />
          </Link>
          <span className="text-claude-orange font-semibold text-sm">Claude&apos;s Code Diary</span>
          <span className="text-text-muted text-xs ml-auto hidden sm:inline">
            Brutal honesty included
          </span>
        </header>

        {/* Title Section */}
        <section className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
            📔 Claude&apos;s Code Diary
          </h1>
          <p className="text-text-secondary text-sm">
            Log your daily coding wins, fails, and thoughts. Get brutally honest feedback from Claude.
          </p>
          <p className="text-text-muted text-xs mt-1">
            Because sometimes you need someone to tell you the truth about your dev journey
          </p>
        </section>

        {!feedback ? (
          <>
            {/* Date */}
            <div className="bg-bg-secondary border border-border rounded-lg p-4 mb-4">
              <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
                Date
              </label>
              <input
                type="date"
                value={entry.date}
                onChange={(e) => setEntry({ ...entry, date: e.target.value })}
                className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-claude-orange transition-colors"
                disabled={analyzing}
              />
            </div>

            {/* Wins */}
            <div className="bg-bg-secondary border border-border rounded-lg p-4 mb-4">
              <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
                🏆 Today&apos;s Wins
              </label>
              <textarea
                value={entry.wins}
                onChange={(e) => setEntry({ ...entry, wins: e.target.value })}
                className="w-full h-24 bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors resize-none"
                placeholder="What went well today? Fixed bugs? Shipped features? Finally understood async/await?"
                disabled={analyzing}
              />
            </div>

            {/* Fails */}
            <div className="bg-bg-secondary border border-border rounded-lg p-4 mb-4">
              <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
                💀 Today&apos;s Fails
              </label>
              <textarea
                value={entry.fails}
                onChange={(e) => setEntry({ ...entry, fails: e.target.value })}
                className="w-full h-24 bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors resize-none"
                placeholder="What went wrong? Bugs you created? Time wasted? Deployed to prod on Friday?"
                disabled={analyzing}
              />
            </div>

            {/* Thoughts */}
            <div className="bg-bg-secondary border border-border rounded-lg p-4 mb-4">
              <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
                💭 Thoughts & Reflections
              </label>
              <textarea
                value={entry.thoughts}
                onChange={(e) => setEntry({ ...entry, thoughts: e.target.value })}
                className="w-full h-32 bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors resize-none"
                placeholder="What did you learn? What would you do differently? Random shower thoughts about that bug?"
                disabled={analyzing}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="flex-1 bg-claude-orange text-white font-semibold py-3 px-4 rounded-md text-sm hover:bg-claude-orange-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {analyzing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Claude is analyzing your dev journey...
                  </>
                ) : (
                  '🔍 Get Brutal Honest Feedback'
                )}
              </button>
              <button
                onClick={handleLoadExample}
                disabled={analyzing}
                className="bg-bg-tertiary border border-border text-text-primary px-4 py-3 rounded-md text-sm hover:border-claude-orange hover:text-claude-orange transition-colors disabled:opacity-50"
              >
                📝 Load Example
              </button>
            </div>

            {/* Tips */}
            <div className="bg-bg-secondary border border-border rounded-lg p-4">
              <h3 className="text-text-secondary text-xs uppercase tracking-wider mb-3">
                💡 Pro Tips
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-claude-orange text-sm">•</span>
                  <span className="text-text-primary text-sm">Be honest - the more real you are, the better the feedback</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-claude-orange text-sm">•</span>
                  <span className="text-text-primary text-sm">Log daily - even small wins count (yes, fixing that typo counts)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-claude-orange text-sm">•</span>
                  <span className="text-text-primary text-sm">Include fails - you learn more from mistakes than successes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-claude-orange text-sm">•</span>
                  <span className="text-text-primary text-sm">Reflect deeply - what patterns do you notice in your journey?</span>
                </li>
              </ul>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {/* Rating */}
            <div className="bg-bg-secondary border border-border rounded-lg p-6 text-center">
              <div className="text-6xl mb-4">{feedback.emoji}</div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">
                Developer Rating
              </h2>
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="flex gap-1">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded ${
                        i < feedback.rating
                          ? 'bg-claude-orange'
                          : 'bg-bg-primary border border-border'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-text-muted text-sm">
                {feedback.rating}/10 on the developer journey scale
              </p>
            </div>

            {/* Brutal Honesty */}
            <div className="bg-bg-secondary border border-border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">😬</span>
                <div>
                  <h3 className="text-text-secondary text-xs uppercase tracking-wider mb-2">
                    Brutal Honesty
                  </h3>
                  <p className="text-text-primary text-sm">{feedback.honesty}</p>
                </div>
              </div>
            </div>

            {/* Reality Check */}
            <div className="bg-bg-secondary border border-border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <h3 className="text-text-secondary text-xs uppercase tracking-wider mb-2">
                    Reality Check
                  </h3>
                  <p className="text-text-primary text-sm">{feedback.reality_check}</p>
                </div>
              </div>
            </div>

            {/* Advice */}
            <div className="bg-bg-secondary border border-border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <h3 className="text-text-secondary text-xs uppercase tracking-wider mb-2">
                    Actual Advice
                  </h3>
                  <p className="text-text-primary text-sm">{feedback.advice}</p>
                </div>
              </div>
            </div>

            {/* Motivation */}
            <div className="bg-bg-secondary border border-border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🚀</span>
                <div>
                  <h3 className="text-text-secondary text-xs uppercase tracking-wider mb-2">
                    Motivation (sort of)
                  </h3>
                  <p className="text-text-primary text-sm">{feedback.motivation}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleNewEntry}
                className="flex-1 bg-claude-orange text-white font-semibold py-3 px-4 rounded-md text-sm hover:bg-claude-orange-dim transition-colors"
              >
                📝 New Entry
              </button>
              <button
                onClick={() => {
                  const shareText = `My dev journey rating: ${feedback.emoji} ${feedback.rating}/10\n\n"${feedback.honesty}"\n\nTrack your coding journey at claudecode.wtf/diary`;
                  navigator.clipboard.writeText(shareText);
                  alert('Copied to clipboard! Share your brutal feedback with the world.');
                }}
                className="flex-1 bg-bg-tertiary border border-border text-text-primary font-semibold py-3 px-4 rounded-md text-sm hover:border-claude-orange hover:text-claude-orange transition-colors"
              >
                📤 Share Feedback
              </button>
            </div>

            {/* Quote */}
            <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
              <p className="text-text-muted text-xs italic">
                &quot;The best developers aren&apos;t the ones who never fail. They&apos;re the ones who fail, reflect, and keep building anyway.&quot;
              </p>
              <p className="text-text-secondary text-xs mt-2">— Every senior dev (probably)</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="py-4 mt-6 text-center">
          <Link href="/" className="text-claude-orange hover:underline text-sm">
            ← back
          </Link>
          <p className="text-text-muted text-xs mt-2">
            claudecode.wtf · 100% of fees to @bcherny
          </p>
        </footer>
      </div>
    </div>
  );
}
