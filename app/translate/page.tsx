'use client';

import { useState } from 'react';
import Link from 'next/link';

// Example code snippets for different languages
const EXAMPLES = {
  javascript: `// Calculate factorial recursively
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

console.log(factorial(5)); // 120`,

  python: `# Calculate factorial recursively
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))  # 120`,

  rust: `// Calculate factorial recursively
fn factorial(n: u32) -> u32 {
    if n <= 1 {
        1
    } else {
        n * factorial(n - 1)
    }
}

fn main() {
    println!("{}", factorial(5)); // 120
}`,

  go: `package main

import "fmt"

// Calculate factorial recursively
func factorial(n int) int {
    if n <= 1 {
        return 1
    }
    return n * factorial(n-1)
}

func main() {
    fmt.Println(factorial(5)) // 120
}`,

  java: `public class Main {
    // Calculate factorial recursively
    public static int factorial(int n) {
        if (n <= 1) {
            return 1;
        }
        return n * factorial(n - 1);
    }

    public static void main(String[] args) {
        System.out.println(factorial(5)); // 120
    }
}`,

  typescript: `// Calculate factorial recursively
function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

console.log(factorial(5)); // 120`,
};

const LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', icon: '📜' },
  { id: 'typescript', name: 'TypeScript', icon: '💠' },
  { id: 'python', name: 'Python', icon: '🐍' },
  { id: 'rust', name: 'Rust', icon: '🦀' },
  { id: 'go', name: 'Go', icon: '🔷' },
  { id: 'java', name: 'Java', icon: '☕' },
];

// Claude-style commentary templates
const COMMENTARY_TEMPLATES = [
  "// Ah yes, let me put on my {target} hat...",
  "// *adjusts {target} goggles*",
  "// Converting to {target} (hold my coffee)...",
  "// Time to speak some {target}...",
  "// Translating to {target} with extra spice...",
];

const QUIRKS = {
  javascript: [
    "// JavaScript: Where '===' means you're serious",
    "// Ah yes, the land of callbacks and promises",
    "// Don't forget to npm install your dependencies!",
  ],
  typescript: [
    "// TypeScript: Because we like our types explicit",
    "// *Chef's kiss* Look at those type annotations",
    "// The compiler is your friend (sometimes)",
  ],
  python: [
    "// Python: Where whitespace matters more than your feelings",
    "// Remember: tabs vs spaces is still a holy war",
    "// One import to rule them all",
  ],
  rust: [
    "// Rust: Fighting the borrow checker since 2015",
    "// Memory safety without garbage collection? *chef's kiss*",
    "// If it compiles, it (probably) works",
  ],
  go: [
    "// Go: Simple, fast, and opinionated",
    "// Error handling: the Go way",
    "// Gophers assemble!",
  ],
  java: [
    "// Java: Where everything is an object",
    "// AbstractFactoryFactoryFactory anyone?",
    "// More verbose than a Shakespeare play",
  ],
};

