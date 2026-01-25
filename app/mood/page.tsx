'use client';

import { useState } from 'react';
import Link from 'next/link';

const EXAMPLE_CODE = `// Fix the damn timeout issue
function fetchUserData(userId) {
  console.log('trying to fetch user...', userId);
  console.log('why is this not working???');

  return fetch(\`/api/users/\${userId}\`)
    .then(res => res.json())
    .then(data => {
      console.log('finally got data:', data);
      return data;
    })
    .catch(err => {
      console.log('ERROR:', err);
      console.log('WTF is happening');
      // TODO: fix this mess tomorrow
      return null;
    });
}`;

interface MoodConfig {
  title: string;
  emoji: string;
  colorClass: string;
  description: string;
  advice: string;
  vibes: string[];
}

const MOODS: Record<string, MoodConfig> = {
  desperate: {
    title: '3AM Debugging Mode',
    emoji: '😭',
    colorClass: 'text-red-400',
    description: 'This code SCREAMS "why won\'t you work?!" Energy: Desperation. Fuel: Coffee and tears.',
    advice: 'Take a break. Seriously. The bug will still be there in the morning, but you\'ll actually be able to see it.',
    vibes: ['Excessive console.logs detected', 'Comment-driven development', 'TODO comments everywhere', 'Stack Overflow in another tab'],
  },
  caffeinated: {
    title: 'Hypercaffeinated Genius',
    emoji: '☕',
    colorClass: 'text-amber-400',
    description: 'You wrote this at 200 WPM with your third espresso. It probably works, but nobody knows how.',
    advice: 'Maybe add some comments? Your future self will thank you. Also, drink some water.',
    vibes: ['Long variable names', 'Chained method calls', 'One-liners that do too much', 'Fast and furious typing detected'],
  },
  perfectionist: {
    title: 'The Perfectionist',
    emoji: '✨',
    colorClass: 'text-accent-purple',
    description: 'Every variable is typed. Every function documented. Every edge case handled. You\'re either very organized or avoiding actual work.',
    advice: 'Your code is beautiful. But does it ship? Remember: done is better than perfect.',
    vibes: ['Type definitions galore', 'JSDoc comments', 'Readonly properties', 'Pristine formatting'],
  },
  confused: {
    title: 'Confusion Station',
    emoji: '🤔',
    colorClass: 'text-indigo-400',
    description: 'You\'re not sure what\'s happening here. The code isn\'t sure either. It\'s a shared journey of uncertainty.',
    advice: 'Step back and diagram it out. Sometimes the best debugging tool is a piece of paper.',
    vibes: ['??? comments', '"any" type usage', '"maybe" and "not sure" in comments', 'Experimental vibes'],
  },
  overengineered: {
    title: 'The Architect',
    emoji: '🏛️',
    colorClass: 'text-cyan-400',
    description: 'Why use a function when you can use an AbstractSingletonFactoryFactory? You\'ve got PATTERNS, baby.',
    advice: 'YAGNI - You Aren\'t Gonna Need It. Sometimes simple is better than clever.',
    vibes: ['Design patterns on design patterns', 'Abstraction layers', 'Enterprise-grade naming', 'Future-proofed to 2099'],
  },
  zen: {
    title: 'Zen Master',
    emoji: '🧘',
    colorClass: 'text-accent-green',
    description: 'Clean, simple, elegant. This code has achieved enlightenment. You were probably in a really good mood.',
    advice: 'Keep doing what you\'re doing. This is the way.',
    vibes: ['Simple and clean', 'Clear intent', 'Minimal complexity', 'Chef\'s kiss'],
  },
  chaotic: {
    title: 'Chaotic Energy',
    emoji: '🌪️',
    colorClass: 'text-fuchsia-400',
    description: 'This code was written by someone who laughs in the face of conventions. Is it madness? Is it genius? Yes.',
    advice: 'Maybe add some structure? Or don\'t. You\'re living your best life. Just... maybe don\'t deploy this to production.',
    vibes: ['Interesting variable names', 'Creative formatting', '"temp" and "hack" comments', 'Unconventional approaches'],
  },
};

