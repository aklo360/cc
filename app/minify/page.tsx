'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const EXAMPLE_CODE = `function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total = total + items[i].price;
  }
  return total;
}

const user = {
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
};

function validateEmail(email) {
  const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return regex.test(email);
}`;

const COMEDY_COMMENTS = [
  '// Claude says: spicy compress incoming 🌶️',
  '// optimized by your favorite AI (me)',
  '// made smol, but make it fashion ✨',
  '// brevity is the soul of wit -Shakespeare & Claude',
  '// minified with love and questionable humor',
  '// less is more, except for bugs 🐛',
  '// compressed like my self-esteem after code review',
  '// tiny code, big vibes',
  '// webpack could never 💅',
  '// if you can read this, you have good eyes',
];

interface MinifiedResult {
  original: string;
  minified: string;
  originalSize: number;
  minifiedSize: number;
  savedBytes: number;
  savedPercent: number;
  comment: string;
}

export default function MinifyPage() {
  const [code, setCode] = useState(EXAMPLE_CODE);
  const [fileName, setFileName] = useState('code.js');
  const [result, setResult] = useState<MinifiedResult | null>(null);
  const [isMinifying, setIsMinifying] = useState(false);
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedMinified, setCopiedMinified] = useState(false);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCode(text);
    };
    reader.readAsText(file);
  }, []);

  const minifyCode = useCallback((sourceCode: string): string => {
    let minified = sourceCode;

    // Remove comments
    minified = minified.replace(/\/\/.*$/gm, '');
    minified = minified.replace(/\/\*[\s\S]*?\*\//g, '');

    // Remove extra whitespace
    minified = minified.replace(/\s+/g, ' ');

    // Remove spaces around operators and punctuation
    minified = minified.replace(/\s*([{};:,()[\]])\s*/g, '$1');

    // Remove newlines
    minified = minified.replace(/\n+/g, '');

    // Trim
    minified = minified.trim();

    // Add a comedy comment at the beginning
    const comment = COMEDY_COMMENTS[Math.floor(Math.random() * COMEDY_COMMENTS.length)];
    minified = comment + '\n' + minified;

    return minified;
  }, []);

  const handleMinify = useCallback(() => {
    if (!code.trim()) return;

    setIsMinifying(true);

    // Simulate processing time for dramatic effect
    setTimeout(() => {
      const originalSize = new Blob([code]).size;
      const minified = minifyCode(code);
      const minifiedSize = new Blob([minified]).size;
      const savedBytes = originalSize - minifiedSize;
      const savedPercent = Math.round((savedBytes / originalSize) * 100);

      const comment = COMEDY_COMMENTS[Math.floor(Math.random() * COMEDY_COMMENTS.length)];

      setResult({
        original: code,
        minified,
        originalSize,
        minifiedSize,
        savedBytes,
        savedPercent,
        comment,
      });

      setIsMinifying(false);
    }, 800);
  }, [code, minifyCode]);

  const handleCopy = useCallback(async (text: string, type: 'original' | 'minified') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'original') {
        setCopiedOriginal(true);
        setTimeout(() => setCopiedOriginal(false), 2000);
      } else {
        setCopiedMinified(true);
        setTimeout(() => setCopiedMinified(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const handleDownload = useCallback((text: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace(/\.[^/.]+$/, '') + '.min' + fileName.match(/\.[^/.]+$/)?.[0] || '.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [fileName]);

  const getFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-4 sm:py-8 px-[5%]">
      <div className="max-w-[1200px] w-[90%]">

        {/* Header */}
        <header className="flex items-center gap-3 py-3 mb-6">
          <Link href="/" className="flex gap-2 hover:opacity-80 transition-opacity">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </Link>
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image src="/cc.png" alt="$CC" width={24} height={24} />
          </Link>
          <span className="text-claude-orange font-semibold text-sm">Code Minifier</span>
          <span className="text-text-muted text-xs ml-auto hidden sm:inline">🗜️ Compress with comedy</span>
        </header>

        {/* Hero Section */}
        <section className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">
            Claude&apos;s Code Compressor
          </h1>
          <p className="text-text-secondary text-sm sm:text-base">
            Minify your code with a side of dev humor and Claude&apos;s signature sass
          </p>
          <p className="text-text-muted text-xs mt-2">
            Making your code smaller and somehow more entertaining since 2026 ✨
          </p>
        </section>

        {/* Upload & Input Section */}
        <div className="bg-bg-secondary border border-border rounded-lg p-4 sm:p-6 mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <label className="text-text-secondary text-xs uppercase tracking-wider">
              Upload or Paste Your Code
            </label>
            <div className="flex items-center gap-2">
              <label className="bg-bg-tertiary border border-border text-text-primary px-3 py-2 rounded-md text-xs hover:border-claude-orange hover:text-claude-orange transition-colors cursor-pointer">
                📁 Choose File
                <input
                  type="file"
                  accept=".js,.jsx,.ts,.tsx,.css,.html,.json,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <span className="text-text-muted text-xs">{fileName}</span>
            </div>
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-64 bg-bg-primary border border-border rounded-md px-3 py-3 font-mono text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors resize-none"
            placeholder="// Paste your code here or upload a file...
// I'll make it tiny and add some comedy gold 💎"
          />

          <div className="flex items-center justify-between mt-4">
            <p className="text-text-muted text-xs">
              {code.trim() ? `${getFileSize(new Blob([code]).size)} ready to compress` : 'Waiting for code...'}
            </p>
            <button
              onClick={handleMinify}
              disabled={!code.trim() || isMinifying}
              className="bg-claude-orange text-white font-semibold py-3 px-6 rounded-md text-sm hover:bg-claude-orange-dim transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {isMinifying ? '🗜️ Minifying...' : '🗜️ Minify Code'}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-4">
            {/* Stats Card */}
            <div className="bg-bg-secondary border border-claude-orange/50 rounded-lg p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📊</span>
                <h3 className="text-text-primary font-semibold">Compression Stats</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-bg-primary rounded-md p-3 text-center">
                  <div className="text-text-muted text-xs mb-1">Original</div>
                  <div className="text-text-primary font-semibold">{getFileSize(result.originalSize)}</div>
                </div>
                <div className="bg-bg-primary rounded-md p-3 text-center">
                  <div className="text-text-muted text-xs mb-1">Minified</div>
                  <div className="text-accent-green font-semibold">{getFileSize(result.minifiedSize)}</div>
                </div>
                <div className="bg-bg-primary rounded-md p-3 text-center">
                  <div className="text-text-muted text-xs mb-1">Saved</div>
                  <div className="text-accent-blue font-semibold">{getFileSize(result.savedBytes)}</div>
                </div>
                <div className="bg-bg-primary rounded-md p-3 text-center">
                  <div className="text-text-muted text-xs mb-1">Reduction</div>
                  <div className="text-accent-purple font-semibold">{result.savedPercent}%</div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <p className="text-text-secondary text-sm italic">&quot;{result.comment}&quot;</p>
                <p className="text-text-muted text-xs mt-1">- Claude, probably</p>
              </div>
            </div>

            {/* Side by side comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Original */}
              <div className="bg-bg-secondary border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-text-secondary text-xs uppercase tracking-wider">
                    Original Code
                  </label>
                  <button
                    onClick={() => handleCopy(result.original, 'original')}
                    className="text-xs text-claude-orange hover:text-claude-orange/80 transition-colors"
                  >
                    {copiedOriginal ? '✓ Copied!' : '📋 Copy'}
                  </button>
                </div>
                <div className="bg-bg-primary border border-border rounded-md p-3 h-64 overflow-auto">
                  <pre className="font-mono text-xs text-text-primary whitespace-pre-wrap break-all">
                    {result.original}
                  </pre>
                </div>
              </div>

              {/* Minified */}
              <div className="bg-bg-secondary border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-text-secondary text-xs uppercase tracking-wider flex items-center gap-2">
                    Minified Code
                    <span className="text-accent-green text-xs">✨</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(result.minified, 'minified')}
                      className="text-xs text-claude-orange hover:text-claude-orange/80 transition-colors"
                    >
                      {copiedMinified ? '✓ Copied!' : '📋 Copy'}
                    </button>
                    <button
                      onClick={() => handleDownload(result.minified)}
                      className="text-xs text-accent-blue hover:text-accent-blue/80 transition-colors"
                    >
                      💾 Download
                    </button>
                  </div>
                </div>
                <div className="bg-bg-primary border border-border rounded-md p-3 h-64 overflow-auto">
                  <pre className="font-mono text-xs text-text-primary whitespace-pre-wrap break-all">
                    {result.minified}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">🗜️</div>
            <div className="text-text-secondary text-xs font-semibold mb-1">Proper Minification</div>
            <div className="text-text-muted text-xs">Removes whitespace & comments</div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">😄</div>
            <div className="text-text-secondary text-xs font-semibold mb-1">Claude Comedy</div>
            <div className="text-text-muted text-xs">Signature humor included</div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">⚡</div>
            <div className="text-text-secondary text-xs font-semibold mb-1">Instant Results</div>
            <div className="text-text-muted text-xs">Client-side processing</div>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-bg-secondary border border-border rounded-lg p-4 mt-4">
          <h3 className="text-text-secondary text-xs uppercase tracking-wider mb-3">
            What Gets Minified
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-muted">
            <div className="flex items-center gap-2">
              <span className="text-accent-green">✓</span>
              <span>Removes all comments (except Claude&apos;s)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent-green">✓</span>
              <span>Strips extra whitespace</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent-green">✓</span>
              <span>Compacts code structure</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent-green">✓</span>
              <span>Adds signature Claude comment</span>
            </div>
          </div>
          <p className="text-text-muted text-xs mt-3 italic">
            Note: This is a fun minifier! For production use, consider tools like Terser or UglifyJS.
          </p>
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
