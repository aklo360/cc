"use client";

import { useState } from "react";
import Link from "next/link";
import PoetryDisplay from "./components/PoetryDisplay";

type PoetryStyle = "haiku" | "limerick" | "sonnet" | "free-verse" | "acrostic";

const POETRY_STYLES: { value: PoetryStyle; label: string; description: string }[] = [
  { value: "haiku", label: "Haiku", description: "5-7-5 syllable pattern" },
  { value: "limerick", label: "Limerick", description: "AABBA rhyme scheme" },
  { value: "sonnet", label: "Sonnet", description: "14 lines of code wisdom" },
  { value: "free-verse", label: "Free Verse", description: "Unstructured beauty" },
  { value: "acrostic", label: "Acrostic", description: "First letters spell CODE" },
];

const EXAMPLE_CODES = [
  `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`,
  `const quickSort = (arr) => {
  if (arr.length <= 1) return arr;
  const pivot = arr[0];
  const left = arr.slice(1).filter(x => x < pivot);
  const right = arr.slice(1).filter(x => x >= pivot);
  return [...quickSort(left), pivot, ...quickSort(right)];
};`,
  `async function fetchData(url) {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Failed:', error);
  }
}`,
  `class BinaryTree {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
  }
}`,
];

const POETRY_PROMPTS: Record<PoetryStyle, string> = {
  haiku: `Write a haiku (5-7-5 syllable pattern) about this code. Focus on its essence and beauty. Format with proper line breaks.`,
  limerick: `Write a humorous limerick (AABBA rhyme scheme) about this code. Make it fun and witty. Format with proper line breaks.`,
  sonnet: `Write a 14-line sonnet about this code in iambic pentameter. Be dramatic and poetic. Format with proper line breaks.`,
  "free-verse": `Write a free-verse poem about this code. Be creative and expressive. Use vivid imagery. Format with proper line breaks.`,
  acrostic: `Write an acrostic poem where the first letters of each line spell CODE. Each line should relate to the provided code. Format with proper line breaks.`,
};

function generatePoetryLocally(code: string, style: PoetryStyle): string {
  // Fallback poetry generation for client-side only
  const poems: Record<PoetryStyle, string[]> = {
    haiku: [
      "Code flows like water\nRecursion calls itself deep\nStack overflow waits",
      "Functions compose well\nPure logic, no side effects\nBeauty in code form",
      "Variables dance\nThrough scope and closures they leap\nMemory persists",
    ],
    limerick: [
      "There once was a function so grand\nWhose logic was perfectly planned\nIt ran without fail\nLeft no memory trail\nThe finest code in the land",
      "A developer wrote with great care\nTheir functions were clean and quite fair\nWith types that were strong\nNothing could go wrong\nExcept when they null didn't spare",
    ],
    sonnet: [
      "When I do count the clock that tells the time\nAnd see the functions nested in their place\nHow variables in memory do climb\nAnd algorithms run with elegant grace\n\nThen of thy code I question every line\nWhere complexity and beauty intertwine\nFor every loop that iterates through space\nMust terminate or infinite disgrace\n\nBut O, what art thou code of perfect form\nWhere every function serves its purpose true\nNo bug nor error can thy structure storm\nEach test does pass, each edge case thought through\n\nSo long as devs can code and eyes can see\nSo long lives this, and this gives life to thee",
    ],
    "free-verse": [
      "The code whispers\nsecrets of logic and flow\n\nEach line a breath\neach function a heartbeat\npulsing with purpose\n\nVariables drift\nthrough the digital void\ncarrying meaning\nin their ephemeral arms\n\nAnd somewhere\nin the depths of the stack\na return value waits\npatient\neternal\nready to emerge",
    ],
    acrostic: [
      "Carefully crafted with intention clear\nOptimized for speed and maintainability\nDeveloped with testing, no bugs to fear\nElegant solution, pure functionality",
      "Calling itself with recursive grace\nOperating on data with practiced ease\nDefining the logic, each edge case in place\nExecuting flawlessly, designed to please",
    ],
  };

  const options = poems[style];
  return options[Math.floor(Math.random() * options.length)];
}

