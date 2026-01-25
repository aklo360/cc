'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

const MoonMission = dynamic(() => import('../components/MoonMission'), { ssr: false });

export default function MoonPage() {
  return (
    <div className="relative">
      <MoonMission />

      {/* Navigation overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <Link
          href="/"
          className="text-claude-orange hover:underline text-sm font-mono"
        >
          ← back
        </Link>
      </div>
    </div>
  );
}
