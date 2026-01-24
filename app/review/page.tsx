"use client";

import { useState } from "react";
import Link from "next/link";

const EXAMPLE_CODE = `function calculateTotal(items) {
  var total = 0;
  for (var i = 0; i < items.length; i++) {
    total = total + items[i].price;
  }
  return total;
}`;

interface ReviewIssue {
  issue: string;
  roast: string;
  fix: string;
  severity: "mild" | "spicy" | "nuclear";
}

interface ReviewResult {
  intro: string;
  issues: ReviewIssue[];
  score: number;
  summary: string;
}

const SEVERITY_CONFIG = {
  mild: { emoji: "😊", label: "Gentle", border: "accent-green", bg: "accent-green" },
  spicy: { emoji: "🌶️", label: "Spicy", border: "claude-orange", bg: "claude-orange" },
  nuclear: { emoji: "💀", label: "Nuclear", border: "red-500", bg: "red-500" },
};

export default function ReviewPage() {
  const [code, setCode] = useState(EXAMPLE_CODE);
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [severity, setSeverity] = useState<"mild" | "spicy" | "nuclear">("spicy");

  const analyzeCode = () => {
    setIsReviewing(true);
    setReview(null);

    setTimeout(() => {
      const issues: ReviewIssue[] = [];
      const codeLines = code.toLowerCase();

      if (codeLines.includes("var ")) {
        issues.push({
          issue: "var usage",
          roast: "Using 'var' in 2024? That's like showing up to a Tesla factory on a penny-farthing.",
          fix: "Use 'const' or 'let'. Join us in this decade.",
          severity: "mild",
        });
      }

      if (codeLines.includes("for") && codeLines.includes("i++")) {
        issues.push({
          issue: "verbose loops",
          roast: "This for-loop is giving me 'I learned JavaScript from a 2005 textbook' vibes.",
          fix: "Try Array.reduce() or a simple for...of loop. It's not 1999 anymore.",
          severity: "mild",
        });
      }

      if (!codeLines.includes("const") && !codeLines.includes("let")) {
        issues.push({
          issue: "no modern JS",
          roast: "Did you time travel here from 2005? Because this code certainly did.",
          fix: "Learn ES6+. It's been out for almost a decade now.",
          severity: "spicy",
        });
      }

      if (!codeLines.includes("try") && (codeLines.includes("parse") || codeLines.includes("fetch"))) {
        issues.push({
          issue: "no error handling",
          roast: "I see you live life on the edge—zero error handling. Bold strategy.",
          fix: "Add try-catch blocks. Production you will thank dev you.",
          severity: "spicy",
        });
      }

      if (code.split("\n").length > 50) {
        issues.push({
          issue: "long function",
          roast: "This function is longer than a CVS receipt. And about as useful.",
          fix: "Break it down into smaller, focused functions. Your future self will thank you.",
          severity: "nuclear",
        });
      }

      if (codeLines.includes("eval")) {
        issues.push({
          issue: "eval() usage",
          roast: "You used eval()? EVAL?! That's not code, that's a war crime.",
          fix: "Delete eval(). There's literally always a better way. Always.",
          severity: "nuclear",
        });
      }

      if (issues.length === 0) {
        issues.push(
          {
            issue: "naming",
            roast: "Your variable names are more cryptic than my dating life.",
            fix: "Use descriptive names. 'data', 'tmp', 'x' are not good variable names.",
            severity: "mild",
          },
          {
            issue: "comments",
            roast: "Comments? Documentation? Never heard of her.",
            fix: "Add JSDoc comments. Future developers (probably you) will appreciate it.",
            severity: "mild",
          }
        );
      }

      let filteredIssues = issues;
      if (severity === "mild") {
        filteredIssues = issues.filter((i) => i.severity === "mild");
      } else if (severity === "spicy") {
        filteredIssues = issues.filter((i) => i.severity !== "nuclear");
      }
      if (filteredIssues.length === 0) filteredIssues = issues;

      const intros = {
        mild: "Oh, sweetie... let's have a little chat about your code.",
        spicy: "Alright, we need to talk. And you're not going to like it.",
        nuclear: "I... I need a moment. *Deep breath* Okay, let's do this.",
      };

      setReview({
        intro: intros[severity],
        issues: filteredIssues,
        score: Math.max(10, 100 - filteredIssues.length * 15),
        summary:
          filteredIssues.length === 0
            ? "Honestly? Not terrible. I've seen worse."
            : filteredIssues.length < 3
              ? "Could be worse, could be better. Story of my life."
              : "We need to have a serious conversation about your life choices.",
      });

      setIsReviewing(false);
    }, 1500);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-accent-green";
    if (score >= 60) return "text-accent-yellow";
    if (score >= 40) return "text-claude-orange";
    return "text-red-400";
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-4 sm:py-8">
      <div className="max-w-[900px] w-full px-4 sm:px-5">
        {/* Terminal Header */}
        <header className="flex items-center gap-3 py-3 border-b border-border mb-6">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/cc.png" alt="$CC" width={24} height={24} />
            <span className="text-claude-orange font-semibold text-sm">Code Review Bot</span>
          </Link>
          <span className="text-text-muted text-xs ml-auto hidden sm:inline">
            Brutally honest feedback
          </span>
        </header>

        {/* Title */}
        <section className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
            Claude&apos;s Code Review Bot
          </h1>
          <p className="text-text-secondary text-sm">
            Get roasted (constructively). Paste your code, pick your pain level.
          </p>
        </section>

        {/* Severity Selector */}
        <div className="bg-bg-secondary border border-border rounded-lg p-4 mb-4">
          <label className="text-text-secondary text-xs uppercase tracking-wider mb-3 block">
            Roast Level
          </label>
          <div className="flex gap-2">
            {(["mild", "spicy", "nuclear"] as const).map((level) => {
              const config = SEVERITY_CONFIG[level];
              const isActive = severity === level;
              return (
                <button
                  key={level}
                  onClick={() => setSeverity(level)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-semibold transition-all ${
                    isActive
                      ? `bg-${config.bg} text-white border border-${config.border}`
                      : "bg-bg-primary border border-border text-text-secondary hover:border-text-muted"
                  }`}
                >
                  <span>{config.emoji}</span>
                  <span>{config.label}</span>
                </button>
              );
            })}
          </div>
        </div>

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
            disabled={isReviewing}
          />
          <button
            onClick={analyzeCode}
            disabled={isReviewing || !code.trim()}
            className="w-full mt-3 bg-claude-orange text-white font-semibold py-3 px-4 rounded-md text-sm hover:bg-claude-orange-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isReviewing ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </>
            ) : (
              "🔥 Roast My Code"
            )}
          </button>
        </div>

        {/* Review Results */}
        {review && !isReviewing && (
          <div className="space-y-4">
            {/* Score Card */}
            <div className="bg-bg-secondary border border-border rounded-lg p-6 text-center">
              <div className="text-5xl font-bold mb-2">
                <span className={getScoreColor(review.score)}>{review.score}</span>
                <span className="text-text-muted text-2xl">/100</span>
              </div>
              <p className="text-text-secondary italic">&quot;{review.summary}&quot;</p>
            </div>

            {/* Intro */}
            <div className="bg-bg-secondary border border-border rounded-lg p-4">
              <p className="text-text-secondary italic">{review.intro}</p>
            </div>

            {/* Issues */}
            {review.issues.map((item, index) => {
              const config = SEVERITY_CONFIG[item.severity];
              return (
                <div
                  key={index}
                  className={`bg-bg-secondary border border-${config.border}/30 rounded-lg p-4`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">{config.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-claude-orange mb-2 capitalize">
                        {item.issue}
                      </h3>
                      <p className="text-text-primary text-sm mb-2">
                        <span className="text-red-400 font-medium">Roast: </span>
                        {item.roast}
                      </p>
                      <p className="text-text-secondary text-sm">
                        <span className="text-accent-green font-medium">Fix: </span>
                        {item.fix}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Footer Note */}
            <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
              <p className="text-text-muted text-xs">
                Remember: I&apos;m roasting your code, not you. We&apos;re all learning here.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="py-4 mt-6 border-t border-border text-center">
          <p className="text-text-muted text-xs">
            <Link href="/" className="text-claude-orange hover:underline">
              claudecode.wtf
            </Link>{" "}
            &middot; 100% of fees to @bcherny
          </p>
        </footer>
      </div>
    </div>
  );
}
