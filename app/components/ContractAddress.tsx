"use client";

import { useState } from "react";

const CA = "Hg23qBLJDvhQtGLHMvot7NK54qAhzQFj9BVd5jpABAGS";

export default function ContractAddress() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(CA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="w-full bg-bg-secondary border border-border rounded-lg p-4 flex items-center justify-between gap-3 hover:border-claude-orange transition-colors group cursor-pointer"
    >
      <div className="text-left min-w-0">
        <div className="text-claude-orange text-xs uppercase tracking-wider mb-1">
          Contract Address
        </div>
        <div className="text-text-primary text-sm font-mono truncate">
          {CA}
        </div>
      </div>
      <div className="flex-shrink-0 text-text-muted group-hover:text-claude-orange transition-colors">
        {copied ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </div>
    </button>
  );
}