const EXAMPLES: Record<string, string> = {
  desperate: `// Fix the damn timeout issue
function fetchUserData(userId) {
  console.log('trying to fetch user...', userId);
  console.log('why is this not working???');
  console.log('please work');
  console.log('PLEASE');

  return fetch(\`/api/users/\${userId}\`)
    .then(res => res.json())
    .then(data => {
      console.log('finally got data:', data);
      return data;
    })
    .catch(err => {
      console.log('ERROR:', err);
      console.log('WTF is happening');
      // TODO: fix this mess tomorrow
      return null;
    });
}`,
  perfectionist: `/**
 * Fetches user data from the API
 * @param userId - The unique identifier for the user
 * @returns Promise resolving to UserData or null on error
 * @throws {NetworkError} When network request fails
 */
interface UserData {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

async function fetchUserData(userId: string): Promise<UserData | null> {
  try {
    const response = await fetch(\`/api/users/\${userId}\`);
    const data: UserData = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch user data:', error);
    return null;
  }
}`,
  chaotic: `function getData(x){var result123abc;;;
// temp hack
if(x){return fetch('/api/'+x).then(r=>r.json()).catch(e=>{console.log(e);return null})}
else{return null};;;}`,
  zen: `const fetchUser = async (id) => {
  const response = await fetch(\`/api/users/\${id}\`);
  return response.json();
};`,
};

