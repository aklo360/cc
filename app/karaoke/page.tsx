'use client';

import Link from 'next/link';
import CodeKaraoke from './components/CodeKaraoke';

export default function KaraokePage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center py-4 sm:py-8 px-[5%]">
      <div className="max-w-[900px] w-[90%]">

        {/* HEADER: Traffic lights + icon LINK to homepage, title is PLAIN TEXT */}
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
          <span className="text-claude-orange font-semibold text-sm">Code Karaoke</span>
          {/* Optional tagline - right aligned */}
          <span className="text-text-muted text-xs ml-auto">Type code in rhythm 🎵</span>
        </header>

        {/* CONTENT */}
        <CodeKaraoke />

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
