/**
 * Builder - Uses Claude Agent SDK to autonomously build projects
 *
 * Hybrid approach:
 * 1. Simple build first
 * 2. Test the build
 * 3. If tests fail, enter debug loop (max 3 attempts)
 * 4. Return success or failure with logs
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { EventEmitter } from 'events';

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
}

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}`;
  console.log(logLine);
  buildEvents.emit('log', logLine);
}

const BUILD_SYSTEM_PROMPT = `You are an expert software engineer building a new feature for claudecode.wtf.

CRITICAL RULES - NEVER VIOLATE:
1. ONLY create NEW files - never modify existing files
2. Put all new code in app/[slug]/ directory (Next.js App Router)
3. The feature must be a standalone page that works independently
4. Use TypeScript, React 19, Tailwind CSS 4
5. Keep it simple - one main page.tsx file, maybe 1-2 components
6. Must work with static export (no server components, no API routes)
7. Include any necessary client-side interactivity with 'use client'

EXISTING CODEBASE STRUCTURE:
- app/ - Next.js App Router pages
- app/components/ - Shared components
- public/ - Static assets (cc.png, claudecode.jpg, etc)
- The site uses dark theme (#0d0d0d bg, #e0e0e0 text, #da7756 accent)

YOUR TASK:
Build the feature, then verify it compiles by running: npm run build

If the build fails, fix the errors and try again (up to 3 attempts).`;

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

  const buildPrompt = `Build a new feature for claudecode.wtf:

PROJECT: ${spec.idea}
SLUG: ${spec.slug}
DESCRIPTION: ${spec.description}

REQUIREMENTS:
1. Create app/${spec.slug}/page.tsx as the main entry point
2. Add any helper components in app/${spec.slug}/components/ if needed
3. Make it visually polished with the dark theme
4. Include fun, engaging interactivity
5. Must work as static HTML (no server-side code)

After creating the files:
1. Run "npm run build" to verify it compiles
2. If there are errors, fix them
3. Report success or failure

Remember: ONLY create NEW files. Never modify existing files.`;

  try {
    let sessionId: string | undefined;
    let tokensUsed = 0;
    let costUsd = 0;
    let durationMs = 0;
    let buildSuccess = false;
    let attempt = 0;
    const maxAttempts = 3;

    while (!buildSuccess && attempt < maxAttempts) {
      attempt++;
      log(`📝 Build attempt ${attempt}/${maxAttempts}`);

      for await (const message of query({
        prompt: attempt === 1 ? buildPrompt : 'The build failed. Please fix the errors and try again.',
        options: {
          allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
          permissionMode: 'bypassPermissions',
          model: 'sonnet',
          cwd: projectRoot,
          resume: sessionId,
          maxTurns: 20,
          maxBudgetUsd: 2.0,
          env: process.env as Record<string, string>,
        },
      })) {
        // Capture session ID
        if (message.type === 'system' && message.subtype === 'init') {
          sessionId = message.session_id;
          log(`🔗 Session: ${sessionId}`);
        }

        // Log assistant messages
        if (message.type === 'assistant' && message.message?.content) {
          for (const block of message.message.content) {
            if (block.type === 'text') {
              const text = block.text.slice(0, 200);
              log(`💭 ${text}${block.text.length > 200 ? '...' : ''}`);
              logs.push(block.text);
            } else if (block.type === 'tool_use') {
              log(`🔧 Using tool: ${block.name}`);
            }
          }
        }

        // Check result
        if (message.type === 'result') {
          tokensUsed += message.usage?.input_tokens || 0;
          tokensUsed += message.usage?.output_tokens || 0;
          costUsd = message.total_cost_usd || 0;
          durationMs = message.duration_ms || 0;

          if (message.subtype === 'success') {
            const result = message.result?.toLowerCase() || '';
            // Check if the build was successful
            if (result.includes('success') || result.includes('built') || result.includes('compiled')) {
              buildSuccess = true;
              log(`✅ Build successful!`);
            } else if (result.includes('error') || result.includes('failed')) {
              log(`❌ Build has errors, will retry...`);
            } else {
              // Assume success if no explicit failure
              buildSuccess = true;
              log(`✅ Build completed`);
            }
            logs.push(message.result || '');
          } else {
            log(`❌ Build error: ${message.errors?.join(', ')}`);
            logs.push(`Error: ${message.errors?.join(', ')}`);
          }
        }
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

  try {
    for await (const message of query({
      prompt: 'Run "npm run build" and tell me if it succeeds or fails. Just report the result.',
      options: {
        allowedTools: ['Bash'],
        permissionMode: 'bypassPermissions',
        model: 'haiku',
        cwd: projectRoot,
        maxTurns: 3,
        maxBudgetUsd: 0.1,
        env: process.env as Record<string, string>,
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
