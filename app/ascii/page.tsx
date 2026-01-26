'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { generateASCII } from './components/ascii-generator';

const EXAMPLE_TEXTS = [
  'CLAUDE CODE',
  'HELLO WORLD',
  'SHIP IT',
  'HACKERMAN',
  'NO BUGS',
  'CODE VIBES'
];

const FONT_STYLES = [
  { id: 'standard', name: 'Standard', desc: 'Classic ASCII' },
  { id: 'small', name: 'Small', desc: 'Compact text' },
  { id: 'banner', name: 'Banner', desc: 'Big & bold' },
  { id: 'block', name: 'Block', desc: 'Solid blocks' },
  { id: 'bubble', name: 'Bubble', desc: 'Rounded fun' },
  { id: 'digital', name: 'Digital', desc: 'LED style' },
];

export default function ASCIIPage() {
  const [inputText, setInputText] = useState('CLAUDE CODE');
  const [selectedFont, setSelectedFont] = useState('standard');
  const [asciiOutput, setAsciiOutput] = useState('');
  const [copied, setCopied] = useState(false);

  // Generate ASCII art on mount and when inputs change
  useEffect(() => {
    const result = generateASCII(inputText.toUpperCase(), selectedFont);
    setAsciiOutput(result);
  }, [inputText, selectedFont]);

  const handleCopy = () => {
    navigator.clipboard.writeText(asciiOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRandomExample = () => {
    const randomText = EXAMPLE_TEXTS[Math.floor(Math.random() * EXAMPLE_TEXTS.length)];
    setInputText(randomText);
  };

  const handleDownload = () => {
    const blob = new Blob([asciiOutput], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ascii-art.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
            <img src="/cc.png" alt="$CC" width={24} height={24} />
          </Link>
          <span className="text-claude-orange font-semibold text-sm">ASCII Art Generator</span>
          <span className="text-text-muted text-xs ml-auto hidden sm:inline">
            Make text sick af
          </span>
        </header>

        {/* Title */}
        <section className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
            ASCII Art Generator 🎨
          </h1>
          <p className="text-text-secondary text-sm">
            Transform boring text into sick ASCII art. Perfect for terminal headers, commits, and code comments.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

          {/* Input Section */}
          <div className="space-y-4">

            {/* Text Input */}
            <div className="bg-bg-secondary border border-border rounded-lg p-4">
              <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
                Your Text
              </label>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                maxLength={20}
                className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors"
                placeholder="Enter text..."
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-text-muted text-xs">{inputText.length}/20 chars</span>
                <button
                  onClick={handleRandomExample}
                  className="text-claude-orange hover:underline text-xs"
                >
                  🎲 Random example
                </button>
              </div>
            </div>

            {/* Font Selection */}
            <div className="bg-bg-secondary border border-border rounded-lg p-4">
              <label className="text-text-secondary text-xs uppercase tracking-wider mb-3 block">
                Font Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                {FONT_STYLES.map((font) => (
                  <button
                    key={font.id}
                    onClick={() => setSelectedFont(font.id)}
                    className={`p-3 rounded-md text-left transition-all ${
                      selectedFont === font.id
                        ? 'bg-claude-orange text-white border-2 border-claude-orange'
                        : 'bg-bg-tertiary border border-border text-text-primary hover:border-claude-orange'
                    }`}
                  >
                    <div className="font-semibold text-sm">{font.name}</div>
                    <div className={`text-xs ${selectedFont === font.id ? 'text-white opacity-90' : 'text-text-muted'}`}>
                      {font.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 bg-claude-orange text-white font-semibold py-2.5 px-4 rounded-md text-sm hover:bg-claude-orange-dim transition-colors"
              >
                {copied ? '✓ Copied!' : '📋 Copy ASCII'}
              </button>
              <button
                onClick={handleDownload}
                className="bg-bg-tertiary border border-border text-text-primary px-4 py-2.5 rounded-md text-sm hover:border-claude-orange hover:text-claude-orange transition-colors"
              >
                💾 Download
              </button>
            </div>
          </div>

          {/* Output Section */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
              ASCII Output
            </label>
            <div className="bg-bg-primary border border-border rounded-md p-4 min-h-[300px] max-h-[500px] overflow-auto">
              <pre className="text-claude-orange text-xs leading-tight font-mono whitespace-pre">
                {asciiOutput || 'Your ASCII art will appear here...'}
              </pre>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="bg-bg-secondary border border-border rounded-lg p-4">
          <div className="text-text-secondary text-xs uppercase tracking-wider mb-2">
            💡 Pro Tips
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="text-text-primary text-sm">
              <span className="text-accent-green">•</span> Keep text short for best results (max 20 chars)
            </div>
            <div className="text-text-primary text-sm">
              <span className="text-accent-blue">•</span> Try different fonts for different vibes
            </div>
            <div className="text-text-primary text-sm">
              <span className="text-accent-purple">•</span> Perfect for git commit headers & terminal banners
            </div>
            <div className="text-text-primary text-sm">
              <span className="text-accent-yellow">•</span> Use in code comments to flex on your team
            </div>
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
