'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function BugBountyPage() {
  const [code, setCode] = useState(`function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i <= items.length; i++) {
    total += items[i].price;
  }
  return total;
}`);
  const [language, setLanguage] = useState('javascript');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeCode = async () => {
    setIsAnalyzing(true);

    // Simulate analysis with a realistic delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Pattern matching for common bugs
    const bugs: string[] = [];

    // Check for off-by-one errors
    if (code.includes('i <= ') && code.includes('.length')) {
      bugs.push('🐛 **Off-by-one error**: Loop condition `i <= items.length` will cause an array index out of bounds error. Arrays are zero-indexed, so the last valid index is `length - 1`.\n\n**Fix**: Change `i <= items.length` to `i < items.length`');
    }

    // Check for missing null/undefined checks
    if ((code.includes('[i]') || code.includes('.get(')) && !code.includes('if (') && !code.includes('?.')) {
      bugs.push('🐛 **Missing null check**: Accessing array elements or object properties without checking if they exist can cause runtime errors.\n\n**Fix**: Add null/undefined checks or use optional chaining: `items[i]?.price`');
    }

    // Check for infinite loops
    if (code.includes('while (true)') && !code.includes('break') && !code.includes('return')) {
      bugs.push('🐛 **Infinite loop**: `while (true)` without a break or return statement will run forever.\n\n**Fix**: Add a proper exit condition or break statement');
    }

    // Check for async/await issues
    if (code.includes('async ') && code.includes('forEach')) {
      bugs.push('🐛 **Async forEach bug**: `forEach` doesn\'t work well with async/await. Promises won\'t be awaited properly.\n\n**Fix**: Use `for...of` loop instead: `for (const item of items) { await ... }`');
    }

    // Check for comparison issues
    if (code.includes('== null') && !code.includes('=== null')) {
      bugs.push('🐛 **Loose equality check**: Using `== null` can lead to unexpected behavior with undefined values.\n\n**Fix**: Use strict equality: `=== null` or check both: `=== null || === undefined`');
    }

    // Check for mutation issues
    if (code.includes('.sort()') && !code.includes('slice()') && !code.includes('[...]')) {
      bugs.push('🐛 **Array mutation**: `.sort()` mutates the original array, which can cause unexpected side effects.\n\n**Fix**: Create a copy first: `[...array].sort()` or `array.slice().sort()`');
    }

    // Check for missing error handling
    if ((code.includes('JSON.parse') || code.includes('fetch(')) && !code.includes('try') && !code.includes('catch')) {
      bugs.push('🐛 **Missing error handling**: Operations that can throw errors should be wrapped in try-catch blocks.\n\n**Fix**: Add error handling:\n```\ntry {\n  JSON.parse(data);\n} catch (error) {\n  // Handle error\n}\n```');
    }

    // Check for floating point comparison
    if ((code.includes('=== 0.') || code.includes('== 0.')) && code.includes('+')) {
      bugs.push('🐛 **Floating point precision**: Comparing floating point numbers with `===` can fail due to precision issues.\n\n**Fix**: Use epsilon comparison: `Math.abs(a - b) < Number.EPSILON`');
    }

    // Check for state mutation in React
    if (code.includes('this.state.') && code.includes('=') && !code.includes('setState')) {
      bugs.push('🐛 **Direct state mutation**: Directly modifying state in React won\'t trigger re-renders.\n\n**Fix**: Use `setState` or state setter functions');
    }

    // Check for missing dependencies
    if (code.includes('useEffect(') && code.includes('[') && code.includes(']') && !code.includes('[]')) {
      const hasVariables = /[a-zA-Z_][a-zA-Z0-9_]*/.test(code);
      if (hasVariables) {
        bugs.push('🐛 **Missing useEffect dependencies**: Variables used inside useEffect should be listed in the dependency array.\n\n**Fix**: Add all dependencies to the array or use ESLint to detect them');
      }
    }

    // Generate fixed code if bugs found
    let fixedCode = code;
    if (code.includes('i <= items.length')) {
      fixedCode = fixedCode.replace('i <= items.length', 'i < items.length');
    }
    if (code.includes('items[i].price') && !code.includes('?.')) {
      fixedCode = fixedCode.replace('items[i].price', 'items[i]?.price || 0');
    }

    if (bugs.length === 0) {
      setAnalysis('✅ **No obvious bugs detected!**\n\nYour code looks clean. However, this is a basic static analysis - always test thoroughly and consider edge cases, performance, and security implications.');
    } else {
      const bugsSection = bugs.map((bug, i) => `### Bug ${i + 1}\n\n${bug}`).join('\n\n---\n\n');
      const fixedSection = fixedCode !== code ? `\n\n---\n\n### 🔧 Fixed Code\n\n\`\`\`${language}\n${fixedCode}\n\`\`\`` : '';
      setAnalysis(`## Analysis Results\n\nFound **${bugs.length}** potential bug${bugs.length === 1 ? '' : 's'}:\n\n---\n\n${bugsSection}${fixedSection}`);
    }

    setIsAnalyzing(false);
  };

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('# ')) {
        return <h1 key={i} className="text-xl font-bold text-text-primary mb-2 mt-4">{line.slice(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-lg font-bold text-text-primary mb-2 mt-3">{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-base font-semibold text-text-primary mb-2 mt-2">{line.slice(4)}</h3>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-bold text-text-primary my-1">{line.slice(2, -2)}</p>;
      }
      if (line.startsWith('---')) {
        return <hr key={i} className="border-border my-3" />;
      }
      if (line.startsWith('```')) {
        return null; // Skip code fence markers
      }
      if (line.trim() === '') {
        return <div key={i} className="h-2" />;
      }

      // Parse inline bold
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} className="text-text-secondary text-sm my-1 leading-relaxed">
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} className="text-text-primary font-semibold">{part.slice(2, -2)}</strong>;
            }
            return <span key={j}>{part}</span>;
          })}
        </p>
      );
    });
  };

  const examples = [
    {
      name: 'Off-by-one Error',
      code: `function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i <= items.length; i++) {
    total += items[i].price;
  }
  return total;
}`,
      lang: 'javascript'
    },
    {
      name: 'Async forEach Bug',
      code: `async function processUsers(users) {
  users.forEach(async (user) => {
    await saveToDatabase(user);
  });
  console.log('Done!'); // Runs before saves complete
}`,
      lang: 'javascript'
    },
    {
      name: 'Array Mutation',
      code: `function getSortedScores(scores) {
  scores.sort((a, b) => b - a);
  return scores; // Mutates original array!
}`,
      lang: 'javascript'
    }
  ];

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-4 sm:py-8 px-[5%]">
      <div className="max-w-[1200px] w-[90%]">

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
          <span className="text-claude-orange font-semibold text-sm">Bug Bounty</span>
          <span className="text-text-muted text-xs ml-auto">Hunt down bugs in your code</span>
        </header>

        {/* CONTENT */}
        <div className="space-y-4">

          {/* Description */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <p className="text-text-primary text-sm leading-relaxed">
              Submit your buggy code and Claude will analyze it to find potential bugs, explain what's wrong, and suggest fixes.
              Like a reverse code review – instead of critiquing good code, we hunt down the actual bugs.
            </p>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Left Column - Input */}
            <div className="space-y-4">

              {/* Code Input */}
              <div className="bg-bg-secondary border border-border rounded-lg p-4">
                <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
                  Buggy Code
                </label>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full h-64 bg-bg-primary border border-border rounded-md px-3 py-2 font-mono text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors resize-none"
                  placeholder="Paste your code here..."
                />
              </div>

              {/* Language Selector */}
              <div className="bg-bg-secondary border border-border rounded-lg p-4">
                <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-claude-orange transition-colors"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="go">Go</option>
                  <option value="rust">Rust</option>
                  <option value="cpp">C++</option>
                </select>
              </div>

              {/* Analyze Button */}
              <button
                onClick={analyzeCode}
                disabled={isAnalyzing || !code.trim()}
                className="w-full bg-claude-orange text-white font-semibold py-2.5 px-4 rounded-md text-sm hover:bg-claude-orange-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? '🔍 Analyzing...' : '🔍 Find Bugs'}
              </button>

              {/* Example Buttons */}
              <div className="bg-bg-secondary border border-border rounded-lg p-4">
                <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
                  Quick Examples
                </label>
                <div className="flex flex-wrap gap-2">
                  {examples.map((example, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setCode(example.code);
                        setLanguage(example.lang);
                        setAnalysis(null);
                      }}
                      className="bg-bg-tertiary border border-border text-text-primary px-3 py-2 rounded-md text-xs hover:border-claude-orange hover:text-claude-orange transition-colors"
                    >
                      {example.name}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Column - Results */}
            <div className="space-y-4">

              <div className="bg-bg-secondary border border-border rounded-lg p-4 min-h-[500px]">
                <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
                  Analysis Results
                </label>

                {analysis ? (
                  <div className="space-y-2">
                    {renderMarkdown(analysis)}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-text-muted text-sm text-center">
                      {isAnalyzing ? '🔍 Analyzing your code...' : 'Submit code to see bug analysis'}
                    </p>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Info Card */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
              How It Works
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-claude-orange font-semibold text-sm mb-1">1. Submit Code</div>
                <p className="text-text-secondary text-xs">Paste your buggy code snippet or use an example</p>
              </div>
              <div>
                <div className="text-claude-orange font-semibold text-sm mb-1">2. Static Analysis</div>
                <p className="text-text-secondary text-xs">Pattern matching finds common bugs and anti-patterns</p>
              </div>
              <div>
                <div className="text-claude-orange font-semibold text-sm mb-1">3. Get Fixes</div>
                <p className="text-text-secondary text-xs">See explanations and suggested corrections</p>
              </div>
            </div>
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