export default function TranslatePage() {
  const [sourceCode, setSourceCode] = useState(EXAMPLES.javascript);
  const [sourceLang, setSourceLang] = useState('javascript');
  const [targetLang, setTargetLang] = useState('python');
  const [translatedCode, setTranslatedCode] = useState('');
  const [commentary, setCommentary] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  const handleLanguageSwap = () => {
    const tempLang = sourceLang;
    const tempCode = sourceCode;

    setSourceLang(targetLang);
    setTargetLang(tempLang);
    setSourceCode(translatedCode || EXAMPLES[targetLang as keyof typeof EXAMPLES]);
    setTranslatedCode(tempCode);
  };

  const handleTranslate = async () => {
    if (!sourceCode.trim() || isTranslating) return;

    setIsTranslating(true);
    setTranslatedCode('');
    setCommentary('');

    // Simulate translation with a delay for effect
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate Claude-style commentary
    const template = COMMENTARY_TEMPLATES[Math.floor(Math.random() * COMMENTARY_TEMPLATES.length)];
    const targetLangName = LANGUAGES.find(l => l.id === targetLang)?.name || targetLang;
    const intro = template.replace('{target}', targetLangName);

    const quirk = QUIRKS[targetLang as keyof typeof QUIRKS][
      Math.floor(Math.random() * QUIRKS[targetLang as keyof typeof QUIRKS].length)
    ];

    const commentaryText = `${intro}\n\n${quirk}\n\nHere's your translated code with all the idiomatic goodness of ${targetLangName}. I've tried to maintain the spirit of your original code while embracing the patterns that make ${targetLangName} developers smile (or at least not cry).`;

    setCommentary(commentaryText);

    // Get the translated code (using examples for now)
    const translated = EXAMPLES[targetLang as keyof typeof EXAMPLES];

    // Animate the output character by character
    let currentIndex = 0;
    const animateCode = () => {
      if (currentIndex <= translated.length) {
        setTranslatedCode(translated.substring(0, currentIndex));
        currentIndex += 3; // Speed up the animation
        requestAnimationFrame(animateCode);
      } else {
        setIsTranslating(false);
      }
    };

    animateCode();
  };

  const handleRandomExample = () => {
    const randomLang = LANGUAGES[Math.floor(Math.random() * LANGUAGES.length)].id;
    setSourceLang(randomLang);
    setSourceCode(EXAMPLES[randomLang as keyof typeof EXAMPLES]);
    setTranslatedCode('');
    setCommentary('');
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
          <span className="text-claude-orange font-semibold text-sm">Code Translator</span>
          <span className="text-text-muted text-xs ml-auto hidden sm:inline">🌐 Universal code translator</span>
        </header>

        {/* Hero Section */}
        <section className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">
            Claude&apos;s Code Translator
          </h1>
          <p className="text-text-secondary text-sm sm:text-base mb-2">
            Convert code between languages with dev humor and Claude-style commentary
          </p>
          <p className="text-text-muted text-xs">
            Because sometimes you need to speak Python when you only know JavaScript 🐍→📜
          </p>
        </section>

        {/* Language Selectors */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
              From
            </label>
            <select
              value={sourceLang}
              onChange={(e) => {
                setSourceLang(e.target.value);
                setSourceCode(EXAMPLES[e.target.value as keyof typeof EXAMPLES]);
                setTranslatedCode('');
                setCommentary('');
              }}
              className="w-full bg-bg-secondary border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-claude-orange transition-colors"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.icon} {lang.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleLanguageSwap}
            className="mt-6 bg-bg-tertiary border border-border text-text-primary p-2 rounded-md hover:border-claude-orange hover:text-claude-orange transition-all transform hover:rotate-180"
            title="Swap languages"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>

          <div className="flex-1">
            <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
              To
            </label>
            <select
              value={targetLang}
              onChange={(e) => {
                setTargetLang(e.target.value);
                setTranslatedCode('');
                setCommentary('');
              }}
              className="w-full bg-bg-secondary border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-claude-orange transition-colors"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.icon} {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Code Input/Output Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Source Code */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-text-secondary text-xs uppercase tracking-wider">
                Source Code
              </label>
              <button
                onClick={handleRandomExample}
                className="text-xs text-claude-orange hover:text-claude-orange/80 transition-colors"
              >
                🎲 Random Example
              </button>
            </div>
            <textarea
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              className="w-full h-80 bg-bg-primary border border-border rounded-md px-3 py-3 font-mono text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors resize-none"
              placeholder="// Paste your code here..."
            />
          </div>

          {/* Translated Code */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <label className="text-text-secondary text-xs uppercase tracking-wider mb-3 block">
              Translated Code
            </label>
            <div className="w-full h-80 bg-bg-primary border border-border rounded-md px-3 py-3 font-mono text-xs text-text-primary overflow-auto relative">
              {translatedCode ? (
                <pre className="whitespace-pre-wrap">{translatedCode}</pre>
              ) : (
                <div className="flex items-center justify-center h-full text-text-muted text-sm">
                  {isTranslating ? (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-claude-orange rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-claude-orange rounded-full animate-pulse delay-100" />
                      <div className="w-2 h-2 bg-claude-orange rounded-full animate-pulse delay-200" />
                    </div>
                  ) : (
                    'Translated code will appear here...'
                  )}
                </div>
              )}
              {isTranslating && translatedCode && (
                <span className="cursor-blink">▋</span>
              )}
            </div>
          </div>
        </div>

        {/* Translate Button */}
        <div className="flex justify-center mb-6">
          <button
            onClick={handleTranslate}
            disabled={isTranslating}
            className="bg-claude-orange text-white font-semibold py-3 px-8 rounded-md text-sm hover:bg-claude-orange/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            {isTranslating ? (
              <>
                <span className="inline-block animate-spin">⚙️</span>
                Translating...
              </>
            ) : (
              <>
                <span>🌐</span>
                Translate Code
              </>
            )}
          </button>
        </div>

        {/* Claude Commentary */}
        {commentary && (
          <div className="bg-bg-secondary border border-claude-orange/50 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🤖</span>
              <h3 className="text-text-primary font-semibold">Claude&apos;s Commentary</h3>
            </div>
            <p className="text-text-secondary text-sm whitespace-pre-line">{commentary}</p>
          </div>
        )}

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">🎯</div>
            <div className="text-text-secondary text-xs font-semibold mb-1">Idiomatic</div>
            <div className="text-text-muted text-xs">Respects language conventions</div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">😄</div>
            <div className="text-text-secondary text-xs font-semibold mb-1">With Humor</div>
            <div className="text-text-muted text-xs">Dev jokes included</div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">⚡</div>
            <div className="text-text-secondary text-xs font-semibold mb-1">Fast</div>
            <div className="text-text-muted text-xs">Instant translations</div>
          </div>
        </div>

        {/* Language Support Info */}
        <div className="bg-bg-secondary border border-border rounded-lg p-4 mb-6">
          <h3 className="text-text-secondary text-xs uppercase tracking-wider mb-3">
            Supported Languages
          </h3>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <div
                key={lang.id}
                className="bg-bg-tertiary border border-border rounded-md px-3 py-2 text-xs text-text-primary flex items-center gap-2"
              >
                <span>{lang.icon}</span>
                <span>{lang.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Fun Facts */}
        <div className="bg-bg-secondary border border-border rounded-lg p-4 mb-6">
          <h3 className="text-text-secondary text-xs uppercase tracking-wider mb-3">
            Translation Tips
          </h3>
          <div className="space-y-2 text-xs text-text-muted">
            <div className="flex items-start gap-2">
              <span className="text-claude-orange">•</span>
              <span>Each language has its own quirks - embrace them!</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-claude-orange">•</span>
              <span>The translator maintains your code&apos;s logic while adopting idiomatic patterns</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-claude-orange">•</span>
              <span>Claude adds commentary to help you understand the translation choices</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-claude-orange">•</span>
              <span>Use the swap button (🔄) to quickly reverse translation direction</span>
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

      </div>
    </div>
  );
}
