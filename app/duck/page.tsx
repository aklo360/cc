'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const COMMON_PROBLEMS = [
  'My React component re-renders infinitely when I update state in useEffect',
  "CSS flexbox isn't centering my div correctly",
  'Async function returns [object Promise] instead of the actual value',
  'My API call works in Postman but fails in my app with CORS error',
  'JavaScript map function is not working on my array',
];

interface DuckResponse {
  advice: string;
  isBadAdvice: boolean;
}

export default function DuckPage() {
  const [problem, setProblem] = useState(COMMON_PROBLEMS[0]);
  const [response, setResponse] = useState<DuckResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isQuacking, setIsQuacking] = useState(false);

  const handleRandomExample = () => {
    const randomIndex = Math.floor(Math.random() * COMMON_PROBLEMS.length);
    setProblem(COMMON_PROBLEMS[randomIndex]);
  };

  const handleTalkToDuck = useCallback(async () => {
    if (!problem.trim() || isLoading) return;

    setIsLoading(true);
    setIsQuacking(true);
    setResponse(null);

    try {
      const res = await fetch('/api/duck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem }),
      });

      if (!res.ok) throw new Error('Duck is sleeping');

      const data = await res.json();
      setResponse(data);
    } catch {
      // Fallback response if API fails
      setResponse({
        advice: "Quack! Have you tried turning it off and on again? But seriously, try explaining your problem out loud - sometimes just articulating it helps you spot the issue!",
        isBadAdvice: false,
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsQuacking(false), 500);
    }
  }, [problem, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleTalkToDuck();
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="max-w-[900px] w-full flex flex-col gap-6">
        {/* Header */}
        <header className="flex items-center gap-3 py-3 border-b border-border">
          <Link href="/" className="flex gap-2 hover:opacity-80 transition-opacity">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </Link>
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image src="/cc.png" alt="$CC" width={24} height={24} />
          </Link>
          <span className="text-claude-orange font-semibold text-sm">Rubber Duck Debugger</span>
          <span className="text-text-muted text-xs ml-auto">🦆 Quack your problems away</span>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Duck Display */}
          <div className="bg-bg-secondary border border-border rounded-lg p-6 flex flex-col items-center justify-center min-h-[400px]">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg
                viewBox="0 0 200 200"
                className={`w-full h-full transition-all duration-300 ${isQuacking ? 'scale-110' : ''}`}
              >
                {/* Body */}
                <ellipse cx="100" cy="120" rx="50" ry="45" fill="#fbbf24" className="drop-shadow-lg" />
                {/* Head */}
                <circle cx="100" cy="70" r="35" fill="#fbbf24" className="drop-shadow-lg" />
                {/* Beak */}
                <g className={isQuacking ? 'animate-pulse' : ''}>
                  <ellipse cx="125" cy="70" rx="20" ry="8" fill="#ff6b35" className="drop-shadow-md" />
                  <path d="M 125 70 Q 135 75 145 70" stroke="#d55a2a" strokeWidth="2" fill="none" />
                </g>
                {/* Eye */}
                <g>
                  <circle cx="95" cy="60" r="6" fill="white" />
                  <circle cx="97" cy="60" r="3" fill="#1a1a1a" className={isQuacking ? 'animate-bounce' : ''} />
                </g>
                {/* Wing */}
                <ellipse
                  cx="70"
                  cy="115"
                  rx="15"
                  ry="25"
                  fill="#f59e0b"
                  className={`transform transition-all duration-300 ${isQuacking ? 'rotate-12' : ''}`}
                />
                {/* Tail */}
                <path
                  d="M 50 130 Q 40 125 35 135 Q 40 140 50 138 Z"
                  fill="#f59e0b"
                  className={`transform-origin-center transition-all duration-300 ${isQuacking ? '-rotate-12' : ''}`}
                />
              </svg>
            </div>
            <div className="mt-6 text-center">
              {response ? (
                <div className="space-y-2">
                  <p className={`text-sm ${response.isBadAdvice ? 'text-accent-yellow' : 'text-text-primary'}`}>
                    {response.advice}
                  </p>
                  {response.isBadAdvice && (
                    <p className="text-text-muted text-xs italic">⚠️ This might be intentionally bad advice...</p>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-text-secondary text-sm mb-2">Ready to listen to your problems!</p>
                  <p className="text-text-muted text-xs">
                    The best debugging technique is to explain your code to a rubber duck
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Input Section */}
          <div className="flex flex-col gap-4">
            <div className="bg-bg-secondary border border-border rounded-lg p-4 flex-1">
              <div className="flex items-center justify-between mb-2">
                <label className="text-text-secondary text-xs uppercase tracking-wider">Explain your problem</label>
                <button
                  onClick={handleRandomExample}
                  className="text-xs text-text-muted hover:text-claude-orange transition-colors"
                >
                  Random example
                </button>
              </div>
              <textarea
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your coding problem in detail..."
                rows={6}
                className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors resize-none"
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-text-muted text-xs">Cmd/Ctrl + Enter to submit</span>
                <button
                  onClick={handleTalkToDuck}
                  disabled={isLoading || !problem.trim()}
                  className="bg-claude-orange text-white font-semibold py-2 px-6 rounded-md text-sm hover:bg-claude-orange/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Quacking...' : 'Talk to Duck'}
                </button>
              </div>
            </div>

            <div className="bg-bg-secondary border border-border rounded-lg p-4">
              <div className="text-text-secondary text-xs uppercase tracking-wider mb-2">Common Problems</div>
              <div className="flex flex-col gap-2">
                {COMMON_PROBLEMS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setProblem(p)}
                    className="text-xs bg-bg-primary border border-border px-3 py-2 rounded text-left text-text-secondary hover:text-claude-orange hover:border-claude-orange transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-bg-secondary border border-border rounded-lg p-4">
          <div className="text-text-secondary text-xs space-y-2">
            <p>
              <strong className="text-text-primary">What is Rubber Duck Debugging?</strong>
            </p>
            <p>
              It&apos;s a method of debugging code by articulating a problem in spoken or written natural language. The
              name is a reference to a story in the book <em>The Pragmatic Programmer</em> in which a programmer would
              carry around a rubber duck and debug their code by forcing themselves to explain it, line by line, to the
              duck.
            </p>
            <p className="text-accent-yellow">
              💡 This duck provides both genuine debugging advice and occasionally hilariously bad suggestions. Use your
              judgment! 🦆
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="py-2 border-t border-border text-center">
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
