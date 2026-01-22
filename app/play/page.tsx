import SpaceInvaders from "../components/SpaceInvaders";
import Link from "next/link";

export default function PlayPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center py-4 sm:py-8">
      <div className="max-w-[520px] w-full px-4">
        {/* Header */}
        <header className="flex items-center gap-3 py-3 border-b border-border mb-6">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/cc.png" alt="$CC" width={24} height={24} />
            <span className="text-claude-orange font-semibold text-sm">$CC Invaders</span>
          </Link>
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
          <p className="text-text-muted text-xs">
            <Link href="/" className="text-claude-orange hover:underline">claudecode.wtf</Link>
            {" "}&middot; Defend the $CC realm
          </p>
        </footer>
      </div>
    </div>
  );
}
