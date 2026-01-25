'use client';

import { useState } from 'react';
import Link from 'next/link';

const EXAMPLE_CODE = `function calculate(a, b, c) {
  var result;
  if (c == "add") {
    result = a + b;
  }
  else if (c == "subtract") {
    result = a - b;
  }
  else if (c == "multiply") {
    result = a * b;
  }
  else if (c == "divide") {
    result = a / b;
  }
  return result;
}

// Helper function
function getData() {
  var data = [];
  for (var i = 0; i < 10; i++) {
    data.push(i);
  }
  return data;
}`;

const REFACTORED_CODE = `type Operation = 'add' | 'subtract' | 'multiply' | 'divide';

/**
 * Performs arithmetic operations on two numbers
 * @param a - First operand
 * @param b - Second operand
 * @param operation - The operation to perform
 * @returns The result of the operation
 */
function calculate(a: number, b: number, operation: Operation): number {
  const operations: Record<Operation, (a: number, b: number) => number> = {
    add: (a, b) => a + b,
    subtract: (a, b) => a - b,
    multiply: (a, b) => a * b,
    divide: (a, b) => a / b,
  };

  return operations[operation](a, b);
}

/**
 * Generates an array of numbers from 0 to length-1
 * @param length - The length of the array to generate
 * @returns An array of sequential numbers
 */
function generateSequentialData(length: number): number[] {
  return Array.from({ length }, (_, i) => i);
}`;

const IMPROVEMENTS = [
  {
    category: 'Type Safety',
    icon: '🛡️',
    items: [
      'Added TypeScript types for function parameters',
      'Created Operation union type for better autocomplete',
      'Added JSDoc comments for documentation',
    ],
  },
  {
    category: 'Code Quality',
    icon: '✨',
    items: [
      'Replaced var with const/let for block scoping',
      'Used === instead of == for strict equality',
      'Converted if-else chain to lookup object',
    ],
  },
  {
    category: 'Modern JavaScript',
    icon: '🚀',
    items: [
      'Used Array.from() instead of manual loop',
      'Applied functional programming patterns',
      'Improved function naming (getData → generateSequentialData)',
    ],
  },
];

const CODE_EXAMPLES = [
  {
    name: 'Calculator',
    before: EXAMPLE_CODE,
  },
  {
    name: 'Callback Hell',
    before: `function getUserData(id) {
  getUser(id, function(user) {
    getOrders(user.id, function(orders) {
      getOrderDetails(orders[0].id, function(details) {
        console.log(details);
      });
    });
  });
}`,
  },
  {
    name: 'Array Manipulation',
    before: `function filterAndMap(arr) {
  var result = [];
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] > 5) {
      result.push(arr[i] * 2);
    }
  }
  return result;
}`,
  },
];

