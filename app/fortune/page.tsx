'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const FORTUNES = [
  {
    fortune: "A bug you didn't write will become your responsibility.",
    category: "Career",
    wisdom: "They say ownership is 9/10ths of the law. In software, it's 9/10ths of proximity to the error log."
  },
  {
    fortune: "Your pull request will be approved after 5pm on Friday.",
    category: "Code Review",
    wisdom: "Perfect timing for a weekend of anxious monitoring."
  },
  {
    fortune: "The code you write today will confuse you in 3 months.",
    category: "Future You",
    wisdom: "Comment like your job depends on it. Because it does."
  },
  {
    fortune: "Production will break 5 minutes after you leave for vacation.",
    category: "DevOps",
    wisdom: "The universe has a cruel sense of humor and excellent timing."
  },
  {
    fortune: "That 'temporary' fix will still be running in 2030.",
    category: "Technical Debt",
    wisdom: "Nothing is more permanent than a temporary solution."
  },
  {
    fortune: "You will spend 3 hours debugging before realizing caps lock was on.",
    category: "Debugging",
    wisdom: "The simplest explanation is usually the most embarrassing."
  },
  {
    fortune: "Your code will work perfectly... until the demo.",
    category: "Presentations",
    wisdom: "Demo gods require a sacrifice. Usually your dignity."
  },
  {
    fortune: "A framework you just learned will be deprecated next month.",
    category: "Career",
    wisdom: "JavaScript frameworks are like buses. Another one comes every 15 minutes."
  },
  {
    fortune: "The bug is in the code you said 'definitely works'.",
    category: "Debugging",
    wisdom: "Confidence and correctness are inversely correlated."
  },
  {
    fortune: "You will be mentioned in a 2am Slack message.",
    category: "On-Call",
    wisdom: "Sleep is temporary. Production incidents are forever."
  },
  {
    fortune: "Your 'quick fix' will introduce 3 new bugs.",
    category: "Technical Debt",
    wisdom: "Whack-a-mole: The Game. Now available in production."
  },
  {
    fortune: "The meeting could have been resolved with a 3-line code change.",
    category: "Meetings",
    wisdom: "Sometimes the best debugging tool is the 'decline' button."
  },
  {
    fortune: "Stack Overflow will have your exact error but from 2009 with no accepted answer.",
    category: "Debugging",
    wisdom: "The internet is full of people who also don't know what they're doing."
  },
  {
    fortune: "Your perfectly documented code will be replaced by an intern's uncommented regex.",
    category: "Code Review",
    wisdom: "Entropy always wins. Especially in codebases."
  },
  {
    fortune: "The bug only appears in production. Always.",
    category: "DevOps",
    wisdom: "'Works on my machine' is the developer's version of 'I swear I'm telling the truth'."
  },
  {
    fortune: "You will find the bug 10 minutes after posting in the Slack channel.",
    category: "Debugging",
    wisdom: "Rubber duck debugging works. So does public humiliation."
  },
  {
    fortune: "The feature that took 2 weeks will be changed entirely after 1 hour in production.",
    category: "Product",
    wisdom: "Users are the ultimate QA team. And they're merciless."
  },
  {
    fortune: "Your legacy code will outlive your career at this company.",
    category: "Career",
    wisdom: "You're not writing code. You're writing your future therapy bills."
  },
  {
    fortune: "A dependency will break the day before your deadline.",
    category: "npm/Dependencies",
    wisdom: "node_modules: Where dreams and disk space go to die."
  },
  {
    fortune: "The junior developer who asked you a question will become your manager.",
    category: "Career",
    wisdom: "Be nice to everyone. Your future boss is watching."
  }
];

const LUCKY_NUMBERS = [
  [4, 8, 15, 16, 23, 42],
  [1, 2, 3, 4, 5, 6],
  [200, 201, 204, 301, 404, 500],
  [80, 443, 8080, 3000, 5000, 8000],
  [2, 4, 8, 16, 32, 64],
  [1, 1, 2, 3, 5, 8],
];

const EMOJI_MAP: Record<string, string> = {
  "Career": "💼",
  "Code Review": "👀",
  "Future You": "🔮",
  "DevOps": "🚀",
  "Technical Debt": "💸",
  "Debugging": "🐛",
  "Presentations": "🎤",
  "On-Call": "📟",
  "Meetings": "😴",
  "Product": "📱",
  "npm/Dependencies": "📦"
};

