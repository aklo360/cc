'use client';

import { useState } from 'react';
import Link from 'next/link';

// Pre-populated confessions for immediate engagement
const INITIAL_CONFESSIONS = [
  {
    id: 1,
    text: "I once pushed directly to production on a Friday at 4:45 PM. The site was down all weekend. I told my boss it was a 'scheduled maintenance window'.",
    sins: ['production', 'friday', 'lies'],
    timestamp: Date.now() - 86400000,
  },
  {
    id: 2,
    text: "I've been copying and pasting the same Stack Overflow answer for 3 years. I still don't understand how it works. I just know it does.",
    sins: ['stackoverflow', 'copypasta', 'ignorance'],
    timestamp: Date.now() - 172800000,
  },
  {
    id: 3,
    text: "There's a 2,400 line function in our codebase. I wrote it. I'm not sorry. It works perfectly. Fight me.",
    sins: ['spaghetti', 'unhinged', 'noregrets'],
    timestamp: Date.now() - 259200000,
  },
  {
    id: 4,
    text: "I once spent 6 hours debugging only to realize I was editing the wrong file the entire time. I blamed it on my IDE.",
    sins: ['debugging', 'timeWaste', 'denial'],
    timestamp: Date.now() - 345600000,
  },
  {
    id: 5,
    text: "I have a file called 'test2_final_ACTUAL_final_USE_THIS.js' in production. It's been there for 2 years.",
    sins: ['naming', 'chaos', 'production'],
    timestamp: Date.now() - 432000000,
  },
  {
    id: 6,
    text: "I accidentally deleted the production database and restored it from a 3-day-old backup. Nobody noticed. I'll take this to my grave.",
    sins: ['database', 'cover-up', 'dangerous'],
    timestamp: Date.now() - 518400000,
  },
  {
    id: 7,
    text: "I told my manager I need React, Redux, GraphQL, and Kubernetes for the project. It's a landing page. With three buttons.",
    sins: ['overengineering', 'resume-driven', 'wasteful'],
    timestamp: Date.now() - 604800000,
  },
  {
    id: 8,
    text: "I've been using 'git commit -m \"fix\"' for 8 years. My commit history is useless. I don't care.",
    sins: ['git', 'lazy', 'chaotic'],
    timestamp: Date.now() - 691200000,
  },
];

const SIN_CATEGORIES = [
  'production', 'debugging', 'git', 'stackoverflow', 'copypasta', 'spaghetti',
  'friday', 'lies', 'database', 'naming', 'lazy', 'overengineering',
  'cover-up', 'timeWaste', 'chaotic', 'dangerous', 'unhinged', 'noregrets'
];

interface Confession {
  id: number;
  text: string;
  sins: string[];
  timestamp: number;
}

export default function ConfessPage() {
  const [confessions, setConfessions] = useState<Confession[]>(INITIAL_CONFESSIONS);
  const [newConfession, setNewConfession] = useState('');
  const [selectedSins, setSelectedSins] = useState<string[]>(['production', 'friday']);
  const [filter, setFilter] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!newConfession.trim()) return;

    const confession: Confession = {
      id: Date.now(),
      text: newConfession,
      sins: selectedSins.length > 0 ? selectedSins : ['untagged'],
      timestamp: Date.now(),
    };

    setConfessions([confession, ...confessions]);
    setNewConfession('');
    setSelectedSins(['production', 'friday']);
  };

  const toggleSin = (sin: string) => {
    setSelectedSins(prev =>
      prev.includes(sin)
        ? prev.filter(s => s !== sin)
        : [...prev, sin]
    );
  };

  const filteredConfessions = filter
    ? confessions.filter(c => c.sins.includes(filter))
    : confessions;

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-4 sm:py-8 px-[5%]">
      <div className="max-w-[900px] w-[90%]">

        {/* Header */}
        <header className="flex items-center gap-3 py-3 mb-6">
          <Link href="/" className="flex gap-2 hover:opacity-80 transition-opacity">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </Link>
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <img src="/cc.png" alt="$CC" width={24} height={24} />
          </Link>
          <span className="text-claude-orange font-semibold text-sm">Code Confessional</span>
          <span className="text-text-muted text-xs ml-auto hidden sm:inline">🙏 Share your shame</span>
        </header>

        {/* Hero Section */}
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">
            🙏 The Code Confessional 🙏
          </h1>
          <p className="text-text-secondary text-sm sm:text-base">
            Anonymous confessions about your worst coding sins, failures, and embarrassing bugs
          </p>
          <p className="text-text-muted text-xs mt-1">
            This is a safe space. We&apos;ve all been there. Share your shame, find solidarity.
          </p>
        </div>

        {/* Confession Input */}
        <div className="bg-bg-secondary border border-border rounded-lg p-4 mb-4">
          <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
            🕯️ Confess Your Sins
          </label>
          <textarea
            value={newConfession}
            onChange={(e) => setNewConfession(e.target.value)}
            className="w-full h-32 bg-bg-primary border border-border rounded-md px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors resize-none mb-3"
            placeholder="I once pushed to production without testing...
