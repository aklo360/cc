export default function BuyButton() {
  return (
    <a
      href="https://bags.fm/Hg23qBLJDvhQtGLHMvot7NK54qAhzQFj9BVd5jpABAGS"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 bg-claude-orange border border-claude-orange text-bg-primary px-4 py-2 sm:px-6 sm:py-3 rounded-md text-sm font-semibold transition-colors hover:bg-claude-orange-dim hover:border-claude-orange-dim cursor-pointer"
    >
      <img src="/bags.ico" alt="Bags" width={16} height={16} />
      $CC on Bags
    </a>
  );
}
