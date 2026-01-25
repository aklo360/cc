import SpaceInvaders from "../components/SpaceInvaders";
import Link from "next/link";

export default function PlayPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center py-4 sm:py-8">
      <div className="max-w-[520px] w-full px-4">
        {/* Header */}
        <header className="flex items-center gap-3 py-3 border-b border-border mb-6">
          <Link href="/" className="flex gap-2 hover:opacity-80 transition-opacity">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </Link>
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <img src="/cc.png" alt="$CC" width={24} height={24} />
          </Link>
          <span className="text-claude-orange font-semibold text-sm">$CC Invaders</span>
          <Link
            href="/meme"
            className="text-text-muted text-xs ml-auto hover:text-claude-orange transition-colors"
          >
            Meme Generator →
          </Link>
        </header>

        {/* Game */}
        <div className="flex justify-center">
          <SpaceInvaders width={480} height={600} />
        </div>

        {/* Footer */}
        <footer className="py-4 mt-6 border-t border-border text-center">
          <Link href="/" className="text-claude-orange hover:underline text-sm">
            ← back
          </Link>
          <p className="text-text-muted text-xs mt-2">
            claudecode.wtf · Defend the $CC realm
          </p>
        </footer>
      </div>
    </div>
  );
}
