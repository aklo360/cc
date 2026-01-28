'use client';

import { useState } from 'react';
import Link from 'next/link';

const EXAMPLE_CODES = [
  `function mystery() {
  let x = [];
  for (var i = 0; i < 10; i++) {
    x.push(function() { return i; });
  }
  return x;
}`,
  `const magic = (a, b) => a + b + '';`,
  `async function getData() {
  const response = await fetch('/api/data');
  const data = await response.json();
  return data?.items?.map(i => i?.value) || [];
}`,
  `[1,2,3].reduce((a,b)=>a+b,0)`,
  `while(true) { console.log("help"); }`
];

interface DetectiveResponse {
  intro: string;
  language: string;
  languageConfidence: string;
  whatItDoes: string;
  styleAnalysis: string;
  verdict: string;
  evidence: string[];
}

export default function DetectivePage() {
  const [code, setCode] = useState(EXAMPLE_CODES[0]);
  const [response, setResponse] = useState<DetectiveResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRandomExample = () => {
    const randomIndex = Math.floor(Math.random() * EXAMPLE_CODES.length);
    setCode(EXAMPLE_CODES[randomIndex]);
    setResponse(null);
  };

  const handleInvestigate = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setResponse(null);

    try {
      const res = await fetch('/api/detective', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) throw new Error('Investigation failed');

      const data = await res.json();
      setResponse(data);
    } catch {
      // Fallback response if API fails
      setResponse({
        intro: "The case hit a snag. Technical difficulties. But I never leave a case unsolved.",
        language: "Analysis Unavailable",
        languageConfidence: "My usual methods are temporarily offline. The lab equipment's on the fritz.",
        whatItDoes: "This code appears to perform some operations, but I'll need my full detective toolkit to give you the complete picture. The basic structure looks intentional - someone wrote this for a reason.",
        styleAnalysis: "Can't give you my full noir commentary right now - my investigation tools are taking a coffee break. But from what I can see with the naked eye, there's code here, and where there's code, there's a story. Come back in a moment and I'll crack this case wide open.",
        verdict: "INVESTIGATION PAUSED - Technical difficulties in the evidence room",
        evidence: [
          "The code exists - that much is clear",
          "Standard syntax patterns detected",
          "Proper investigation requires full access to detective tools",
          "Try again in a moment - this case isn't closed yet"
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-4 sm:py-8 px-[5%]">
      <div className="max-w-[900px] w-[90%]">

        {/* HEADER */}
        <header className="flex items-center gap-3 py-3 mb-6">
          <Link href="/" className="flex gap-2 hover:opacity-80 transition-opacity">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </Link>
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <img src="/cc.png" alt="$CC" width={24} height={24} />
          </Link>
          <span className="text-claude-orange font-semibold text-sm">Code Detective</span>
          <span className="text-text-muted text-xs ml-auto hidden sm:inline">🕵️ Solving code mysteries</span>
        </header>

        {/* HERO */}
        <section className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">
            Claude&apos;s Code Detective Agency
          </h1>
          <p className="text-text-secondary text-sm sm:text-base mb-1">
            Private investigator specializing in mysterious code snippets
          </p>
          <p className="text-text-muted text-xs">
            🔎 The case files are open. Submit your evidence.
          </p>
        </section>

        {/* CODE INPUT */}
        <div className="bg-bg-secondary border border-border rounded-lg p-4 sm:p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-text-secondary text-xs uppercase tracking-wider">
              📋 Case File: Submit Code Evidence
            </label>
            <button
              onClick={handleRandomExample}
              className="text-xs text-claude-orange hover:text-claude-orange/80 transition-colors"
            >
              🎲 Random Cold Case
            </button>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-64 bg-bg-primary border border-border rounded-md px-3 py-3 font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors resize-none"
            placeholder="// Paste the mysterious code here...
// I've cracked tougher cases than this."
          />
          <div className="flex items-center justify-between mt-4">
            <p className="text-text-muted text-xs">💼 Every snippet tells a story</p>
            <button
              onClick={handleInvestigate}
              disabled={isLoading}
              className="bg-claude-orange text-white font-semibold py-3 px-6 rounded-md text-sm hover:bg-claude-orange/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              {isLoading ? '🔍 Investigating...' : '🔍 Investigate'}
            </button>
          </div>
        </div>

        {/* DETECTIVE REPORT */}
        {response && (
          <div className="bg-bg-secondary border border-claude-orange/50 rounded-lg p-4 sm:p-6 mb-4 space-y-4">
            {/* Intro */}
            <div className="border-b border-border pb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🕵️</span>
                <h3 className="text-text-primary font-semibold">Detective&apos;s Report</h3>
              </div>
              <p className="text-text-secondary text-sm italic">&ldquo;{response.intro}&rdquo;</p>
            </div>

            {/* Language Detection */}
            <div>
              <label className="text-text-secondary text-xs uppercase tracking-wider mb-1 block">
                🔬 Language Analysis
              </label>
              <p className="text-text-primary font-semibold mb-1">{response.language}</p>
              <p className="text-text-muted text-xs">{response.languageConfidence}</p>
            </div>

            {/* What It Does */}
            <div>
              <label className="text-text-secondary text-xs uppercase tracking-wider mb-1 block">
                🧩 What This Code Actually Does
              </label>
              <p className="text-text-secondary text-sm">{response.whatItDoes}</p>
            </div>

            {/* Style Analysis (The Roast) */}
            <div className="bg-bg-primary border border-border rounded-md p-3">
              <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
                😎 Style Analysis (Noir Commentary)
              </label>
              <p className="text-text-secondary text-sm leading-relaxed">{response.styleAnalysis}</p>
            </div>

            {/* Evidence */}
            {response.evidence && response.evidence.length > 0 && (
              <div>
                <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
                  📑 Evidence Log
                </label>
                <ul className="space-y-1.5">
                  {response.evidence.map((item, i) => (
                    <li key={i} className="text-text-muted text-xs flex items-start gap-2">
                      <span className="text-claude-orange flex-shrink-0">#{i + 1}</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Verdict */}
            <div className="bg-bg-tertiary border border-claude-orange rounded-md p-3 text-center">
              <label className="text-text-secondary text-xs uppercase tracking-wider mb-1 block">
                ⚖️ Final Verdict
              </label>
              <p className="text-claude-orange font-semibold text-sm">{response.verdict}</p>
            </div>
          </div>
        )}

        {/* FEATURE CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">🔍</div>
            <div className="text-text-secondary text-xs font-semibold mb-1">Language Detection</div>
            <div className="text-text-muted text-xs">Identifies what you&apos;re working with</div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">🎭</div>
            <div className="text-text-secondary text-xs font-semibold mb-1">Noir Commentary</div>
            <div className="text-text-muted text-xs">Hard-boiled code reviews</div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-text-secondary text-xs font-semibold mb-1">Full Analysis</div>
            <div className="text-text-muted text-xs">What it does + how it&apos;s written</div>
          </div>
        </div>

        {/* DETECTIVE SPECIALTIES */}
        <div className="bg-bg-secondary border border-border rounded-lg p-4 mb-4">
          <label className="text-text-secondary text-xs uppercase tracking-wider mb-3 block">
            🎯 This Detective Specializes In
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-muted">
            {[
              'Language identification (JavaScript, Python, Go, Rust, etc.)',
              'Explaining what cryptic code actually does',
              'Noir-style roasting of questionable coding practices',
              'Spotting classic anti-patterns and code smells',
              'One-liner mysteries and obfuscated code',
              'Legacy code archaeology'
            ].map((specialty, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-claude-orange flex-shrink-0">•</span>
                <span>{specialty}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
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
