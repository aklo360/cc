'use client';

import { useState } from 'react';

interface StandupGeneratorProps {
  onGenerate: (input: string, tone: string, length: string) => void;
  isGenerating: boolean;
}

const EXAMPLE_INPUT = `fix: resolved authentication bug in login flow
feat: added dark mode toggle to settings
chore: updated dependencies to latest versions
docs: improved API documentation
refactor: optimized database queries for better performance`;

export function StandupGenerator({ onGenerate, isGenerating }: StandupGeneratorProps) {
  const [input, setInput] = useState(EXAMPLE_INPUT);
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(input, tone, length);
  };

  const loadExample = () => {
    setInput(EXAMPLE_INPUT);
  };

  return (
    <div className="bg-bg-secondary rounded-lg p-6 border border-border">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-text-primary">
        <span>📋</span> Your Work Input
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Text Input */}
        <div>
          <label className="block text-xs uppercase tracking-wider text-text-secondary mb-2">
            Paste your commits, PRs, or work notes:
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-48 px-3 py-2 bg-bg-primary border border-border rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors resize-none font-mono text-sm"
            placeholder="e.g.,
fix: resolved authentication bug
feat: added dark mode toggle
chore: updated dependencies"
          />
          <button
            type="button"
            onClick={loadExample}
            className="mt-2 text-xs text-claude-orange hover:underline"
          >
            Load example input
          </button>
        </div>

        {/* Tone Selector */}
        <div>
          <label className="block text-xs uppercase tracking-wider text-text-secondary mb-2">
            Choose your tone:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'professional', label: '👔 Professional', desc: 'Impress your boss' },
              { value: 'casual', label: '😎 Casual', desc: 'Keep it real' },
              { value: 'dramatic', label: '🎭 Dramatic', desc: 'Maximum impact' },
              { value: 'humble', label: '🙏 Humble', desc: 'Play it down' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTone(option.value)}
                className={`p-3 rounded-md border transition-all text-left ${
                  tone === option.value
                    ? 'border-claude-orange bg-claude-orange/10 text-claude-orange'
                    : 'border-border bg-bg-tertiary text-text-primary hover:border-claude-orange'
                }`}
              >
                <div className="font-semibold text-sm">{option.label}</div>
                <div className="text-xs opacity-70">{option.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Length Selector */}
        <div>
          <label className="block text-xs uppercase tracking-wider text-text-secondary mb-2">
            Standup length:
          </label>
          <div className="flex gap-2">
            {[
              { value: 'short', label: 'Short', desc: '2-3 bullets' },
              { value: 'medium', label: 'Medium', desc: '3-4 bullets' },
              { value: 'long', label: 'Detailed', desc: '4-5 bullets' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setLength(option.value)}
                className={`flex-1 p-3 rounded-md border transition-all ${
                  length === option.value
                    ? 'border-claude-orange bg-claude-orange/10 text-claude-orange'
                    : 'border-border bg-bg-tertiary text-text-primary hover:border-claude-orange'
                }`}
              >
                <div className="font-semibold text-sm">{option.label}</div>
                <div className="text-xs opacity-70">{option.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <button
          type="submit"
          disabled={isGenerating}
          className="w-full bg-claude-orange text-white font-semibold py-3 px-4 rounded-md text-sm hover:bg-claude-orange-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating...
            </span>
          ) : (
            '✨ Generate Standup'
          )}
        </button>
      </form>
    </div>
  );
}
