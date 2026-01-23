import React from "react";

type PoetryStyle = "haiku" | "limerick" | "sonnet" | "free-verse" | "acrostic";

interface PoetryDisplayProps {
  poetry: string | null;
  style: PoetryStyle;
  isGenerating: boolean;
  onCopy: () => void;
  onShare: () => void;
}

const STYLE_COLORS: Record<PoetryStyle, string> = {
  haiku: "text-accent-green",
  limerick: "text-accent-yellow",
  sonnet: "text-accent-purple",
  "free-verse": "text-accent-blue",
  acrostic: "text-claude-orange",
};

const STYLE_ICONS: Record<PoetryStyle, React.ReactElement> = {
  haiku: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  limerick: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  ),
  sonnet: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  ),
  "free-verse": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" />
      <path d="M7 12l4-4 4 4 6-6" />
    </svg>
  ),
  acrostic: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  ),
};

export default function PoetryDisplay({
  poetry,
  style,
  isGenerating,
  onCopy,
  onShare,
}: PoetryDisplayProps) {
  const colorClass = STYLE_COLORS[style];
  const icon = STYLE_ICONS[style];

  return (
    <div className="bg-bg-secondary border border-border rounded-lg p-4 flex flex-col min-h-[400px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={colorClass}>{icon}</span>
          <span className="text-text-secondary text-xs uppercase tracking-wider">
            Your Poetry
          </span>
        </div>
        {poetry && (
          <div className="flex gap-2">
            <button
              onClick={onCopy}
              className="p-1.5 bg-bg-tertiary border border-border rounded text-text-secondary hover:text-claude-orange hover:border-claude-orange transition-colors"
              title="Copy to clipboard"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
            <button
              onClick={onShare}
              className="p-1.5 bg-bg-tertiary border border-border rounded text-text-secondary hover:text-claude-orange hover:border-claude-orange transition-colors"
              title="Share on Twitter"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 bg-bg-primary border border-border rounded-lg p-4 overflow-auto">
        {isGenerating ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-border rounded-full" />
              <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-claude-orange rounded-full animate-spin" />
            </div>
            <div className="text-text-secondary text-sm animate-pulse">
              Crafting poetic verses...
            </div>
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-claude-orange rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-claude-orange rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-claude-orange rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        ) : poetry ? (
          <div className="h-full flex items-center justify-center">
            <div className={`text-center ${colorClass} transition-all duration-500 ease-in-out`}>
              <pre className="font-mono text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                {poetry}
              </pre>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-text-muted">
            <div className="relative">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="opacity-30"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-claude-orange rounded-full animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold mb-1">Ready to create poetry</p>
              <p className="text-xs">Paste your code and select a style</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center max-w-xs">
              {Object.keys(STYLE_COLORS).map((s) => (
                <div
                  key={s}
                  className={`px-2 py-1 bg-bg-secondary border border-border rounded text-xs ${
                    STYLE_COLORS[s as PoetryStyle]
                  }`}
                >
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {poetry && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-text-muted text-xs text-center">
            <span className="text-claude-orange">✨</span> Your code, transformed into art{" "}
            <span className="text-claude-orange">✨</span>
          </div>
        </div>
      )}
    </div>
  );
}
