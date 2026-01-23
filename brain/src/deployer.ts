/**
 * Deployer - Deploys built projects to Cloudflare Pages
 *
 * Uses wrangler CLI to:
 * 1. Build the Next.js static export
 * 2. Deploy to Cloudflare Pages
 * 3. Return the live URL
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { buildEvents } from './builder.js';
import { config } from 'dotenv';
import { join } from 'path';

const execAsync = promisify(exec);

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
      const buildResult = await execAsync('npm run build', {
        cwd: projectRoot,
        timeout: 300000, // 5 minutes
        env: execEnv,
      });
      logs.push(buildResult.stdout);
      log('✅ Build complete');
    } catch (error) {
      const err = error as { stderr?: string; stdout?: string };
      log(`❌ Build failed: ${err.stderr || err.stdout}`);
      return {
        success: false,
        error: `Build failed: ${err.stderr}`,
        logs,
      };
    }

    // Step 2: Deploy to Cloudflare Pages
    log('☁️ Deploying to Cloudflare Pages...');
    try {
      const deployResult = await execAsync(
        'npx wrangler pages deploy out --project-name=ccwtf --commit-dirty=true',
        {
          cwd: projectRoot,
          timeout: 300000, // 5 minutes
          env: execEnv,
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
      const err = error as { stderr?: string; stdout?: string };
      log(`❌ Deploy failed: ${err.stderr || err.stdout}`);
      return {
        success: false,
        error: `Deploy failed: ${err.stderr}`,
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
