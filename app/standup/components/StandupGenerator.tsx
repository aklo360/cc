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
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 backdrop-blur-sm">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <span>📋</span> Your Work Input
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Text Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Paste your commits, PRs, or work notes:
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-48 px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none font-mono text-sm"
            placeholder="e.g.,
fix: resolved authentication bug
feat: added dark mode toggle
chore: updated dependencies"
          />
          <button
            type="button"
            onClick={loadExample}
            className="mt-2 text-xs text-purple-400 hover:text-purple-300 underline"
          >
            Load example input
          </button>
        </div>

        {/* Tone Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
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
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  tone === option.value
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-gray-600 bg-gray-900 hover:border-gray-500'
                }`}
              >
                <div className="font-semibold text-sm">{option.label}</div>
                <div className="text-xs text-gray-400">{option.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Length Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
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
                className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                  length === option.value
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-gray-600 bg-gray-900 hover:border-gray-500'
                }`}
              >
                <div className="font-semibold text-sm">{option.label}</div>
                <div className="text-xs text-gray-400">{option.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <button
          type="submit"
          disabled={isGenerating}
          className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
            isGenerating
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transform hover:scale-[1.02] active:scale-[0.98]'
          }`}
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
