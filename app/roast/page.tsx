'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const EXAMPLE_CODE = `function getData() {
  var data = null;
  fetch('/api/data').then(res => {
    data = res.json();
  });
  return data; // TODO: fix this later
}`;

const ROAST_TARGETS = [
  'Using var in 2026',
  'Console.log debugging',
  'TODO comments from 1999',
  'Hardcoded secrets',
  'Functions longer than CVS receipts',
  'Variable names like "x" and "tmp"',
];

interface RoastResponse {
  roast: string;
  suggestions: string[];
}

export default function RoastPage() {
  const [code, setCode] = useState(EXAMPLE_CODE);
  const [response, setResponse] = useState<RoastResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRandomExample = () => {
    const examples = [
      EXAMPLE_CODE,
      `// production ready code
let x = 1;
let xx = 2;
let xxx = x + xx;
console.log(xxx);
// ship it!`,
      `async function doTheThing() {
  try {
    const result = await fetch(API_KEY); // oops
    return result;
  } catch(e) {
    // TODO: handle error
  }
}`,
    ];
    const randomIndex = Math.floor(Math.random() * examples.length);
    setCode(examples[randomIndex]);
  };

  const handleRoast = useCallback(async () => {
    if (!code.trim() || isLoading) return;

    setIsLoading(true);
    setResponse(null);

    try {
      const res = await fetch('/api/roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) throw new Error('Roast failed');

      const data = await res.json();
      setResponse(data);
    } catch {
      // Fallback roast if API fails
      setResponse({
        roast: "Oh honey, this code is like a mystery novel where the mystery is 'why did someone think this was okay?' I've seen spaghetti with better structure. But hey, at least it probably runs... sometimes!",
        suggestions: [
          'Consider using const/let instead of var',
          'Async/await might help with that data fetching',
          'Those TODO comments have been there since the before times',
        ],
      });
    } finally {
      setIsLoading(false);
    }
  }, [code, isLoading]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-4 sm:py-8">
      <div className="max-w-[900px] w-full px-4 sm:px-5">
        {/* Header */}
        <header className="flex items-center gap-3 py-3 border-b border-border mb-6">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Image src="/cc.png" alt="$CC" width={24} height={24} />
            <span className="text-claude-orange font-semibold text-sm">Code Roast</span>
          </Link>
          <span className="text-text-muted text-xs ml-auto hidden sm:inline">🔥 Where code gets grilled</span>
        </header>

        {/* Hero Section */}
        <section className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">Claude&apos;s Code Critique Corner</h1>
          <p className="text-text-secondary text-sm sm:text-base">
            Upload your code for a brutally honest (but loving) roast
          </p>
          <p className="text-text-muted text-xs mt-2">Think code review meets comedy roast 🎤🔥</p>
        </section>

        {/* Code Input */}
        <div className="bg-bg-secondary border border-border rounded-lg p-4 sm:p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-text-secondary text-xs uppercase tracking-wider">
              Paste Your Code (if you dare)
            </label>
            <button
              onClick={handleRandomExample}
              className="text-xs text-claude-orange hover:text-claude-orange/80 transition-colors"
            >
              🎲 Random Example
            </button>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-64 bg-bg-primary border border-border rounded-md px-3 py-3 font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors resize-none"
            placeholder="// Paste your code here...
// I promise to be gentle (mostly)"
          />
          <div className="flex items-center justify-between mt-4">
            <p className="text-text-muted text-xs">Don&apos;t worry, we roast with love ❤️‍🔥</p>
            <button
              onClick={handleRoast}
              disabled={isLoading || !code.trim()}
              className="bg-claude-orange text-white font-semibold py-3 px-6 rounded-md text-sm hover:bg-claude-orange/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {isLoading ? '🔥 Roasting...' : '🔥 Roast My Code'}
            </button>
          </div>
        </div>

        {/* Roast Response */}
        {response && (
          <div className="bg-bg-secondary border border-claude-orange/50 rounded-lg p-4 sm:p-6 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🔥</span>
              <h3 className="text-text-primary font-semibold">The Roast</h3>
            </div>
            <p className="text-text-secondary text-sm mb-4">{response.roast}</p>
            {response.suggestions.length > 0 && (
              <>
                <h4 className="text-text-secondary text-xs uppercase tracking-wider mb-2">
                  But seriously, here&apos;s some help:
                </h4>
                <ul className="space-y-1">
                  {response.suggestions.map((s, i) => (
                    <li key={i} className="text-text-muted text-xs flex items-start gap-2">
                      <span className="text-accent-green">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">😂</div>
            <div className="text-text-secondary text-xs">Brutally Honest</div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">💡</div>
            <div className="text-text-secondary text-xs">Actually Helpful</div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">❤️</div>
            <div className="text-text-secondary text-xs">With Love</div>
          </div>
        </div>

        {/* Roast Targets */}
        <div className="bg-bg-secondary border border-border rounded-lg p-4">
          <h3 className="text-text-secondary text-xs uppercase tracking-wider mb-3">
            What You Might Get Roasted For
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-muted">
            {ROAST_TARGETS.map((target, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-claude-orange">•</span>
                <span>{target}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="py-4 mt-6 border-t border-border text-center">
          <p className="text-text-muted text-xs">
            <Link href="/" className="text-claude-orange hover:underline">
              claudecode.wtf
            </Link>{' '}
            · 100% of fees to @bcherny
          </p>
        </footer>
      </div>
    </div>
  );
}
