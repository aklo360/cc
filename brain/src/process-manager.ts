/**
 * Process Manager - Tracks and manages child processes
 *
 * Handles:
 * - Tracking Claude subprocess PIDs
 * - Killing orphaned processes on cancel/startup
 * - Timeout management with proper abort
 * - Resource cleanup
 */

import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { buildEvents } from './builder.js';

const execAsync = promisify(exec);

// Store active processes
interface TrackedProcess {
  pid: number;
  type: 'claude' | 'puppeteer' | 'remotion' | 'wrangler';
  startedAt: Date;
  cycleId?: number;
  description: string;
}

const activeProcesses = new Map<number, TrackedProcess>();

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [ProcessManager] ${message}`;
  console.log(logLine);
  buildEvents.emit('log', logLine);
}

/**
 * Track a new process
 */
export function trackProcess(
  pid: number,
  type: TrackedProcess['type'],
  description: string,
  cycleId?: number
): void {
  activeProcesses.set(pid, {
    pid,
    type,
    startedAt: new Date(),
    cycleId,
    description,
  });
  log(`Tracking ${type} process: PID ${pid} - ${description}`);
}

/**
 * Untrack a process (when it completes normally)
 */
export function untrackProcess(pid: number): void {
  if (activeProcesses.has(pid)) {
    const proc = activeProcesses.get(pid)!;
    activeProcesses.delete(pid);
    log(`Untracked ${proc.type} process: PID ${pid}`);
  }
}

/**
 * Get all tracked processes
 */
export function getActiveProcesses(): TrackedProcess[] {
  return Array.from(activeProcesses.values());
}

/**
 * Get processes for a specific cycle
 */
export function getProcessesForCycle(cycleId: number): TrackedProcess[] {
  return Array.from(activeProcesses.values()).filter(p => p.cycleId === cycleId);
}

/**
 * Kill a specific process by PID
 */
export async function killProcess(pid: number, signal: 'SIGTERM' | 'SIGKILL' = 'SIGTERM'): Promise<boolean> {
  try {
    process.kill(pid, signal);
    log(`Sent ${signal} to PID ${pid}`);

    // Wait a bit and check if it's dead
    await new Promise(r => setTimeout(r, 1000));

    try {
      // If this doesn't throw, process is still alive
      process.kill(pid, 0);

      // Process still alive, force kill
      if (signal !== 'SIGKILL') {
        log(`Process ${pid} still alive, sending SIGKILL`);
        process.kill(pid, 'SIGKILL');
        await new Promise(r => setTimeout(r, 500));
      }
    } catch {
      // Process is dead (kill(pid, 0) throws when process doesn't exist)
    }

    untrackProcess(pid);
    return true;
  } catch (error) {
    // Process might already be dead
    untrackProcess(pid);
    return false;
  }
}

/**
 * Kill all processes of a specific type
 */
export async function killProcessesByType(type: TrackedProcess['type']): Promise<number> {
  const processes = Array.from(activeProcesses.values()).filter(p => p.type === type);
  let killed = 0;

  for (const proc of processes) {
    if (await killProcess(proc.pid)) {
      killed++;
    }
  }

  return killed;
}

/**
 * Kill all processes for a specific cycle
 */
export async function killProcessesForCycle(cycleId: number): Promise<number> {
  const processes = getProcessesForCycle(cycleId);
  let killed = 0;

  for (const proc of processes) {
    if (await killProcess(proc.pid)) {
      killed++;
    }
  }

  return killed;
}

/**
 * Kill all tracked processes
 */
export async function killAllProcesses(): Promise<number> {
  const processes = Array.from(activeProcesses.values());
  let killed = 0;

  for (const proc of processes) {
    if (await killProcess(proc.pid)) {
      killed++;
    }
  }

  return killed;
}

/**
 * Find and kill orphaned Claude processes from previous runs
 * This runs on startup to clean up any processes left from crashes
 */
export async function cleanupOrphanedProcesses(): Promise<{ claude: number; chrome: number }> {
  let claudeKilled = 0;
  let chromeKilled = 0;

  try {
    // Find orphaned Claude processes
    const { stdout: claudeOutput } = await execAsync(
      "pgrep -f '/root/.local/bin/claude' || true"
    );

    const claudePids = claudeOutput.trim().split('\n').filter(Boolean).map(Number);

    for (const pid of claudePids) {
      if (pid && !isNaN(pid)) {
        try {
          process.kill(pid, 'SIGTERM');
          claudeKilled++;
          log(`Killed orphaned Claude process: PID ${pid}`);
        } catch {
          // Process might already be dead
        }
      }
    }

    // Find orphaned Chrome/Chromium processes (from Puppeteer)
    const { stdout: chromeOutput } = await execAsync(
      "pgrep -f 'chromium|chrome' || true"
    );

    const chromePids = chromeOutput.trim().split('\n').filter(Boolean).map(Number);

    // Only kill Chrome processes that are older than 30 minutes (likely orphaned)
    for (const pid of chromePids) {
      if (pid && !isNaN(pid)) {
        try {
          // Check process age
          const { stdout: startTime } = await execAsync(
            `ps -o etimes= -p ${pid} 2>/dev/null || echo "0"`
          );
          const elapsedSeconds = parseInt(startTime.trim()) || 0;

          // If process is older than 30 minutes, kill it
          if (elapsedSeconds > 1800) {
            process.kill(pid, 'SIGTERM');
            chromeKilled++;
            log(`Killed orphaned Chrome process: PID ${pid} (age: ${elapsedSeconds}s)`);
          }
        } catch {
          // Process might already be dead
        }
      }
    }
  } catch (error) {
    log(`Error during cleanup: ${error}`);
  }

  return { claude: claudeKilled, chrome: chromeKilled };
}

/**
 * Execute a command with proper timeout and abort handling
 * Unlike promisify(exec), this actually kills the child process on timeout
 */
export function execWithTimeout(
  command: string,
  options: {
    cwd?: string;
    timeout: number;
    env?: NodeJS.ProcessEnv;
    description?: string;
    cycleId?: number;
  }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const { cwd, timeout, env, description, cycleId } = options;

    let stdout = '';
    let stderr = '';
    let killed = false;

    const child = spawn('bash', ['-c', command], {
      cwd,
      env: env || process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Track the process
    if (child.pid) {
      trackProcess(child.pid, 'wrangler', description || command, cycleId);
    }

    // Collect output
    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    // Set up timeout
    const timeoutId = setTimeout(() => {
      killed = true;
      log(`Command timed out after ${timeout}ms: ${command.slice(0, 50)}...`);

      if (child.pid) {
        // First try SIGTERM
        try {
          process.kill(child.pid, 'SIGTERM');
        } catch {}

        // Then SIGKILL after 5 seconds
        setTimeout(() => {
          try {
            process.kill(child.pid!, 'SIGKILL');
          } catch {}
        }, 5000);
      }

      reject(new Error(`Command timed out after ${timeout}ms`));
    }, timeout);

    // Handle completion
    child.on('close', (code) => {
      clearTimeout(timeoutId);

      if (child.pid) {
        untrackProcess(child.pid);
      }

      if (killed) {
        return; // Already rejected
      }

      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command exited with code ${code}: ${stderr || stdout}`));
      }
    });

    child.on('error', (error) => {
      clearTimeout(timeoutId);

      if (child.pid) {
        untrackProcess(child.pid);
      }

      if (!killed) {
        reject(error);
      }
    });
  });
}

/**
 * Create an AbortController with timeout
 */
export function createTimeoutController(timeoutMs: number): {
  controller: AbortController;
  timeoutId: NodeJS.Timeout;
  cleanup: () => void;
} {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const cleanup = () => {
    clearTimeout(timeoutId);
  };

  return { controller, timeoutId, cleanup };
}

/**
 * Register cleanup handlers for graceful shutdown
 */
export function registerShutdownHandlers(): void {
  const shutdown = async () => {
    log('Shutting down - killing all tracked processes...');
    const killed = await killAllProcesses();
    log(`Killed ${killed} processes`);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('exit', () => {
    // Synchronous cleanup - best effort
    for (const proc of activeProcesses.values()) {
      try {
        process.kill(proc.pid, 'SIGKILL');
      } catch {}
    }
  });
}
