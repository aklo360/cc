'use client';

import { useState } from 'react';

interface WrapUpProps {
  repoName: string;
  data: {
    languages: Array<{ name: string; percentage: number; color: string }>;
    fileStats: {
      totalFiles: number;
      totalLines: number;
      largestFile: string;
      largestFileLines: number;
    };
    commitStats: {
      totalCommits: number;
      topDay: string;
      topHour: string;
      bussiestMonth: string;
    };
    personality: {
      type: string;
      traits: string[];
      vibe: string;
    };
  };
  onReset: () => void;
}

export function WrapUp({ repoName, data, onReset }: WrapUpProps) {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = () => {
    setIsSharing(true);
    setTimeout(() => {
      alert('Share functionality would be implemented here!\nFor now, take a screenshot to share your Repo Wrapped.');
      setIsSharing(false);
    }, 500);
  };

  return (
    <div className="text-center">
      <div className="mb-8">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-5xl font-bold text-white mb-4">That's a Wrap!</h2>
        <p className="text-purple-300 text-xl mb-8">
          {repoName} in review
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-6 rounded-2xl border border-purple-500/30">
          <div className="text-3xl font-bold text-white mb-1">
            {data.languages[0].name}
          </div>
          <div className="text-purple-300 text-sm">Top Language</div>
        </div>
        <div className="bg-gradient-to-br from-pink-500/20 to-orange-500/20 p-6 rounded-2xl border border-pink-500/30">
          <div className="text-3xl font-bold text-white mb-1">
            {data.commitStats.totalCommits.toLocaleString()}
          </div>
          <div className="text-purple-300 text-sm">Commits</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 p-6 rounded-2xl border border-orange-500/30">
          <div className="text-3xl font-bold text-white mb-1">
            {(data.fileStats.totalLines / 1000).toFixed(1)}K
          </div>
          <div className="text-purple-300 text-sm">Lines of Code</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/20 to-green-500/20 p-6 rounded-2xl border border-yellow-500/30">
          <div className="text-3xl font-bold text-white mb-1">
            {data.personality.type.split(' ')[1]}
          </div>
          <div className="text-purple-300 text-sm">Personality</div>
        </div>
      </div>

      <div className="bg-black/40 p-6 rounded-2xl border border-purple-500/30 mb-8">
        <p className="text-purple-300 italic">
          &ldquo;{data.personality.vibe}&rdquo;
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleShare}
          disabled={isSharing}
          className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-purple-600/50 disabled:to-pink-600/50 text-white font-bold rounded-2xl transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/50"
        >
          {isSharing ? 'Sharing...' : 'Share Your Wrapped'}
        </button>
        <button
          onClick={onReset}
          className="flex-1 py-4 bg-black/60 hover:bg-black/80 text-white font-bold rounded-2xl transition-all border border-purple-500/30 hover:border-purple-500/50"
        >
          Try Another Repo
        </button>
      </div>

      <div className="mt-8 text-center">
        <p className="text-purple-400/60 text-sm">
          Made with ❤️ for developers who love their code
        </p>
      </div>
    </div>
  );
}
