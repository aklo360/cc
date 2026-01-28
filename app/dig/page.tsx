'use client';

import Link from 'next/link';
import { useState } from 'react';

interface Artifact {
  type: 'todo' | 'mystery' | 'ancient' | 'fossil' | 'relic';
  line: number;
  content: string;
  age: string;
  description: string;
}

export default function DigPage() {
  const [code, setCode] = useState(`// Example code - paste your own!
function calculateTotal(items) {
  // TODO: Add tax calculation here
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}

// FIXME: This needs refactoring
function legacyProcessor(data) {
  var result = [];
  for (var i = 0; i < data.length; i++) {
    result.push(data[i]);
  }
  return result;
}

function mysteriousFunction(x, y, z) {
  // No one knows what this does anymore
  return ((x * 3.14159) + (y << 2)) / z;
}

// NOTE: Keep this for backwards compatibility
function deprecatedHelper() {
  // Added in 2015
  return "legacy";
}`);

  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isExcavating, setIsExcavating] = useState(false);

  const excavate = () => {
    setIsExcavating(true);

    setTimeout(() => {
      const foundArtifacts: Artifact[] = [];
      const lines = code.split('\n');

      lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmed = line.trim();

        // Find TODO comments
        if (trimmed.includes('TODO') || trimmed.includes('FIXME') || trimmed.includes('HACK')) {
          foundArtifacts.push({
            type: 'todo',
            line: lineNum,
            content: line,
            age: `${Math.floor(Math.random() * 500) + 100} days old`,
            description: 'Ancient task marker - never completed'
          });
        }

        // Find var declarations (ancient syntax)
        if (trimmed.startsWith('var ')) {
          foundArtifacts.push({
            type: 'fossil',
            line: lineNum,
            content: line,
            age: 'Pre-ES6 era (before 2015)',
            description: 'Fossilized variable declaration'
          });
        }

        // Find cryptic single-letter variables or mysterious operations
        if ((trimmed.match(/\b[xyz]\b/g)?.length || 0) > 2 || trimmed.includes('<<') || trimmed.includes('3.14159')) {
          foundArtifacts.push({
            type: 'mystery',
            line: lineNum,
            content: line,
            age: 'Unknown origin',
            description: 'Mysterious code - purpose unclear'
          });
        }

        // Find old-style for loops
        if (trimmed.match(/for\s*\(\s*(?:var|let)\s+\w+\s*=\s*0/)) {
          foundArtifacts.push({
            type: 'ancient',
            line: lineNum,
            content: line,
            age: 'Pre-functional era',
            description: 'Ancient iteration technique'
          });
        }

        // Find deprecated/legacy markers
        if (trimmed.toLowerCase().includes('legacy') ||
            trimmed.toLowerCase().includes('deprecated') ||
            trimmed.toLowerCase().includes('backwards compatibility')) {
          foundArtifacts.push({
            type: 'relic',
            line: lineNum,
            content: line,
            age: 'Maintained for compatibility',
            description: 'Sacred relic - must not be removed'
          });
        }

        // Find year markers in comments
        const yearMatch = trimmed.match(/20\d{2}/);
        if (yearMatch) {
          const year = parseInt(yearMatch[0]);
          const yearsAgo = 2026 - year;
          if (yearsAgo > 0) {
            foundArtifacts.push({
              type: 'ancient',
              line: lineNum,
              content: line,
              age: `${yearsAgo} years old (${year})`,
              description: 'Timestamped code layer'
            });
          }
        }
      });

      setArtifacts(foundArtifacts);
      setIsExcavating(false);
    }, 1500);
  };

  const getArtifactIcon = (type: string) => {
    switch (type) {
      case 'todo': return '📋';
      case 'mystery': return '❓';
      case 'ancient': return '🏺';
      case 'fossil': return '🦴';
      case 'relic': return '⚱️';
      default: return '🔍';
    }
  };

  const getArtifactColor = (type: string) => {
    switch (type) {
      case 'todo': return 'text-yellow-400';
      case 'mystery': return 'text-purple-400';
      case 'ancient': return 'text-orange-400';
      case 'fossil': return 'text-gray-400';
      case 'relic': return 'text-blue-400';
      default: return 'text-text-secondary';
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-4 sm:py-8 px-[5%]">
      <div className="max-w-[1200px] w-[90%]">

        {/* HEADER */}
        <header className="flex items-center gap-3 py-3 mb-6">
          <Link href="/" className="flex gap-2 hover:opacity-80 transition-opacity">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </Link>
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <img src="/cc.png" alt="$CC" width={24} height={24} />
          </Link>
          <span className="text-claude-orange font-semibold text-sm">dig</span>
          <span className="text-text-muted text-xs ml-auto">Code Archeology</span>
        </header>

        {/* CONTENT */}
        <div className="space-y-4">
          {/* Introduction */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <p className="text-text-primary text-sm mb-2">
              🏛️ Welcome, Code Archeologist! Paste your codebase and discover hidden artifacts:
            </p>
            <ul className="text-text-secondary text-xs space-y-1 ml-4">
              <li>📋 Ancient TODO comments that were never completed</li>
              <li>🦴 Fossilized syntax from bygone eras</li>
              <li>❓ Mysterious functions with unclear purposes</li>
              <li>🏺 Different code layers from various time periods</li>
              <li>⚱️ Sacred relics kept for backwards compatibility</li>
            </ul>
          </div>

          {/* Code Input */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
              Excavation Site (Paste your code)
            </label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 font-mono text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors resize-none"
              rows={12}
              placeholder="Paste your code here to begin the excavation..."
            />
          </div>

          {/* Excavate Button */}
          <button
            onClick={excavate}
            disabled={isExcavating}
            className="w-full bg-claude-orange text-white font-semibold py-2.5 px-4 rounded-md text-sm hover:bg-claude-orange-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExcavating ? '🔍 Excavating...' : '⛏️ Begin Excavation'}
          </button>

          {/* Results */}
          {artifacts.length > 0 && (
            <div className="bg-bg-secondary border border-border rounded-lg p-4">
              <label className="text-text-secondary text-xs uppercase tracking-wider mb-3 block">
                Discovered Artifacts ({artifacts.length})
              </label>
              <div className="space-y-3">
                {artifacts.map((artifact, idx) => (
                  <div
                    key={idx}
                    className="bg-bg-primary border border-border rounded-md p-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getArtifactIcon(artifact.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold ${getArtifactColor(artifact.type)}`}>
                            {artifact.type.toUpperCase()}
                          </span>
                          <span className="text-text-muted text-xs">Line {artifact.line}</span>
                          <span className="text-text-muted text-xs ml-auto">{artifact.age}</span>
                        </div>
                        <p className="text-text-secondary text-xs mb-2">{artifact.description}</p>
                        <pre className="bg-bg-tertiary border border-border rounded px-2 py-1 text-xs text-text-primary font-mono overflow-x-auto">
                          {artifact.content}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {artifacts.length === 0 && !isExcavating && (
            <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
              <p className="text-text-muted text-sm">
                No excavation performed yet. Click "Begin Excavation" to discover artifacts! 🔍
              </p>
            </div>
          )}

          {/* Excavation Report Summary */}
          {artifacts.length > 0 && (
            <div className="bg-bg-secondary border border-border rounded-lg p-4">
              <label className="text-text-secondary text-xs uppercase tracking-wider mb-3 block">
                Archeological Summary
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="bg-bg-primary border border-border rounded-md p-2 text-center">
                  <div className="text-lg">📋</div>
                  <div className="text-text-primary text-xs font-semibold">
                    {artifacts.filter(a => a.type === 'todo').length}
                  </div>
                  <div className="text-text-muted text-xs">TODOs</div>
                </div>
                <div className="bg-bg-primary border border-border rounded-md p-2 text-center">
                  <div className="text-lg">🦴</div>
                  <div className="text-text-primary text-xs font-semibold">
                    {artifacts.filter(a => a.type === 'fossil').length}
                  </div>
                  <div className="text-text-muted text-xs">Fossils</div>
                </div>
                <div className="bg-bg-primary border border-border rounded-md p-2 text-center">
                  <div className="text-lg">❓</div>
                  <div className="text-text-primary text-xs font-semibold">
                    {artifacts.filter(a => a.type === 'mystery').length}
                  </div>
                  <div className="text-text-muted text-xs">Mysteries</div>
                </div>
                <div className="bg-bg-primary border border-border rounded-md p-2 text-center">
                  <div className="text-lg">🏺</div>
                  <div className="text-text-primary text-xs font-semibold">
                    {artifacts.filter(a => a.type === 'ancient').length}
                  </div>
                  <div className="text-text-muted text-xs">Ancient</div>
                </div>
                <div className="bg-bg-primary border border-border rounded-md p-2 text-center">
                  <div className="text-lg">⚱️</div>
                  <div className="text-text-primary text-xs font-semibold">
                    {artifacts.filter(a => a.type === 'relic').length}
                  </div>
                  <div className="text-text-muted text-xs">Relics</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
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