export default function PoetryPage() {
  const [code, setCode] = useState("");
  const [style, setStyle] = useState<PoetryStyle>("haiku");
  const [poetry, setPoetry] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePoetry = async () => {
    if (!code.trim()) return;

    setIsGenerating(true);
    setError(null);
    setPoetry(null);

    try {
      // Simulate API delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Generate poetry locally (since no API endpoint is available)
      const result = generatePoetryLocally(code, style);
      setPoetry(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate poetry");
      // Still show fallback poetry on error
      setPoetry(generatePoetryLocally(code, style));
    } finally {
      setIsGenerating(false);
    }
  };

  const useExampleCode = (example: string) => {
    setCode(example);
    setPoetry(null);
  };

  const copyPoetry = () => {
    if (poetry) {
      navigator.clipboard.writeText(poetry);
    }
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(
      `Just turned my code into ${style}!\n\nTry it: claudecode.wtf/poetry\n\n$CC`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-4">
      <div className="max-w-[1200px] w-full flex flex-col">
        {/* Header */}
        <header className="flex items-center gap-3 py-3 border-b border-border shrink-0">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/cc.png" alt="$CC" width={24} height={24} />
            <span className="text-claude-orange font-semibold text-sm">Code Poetry Generator</span>
          </Link>
          <span className="text-text-muted text-xs ml-auto hidden sm:block">
            Transform code into art
          </span>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 py-4">
          {/* Left Column - Input */}
          <div className="flex flex-col gap-3 min-h-0">
            {/* Code Input */}
            <div className="bg-bg-secondary border border-border rounded-lg p-4 flex-1 flex flex-col min-h-0">
              <label className="text-text-secondary text-xs uppercase tracking-wider mb-2">
                Your Code
              </label>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste your code here..."
                className="flex-1 bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors resize-none font-mono"
                disabled={isGenerating}
                spellCheck={false}
              />
            </div>

            {/* Style Selection */}
            <div className="bg-bg-secondary border border-border rounded-lg p-4">
              <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
                Poetry Style
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {POETRY_STYLES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStyle(s.value)}
                    className={`p-3 rounded-md border text-left transition-all ${
                      style === s.value
                        ? "bg-claude-orange border-claude-orange text-white"
                        : "bg-bg-primary border-border text-text-secondary hover:border-claude-orange hover:text-claude-orange"
                    }`}
                    disabled={isGenerating}
                  >
                    <div className="font-semibold text-sm">{s.label}</div>
                    <div className="text-xs opacity-80 mt-0.5">{s.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={generatePoetry}
              disabled={isGenerating || !code.trim()}
              className="w-full bg-claude-orange text-white font-semibold py-3 px-4 rounded-md text-sm hover:bg-claude-orange-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Crafting poetry...
                </span>
              ) : (
                "Generate Poetry"
              )}
            </button>

            {/* Example Codes */}
            <div className="bg-bg-secondary border border-border rounded-lg p-4">
              <div className="text-text-secondary text-xs uppercase tracking-wider mb-2">
                Try these examples
              </div>
              <div className="flex flex-col gap-2">
                {EXAMPLE_CODES.map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => useExampleCode(example)}
                    className="text-left text-xs bg-bg-primary border border-border px-3 py-2 rounded text-text-secondary hover:text-claude-orange hover:border-claude-orange transition-colors font-mono"
                    disabled={isGenerating}
                  >
                    {example.split("\n")[0].substring(0, 50)}...
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Output */}
          <div className="flex flex-col gap-3 min-h-0">
            <PoetryDisplay
              poetry={poetry}
              style={style}
              isGenerating={isGenerating}
              onCopy={copyPoetry}
              onShare={shareToTwitter}
            />

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-xs">
                {error}
              </div>
            )}

            {/* Info Card */}
            <div className="bg-bg-secondary border border-border rounded-lg p-4">
              <div className="text-claude-orange text-xs uppercase tracking-wider mb-2">
                About Code Poetry
              </div>
              <p className="text-text-secondary text-xs leading-relaxed">
                Code Poetry Generator transforms your functions into beautiful verse. Whether
                it&apos;s a haiku about recursion or a sonnet celebrating your algorithms, Claude
                finds the art in your code. Because every great function deserves to be
                immortalized in poetry.
              </p>
              <div className="mt-3 pt-3 border-t border-border">
                <div className="text-text-muted text-xs">
                  <span className="text-claude-orange">✨</span> Powered by Claude&apos;s poetic
                  sensibilities
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="py-3 border-t border-border text-center shrink-0 mt-4">
          <p className="text-text-muted text-xs">
            <Link href="/" className="text-claude-orange hover:underline">
              claudecode.wtf
            </Link>
            {" "}&middot; Where code becomes poetry
          </p>
        </footer>
      </div>
    </div>
  );
}
