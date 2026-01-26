/**
 * Homepage Button Updater - Safely adds new feature buttons to the homepage
 *
 * Safety Rules:
 * - ONLY adds new buttons, NEVER modifies existing ones
 * - Inserts before BuyButton (consistent position)
 * - Skips if button already exists (idempotent)
 * - Verifies feature page exists before adding
 * - Non-blocking - failure doesn't break the cycle
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get project root dynamically
function getProjectRoot(): string {
  // Use PROJECT_ROOT env var (set in Docker), fallback to relative path
  if (process.env.PROJECT_ROOT) {
    return process.env.PROJECT_ROOT;
  }
  // brain/src/homepage.ts -> brain/src -> brain -> ccwtf
  return join(__dirname, '..', '..');
}

// Available color schemes for buttons
const BUTTON_COLORS = [
  { border: 'accent-green', text: 'accent-green', hover: 'accent-green' },
  { border: 'accent-purple', text: 'accent-purple', hover: 'accent-purple' },
  { border: 'cyan-500', text: 'cyan-400', hover: 'cyan-500' },
  { border: 'fuchsia-500', text: 'fuchsia-400', hover: 'fuchsia-500' },
  { border: 'amber-500', text: 'amber-400', hover: 'amber-500' },
  { border: 'emerald-500', text: 'emerald-400', hover: 'emerald-500' },
  { border: 'rose-500', text: 'rose-400', hover: 'rose-500' },
  { border: 'indigo-500', text: 'indigo-400', hover: 'indigo-500' },
];

// Feather icons for different feature types
const FEATURE_ICONS: Record<string, string> = {
  game: '<path d="M6 12h4m4 0h4M6 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm12 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>',
  tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  generator: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  default: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  poetry: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  art: '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  quiz: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
};

// Guess icon based on feature name
function guessIcon(featureName: string): string {
  const name = featureName.toLowerCase();
  if (name.includes('game') || name.includes('play') || name.includes('invader')) return FEATURE_ICONS.game;
  if (name.includes('tool') || name.includes('util')) return FEATURE_ICONS.tool;
  if (name.includes('generat') || name.includes('create') || name.includes('maker')) return FEATURE_ICONS.generator;
  if (name.includes('poetry') || name.includes('poem') || name.includes('book') || name.includes('read')) return FEATURE_ICONS.poetry;
  if (name.includes('art') || name.includes('draw') || name.includes('paint') || name.includes('visual')) return FEATURE_ICONS.art;
  if (name.includes('music') || name.includes('sound') || name.includes('audio')) return FEATURE_ICONS.music;
  if (name.includes('quiz') || name.includes('trivia') || name.includes('question')) return FEATURE_ICONS.quiz;
  return FEATURE_ICONS.default;
}

// Count existing feature buttons to pick a different color
function countExistingButtons(content: string): number {
  const matches = content.match(/href="\/[a-z-]+"/g);
  return matches ? matches.filter(m => !m.includes('/meme') && !m.includes('/play') && !m.includes('/moon') && !m.includes('/watch')).length : 0;
}

// Generate the button HTML
function generateButtonHtml(slug: string, name: string, colorIndex: number): string {
  const color = BUTTON_COLORS[colorIndex % BUTTON_COLORS.length];
  const icon = guessIcon(name);

  return `          <a
            href="/${slug}"
            className="inline-flex items-center gap-2 bg-bg-secondary border border-${color.border} text-${color.text} px-4 py-2 sm:px-6 sm:py-3 rounded-md text-sm font-semibold transition-colors hover:bg-${color.hover} hover:text-white"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              ${icon}
            </svg>
            ${name}
          </a>`;
}

export interface HomepageUpdateResult {
  success: boolean;
  error?: string;
  alreadyExists?: boolean;
  deployed?: boolean;
}

export async function addFeatureToHomepage(
  slug: string,
  featureName: string,
  log: (msg: string) => void = console.log
): Promise<HomepageUpdateResult> {
  const projectRoot = getProjectRoot();
  const homepagePath = join(projectRoot, 'app', 'page.tsx');

  try {
    // 1. Check if homepage exists
    if (!existsSync(homepagePath)) {
      log(`   ⚠️ Homepage not found at ${homepagePath}`);
      return { success: false, error: 'Homepage file not found' };
    }

    // 2. Read current homepage
    const content = readFileSync(homepagePath, 'utf-8');

    // 3. Check if button already exists (idempotent)
    if (content.includes(`href="/${slug}"`)) {
      log(`   ✓ Button for /${slug} already exists, skipping`);
      return { success: true, alreadyExists: true };
    }

    // 4. Verify the feature page exists
    const featurePagePath = join(projectRoot, 'app', slug, 'page.tsx');
    if (!existsSync(featurePagePath)) {
      log(`   ⚠️ Feature page not found at ${featurePagePath}`);
      return { success: false, error: `Feature page not found: /${slug}` };
    }

    // 5. Find insertion point (end of feature buttons section, before </section>)
    // Look for the closing tag of the feature buttons section
    const featureButtonsSectionMarker = '{/* Feature Buttons - RIGHT BELOW JOIN COMMUNITY */}';
    const sectionStart = content.indexOf(featureButtonsSectionMarker);

    if (sectionStart === -1) {
      log('   ⚠️ Could not find feature buttons section');
      return { success: false, error: 'Feature buttons section not found' };
    }

    // Find the closing </section> after the feature buttons
    const sectionEnd = content.indexOf('</section>', sectionStart);
    if (sectionEnd === -1) {
      log('   ⚠️ Could not find end of feature buttons section');
      return { success: false, error: 'Feature buttons section end not found' };
    }

    // Insert before the closing </section>
    const insertIndex = sectionEnd;

    // 6. Count existing buttons for color selection
    const existingCount = countExistingButtons(content);
    const colorIndex = existingCount; // Start from next color

    // 7. Generate button HTML
    const buttonHtml = generateButtonHtml(slug, featureName, colorIndex);

    // 8. Insert the button (before </section>)
    const newContent =
      content.slice(0, insertIndex) +
      buttonHtml +
      '\n        ' +
      content.slice(insertIndex);

    // 9. Write updated file
    writeFileSync(homepagePath, newContent, 'utf-8');
    log(`   ✓ Added button for ${featureName} (/${slug})`);

    // 10. Rebuild and deploy
    log('   → Rebuilding site...');
    try {
      execSync('npm run build', { cwd: projectRoot, stdio: 'pipe' });
      log('   ✓ Build successful');
    } catch (buildError) {
      log(`   ⚠️ Build failed, reverting changes`);
      writeFileSync(homepagePath, content, 'utf-8'); // Rollback
      return { success: false, error: 'Build failed after adding button' };
    }

    // 11. Deploy to Cloudflare
    log('   → Deploying to Cloudflare...');
    try {
      execSync('npx wrangler pages deploy out --project-name=ccwtf', {
        cwd: projectRoot,
        stdio: 'pipe',
      });
      log('   ✓ Deployed successfully');
      return { success: true, deployed: true };
    } catch (deployError) {
      log(`   ⚠️ Deploy failed: ${deployError}`);
      // Don't rollback - the code is correct, just deploy issue
      return { success: true, deployed: false, error: 'Deploy failed' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`   ❌ Homepage update failed: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}
