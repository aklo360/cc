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
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 backdrop-blur-sm flex items-center justify-center min-h-[500px]">
        <div className="text-center text-gray-400">
          <div className="text-6xl mb-4">🎯</div>
          <p className="text-lg">Your standup will appear here</p>
          <p className="text-sm mt-2">Fill in your work and click generate!</p>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 backdrop-blur-sm flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <div className="inline-block animate-bounce text-6xl mb-4">🤖</div>
          <p className="text-lg text-gray-300">Crafting your standup...</p>
          <p className="text-sm text-gray-500 mt-2">Making it sound impressive</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span>📢</span> Your Standup
        </h2>
        <button
          onClick={handleCopy}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            copied
              ? 'bg-green-600 text-white'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          {copied ? '✓ Copied!' : '📋 Copy'}
        </button>
      </div>

      <div className="bg-gray-900 rounded-lg p-6 border border-gray-600 min-h-[400px]">
        <div className="prose prose-invert max-w-none">
          {standup.split('\n').map((line, index) => {
            if (line.startsWith('**')) {
              // Section headers
              return (
                <h3 key={index} className="text-purple-400 font-bold text-lg mt-4 first:mt-0 mb-2">
                  {line.replace(/\*\*/g, '')}
                </h3>
              );
            } else if (line.startsWith('•')) {
              // Bullet points
              return (
                <p key={index} className="text-gray-200 ml-4 mb-2 leading-relaxed">
                  {line}
                </p>
              );
            } else if (line.trim()) {
              // Regular text
              return (
                <p key={index} className="text-gray-300 mb-2">
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
          className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-all"
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
          className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-all"
        >
          💾 Download
        </button>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-700">
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400">
            {standup.split('\n').filter(l => l.startsWith('•')).length}
          </div>
          <div className="text-xs text-gray-400">Accomplishments</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400">
            {standup.split(' ').length}
          </div>
          <div className="text-xs text-gray-400">Words</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400">
            {Math.ceil(standup.split(' ').length / 150)}
          </div>
          <div className="text-xs text-gray-400">Min Read</div>
        </div>
      </div>
    </div>
  );
}
