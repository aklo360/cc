'use client';

import { useState } from 'react';

interface ConfessionFormProps {
  onConfess: (confession: string) => void;
  isGenerating: boolean;
}

const exampleConfessions = [
  "I've been using console.log() to debug production code for 5 years...",
  "I git force pushed to main and blamed it on a merge conflict",
  "I copied code from Stack Overflow without understanding it",
  "I skip writing tests because 'the code is simple enough'",
  "I never write comments because I think my code is self-documenting",
  "I test features directly in production",
  "I use 'any' type in TypeScript to make errors go away",
  "I've shipped code with TODO comments from 2 years ago",
];

export function ConfessionForm({ onConfess, isGenerating }: ConfessionFormProps) {
  const [confession, setConfession] = useState(
    exampleConfessions[Math.floor(Math.random() * exampleConfessions.length)]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (confession.trim()) {
      onConfess(confession.trim());
    }
  };

  const handleRandomConfession = () => {
    const randomConfession = exampleConfessions[Math.floor(Math.random() * exampleConfessions.length)];
    setConfession(randomConfession);
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30 shadow-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Confession Input */}
        <div>
          <label htmlFor="confession" className="block text-sm font-medium text-gray-300 mb-2">
            Confess your coding sins...
          </label>
          <textarea
            id="confession"
            value={confession}
            onChange={(e) => setConfession(e.target.value)}
            placeholder="I have sinned in the eyes of clean code..."
            className="w-full h-40 px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            disabled={isGenerating}
          />
          <p className="text-xs text-gray-500 mt-2">
            Your confession is anonymous. Let it all out. 🙏
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 flex-wrap">
          <button
            type="submit"
            disabled={isGenerating || !confession.trim()}
            className="flex-1 min-w-[200px] bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg"
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
                Seeking Judgment...
              </span>
            ) : (
              '🙏 Confess Your Sins'
            )}
          </button>

          <button
            type="button"
            onClick={handleRandomConfession}
            disabled={isGenerating}
            className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
          >
            🎲 Random Sin
          </button>
        </div>
      </form>

      {/* Example Sins */}
      <div className="mt-8 pt-8 border-t border-gray-700">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Common Developer Sins:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {exampleConfessions.slice(0, 6).map((example, index) => (
            <button
              key={index}
              onClick={() => setConfession(example)}
              disabled={isGenerating}
              className="text-left text-sm text-gray-400 hover:text-purple-400 transition-colors duration-200 p-2 rounded hover:bg-gray-700/50 disabled:cursor-not-allowed disabled:hover:text-gray-400"
            >
              • {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
