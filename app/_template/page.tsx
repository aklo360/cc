/**
 * CANONICAL REFERENCE TEMPLATE - READ THIS BEFORE BUILDING ANY PAGE
 *
 * The brain's builder.ts reads this file to understand correct patterns.
 * This is the SINGLE SOURCE OF TRUTH for page structure.
 *
 * PATTERN RULES:
 * 1. Traffic lights + CC icon are LINKS to homepage
 * 2. Page title is PLAIN TEXT (not a link)
 * 3. Footer has "← back" link (REQUIRED) and NO border-t
 * 4. Header has NO border-b (clean look)
 * 5. Use max-w-[900px] default, max-w-[1200px] for wide pages
 */

'use client';

import Link from 'next/link';

export default function TemplatePage() {
  return (
    // WRAPPER: Centers content with standard margins
    <div className="min-h-screen w-full flex items-center justify-center py-4 sm:py-8 px-[5%]">
      <div className="max-w-[900px] w-[90%]">

        {/* HEADER: Traffic lights + icon LINK to homepage, title is PLAIN TEXT */}
        {/* NO border-b on header */}
        <header className="flex items-center gap-3 py-3 mb-6">
          {/* Traffic lights - Link to homepage */}
          <Link href="/" className="flex gap-2 hover:opacity-80 transition-opacity">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </Link>
          {/* CC Icon - Link to homepage */}
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <img src="/cc.png" alt="$CC" width={24} height={24} />
          </Link>
          {/* Title - PLAIN TEXT, NOT a link */}
          <span className="text-claude-orange font-semibold text-sm">Feature Name</span>
          {/* Optional tagline - right aligned */}
          <span className="text-text-muted text-xs ml-auto">Optional tagline</span>
        </header>

        {/* CONTENT - Use bg-bg-secondary for cards */}
        <div className="space-y-4">
          {/* Standard card pattern */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
              Section Label
            </label>
            {/* Your content here */}
            <p className="text-text-primary text-sm">Content goes here</p>
          </div>

          {/* Primary button pattern */}
          <button className="bg-claude-orange text-white font-semibold py-2.5 px-4 rounded-md text-sm hover:bg-claude-orange-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            Primary Action
          </button>

          {/* Secondary button pattern */}
          <button className="bg-bg-tertiary border border-border text-text-primary px-3 py-2 rounded-md text-sm hover:border-claude-orange hover:text-claude-orange transition-colors">
            Secondary Action
          </button>

          {/* Input pattern */}
          <textarea className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors resize-none" />
        </div>

        {/* FOOTER: "← back" link REQUIRED, NO border-t */}
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