function RefactorPage() {
  const [code, setCode] = useState(EXAMPLE_CODE);
  const [refactoredCode, setRefactoredCode] = useState('');
  const [improvements, setImprovements] = useState<typeof IMPROVEMENTS>([]);
  const [isRefactoring, setIsRefactoring] = useState(false);
  const [hasRefactored, setHasRefactored] = useState(false);

  const handleLoadExample = (example: typeof CODE_EXAMPLES[0]) => {
    setCode(example.before);
    setRefactoredCode('');
    setImprovements([]);
    setHasRefactored(false);
  };

  const handleRefactor = async () => {
    if (!code.trim() || isRefactoring) return;

    setIsRefactoring(true);
    setRefactoredCode('');
    setImprovements([]);

    // Simulate AI processing with typing effect
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Type out refactored code character by character
    const targetCode = REFACTORED_CODE;
    let currentCode = '';

    for (let i = 0; i < targetCode.length; i++) {
      currentCode += targetCode[i];
      setRefactoredCode(currentCode);

      // Variable speed for dramatic effect
      const delay = targetCode[i] === '\n' ? 10 : Math.random() * 20 + 5;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // Show improvements after typing completes
    await new Promise((resolve) => setTimeout(resolve, 300));
    setImprovements(IMPROVEMENTS);
    setIsRefactoring(false);
    setHasRefactored(true);
  };

  const handleReset = () => {
    setRefactoredCode('');
    setImprovements([]);
    setHasRefactored(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-4 sm:py-8 px-[5%]">
      <div className="max-w-[1200px] w-[90%]">
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
          <span className="text-claude-orange font-semibold text-sm">AI Code Refactor</span>
          <span className="text-text-muted text-xs ml-auto hidden sm:inline">
            ✨ Transform messy → clean
          </span>
        </header>

        {/* Hero Section */}
        <section className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">
            AI Code Refactor Machine
          </h1>
          <p className="text-text-secondary text-sm sm:text-base">
            Upload messy code, watch AI transform it into clean, optimized masterpiece
          </p>
          <p className="text-text-muted text-xs mt-2">
            Real-time diff • Improvement notes • Best practices
          </p>
        </section>

        {/* Example Selector */}
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {CODE_EXAMPLES.map((example, i) => (
            <button
              key={i}
              onClick={() => handleLoadExample(example)}
              className="bg-bg-tertiary border border-border text-text-primary px-3 py-1.5 rounded-md text-xs hover:border-claude-orange hover:text-claude-orange transition-colors"
            >
              📝 {example.name}
            </button>
          ))}
        </div>

        {/* Code Editor Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Before */}
          <div className="bg-bg-secondary border border-border rounded-lg overflow-hidden">
            <div className="bg-bg-tertiary border-b border-border px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-text-muted text-xs font-semibold uppercase tracking-wider">
                  Before
                </span>
                <span className="text-text-muted text-xs">😬 Messy Code</span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              </div>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-[400px] bg-bg-primary px-4 py-3 font-mono text-xs text-text-primary placeholder:text-text-muted focus:outline-none resize-none"
              placeholder="// Paste your messy code here..."
              spellCheck={false}
            />
          </div>

          {/* After */}
          <div className="bg-bg-secondary border border-border rounded-lg overflow-hidden">
            <div className="bg-bg-tertiary border-b border-border px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-text-muted text-xs font-semibold uppercase tracking-wider">
                  After
                </span>
                <span className="text-text-muted text-xs">✨ Clean Code</span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              </div>
            </div>
            <div className="relative h-[400px] bg-bg-primary overflow-auto">
              {refactoredCode ? (
                <pre className="px-4 py-3 font-mono text-xs text-accent-green whitespace-pre-wrap">
                  {refactoredCode}
                  {isRefactoring && (
                    <span className="inline-block w-2 h-4 bg-accent-green ml-0.5 cursor-blink" />
                  )}
                </pre>
              ) : (
                <div className="h-full flex items-center justify-center text-text-muted text-xs">
                  {hasRefactored ? '🎉 Refactoring complete!' : '👈 Click "Refactor" to transform your code'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            onClick={handleRefactor}
            disabled={isRefactoring || !code.trim()}
            className="bg-claude-orange text-white font-semibold py-3 px-8 rounded-md text-sm hover:bg-claude-orange-dim transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg transform hover:scale-105"
          >
            {isRefactoring ? (
              <>
                <span className="inline-block animate-spin">⚙️</span>
                Refactoring...
              </>
            ) : (
              <>
                <span>🪄</span>
                Refactor Code
              </>
            )}
          </button>

          {hasRefactored && (
            <button
              onClick={handleReset}
              className="bg-bg-tertiary border border-border text-text-primary px-4 py-3 rounded-md text-sm hover:border-claude-orange hover:text-claude-orange transition-colors"
            >
              🔄 Reset
            </button>
          )}
        </div>

        {/* Improvements Section */}
        {improvements.length > 0 && (
          <div className="bg-bg-secondary border border-claude-orange/30 rounded-lg p-4 sm:p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📊</span>
              <h3 className="text-text-primary font-semibold text-base">
                What Changed & Why
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {improvements.map((improvement, i) => (
                <div
                  key={i}
                  className="bg-bg-primary border border-border rounded-lg p-4 transform transition-all hover:border-claude-orange/50"
                  style={{
                    animation: `fadeIn 0.5s ease-in-out ${i * 0.15}s both`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{improvement.icon}</span>
                    <h4 className="text-text-secondary text-xs font-semibold uppercase tracking-wider">
                      {improvement.category}
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    {improvement.items.map((item, j) => (
                      <li key={j} className="text-text-muted text-xs flex items-start gap-2">
                        <span className="text-accent-green mt-0.5">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-bg-secondary border border-border rounded-lg p-3 text-center hover:border-claude-orange/50 transition-colors">
            <div className="text-xl mb-1">⚡</div>
            <div className="text-text-secondary text-xs font-semibold mb-0.5">Instant</div>
            <div className="text-text-muted text-[10px]">Real-time refactor</div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-3 text-center hover:border-claude-orange/50 transition-colors">
            <div className="text-xl mb-1">🎯</div>
            <div className="text-text-secondary text-xs font-semibold mb-0.5">Smart</div>
            <div className="text-text-muted text-[10px]">AI-powered fixes</div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-3 text-center hover:border-claude-orange/50 transition-colors">
            <div className="text-xl mb-1">📚</div>
            <div className="text-text-secondary text-xs font-semibold mb-0.5">Learn</div>
            <div className="text-text-muted text-[10px]">Best practices</div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-3 text-center hover:border-claude-orange/50 transition-colors">
            <div className="text-xl mb-1">✨</div>
            <div className="text-text-secondary text-xs font-semibold mb-0.5">Clean</div>
            <div className="text-text-muted text-[10px]">Production ready</div>
          </div>
        </div>

        {/* What Gets Improved */}
        <div className="bg-bg-secondary border border-border rounded-lg p-4 sm:p-6">
          <h3 className="text-text-secondary text-xs uppercase tracking-wider mb-4 font-semibold">
            What Gets Improved
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs text-text-muted">
            <div className="flex items-center gap-2">
              <span className="text-claude-orange">→</span>
              <span>var/let → const declarations</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-claude-orange">→</span>
              <span>if-else chains → object lookups</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-claude-orange">→</span>
              <span>Manual loops → Array methods</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-claude-orange">→</span>
              <span>Callback hell → async/await</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-claude-orange">→</span>
              <span>== → === strict equality</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-claude-orange">→</span>
              <span>Missing types → TypeScript</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-claude-orange">→</span>
              <span>Poor naming → descriptive names</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-claude-orange">→</span>
              <span>No docs → JSDoc comments</span>
            </div>
          </div>
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

        {/* CSS Animation */}
        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </div>
  );
}

RefactorPage.displayName = 'RefactorPage';
export default RefactorPage;