export default function FortunePage() {
  const [fortune, setFortune] = useState(FORTUNES[0]);
  const [luckyNumbers, setLuckyNumbers] = useState(LUCKY_NUMBERS[0]);
  const [isOpening, setIsOpening] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Set initial random fortune on mount
  useEffect(() => {
    crackFortune();
  }, []);

  const crackFortune = () => {
    setIsOpening(true);
    setIsOpen(false);

    setTimeout(() => {
      const randomFortune = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
      const randomNumbers = LUCKY_NUMBERS[Math.floor(Math.random() * LUCKY_NUMBERS.length)];
      setFortune(randomFortune);
      setLuckyNumbers(randomNumbers);
      setIsOpen(true);
      setIsOpening(false);
    }, 800);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-4 sm:py-8">
      <div className="max-w-[900px] w-full px-4 sm:px-5">
        {/* Terminal Header */}
        <header className="flex items-center gap-3 py-3 mb-6">
          <Link href="/" className="flex gap-2 hover:opacity-80 transition-opacity">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </Link>
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <img src="/cc.png" alt="$CC" width={24} height={24} />
          </Link>
          <span className="text-claude-orange font-semibold text-sm">Dev Fortune Cookie</span>
          <span className="text-text-muted text-xs ml-auto hidden sm:inline">
            Know your coding fate
          </span>
        </header>

        {/* Title */}
        <section className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
            Dev Fortune Cookie 🥠
          </h1>
          <p className="text-text-secondary text-sm">
            AI-powered fortunes that predict your coding fate with programming wisdom and dev humor
          </p>
        </section>

        {/* Cookie Container */}
        <div className="bg-bg-secondary border border-border rounded-lg p-6 mb-4">
          <div className="text-center mb-6">
            <div className="text-8xl mb-4 transition-transform duration-500" style={{
              transform: isOpening ? 'scale(0.9) rotate(10deg)' : 'scale(1) rotate(0deg)'
            }}>
              {isOpen ? '🥠💥' : '🥠'}
            </div>
            <button
              onClick={crackFortune}
              disabled={isOpening}
              className="bg-claude-orange text-white font-semibold py-3 px-6 rounded-md text-sm hover:bg-claude-orange-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isOpening ? 'Cracking Cookie...' : isOpen ? '🔄 Get Another Fortune' : '✨ Crack Open Cookie'}
            </button>
          </div>

          {isOpen && (
            <div className="space-y-4 animate-fadeIn">
              {/* Fortune */}
              <div className="bg-bg-primary border border-border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{EMOJI_MAP[fortune.category] || '🔮'}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-text-secondary text-xs uppercase tracking-wider">
                        {fortune.category}
                      </span>
                    </div>
                    <p className="text-text-primary text-base font-medium mb-2">
                      {fortune.fortune}
                    </p>
                    <p className="text-text-secondary text-sm italic">
                      {fortune.wisdom}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lucky Numbers */}
              <div className="bg-bg-primary border border-border rounded-lg p-4">
                <label className="text-text-secondary text-xs uppercase tracking-wider mb-3 block">
                  Lucky HTTP Status Codes
                </label>
                <div className="flex gap-3 justify-center flex-wrap">
                  {luckyNumbers.map((num, idx) => (
                    <div
                      key={idx}
                      className="w-12 h-12 bg-bg-secondary border border-claude-orange rounded-lg flex items-center justify-center text-claude-orange font-bold text-sm"
                    >
                      {num}
                    </div>
                  ))}
                </div>
              </div>

              {/* Share */}
              <button
                onClick={() => {
                  const shareText = `My dev fortune: "${fortune.fortune}"\n\nGet yours at claudecode.wtf/fortune 🥠`;
                  navigator.clipboard.writeText(shareText);
                  alert('Fortune copied to clipboard!');
                }}
                className="w-full bg-bg-tertiary border border-border text-text-primary px-4 py-3 rounded-md text-sm hover:border-claude-orange hover:text-claude-orange transition-colors"
              >
                📤 Share Your Fortune
              </button>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
          <p className="text-text-muted text-xs">
            <span className="text-text-secondary">Disclaimer:</span> These fortunes are 100% accurate 60% of the time.
            Side effects may include paranoia, imposter syndrome, and an urge to refactor everything.
          </p>
        </div>

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
