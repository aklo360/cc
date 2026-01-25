/**
 * Builder - Uses Claude Agent SDK to autonomously build projects
 *
 * Hybrid approach:
 * 1. Simple build first
 * 2. Test the build
 * 3. If tests fail, enter debug loop (max 3 attempts)
 * 4. Return success or failure with logs
 *
 * Fixed issues:
 * - Added 10-minute timeout per build attempt
 * - Tracks Claude PID for cleanup on cancel
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { EventEmitter } from 'events';
import { setCyclePid } from './db.js';

// Event emitter for real-time log streaming
export const buildEvents = new EventEmitter();

export interface BuildResult {
  success: boolean;
  projectPath: string;
  logs: string[];
  error?: string;
  sessionId?: string;
  tokensUsed?: number;
  costUsd?: number;
  durationMs?: number;
}

export interface ProjectSpec {
  idea: string;
  slug: string;
  description: string;
  /** If retrying after verification failure, provide the errors so Claude can fix them */
  verificationErrors?: string[];
  /** If retrying, this indicates which attempt we're on */
  retryAttempt?: number;
  /** Cycle ID for PID tracking and cleanup */
  cycleId?: number;
}

// Build timeout: 10 minutes per attempt
const BUILD_TIMEOUT_MS = 10 * 60 * 1000;

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}`;
  console.log(logLine);
  buildEvents.emit('log', logLine);
}

/**
 * Creates a timeout promise that rejects after the specified time
 */
function createTimeout(ms: number, label: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });
}

const BUILD_SYSTEM_PROMPT = `You are an expert software engineer building a new feature for claudecode.wtf.

CRITICAL RULES - NEVER VIOLATE:
1. ONLY create NEW files - never modify existing files outside app/[slug]/
2. Put all new code in app/[slug]/ directory (Next.js App Router)
3. The feature must be a standalone page that works independently
4. Use TypeScript, React 19, Tailwind CSS 4
5. Keep it simple - one main page.tsx file, maybe 1-2 components
6. Must work with static export (no server components, no API routes)
7. Include any necessary client-side interactivity with 'use client'
8. NEVER modify app/page.tsx - the homepage is managed by a separate system
9. NEVER modify ANY files outside app/[slug]/ - only create/edit within your feature folder
10. DO NOT add links to the homepage - homepage buttons are added automatically after deploy

EXISTING CODEBASE STRUCTURE:
- app/ - Next.js App Router pages
- app/components/ - Shared components
- public/ - Static assets (cc.png, claudecode.jpg, etc)

╔═══════════════════════════════════════════════════════════════════════════════╗
║  ⚠️ CRITICAL BRAND ENFORCEMENT - VIOLATION = AUTOMATIC REJECTION ⚠️           ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  Every page on claudecode.wtf MUST look IDENTICAL to the homepage.            ║
║  Same terminal header. Same dark theme. Same colors. Same footer.             ║
║  NO exceptions. NO creativity with colors. NO light themes. NO gradients.     ║
╚═══════════════════════════════════════════════════════════════════════════════╝

BEFORE BUILDING: You MUST read app/_template/page.tsx - this is the REFERENCE for how ALL pages look.

❌ INSTANT REJECTION IF YOU USE:
   - Light backgrounds (white, gray, light colors)
   - Gradient text or backgrounds
   - Inline hex colors like #000, #fff, #333, #666, #999
   - Generic Tailwind like bg-gray-100, text-gray-500, bg-white
   - Any colors NOT in our custom Tailwind palette
   - Missing terminal header with traffic light dots
   - Missing "← back" link in footer (REQUIRED)
   - Page title wrapped in a Link (must be plain text)
   - border-b on header or border-t on footer (neither should have borders)
   - max-width over 1200px (use max-w-[900px] default)
   - Emojis in headings or body paragraphs (only in buttons)
   - Flowery copy like "Transform your..." or "Where X meets Y..."
   - Different page layout/structure

✅ YOU MUST USE EXACTLY:

1. TERMINAL HEADER (Copy this EXACTLY - Required on ALL pages):
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
     <span className="text-claude-orange font-semibold text-sm">[Feature Name]</span>
   </header>

   IMPORTANT HEADER RULES:
   - Traffic lights and CC icon are LINKS to homepage
   - Title is PLAIN TEXT (span), NOT wrapped in a Link
   - NO border-b on the header (clean look)

