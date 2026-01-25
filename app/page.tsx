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

        {/* Logo Section */}
        <section className="text-center">
          <img
            src="/cc.png"
            alt="$CC mascot"
            width={80}
            height={80}
            className="mx-auto mb-3"
          />
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

        {/* All Buttons - unified section */}
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
            Space Invaders
          </a>
          <a href="/moon" className="inline-flex items-center gap-2 bg-bg-secondary border border-cyan-500 text-cyan-400 px-4 py-2 sm:px-6 sm:py-3 rounded-md text-sm font-semibold transition-colors hover:bg-cyan-500 hover:text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            StarClaude64
          </a>
          <a href="/poetry" className="inline-flex items-center gap-2 bg-bg-secondary border border-accent-green text-accent-green px-4 py-2 sm:px-6 sm:py-3 rounded-md text-sm font-semibold transition-colors hover:bg-accent-green hover:text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            Code Poetry Generator
          </a>
          <a href="/ide" className="inline-flex items-center gap-2 bg-bg-secondary border border-indigo-500 text-indigo-400 px-4 py-2 sm:px-6 sm:py-3 rounded-md text-sm font-semibold transition-colors hover:bg-indigo-500 hover:text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 18 22 12 16 6"/>
              <polyline points="8 6 2 12 8 18"/>
            </svg>
            Claude Code IDE
          </a>
          <a href="/mood" className="inline-flex items-center gap-2 bg-bg-secondary border border-rose-500 text-rose-400 px-4 py-2 sm:px-6 sm:py-3 rounded-md text-sm font-semibold transition-colors hover:bg-rose-500 hover:text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
            Code Mood Ring
          </a>
          <a href="/duck" className="inline-flex items-center gap-2 bg-bg-secondary border border-yellow-500 text-yellow-400 px-4 py-2 sm:px-6 sm:py-3 rounded-md text-sm font-semibold transition-colors hover:bg-yellow-500 hover:text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="10" r="6"/>
              <ellipse cx="12" cy="18" rx="8" ry="4"/>
              <circle cx="10" cy="9" r="1" fill="currentColor"/>
            </svg>
            Rubber Duck Debugger
          </a>
          <a href="/roast" className="inline-flex items-center gap-2 bg-bg-secondary border border-orange-600 text-orange-500 px-4 py-2 sm:px-6 sm:py-3 rounded-md text-sm font-semibold transition-colors hover:bg-orange-600 hover:text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/>
            </svg>
            Code Roast
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
            href="https://x.com/bcherny"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-bg-secondary border border-border text-text-primary px-4 py-2 sm:px-6 sm:py-3 rounded-md text-sm transition-colors hover:bg-bg-tertiary hover:border-claude-orange hover:text-claude-orange"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            @bcherny
          </a>
          <a
            href="https://github.com/anthropics/claude-code"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-bg-secondary border border-border text-text-primary px-4 py-2 sm:px-6 sm:py-3 rounded-md text-sm transition-colors hover:bg-bg-tertiary hover:border-claude-orange hover:text-claude-orange"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Claude Code
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
