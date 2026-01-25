'use client';

import { useState } from 'react';
import { RepoAnalysis } from './components/RepoAnalysis';
import { WrapUp } from './components/WrapUp';
import './wrapped.css';

export default function WrappedPage() {
  const [repoUrl, setRepoUrl] = useState('https://github.com/vercel/next.js');
  const [analyzing, setAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleAnalyze = async () => {
    if (!repoUrl.trim()) return;

    setAnalyzing(true);
    // Simulate analysis time for dramatic effect
    await new Promise(resolve => setTimeout(resolve, 2000));
    setAnalyzing(false);
    setShowResults(true);
  };

  const handleReset = () => {
    setShowResults(false);
    setRepoUrl('');
  };

  if (analyzing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative w-32 h-32 mx-auto mb-8">
            <div className="absolute inset-0 border-8 border-purple-500/30 rounded-full"></div>
            <div className="absolute inset-0 border-8 border-transparent border-t-purple-500 rounded-full animate-spin"></div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Analyzing Repository...</h2>
          <p className="text-purple-300">Unwrapping your code...</p>
        </div>
      </div>
    );
  }

  if (showResults) {
    return <RepoAnalysis repoUrl={repoUrl} onReset={handleReset} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Repo Wrapped
          </h1>
          <p className="text-xl text-purple-300 mb-2">
            Your code year in review
          </p>
          <p className="text-sm text-purple-400">
            Spotify Wrapped, but for GitHub repositories
          </p>
        </div>

        <div className="bg-black/40 backdrop-blur-lg rounded-3xl p-8 border border-purple-500/30 shadow-2xl">
          <label htmlFor="repo-url" className="block text-purple-300 mb-3 text-sm font-medium">
            GitHub Repository URL
          </label>
          <input
            id="repo-url"
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
            placeholder="https://github.com/username/repo"
            className="w-full px-6 py-4 bg-black/60 border-2 border-purple-500/50 rounded-2xl text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-400 transition-colors mb-6"
          />

          <button
            onClick={handleAnalyze}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-2xl transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/50"
          >
            Unwrap My Repo
          </button>

          <div className="mt-8 pt-6 border-t border-purple-500/30">
            <p className="text-purple-400 text-sm mb-3">Try these popular repos:</p>
            <div className="flex flex-wrap gap-2">
              {[
                'vercel/next.js',
                'facebook/react',
                'microsoft/vscode',
                'torvalds/linux'
              ].map((repo) => (
                <button
                  key={repo}
                  onClick={() => setRepoUrl(`https://github.com/${repo}`)}
                  className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 rounded-lg text-xs transition-colors border border-purple-500/30"
                >
                  {repo}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-purple-400/60 text-sm">
            Note: This is a demo with simulated data for visualization purposes
          </p>
        </div>
      </div>
    </div>
  );
}