2. COLOR PALETTE (Use ONLY these Tailwind custom classes):
   ┌─────────────────────────────────────────────────────────────┐
   │ BACKGROUNDS:                                                │
   │   bg-bg-primary    - Main page background (#0d0d0d)         │
   │   bg-bg-secondary  - Cards, sections (#1a1a1a)              │
   │   bg-bg-tertiary   - Hover states, inputs (#262626)         │
   │                                                             │
   │ TEXT:                                                       │
   │   text-text-primary   - Main text (#e0e0e0)                 │
   │   text-text-secondary - Labels (#a0a0a0)                    │
   │   text-text-muted     - Hints, captions (#666666)           │
   │                                                             │
   │ ACCENTS:                                                    │
   │   text-claude-orange / bg-claude-orange (#da7756)           │
   │   text-accent-green / bg-accent-green (#4ade80)             │
   │   text-accent-purple / bg-accent-purple                     │
   │   text-cyan-400, text-fuchsia-400, text-amber-400, etc.     │
   │                                                             │
   │ BORDERS:                                                    │
   │   border-border (#333333)                                   │
   └─────────────────────────────────────────────────────────────┘

3. CARD STYLING:
   <div className="bg-bg-secondary border border-border rounded-lg p-4">
     <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
       Label Text
     </label>
     <!-- Content -->
   </div>

4. BUTTON STYLING:
   Primary: className="bg-claude-orange text-white font-semibold py-2.5 px-4 rounded-md text-sm hover:bg-claude-orange-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
   Secondary: className="bg-bg-tertiary border border-border text-text-primary px-3 py-2 rounded-md text-sm hover:border-claude-orange hover:text-claude-orange transition-colors"

5. INPUT STYLING:
   <textarea className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors resize-none" />

6. FOOTER (Copy this EXACTLY - Required on ALL pages):
   <footer className="py-4 mt-6 text-center">
     <Link href="/" className="text-claude-orange hover:underline text-sm">
       ← back
     </Link>
     <p className="text-text-muted text-xs mt-2">
       claudecode.wtf · 100% of fees to @bcherny
     </p>
   </footer>

   IMPORTANT FOOTER RULES:
   - MUST include "← back" link to homepage (REQUIRED)
   - NO border-t on footer (clean look)
   - Back link on first line, attribution on second line

7. PAGE WRAPPER (Copy this EXACTLY):
   <div className="min-h-screen w-full flex items-center justify-center py-4 sm:py-8">
     <div className="max-w-[900px] w-full px-4 sm:px-5">
       {/* Terminal Header */}
       {/* Content */}
       {/* Footer */}
     </div>
   </div>

FINAL CHECK BEFORE SUBMISSION - The build will be REJECTED if:
□ Page uses ANY color not in the palette above
□ Page is missing terminal header with traffic light dots
□ Page title is wrapped in a Link (must be plain span text)
□ Header has border-b (should NOT have border)
□ Footer has border-t (should NOT have border)
□ Footer is missing "← back" link (REQUIRED)
□ Footer is missing "claudecode.wtf · 100% of fees to @bcherny" attribution
□ Page has a light/white background anywhere
□ Page uses generic Tailwind colors instead of custom classes
□ Page uses max-width over 1200px

`;

export async function buildProject(spec: ProjectSpec): Promise<BuildResult> {
  const logs: string[] = [];
  // Use PROJECT_ROOT env var or default to cwd parent
  const projectRoot = process.env.PROJECT_ROOT || process.cwd().replace('/brain', '');
  const projectPath = `${projectRoot}/app/${spec.slug}`;

  log(`🔨 Starting build: ${spec.idea}`);
  log(`📁 Target path: ${projectPath}`);

  // Debug: Check if API key is available
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    log(`❌ ANTHROPIC_API_KEY not found in environment!`);
    return {
      success: false,
      projectPath,
      logs: ['ANTHROPIC_API_KEY not set'],
      error: 'ANTHROPIC_API_KEY environment variable is not set',
    };
  }
  log(`🔑 API key found (${apiKey.slice(0, 10)}...)`);

  // Build the prompt - different for initial build vs retry after verification failure
  let buildPrompt: string;

  if (spec.verificationErrors && spec.verificationErrors.length > 0) {
    // This is a RETRY after functional verification failed
    buildPrompt = `URGENT: FIX BROKEN FEATURE - Functional verification FAILED!

PROJECT: ${spec.idea}
SLUG: ${spec.slug}
DESCRIPTION: ${spec.description}

THE FEATURE WAS DEPLOYED BUT FAILED FUNCTIONAL TESTING. The deployed feature is BROKEN.
You MUST fix these issues so the feature works correctly:

⚠️ CRITICAL CONSTRAINTS:
- ONLY modify files in app/${spec.slug}/ - DO NOT touch any other files
- NEVER modify app/page.tsx - the homepage is managed separately
- DO NOT add homepage buttons or links - they are added automatically after deploy

VERIFICATION ERRORS:
${spec.verificationErrors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

THIS IS RETRY ATTEMPT #${spec.retryAttempt || 2}. The feature exists but doesn't work properly.

WHAT YOU NEED TO DO:
1. Read the existing code in app/${spec.slug}/ to understand what was built
2. Fix the specific issues listed above
3. For games: Make sure START/PLAY buttons are NEVER disabled - they should always be clickable
4. For forms: Ensure inputs have sensible defaults so submit buttons work immediately
5. Run "npm run build" to verify it compiles
6. Test your fix makes sense

COMMON FIXES:
- If buttons are disabled until input: Set default values so buttons work immediately
- If start buttons don't work: Remove disabled conditions or provide defaults
- If forms require input: Add placeholder/default values

You CAN modify the files you created in app/${spec.slug}/ - fix the broken code!`;
  } else {
    // Initial build prompt
    buildPrompt = `Build a new feature for claudecode.wtf:

PROJECT: ${spec.idea}
SLUG: ${spec.slug}
DESCRIPTION: ${spec.description}

REQUIREMENTS:
1. Create app/${spec.slug}/page.tsx as the main entry point
2. Add any helper components in app/${spec.slug}/components/ if needed
3. Make it visually polished with the dark theme
4. Include fun, engaging interactivity
5. Must work as static HTML (no server-side code)

CRITICAL UX REQUIREMENTS (to pass functional verification):
- ALL buttons must be clickable immediately on page load
- For games: START/PLAY buttons must NEVER be disabled
- For forms: Provide sensible default values so submit works immediately
- For generators: Pre-fill inputs with examples
- NEVER require user input before primary actions are available

After creating the files:
1. Run "npm run build" to verify it compiles
2. If there are errors, fix them
3. Report success or failure

Remember: ONLY create NEW files. Never modify existing files.`;
  }

  try {
    let sessionId: string | undefined;
    let tokensUsed = 0;
    let costUsd = 0;
    let durationMs = 0;
    let buildSuccess = false;
    let attempt = 0;
    const maxAttempts = 3;

    // Find claude executable - check common locations
    const claudePath = process.env.CLAUDE_PATH ||
      (process.env.HOME ? `${process.env.HOME}/.local/bin/claude` : undefined);

    while (!buildSuccess && attempt < maxAttempts) {
      attempt++;
      log(`📝 Build attempt ${attempt}/${maxAttempts} (timeout: ${BUILD_TIMEOUT_MS / 1000}s)`);

      // Wrap the query in a promise so we can race against timeout
      const runBuildAttempt = async (): Promise<{
        success: boolean;
        sessionId?: string;
        tokensUsed: number;
        costUsd: number;
        durationMs: number;
        logs: string[];
      }> => {
        let attemptSuccess = false;
        let attemptSessionId = sessionId;
        let attemptTokens = 0;
        let attemptCost = 0;
        let attemptDuration = 0;
        const attemptLogs: string[] = [];

        for await (const message of query({
          prompt: attempt === 1 ? buildPrompt : 'The build failed. Please fix the errors and try again.',
          options: {
            allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
            permissionMode: 'acceptEdits',
            model: 'sonnet',
            cwd: projectRoot,
            resume: attemptSessionId,
            maxTurns: 20,
            maxBudgetUsd: 2.0,
            env: process.env as Record<string, string>,
            pathToClaudeCodeExecutable: claudePath,
          },
        })) {
          // Capture session ID
          if (message.type === 'system' && message.subtype === 'init') {
            attemptSessionId = message.session_id;
            log(`🔗 Session: ${attemptSessionId}`);

            // Track the Claude PID for cleanup on cancel (if available)
            if (spec.cycleId && (message as { pid?: number }).pid) {
              setCyclePid(spec.cycleId, (message as { pid?: number }).pid!);
              log(`📝 Tracking Claude PID: ${(message as { pid?: number }).pid}`);
            }
          }

          // Log assistant messages
          if (message.type === 'assistant' && message.message?.content) {
            for (const block of message.message.content) {
              if (block.type === 'text') {
                const text = block.text.slice(0, 200);
                log(`💭 ${text}${block.text.length > 200 ? '...' : ''}`);
                attemptLogs.push(block.text);
              } else if (block.type === 'tool_use') {
                log(`🔧 Using tool: ${block.name}`);
              }
            }
          }

          // Check result
          if (message.type === 'result') {
            attemptTokens += message.usage?.input_tokens || 0;
            attemptTokens += message.usage?.output_tokens || 0;
            attemptCost = message.total_cost_usd || 0;
            attemptDuration = message.duration_ms || 0;

            if (message.subtype === 'success') {
              const result = message.result?.toLowerCase() || '';
              // Check if the build was successful
              if (result.includes('success') || result.includes('built') || result.includes('compiled')) {
                attemptSuccess = true;
                log(`✅ Build successful!`);
              } else if (result.includes('error') || result.includes('failed')) {
                log(`❌ Build has errors, will retry...`);
              } else {
                // Assume success if no explicit failure
                attemptSuccess = true;
                log(`✅ Build completed`);
              }
              attemptLogs.push(message.result || '');
            } else {
              log(`❌ Build error: ${message.errors?.join(', ')}`);
              attemptLogs.push(`Error: ${message.errors?.join(', ')}`);
            }
          }
        }

        return {
          success: attemptSuccess,
          sessionId: attemptSessionId,
          tokensUsed: attemptTokens,
          costUsd: attemptCost,
          durationMs: attemptDuration,
          logs: attemptLogs,
        };
      };

      // Race the build against timeout
      try {
        const result = await Promise.race([
          runBuildAttempt(),
          createTimeout(BUILD_TIMEOUT_MS, `Build attempt ${attempt}`),
        ]);

        // Update cumulative stats
        sessionId = result.sessionId;
        tokensUsed += result.tokensUsed;
        costUsd = result.costUsd;
        durationMs += result.durationMs;
        logs.push(...result.logs);
        buildSuccess = result.success;

      } catch (timeoutError) {
        const errMsg = timeoutError instanceof Error ? timeoutError.message : String(timeoutError);
        log(`⏰ ${errMsg}`);
        logs.push(`Timeout: ${errMsg}`);
        // Continue to next attempt (timeout counts as failure)
      }
    }

    if (!buildSuccess) {
      log(`💥 Build failed after ${maxAttempts} attempts`);
      return {
        success: false,
        projectPath,
        logs,
        error: `Build failed after ${maxAttempts} attempts`,
        sessionId,
        tokensUsed,
        costUsd,
        durationMs,
      };
    }

    log(`🎉 Project built successfully!`);
    return {
      success: true,
      projectPath,
      logs,
      sessionId,
      tokensUsed,
      costUsd,
      durationMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`💥 Build error: ${errorMessage}`);
    return {
      success: false,
      projectPath,
      logs,
      error: errorMessage,
    };
  }
}

export async function verifyBuild(): Promise<{ success: boolean; output: string }> {
  log('🔍 Verifying build...');
  const projectRoot = process.env.PROJECT_ROOT || process.cwd().replace('/brain', '');
  const claudePath = process.env.CLAUDE_PATH ||
    (process.env.HOME ? `${process.env.HOME}/.local/bin/claude` : undefined);

  try {
    for await (const message of query({
      prompt: 'Run "npm run build" and tell me if it succeeds or fails. Just report the result.',
      options: {
        allowedTools: ['Bash'],
        permissionMode: 'acceptEdits',
        model: 'haiku',
        cwd: projectRoot,
        maxTurns: 3,
        maxBudgetUsd: 0.1,
        env: process.env as Record<string, string>,
        pathToClaudeCodeExecutable: claudePath,
      },
    })) {
      if (message.type === 'result' && message.subtype === 'success') {
        const result = message.result?.toLowerCase() || '';
        const success = result.includes('success') || result.includes('built') || !result.includes('error');
        log(success ? '✅ Build verified' : '❌ Build verification failed');
        return { success, output: message.result || '' };
      }
    }
  } catch (error) {
    log(`❌ Build verification error: ${error}`);
  }

  return { success: false, output: 'Verification failed' };
}