I accidentally dropped the production database...
I've been copy-pasting code I don't understand for years..."
          />

          {/* Sin Tags */}
          <div className="mb-3">
            <label className="text-text-muted text-xs mb-2 block">Tag your sins (click to toggle):</label>
            <div className="flex flex-wrap gap-2">
              {SIN_CATEGORIES.slice(0, 12).map((sin) => (
                <button
                  key={sin}
                  onClick={() => toggleSin(sin)}
                  className={`px-2 py-1 rounded text-xs transition-all ${
                    selectedSins.includes(sin)
                      ? 'bg-claude-orange text-white border border-claude-orange'
                      : 'bg-bg-tertiary border border-border text-text-secondary hover:border-claude-orange'
                  }`}
                >
                  {sin}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-claude-orange text-white font-semibold py-2.5 px-4 rounded-md text-sm hover:bg-claude-orange-dim transition-colors"
          >
            🙏 Confess Anonymously
          </button>
        </div>

        {/* Filter Bar */}
        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter(null)}
            className={`px-3 py-1.5 rounded text-xs whitespace-nowrap transition-colors ${
              filter === null
                ? 'bg-claude-orange text-white'
                : 'bg-bg-secondary border border-border text-text-secondary hover:border-claude-orange'
            }`}
          >
            All Sins
          </button>
          {['production', 'friday', 'git', 'debugging', 'database', 'lies'].map((sin) => (
            <button
              key={sin}
              onClick={() => setFilter(sin)}
              className={`px-3 py-1.5 rounded text-xs whitespace-nowrap transition-colors ${
                filter === sin
                  ? 'bg-claude-orange text-white'
                  : 'bg-bg-secondary border border-border text-text-secondary hover:border-claude-orange'
              }`}
            >
              #{sin}
            </button>
          ))}
        </div>

        {/* Confessions Feed */}
        <div className="space-y-3 mb-6">
          {filteredConfessions.map((confession) => (
            <div
              key={confession.id}
              className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-claude-orange/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex flex-wrap gap-1.5">
                  {confession.sins.map((sin) => (
                    <span
                      key={sin}
                      onClick={() => setFilter(sin)}
                      className="px-2 py-0.5 bg-bg-tertiary border border-border rounded text-xs text-claude-orange cursor-pointer hover:bg-claude-orange hover:text-white transition-colors"
                    >
                      #{sin}
                    </span>
                  ))}
                </div>
                <span className="text-text-muted text-xs whitespace-nowrap ml-2">
                  {getTimeAgo(confession.timestamp)}
                </span>
              </div>
              <p className="text-text-primary text-sm leading-relaxed">{confession.text}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-bg-secondary border border-border rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">🙏</div>
            <div className="text-text-primary text-lg font-semibold">{confessions.length}</div>
            <div className="text-text-muted text-xs">Confessions</div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">🔥</div>
            <div className="text-text-primary text-lg font-semibold">
              {confessions.reduce((sum, c) => sum + c.sins.length, 0)}
            </div>
            <div className="text-text-muted text-xs">Total Sins</div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">💀</div>
            <div className="text-text-primary text-lg font-semibold">
              {confessions.filter(c => c.sins.includes('production')).length}
            </div>
            <div className="text-text-muted text-xs">Prod Sins</div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">🤝</div>
            <div className="text-text-primary text-lg font-semibold">100%</div>
            <div className="text-text-muted text-xs">Solidarity</div>
          </div>
        </div>

        {/* Footer */}
        <footer className="py-4 mt-6 text-center">
          <Link href="/" className="text-claude-orange hover:underline text-sm">
            ← back
          </Link>
          <p className="text-text-muted text-xs mt-2">
            claudecode.wtf · 100% of fees to @bcherny
          </p>
        </footer>

      </div>
    </div>
  );
}
