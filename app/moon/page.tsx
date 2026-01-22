'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

const MoonMission = dynamic(() => import('../components/MoonMission'), { ssr: false });

export default function MoonPage() {
  return (
    <div className="relative">
      <MoonMission />

      {/* Navigation overlay */}
      <div className="absolute top-4 left-4 z-10">
        <Link
          href="/"
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors font-mono text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          claudecode.wtf
        </Link>
      </div>
    </div>
  );
}