export default function MoodPage() {
  const [code, setCode] = useState(EXAMPLE_CODE);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{ mood: MoodConfig; confidence: number; secondaryMood: string | null } | null>(null);

  const analyzeMood = (codeText: string) => {
    const patterns: Record<string, RegExp[]> = {
      desperate: [
        /\/\/\s*(fuck|shit|damn|wtf|help|why|please work)/i,
        /console\.log\(['"].*\?+['"].*\)/,
        /\/\/\s*TODO:.*fix.*this/i,
        /\/\/\s*this\s+(doesn't|doesnt)\s+work/i,
      ],
      caffeinated: [
        /\b(while|for)\s*\([^)]*\)\s*\{[^}]{200,}\}/,
        /\b\w{15,}\b/,
        /\)\s*\.\s*\w+\s*\(\s*\)\s*\.\s*\w+\s*\(/,
        /=>.*=>.*=>/,
      ],
      perfectionist: [
        /\/\*\*[\s\S]*@param/,
        /interface\s+\w+/g,
        /type\s+\w+\s*=/g,
        /private\s+readonly/,
      ],
      confused: [
        /\/\/\s*\?\?\?/,
        /\/\/\s*not\s+sure/i,
        /\/\/\s*maybe/i,
        /any\s*(\[|\)|;)/,
      ],
      overengineered: [
        /AbstractFactoryBuilder/i,
        /SingletonManager/i,
        /class.*Factory.*Factory/,
        /interface\s+I[A-Z]\w*Interface/,
      ],
      zen: [
        /\/\/\s*zen/i,
        /const\s+\w+\s*=\s*\([^)]*\)\s*=>/,
        /^\s*return\s+\w+$/m,
        /\/\/\s*simple/i,
      ],
      chaotic: [
        /;\s*;\s*;/,
        /\b(var\s+|let\s+|const\s+)\w+\d+\w*\d+/,
        /\/\/\s*temp/i,
        /\/\/\s*hack/i,
      ],
    };

    const scores: Record<string, number> = {
      desperate: 0,
      caffeinated: 0,
      perfectionist: 0,
      confused: 0,
      overengineered: 0,
      zen: 0,
      chaotic: 0,
    };

    Object.entries(patterns).forEach(([mood, regexes]) => {
      regexes.forEach(regex => {
        const matches = codeText.match(regex);
        if (matches) {
          scores[mood] += Array.isArray(matches) ? matches.length : 1;
        }
      });
    });

    const lines = codeText.split('\n');
    const commentLines = lines.filter(l => l.trim().startsWith('//')).length;
    const codeLines = lines.filter(l => l.trim() && !l.trim().startsWith('//')).length;
    const avgLineLength = codeLines > 0 ? codeText.length / codeLines : 0;

    if (commentLines > codeLines * 0.5) scores.perfectionist += 2;
    if (avgLineLength > 100) scores.caffeinated += 2;
    if (codeText.includes('TODO') || codeText.includes('FIXME')) scores.desperate += 2;
    const consoleLogMatches = codeText.match(/console\.log/g);
    if (consoleLogMatches && consoleLogMatches.length > 3) scores.desperate += 3;
    if (avgLineLength < 40 && codeLines > 5) scores.zen += 2;

    const sortedMoods = Object.entries(scores)
      .filter(([_, score]) => score > 0)
      .sort(([, a], [, b]) => b - a);

    if (sortedMoods.length === 0) {
      return {
        mood: MOODS.zen,
        confidence: 50,
        secondaryMood: null,
      };
    }

    const [primaryMood, primaryScore] = sortedMoods[0];
    const secondaryMood = sortedMoods.length > 1 ? sortedMoods[1][0] : null;

    return {
      mood: MOODS[primaryMood],
      confidence: Math.min(90, 50 + primaryScore * 10),
      secondaryMood: secondaryMood ? MOODS[secondaryMood].title : null,
    };
  };

  const handleAnalyze = async () => {
    if (!code.trim()) return;
    setAnalyzing(true);
    setResult(null);

    await new Promise(resolve => setTimeout(resolve, 1500));

    const analysisResult = analyzeMood(code);
    setResult(analysisResult);
    setAnalyzing(false);
  };

  const loadExample = (key: string) => {
    setCode(EXAMPLES[key]);
    setResult(null);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-4 sm:py-8">
      <div className="max-w-[900px] w-full px-4 sm:px-5">
        {/* Terminal Header */}
        <header className="flex items-center gap-3 py-3 border-b border-border mb-6">
          <Link href="/" className="flex gap-2 hover:opacity-80 transition-opacity">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </Link>
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <img src="/cc.png" alt="$CC" width={24} height={24} />
          </Link>
          <span className="text-claude-orange font-semibold text-sm">Code Mood Ring</span>
          <span className="text-text-muted text-xs ml-auto hidden sm:inline">
            What emotional state were you in?
          </span>
        </header>

        {/* Title */}
        <section className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
            Code Mood Ring
          </h1>
          <p className="text-text-secondary text-sm">
            Paste your code. Discover the emotional state you were in when you wrote it.
          </p>
          <p className="text-text-muted text-xs mt-1">
            Because we all know that 3am debugging code hits different
          </p>
        </section>

        {!result ? (
          <>
            {/* Code Input */}
            <div className="bg-bg-secondary border border-border rounded-lg p-4 mb-4">
              <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
                Your Code
              </label>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-48 bg-bg-primary border border-border rounded-md px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors resize-none"
                placeholder="// Paste your code here..."
                disabled={analyzing}
              />

              {/* Example Buttons */}
              <div className="flex flex-wrap gap-2 mt-3 mb-3">
                <button
                  type="button"
                  onClick={() => loadExample('desperate')}
                  className="px-3 py-1.5 text-xs bg-bg-primary hover:bg-bg-tertiary border border-red-500/30 rounded-md text-red-400 transition-colors"
                >
                  😭 Desperate
                </button>
                <button
                  type="button"
                  onClick={() => loadExample('perfectionist')}
                  className="px-3 py-1.5 text-xs bg-bg-primary hover:bg-bg-tertiary border border-accent-purple/30 rounded-md text-accent-purple transition-colors"
                >
                  ✨ Perfectionist
                </button>
                <button
                  type="button"
                  onClick={() => loadExample('chaotic')}
                  className="px-3 py-1.5 text-xs bg-bg-primary hover:bg-bg-tertiary border border-fuchsia-500/30 rounded-md text-fuchsia-400 transition-colors"
                >
                  🌪️ Chaotic
                </button>
                <button
                  type="button"
                  onClick={() => loadExample('zen')}
                  className="px-3 py-1.5 text-xs bg-bg-primary hover:bg-bg-tertiary border border-accent-green/30 rounded-md text-accent-green transition-colors"
                >
                  🧘 Zen
                </button>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={analyzing || !code.trim()}
                className="w-full bg-claude-orange text-white font-semibold py-3 px-4 rounded-md text-sm hover:bg-claude-orange-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {analyzing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analyzing your emotional state...
                  </>
                ) : (
                  '🔮 Analyze My Code Mood'
                )}
              </button>
            </div>

            {/* Tip */}
            <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
              <p className="text-text-muted text-xs">
                Pro tip: The more honest your code, the more accurate the reading
              </p>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {/* Result Card */}
            <div className="bg-bg-secondary border border-border rounded-lg p-6 text-center">
              <div className="text-6xl mb-4">{result.mood.emoji}</div>
              <h2 className={`text-2xl font-bold mb-2 ${result.mood.colorClass}`}>
                {result.mood.title}
              </h2>
              <div className="flex items-center justify-center gap-2 text-text-muted mb-4">
                <span className="text-xs">Confidence:</span>
                <div className="bg-bg-primary rounded-full h-2 w-32 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-claude-orange transition-all duration-1000"
                    style={{ width: `${result.confidence}%` }}
                  />
                </div>
                <span className="text-xs font-semibold">{result.confidence}%</span>
              </div>
              <p className="text-text-secondary text-sm">{result.mood.description}</p>
            </div>

            {/* Vibes Detected */}
            <div className="bg-bg-secondary border border-border rounded-lg p-4">
              <h3 className="text-text-secondary text-xs uppercase tracking-wider mb-3">
                Vibes Detected
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {result.mood.vibes.map((vibe, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-bg-primary border border-border rounded-md px-3 py-2"
                  >
                    <span className="text-claude-orange">•</span>
                    <span className="text-text-primary text-sm">{vibe}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Advice */}
            <div className="bg-bg-secondary border border-border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">💡</span>
                <div>
                  <h3 className="text-text-secondary text-xs uppercase tracking-wider mb-2">
                    Advice
                  </h3>
                  <p className="text-text-primary text-sm">{result.mood.advice}</p>
                </div>
              </div>
            </div>

            {/* Secondary Mood */}
            {result.secondaryMood && (
              <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
                <p className="text-text-muted text-sm">
                  <span className="text-text-secondary">Also detected:</span> {result.secondaryMood}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setResult(null)}
                className="flex-1 bg-claude-orange text-white font-semibold py-3 px-4 rounded-md text-sm hover:bg-claude-orange-dim transition-colors"
              >
                🔄 Analyze Another Code
              </button>
              <button
                onClick={() => {
                  const shareText = `My code mood: ${result.mood.emoji} ${result.mood.title} (${result.confidence}% confidence)\n\nTry it yourself at claudecode.wtf/mood`;
                  navigator.clipboard.writeText(shareText);
                  alert('Copied to clipboard!');
                }}
                className="flex-1 bg-bg-secondary hover:bg-bg-tertiary text-text-primary font-semibold py-3 px-4 rounded-md text-sm border border-border transition-colors"
              >
                📤 Share Results
              </button>
            </div>

            {/* Fun Fact */}
            <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
              <p className="text-text-muted text-xs">
                <span className="text-text-secondary">Fun fact:</span> Studies show that 73% of developers write their best code either at 2am or right before a deadline. The other 27% are lying.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="py-4 mt-6 border-t border-border text-center">
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
