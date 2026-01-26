'use client';

import { useState, useEffect } from 'react';

interface StandupOutputProps {
  standup: string;
  isGenerating: boolean;
}

export function StandupOutput({ standup, isGenerating }: StandupOutputProps) {
  const [copied, setCopied] = useState(false);
  const [showOutput, setShowOutput] = useState(false);

  useEffect(() => {
    if (standup) {
      setShowOutput(true);
    }
  }, [standup]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(standup);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!showOutput && !isGenerating) {
    return (
      <div className="bg-bg-secondary rounded-lg p-6 border border-border flex items-center justify-center min-h-[500px]">
        <div className="text-center text-text-muted">
          <div className="text-6xl mb-4">🎯</div>
          <p className="text-base text-text-secondary">Your standup will appear here</p>
          <p className="text-sm mt-2">Fill in your work and click generate!</p>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="bg-bg-secondary rounded-lg p-6 border border-border flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <div className="inline-block animate-bounce text-6xl mb-4">🤖</div>
          <p className="text-base text-text-secondary">Crafting your standup...</p>
          <p className="text-sm text-text-muted mt-2">Making it sound impressive</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-secondary rounded-lg p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2 text-text-primary">
          <span>📢</span> Your Standup
        </h2>
        <button
          onClick={handleCopy}
          className={`px-4 py-2 rounded-md font-semibold text-sm transition-all ${
            copied
              ? 'bg-accent-green text-white'
              : 'bg-claude-orange hover:bg-claude-orange-dim text-white'
          }`}
        >
          {copied ? '✓ Copied!' : '📋 Copy'}
        </button>
      </div>

      <div className="bg-bg-primary rounded-md p-6 border border-border min-h-[400px]">
        <div className="prose prose-invert max-w-none">
          {standup.split('\n').map((line, index) => {
            if (line.startsWith('**')) {
              // Section headers
              return (
                <h3 key={index} className="text-claude-orange font-bold text-base mt-4 first:mt-0 mb-2">
                  {line.replace(/\*\*/g, '')}
                </h3>
              );
            } else if (line.startsWith('•')) {
              // Bullet points
              return (
                <p key={index} className="text-text-primary ml-4 mb-2 leading-relaxed text-sm">
                  {line}
                </p>
              );
            } else if (line.trim()) {
              // Regular text
              return (
                <p key={index} className="text-text-secondary mb-2 text-sm">
                  {line}
                </p>
              );
            }
            return null;
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 py-2 px-4 bg-bg-tertiary border border-border text-text-primary rounded-md text-sm hover:border-claude-orange hover:text-claude-orange transition-colors"
        >
          📋 Copy to Clipboard
        </button>
        <button
          onClick={() => {
            const blob = new Blob([standup], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `standup-${new Date().toISOString().split('T')[0]}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex-1 py-2 px-4 bg-bg-tertiary border border-border text-text-primary rounded-md text-sm hover:border-claude-orange hover:text-claude-orange transition-colors"
        >
          💾 Download
        </button>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-border">
        <div className="text-center">
          <div className="text-2xl font-bold text-claude-orange">
            {standup.split('\n').filter(l => l.startsWith('•')).length}
          </div>
          <div className="text-xs text-text-muted">Accomplishments</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-claude-orange">
            {standup.split(' ').length}
          </div>
          <div className="text-xs text-text-muted">Words</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-claude-orange">
            {Math.ceil(standup.split(' ').length / 150)}
          </div>
          <div className="text-xs text-text-muted">Min Read</div>
        </div>
      </div>
    </div>
  );
}
