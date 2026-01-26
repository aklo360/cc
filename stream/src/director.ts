/**
 * Stream Director - Orchestrates what the stream shows based on brain state
 *
 * - Active cycle: Show /watch page (build logs)
 * - Cooldown: Show /vj page (Three.js branded visuals)
 */

import { Page } from 'puppeteer-core';

export interface DirectorConfig {
  brainUrl: string;
  watchUrl: string;
  vjUrl: string;
  pollInterval: number; // ms between status checks
}

export interface BrainStatus {
  brain: string;
  cycle: {
    id: number;
    status: string;
    project: string;
  } | null;
}

type StreamScene = 'watch' | 'vj';

export class Director {
  private config: DirectorConfig;
  private page: Page | null = null;
  private currentScene: StreamScene = 'watch';
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private isNavigating = false;

  constructor(config: DirectorConfig) {
    this.config = config;
  }

  /**
   * Start directing - attach to browser page and begin polling
   */
  start(page: Page): void {
    this.page = page;
    console.log('[director] Started - polling brain status');

    // Initial check
    this.checkAndSwitch();

    // Poll periodically
    this.pollTimer = setInterval(() => {
      this.checkAndSwitch();
    }, this.config.pollInterval);
  }

  /**
   * Stop directing
   */
  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.page = null;
    console.log('[director] Stopped');
  }

  /**
   * Get current scene
   */
  getScene(): StreamScene {
    return this.currentScene;
  }

  /**
   * Check brain status and switch scenes if needed
   */
  private async checkAndSwitch(): Promise<void> {
    if (this.isNavigating || !this.page) return;

    try {
      const status = await this.fetchBrainStatus();
      const targetScene = this.determineScene(status);

      if (targetScene !== this.currentScene) {
        await this.switchScene(targetScene);
      }
    } catch (error) {
      // Brain might be down - stay on current scene
      console.error('[director] Failed to check brain status:', error);
    }
  }

  /**
   * Fetch brain status from API
   */
  private async fetchBrainStatus(): Promise<BrainStatus> {
    const response = await fetch(`${this.config.brainUrl}/status`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Brain returned ${response.status}`);
    }

    return response.json();
  }

  /**
   * Determine which scene to show based on brain status
   */
  private determineScene(status: BrainStatus): StreamScene {
    // If there's an active cycle (planning or executing), show watch page
    if (status.cycle && ['planning', 'executing'].includes(status.cycle.status)) {
      return 'watch';
    }

    // Otherwise show VJ (cooldown, completed, or no cycle)
    return 'vj';
  }

  /**
   * Switch to a new scene
   */
  private async switchScene(scene: StreamScene): Promise<void> {
    if (!this.page || this.isNavigating) return;

    this.isNavigating = true;
    const previousScene = this.currentScene;

    try {
      const url = scene === 'watch'
        ? this.config.watchUrl
        : this.config.vjUrl;

      console.log(`[director] Switching: ${previousScene} -> ${scene}`);
      console.log(`[director] Navigating to: ${url}`);

      await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Hide scrollbars
      await this.page.evaluate(() => {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
      });

      this.currentScene = scene;
      console.log(`[director] Now showing: ${scene}`);
    } catch (error) {
      console.error(`[director] Failed to switch to ${scene}:`, error);
    } finally {
      this.isNavigating = false;
    }
  }

  /**
   * Force switch to a specific scene (manual override)
   */
  async forceScene(scene: StreamScene): Promise<void> {
    await this.switchScene(scene);
  }
}
