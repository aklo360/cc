'use client';

import { useState, useEffect } from 'react';
import { WrapUp } from './WrapUp';

interface RepoAnalysisProps {
  repoUrl: string;
  onReset: () => void;
}

type Slide =
  | 'languages'
  | 'files'
  | 'commits'
  | 'activity'
  | 'personality'
  | 'summary';

export function RepoAnalysis({ repoUrl, onReset }: RepoAnalysisProps) {
  const [currentSlide, setCurrentSlide] = useState<Slide>('languages');
  const [isAnimating, setIsAnimating] = useState(true);

  // Extract repo name from URL
  const repoName = repoUrl.split('github.com/')[1] || 'your repo';

  // Simulated data (in a real app, this would come from GitHub API)
  const data = {
    languages: [
      { name: 'TypeScript', percentage: 45, color: '#3178c6' },
      { name: 'JavaScript', percentage: 25, color: '#f7df1e' },
      { name: 'CSS', percentage: 15, color: '#563d7c' },
      { name: 'HTML', percentage: 10, color: '#e34c26' },
      { name: 'Other', percentage: 5, color: '#6e7681' },
    ],
    fileStats: {
      totalFiles: 1247,
      totalLines: 89342,
      largestFile: 'src/compiler/index.ts',
      largestFileLines: 3421,
    },
    commitStats: {
      totalCommits: 8934,
      topDay: 'Tuesday',
      topHour: '2 PM',
      bussiestMonth: 'October',
    },
    activityPattern: [
      { day: 'Mon', commits: 145 },
      { day: 'Tue', commits: 189 },
      { day: 'Wed', commits: 167 },
      { day: 'Thu', commits: 178 },
      { day: 'Fri', commits: 134 },
      { day: 'Sat', commits: 67 },
      { day: 'Sun', commits: 54 },
    ],
    personality: {
      type: 'The Architect',
      traits: [
        'Obsessed with clean code',
        'Late-night coding sessions',
        'Refactor enthusiast',
        'Documentation champion',
      ],
      vibe: 'Perfectionist with a vision',
    },
  };

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 600);
    return () => clearTimeout(timer);
  }, [currentSlide]);

  const slides: Slide[] = ['languages', 'files', 'commits', 'activity', 'personality', 'summary'];
  const currentIndex = slides.indexOf(currentSlide);

  const nextSlide = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < slides.length) {
      setCurrentSlide(slides[nextIndex]);
    }
  };

  const prevSlide = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setCurrentSlide(slides[prevIndex]);
    }
  };

  const renderSlide = () => {
    switch (currentSlide) {
      case 'languages':
        return (
          <div className={`transition-all duration-600 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
            <h2 className="text-5xl font-bold text-white mb-4">Your Top Languages</h2>
            <p className="text-purple-300 mb-12">The voice of your code</p>

            <div className="space-y-6">
              {data.languages.map((lang, index) => (
                <div
                  key={lang.name}
                  className="animate-slide-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-semibold">{lang.name}</span>
                    <span className="text-purple-300">{lang.percentage}%</span>
                  </div>
                  <div className="w-full bg-black/40 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${lang.percentage}%`,
                        backgroundColor: lang.color,
                        transitionDelay: `${index * 100}ms`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'files':
        return (
          <div className={`transition-all duration-600 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
            <h2 className="text-5xl font-bold text-white mb-4">By The Numbers</h2>
            <p className="text-purple-300 mb-12">Your codebase in stats</p>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-8 rounded-3xl border border-purple-500/30">
                <div className="text-6xl font-bold text-white mb-2">
                  {data.fileStats.totalFiles.toLocaleString()}
                </div>
                <div className="text-purple-300">Files</div>
              </div>
              <div className="bg-gradient-to-br from-pink-500/20 to-orange-500/20 p-8 rounded-3xl border border-pink-500/30">
                <div className="text-6xl font-bold text-white mb-2">
                  {(data.fileStats.totalLines / 1000).toFixed(1)}K
                </div>
                <div className="text-purple-300">Lines of Code</div>
              </div>
            </div>

            <div className="mt-8 bg-black/40 p-6 rounded-2xl border border-purple-500/30">
              <div className="text-purple-400 text-sm mb-2">Largest File</div>
              <div className="text-white font-mono text-lg mb-1">{data.fileStats.largestFile}</div>
              <div className="text-purple-300">{data.fileStats.largestFileLines.toLocaleString()} lines</div>
            </div>
          </div>
        );

      case 'commits':
        return (
          <div className={`transition-all duration-600 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
            <h2 className="text-5xl font-bold text-white mb-4">Commit History</h2>
            <p className="text-purple-300 mb-12">Your coding journey</p>

            <div className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 p-8 rounded-3xl border border-purple-500/30 mb-8">
              <div className="text-7xl font-bold text-white mb-2">
                {data.commitStats.totalCommits.toLocaleString()}
              </div>
              <div className="text-purple-300 text-xl">Total Commits</div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-black/40 p-6 rounded-2xl border border-purple-500/30 text-center">
                <div className="text-2xl font-bold text-white mb-1">{data.commitStats.topDay}</div>
                <div className="text-purple-400 text-sm">Most Active Day</div>
              </div>
              <div className="bg-black/40 p-6 rounded-2xl border border-purple-500/30 text-center">
                <div className="text-2xl font-bold text-white mb-1">{data.commitStats.topHour}</div>
                <div className="text-purple-400 text-sm">Peak Hour</div>
              </div>
              <div className="bg-black/40 p-6 rounded-2xl border border-purple-500/30 text-center">
                <div className="text-2xl font-bold text-white mb-1">{data.commitStats.bussiestMonth}</div>
                <div className="text-purple-400 text-sm">Busiest Month</div>
              </div>
            </div>
          </div>
        );

      case 'activity':
        return (
          <div className={`transition-all duration-600 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
            <h2 className="text-5xl font-bold text-white mb-4">Weekly Pattern</h2>
            <p className="text-purple-300 mb-12">When the magic happens</p>

            <div className="flex items-end justify-between h-64 gap-4">
              {data.activityPattern.map((item, index) => {
                const maxCommits = Math.max(...data.activityPattern.map(d => d.commits));
                const height = (item.commits / maxCommits) * 100;

                return (
                  <div key={item.day} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-gradient-to-t from-purple-500 to-pink-500 rounded-t-lg transition-all duration-1000 ease-out hover:from-purple-400 hover:to-pink-400 cursor-pointer"
                      style={{
                        height: `${height}%`,
                        transitionDelay: `${index * 100}ms`,
                      }}
                    ></div>
                    <div className="text-white font-semibold mt-4">{item.day}</div>
                    <div className="text-purple-400 text-sm">{item.commits}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'personality':
        return (
          <div className={`transition-all duration-600 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
            <h2 className="text-5xl font-bold text-white mb-4">Coding Personality</h2>
            <p className="text-purple-300 mb-12">What your code says about you</p>

            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-8 rounded-3xl border border-purple-500/30 mb-8">
              <div className="text-4xl font-bold text-white mb-2">{data.personality.type}</div>
              <div className="text-purple-300 text-lg italic">{data.personality.vibe}</div>
            </div>

            <div className="space-y-4">
              {data.personality.traits.map((trait, index) => (
                <div
                  key={trait}
                  className="bg-black/40 p-4 rounded-2xl border border-purple-500/30 animate-slide-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-white">{trait}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'summary':
        return <WrapUp repoName={repoName} data={data} onReset={onReset} />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        <div className="bg-black/40 backdrop-blur-lg rounded-3xl p-12 border border-purple-500/30 shadow-2xl">
          {renderSlide()}

          {/* Navigation */}
          <div className="mt-12 flex items-center justify-between">
            <button
              onClick={prevSlide}
              disabled={currentIndex === 0}
              className="px-6 py-3 bg-purple-500/20 hover:bg-purple-500/40 disabled:bg-purple-500/10 disabled:cursor-not-allowed text-white rounded-xl transition-colors border border-purple-500/30 disabled:border-purple-500/10"
            >
              Previous
            </button>

            <div className="flex gap-2">
              {slides.map((slide, index) => (
                <button
                  key={slide}
                  onClick={() => setCurrentSlide(slide)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentIndex
                      ? 'bg-purple-500 w-8'
                      : 'bg-purple-500/30 hover:bg-purple-500/50'
                  }`}
                  aria-label={`Go to ${slide} slide`}
                ></button>
              ))}
            </div>

            <button
              onClick={nextSlide}
              disabled={currentIndex === slides.length - 1}
              className="px-6 py-3 bg-purple-500/20 hover:bg-purple-500/40 disabled:bg-purple-500/10 disabled:cursor-not-allowed text-white rounded-xl transition-colors border border-purple-500/30 disabled:border-purple-500/10"
            >
              {currentIndex === slides.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
