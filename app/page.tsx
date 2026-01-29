import Terminal from "./components/Terminal";
import BuyButton from "./components/BuyButton";

export default function Home() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center py-6">
      <div className="max-w-[900px] w-full px-4 grid gap-4">
        {/* Terminal Header */}
        <header className="flex items-center gap-3 py-3 border-b border-border">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-text-secondary text-sm ml-auto">
            claude-code-coin ~ zsh
          </span>
        </header>

        {/* Logo + Social Links Row */}
        <div className="flex items-start justify-between -mt-6">
          <img
            src="/cc.png"
            alt="$CC"
            width={64}
            height={64}
          />
          <div className="flex items-center gap-4">
            <a href="https://x.com/ClaudeCodeWTF" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-text-muted text-xs hover:text-claude-orange transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            @ClaudeCodeWTF
          </a>
          <a href="https://www.youtube.com/watch?v=W7l43i8GDYw" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-text-muted text-xs hover:text-red-500 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            YouTube
          </a>
          <a href="https://kick.com/pxpwtf" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-text-muted text-xs hover:text-[#53FC18] transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1.333 0h8v5.333H12V2.667h2.667V0h8v8H20v2.667h-2.667v2.666H20V16h2.667v8h-8v-2.667H12v-2.666H9.333V24h-8Z"/>
            </svg>
            Kick
          </a>
          </div>
        </div>

        {/* ASCII Logo Section */}
        <section className="text-center">
          <pre className="text-claude-orange text-[5px] sm:text-[8px] leading-tight inline-block whitespace-pre">
{` ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗     ██████╗ ██████╗ ██████╗ ███████╗     ██████╗ ██████╗ ██╗███╗   ██╗
██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝    ██╔════╝██╔═══██╗██╔══██╗██╔════╝    ██╔════╝██╔═══██╗██║████╗  ██║
██║     ██║     ███████║██║   ██║██║  ██║█████╗      ██║     ██║   ██║██║  ██║█████╗      ██║     ██║   ██║██║██╔██╗ ██║
██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝      ██║     ██║   ██║██║  ██║██╔══╝      ██║     ██║   ██║██║██║╚██╗██║
╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗    ╚██████╗╚██████╔╝██████╔╝███████╗    ╚██████╗╚██████╔╝██║██║ ╚████║
 ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝     ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝     ╚═════╝ ╚═════╝ ╚═╝╚═╝  ╚═══╝`}
          </pre>
          <p className="text-text-secondary text-sm mt-3">
            The unofficial community memecoin celebrating Claude Code
          </p>
        </section>

        {/* Top Row: Community + Watch */}
        <section className="flex flex-wrap gap-2 justify-center">
          <a href="https://x.com/i/communities/2014131779628618154" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-bg-secondary border border-border text-text-primary px-4 py-2 sm:px-6 sm:py-3 rounded-md text-sm transition-colors hover:bg-bg-tertiary hover:border-claude-orange hover:text-claude-orange">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Join the Community
          </a>
          <a href="/watch" className="inline-flex items-center gap-2 bg-bg-secondary border border-fuchsia-500 text-fuchsia-400 px-4 py-2 sm:px-6 sm:py-3 rounded-md text-sm font-semibold transition-colors hover:bg-fuchsia-500 hover:text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            Watch Dev Cook
          </a>
        </section>

        {/* Feature Buttons */}
        <section className="flex flex-wrap gap-2 justify-center">
          <a href="/meme" className="inline-flex items-center gap-2 bg-claude-orange text-white px-4 py-2 sm:px-6 sm:py-3 rounded-md text-sm font-semibold transition-colors hover:bg-claude-orange-dim">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Meme Generator
          </a>
          <a href="/play" className="inline-flex items-center gap-2 bg-bg-secondary border border-claude-orange text-claude-orange px-4 py-2 sm:px-6 sm:py-3 rounded-md text-sm font-semibold transition-colors hover:bg-claude-orange hover:text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            $CC Invaders
          </a>
          <a href="/moon" className="inline-flex items-center gap-2 bg-bg-secondary border border-cyan-500 text-cyan-400 px-4 py-2 sm:px-6 sm:py-3 rounded-md text-sm font-semibold transition-colors hover:bg-cyan-500 hover:text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            StarClaude64
          </a>
          <a href="/vj" className="inline-flex items-center gap-2 bg-bg-secondary border border-purple-500 text-purple-400 px-4 py-2 sm:px-6 sm:py-3 rounded-md text-sm font-semibold transition-colors hover:bg-purple-500 hover:text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
              <line x1="7" y1="2" x2="7" y2="22"/>
              <line x1="17" y1="2" x2="17" y2="22"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <line x1="2" y1="7" x2="7" y2="7"/>
              <line x1="2" y1="17" x2="7" y2="17"/>
              <line x1="17" y1="17" x2="22" y2="17"/>
              <line x1="17" y1="7" x2="22" y2="7"/>
            </svg>
            VJ Mode
          </a>
          <a
            href="/ccflip"
            className="inline-flex items-center gap-2 bg-bg-secondary border border-green-500 text-green-400 px-4 py-2 sm:px-6 sm:py-3 rounded-md text-sm font-semibold transition-colors hover:bg-green-500 hover:text-white"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v2M12 16v2M6 12h2M16 12h2"/>
            </svg>
            CC Flip
          </a>
          <a
            href="/swap"
            className="inline-flex items-center gap-2 bg-bg-secondary border border-emerald-500 text-emerald-400 px-4 py-2 sm:px-6 sm:py-3 rounded-md text-sm font-semibold transition-colors hover:bg-emerald-500 hover:text-white"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16"/>
            </svg>
            Swap $CC
          </a>
        </section>

        {/* Terminal + Info Cards - grouped together */}
        <section>
          <Terminal />
          <div className="grid grid-cols-2 mt-2">
            <div className="bg-bg-secondary border border-border rounded-lg p-2">
              <div className="text-claude-orange text-xs uppercase tracking-wider">Token Supply</div>
              <div className="text-lg font-bold text-text-primary">1,000,000,000</div>
              <div className="text-text-muted text-xs">One billion $CC</div>
            </div>
            <div className="bg-bg-secondary border border-border rounded-lg p-2">
              <div className="text-claude-orange text-xs uppercase tracking-wider">Creator Fees</div>
              <div className="text-lg font-bold text-text-primary">100%</div>
              <div className="text-text-muted text-xs">All fees to @bcherny</div>
            </div>
          </div>
        </section>

        {/* External Links */}
        <section className="flex flex-wrap gap-2 justify-center">
          <BuyButton />
          <a
            href="https://gmgn.ai/sol/token/Hg23qBLJDvhQtGLHMvot7NK54qAhzQFj9BVd5jpABAGS?ref=UOJLtKlB"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-bg-secondary border border-border text-text-primary px-4 py-2 sm:px-6 sm:py-3 rounded-md text-sm transition-colors hover:bg-bg-tertiary hover:border-claude-orange hover:text-claude-orange"
          >
            <img src="/gmgn.png" alt="GMGN" width={16} height={16} />
            Buy on GMGN
          </a>
          <a
            href="https://photon-sol.tinyastro.io/en/lp/3iJgVmQZwFHe4ScccyvXcFVoVaWnHcktoviessy8sR15?handle=12124071cd836f5e8480a"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-bg-secondary border border-border text-text-primary px-4 py-2 sm:px-6 sm:py-3 rounded-md text-sm transition-colors hover:bg-bg-tertiary hover:border-claude-orange hover:text-claude-orange"
          >
            <img src="/photon.png" alt="Photon" width={16} height={16} />
            Buy on Photon
          </a>
          <a
            href="https://axiom.trade/meme/3iJgVmQZwFHe4ScccyvXcFVoVaWnHcktoviessy8sR15?chain=sol&ref=aklo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-bg-secondary border border-border text-text-primary px-4 py-2 sm:px-6 sm:py-3 rounded-md text-sm transition-colors hover:bg-bg-tertiary hover:border-claude-orange hover:text-claude-orange"
          >
            <img src="/axiom.png" alt="Axiom" width={16} height={16} />
            Buy on Axiom
          </a>
        </section>

        {/* Footer */}
        <footer className="pt-4 border-t border-border text-center">
          <p className="text-text-muted text-xs leading-relaxed">
            Built with love by the community for the community
            <br />
            100% of fees dedicated to{" "}
            <a
              href="https://x.com/bcherny"
              target="_blank"
              rel="noopener noreferrer"
              className="text-claude-orange hover:underline"
            >
              Boris Cherny
            </a>
            , creator of Claude Code
          </p>
        </footer>
      </div>
    </div>
  );
}
