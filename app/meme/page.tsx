"use client";

import { useState } from "react";
import Link from "next/link";

const EXAMPLE_PROMPTS = [
  "sitting behind a desk with a laptop and coffee mug",
  "next to a giant gold coin, money floating around",
  "wearing tiny sunglasses, pile of cash nearby",
  "riding a rocket ship through space, stars around",
  "surrounded by confetti, wearing a tiny party hat",
  "at a gym with dumbbells on the floor",
  "in a cozy cafe setting with coffee cup",
  "standing on the moon with Earth in background",
];

export default function MemePage() {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateMeme = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("https://ccwtf-api.aklo.workers.dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setImageUrl(data.image);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadImage = () => {
    if (!imageUrl) return;
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `cc-meme-${Date.now()}.png`;
    link.click();
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(
      `Just made this $CC meme!\n\nCreate yours: claudecode.wtf/meme\n\n$CC`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  const useRandomPrompt = () => {
    const random = EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)];
    setPrompt(random);
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center p-4 overflow-hidden">
      <div className="max-w-[900px] w-full flex flex-col">
        {/* Header */}
        <header className="flex items-center gap-3 py-3 border-b border-border shrink-0">
          <Link href="/" className="flex gap-2 hover:opacity-80 transition-opacity">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </Link>
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <img src="/cc.png" alt="$CC" width={24} height={24} />
          </Link>
          <span className="text-claude-orange font-semibold text-sm">$CC Meme Generator</span>
          <span className="text-text-muted text-xs ml-auto">
            Powered by Gemini
          </span>
        </header>

        {/* Main Content - Two Square Columns */}
        <div className="aspect-[2/1] w-full grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {/* Left Column - Controls */}
          <div className="flex flex-col gap-3 min-h-0">
            {/* Prompt Input */}
            <div className="bg-bg-secondary border border-border rounded-lg p-4">
              <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
                Describe the scene
              </label>
              <div className="flex gap-2">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), generateMeme())}
                  placeholder="e.g., holding a gold coin, celebrating"
                  rows={3}
                  className="flex-1 bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors resize-none"
                  disabled={isLoading}
                />
                <button
                  onClick={useRandomPrompt}
                  className="px-3 py-2 bg-bg-tertiary border border-border rounded-md text-text-secondary hover:text-claude-orange hover:border-claude-orange transition-colors self-start"
                  title="Random prompt"
                  disabled={isLoading}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>

              <button
                onClick={generateMeme}
                disabled={isLoading || !prompt.trim()}
                className="w-full mt-3 bg-claude-orange text-white font-semibold py-2.5 px-4 rounded-md text-sm hover:bg-claude-orange-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating...
                  </span>
                ) : (
                  "Generate Meme"
                )}
              </button>

              {error && (
                <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-md text-red-400 text-xs">
                  {error}
                </div>
              )}
            </div>

            {/* Example Prompts */}
            <div className="bg-bg-secondary border border-border rounded-lg p-4 flex-1 overflow-auto">
              <div className="text-text-secondary text-xs uppercase tracking-wider mb-2">
                Try these
              </div>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPrompt(p)}
                    className="text-xs bg-bg-primary border border-border px-2.5 py-1.5 rounded text-text-secondary hover:text-claude-orange hover:border-claude-orange transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4 flex flex-col min-h-0">
            <div className="text-text-secondary text-xs uppercase tracking-wider mb-2">
              Preview
            </div>
            <div className="flex-1 bg-bg-primary border border-border rounded-lg flex items-center justify-center overflow-hidden">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Generated meme"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-text-muted text-center p-4">
                  <img
                    src="/claudecode.jpg"
                    alt="$CC character"
                    className="w-24 h-24 mx-auto mb-2 opacity-40 rounded-lg"
                  />
                  <p className="text-xs">Your meme will appear here</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {imageUrl && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={downloadImage}
                  className="flex-1 flex items-center justify-center gap-2 bg-bg-tertiary border border-border text-text-primary px-3 py-2 rounded-md text-sm hover:border-claude-orange hover:text-claude-orange transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download
                </button>
                <button
                  onClick={shareToTwitter}
                  className="flex-1 flex items-center justify-center gap-2 bg-bg-tertiary border border-border text-text-primary px-3 py-2 rounded-md text-sm hover:border-claude-orange hover:text-claude-orange transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Share
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="py-2 border-t border-border text-center shrink-0">
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
