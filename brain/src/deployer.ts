/**
 * Deployer - Deploys built projects to Cloudflare Pages
 *
 * Uses wrangler CLI to:
 * 1. Build the Next.js static export
 * 2. Deploy to Cloudflare Pages
 * 3. Return the live URL
 *
 * Fixed issues:
 * - Uses execWithTimeout for proper process killing on timeout
 * - Git push is critical (with retry logic)
 */

import { buildEvents } from './builder.js';
import { config } from 'dotenv';
import { join } from 'path';
import { execWithTimeout } from './process-manager.js';

// Load .env from brain directory
const brainDir = process.cwd().includes('/brain') ? process.cwd() : join(process.cwd(), 'brain');
config({ path: join(brainDir, '.env') });

export interface DeployResult {
  success: boolean;
  url?: string;
  error?: string;
  logs: string[];
}

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}`;
  console.log(logLine);
  buildEvents.emit('log', logLine);
}

export async function deployToCloudflare(): Promise<DeployResult> {
  const logs: string[] = [];
  const projectRoot = process.env.PROJECT_ROOT || process.cwd().replace('/brain', '');

  // Ensure we have required Cloudflare credentials
  const cfToken = process.env.CLOUDFLARE_API_TOKEN;
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  if (!cfToken) {
    log('❌ CLOUDFLARE_API_TOKEN not set');
    return {
      success: false,
      error: 'CLOUDFLARE_API_TOKEN environment variable required',
      logs: ['Missing CLOUDFLARE_API_TOKEN'],
    };
  }

  // Build environment with proper PATH for node/npx
  const nodeDir = process.env.HOME ? `${process.env.HOME}/.nvm/versions/node/v22.22.0/bin` : '';
  const execEnv = {
    ...process.env,
    PATH: nodeDir ? `${nodeDir}:${process.env.PATH}` : process.env.PATH,
    CLOUDFLARE_API_TOKEN: cfToken,
    CLOUDFLARE_ACCOUNT_ID: cfAccountId || '',
  } as NodeJS.ProcessEnv;

  try {
    log('🚀 Starting deployment to Cloudflare Pages...');
    log(`📁 Project root: ${projectRoot}`);
    log(`🔑 Cloudflare token: ${cfToken.slice(0, 10)}...`);

    // Step 1: Build the Next.js static export
    log('📦 Building Next.js static export...');
    try {
      const buildResult = await execWithTimeout('npm run build', {
        cwd: projectRoot,
        timeout: 300000, // 5 minutes - process WILL be killed on timeout
        env: execEnv,
        description: 'Next.js build',
      });
      logs.push(buildResult.stdout);
      log('✅ Build complete');
    } catch (error) {
      const err = error as Error;
      log(`❌ Build failed: ${err.message}`);
      return {
        success: false,
        error: `Build failed: ${err.message}`,
        logs,
      };
    }

    // Step 1.5: Commit and push to GitHub (CRITICAL - with retry)
    log('📤 Pushing to GitHub...');
    let gitPushSucceeded = false;
    const maxGitRetries = 3;

    for (let attempt = 1; attempt <= maxGitRetries; attempt++) {
      try {
        // Add all new/modified files
        await execWithTimeout('git add -A', {
          cwd: projectRoot,
          timeout: 30000,
          env: execEnv,
          description: 'Git add',
        });

        // Commit with descriptive message
        await execWithTimeout(`git commit -m "Auto-deploy: New feature built by Central Brain

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>" || true`, {
          cwd: projectRoot,
          timeout: 30000,
          env: execEnv,
          description: 'Git commit',
        });

        // Push to origin main
        const pushResult = await execWithTimeout('git push origin main', {
          cwd: projectRoot,
          timeout: 60000,
          env: execEnv,
          description: 'Git push',
        });
        logs.push(pushResult.stdout);
        log('✅ Pushed to GitHub');
        gitPushSucceeded = true;
        break;
      } catch (error) {
        const err = error as Error;
        log(`⚠️ Git push attempt ${attempt}/${maxGitRetries} failed: ${err.message}`);

        if (attempt < maxGitRetries) {
          log(`   Retrying in 5 seconds...`);
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    }

    if (!gitPushSucceeded) {
      log('❌ Git push failed after all retries - aborting deploy');
      return {
        success: false,
        error: 'Git push failed - code not synced to GitHub',
        logs,
      };
    }

    // Step 2: Deploy to Cloudflare Pages
    log('☁️ Deploying to Cloudflare Pages...');
    try {
      const deployResult = await execWithTimeout(
        'npx wrangler pages deploy out --project-name=ccwtf --commit-dirty=true',
        {
          cwd: projectRoot,
          timeout: 300000, // 5 minutes - process WILL be killed on timeout
          env: execEnv,
          description: 'Wrangler deploy',
        }
      );
      logs.push(deployResult.stdout);

      // Extract URL from output
      const urlMatch = deployResult.stdout.match(/https:\/\/[^\s]+\.pages\.dev/);
      const url = urlMatch ? urlMatch[0] : 'https://claudecode.wtf';

      log(`✅ Deployed to: ${url}`);

      return {
        success: true,
        url,
        logs,
      };
    } catch (error) {
      const err = error as Error;
      log(`❌ Deploy failed: ${err.message}`);
      return {
        success: false,
        error: `Deploy failed: ${err.message}`,
        logs,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`💥 Deployment error: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage,
      logs,
    };
  }
}

export async function verifyDeployment(url: string): Promise<boolean> {
  log(`🔍 Verifying deployment at ${url}...`);

  try {
    const response = await fetch(url, { method: 'HEAD' });
    const success = response.ok;
    log(success ? '✅ Deployment verified' : `❌ Deployment check failed: ${response.status}`);
    return success;
  } catch (error) {
    log(`❌ Deployment verification error: ${error}`);
    return false;
  }
}
