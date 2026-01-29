/**
 * Stream Director - Time-based scene scheduling
 *
 * Schedule: 2 hours BUILD (/watch) → 1 hour BREAK (/vj) → repeat
 *
 * This creates a 3-hour cycle:
 * - Hour 0-2: Build mode (showing /watch with build logs)
 * - Hour 2-3: Break mode (showing /vj visuals)
 */

import { Page } from 'puppeteer-core';

export interface DirectorConfig {
  brainUrl: string;
  watchUrl: string;
  vjUrl: string;
  pollInterval: number; // ms between time checks
}

type StreamScene = 'watch' | 'vj';

// Schedule configuration (in minutes)
const BUILD_DURATION_MINS = 120; // 2 hours
const BREAK_DURATION_MINS = 60;  // 1 hour
const CYCLE_DURATION_MINS = BUILD_DURATION_MINS + BREAK_DURATION_MINS; // 3 hours

export class Director {
  private config: DirectorConfig;
  private page: Page | null = null;
  private currentScene: StreamScene = 'watch';
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private isNavigating = false;
  private cycleStartTime: number;

  constructor(config: DirectorConfig) {
    this.config = config;
    // Start cycle from current time
    this.cycleStartTime = Date.now();
  }

  /**
   * Start directing - attach to browser page and begin time-based scheduling
   */
  start(page: Page): void {
    this.page = page;
    console.log('[director] Started - time-based scheduling');
    console.log(`[director] Schedule: ${BUILD_DURATION_MINS}min BUILD → ${BREAK_DURATION_MINS}min BREAK → repeat`);

    // Initial check
    this.checkAndSwitch();

    // Check every minute
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
   * Get schedule info for health endpoint
   */
  getScheduleInfo(): {
    currentPhase: 'build' | 'break';
    minutesIntoPhase: number;
    minutesRemaining: number;
    nextSwitch: string;
  } {
    const minutesIntoCycle = this.getMinutesIntoCycle();

    if (minutesIntoCycle < BUILD_DURATION_MINS) {
      // In BUILD phase
      const minutesRemaining = BUILD_DURATION_MINS - minutesIntoCycle;
      return {
        currentPhase: 'build',
        minutesIntoPhase: minutesIntoCycle,
        minutesRemaining,
        nextSwitch: `${minutesRemaining}min until break`,
      };
    } else {
      // In BREAK phase
      const minutesIntoBreak = minutesIntoCycle - BUILD_DURATION_MINS;
      const minutesRemaining = BREAK_DURATION_MINS - minutesIntoBreak;
      return {
        currentPhase: 'break',
        minutesIntoPhase: minutesIntoBreak,
        minutesRemaining,
        nextSwitch: `${minutesRemaining}min until build`,
      };
    }
  }

  /**
   * Get minutes into current 3-hour cycle
   */
  private getMinutesIntoCycle(): number {
    const elapsedMs = Date.now() - this.cycleStartTime;
    const elapsedMins = Math.floor(elapsedMs / (60 * 1000));
    return elapsedMins % CYCLE_DURATION_MINS;
  }

  /**
   * Determine which scene based on time
   *
   * 0-120 min: BUILD (/watch)
   * 120-180 min: BREAK (/vj)
   */
  private determineScene(): StreamScene {
    const minutesIntoCycle = this.getMinutesIntoCycle();

    if (minutesIntoCycle < BUILD_DURATION_MINS) {
      return 'watch'; // BUILD phase (first 2 hours)
    } else {
      return 'vj'; // BREAK phase (third hour)
    }
  }

  /**
   * Check time and switch scenes if needed
   */
  private async checkAndSwitch(): Promise<void> {
    if (this.isNavigating || !this.page) return;

    const targetScene = this.determineScene();
    const scheduleInfo = this.getScheduleInfo();

    // Log current phase every check
    console.log(`[director] Phase: ${scheduleInfo.currentPhase.toUpperCase()} | ${scheduleInfo.nextSwitch}`);

    if (targetScene !== this.currentScene) {
      await this.switchScene(targetScene);
    }
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

      console.log(`[director] ========================================`);
      console.log(`[director] SWITCHING: ${previousScene.toUpperCase()} -> ${scene.toUpperCase()}`);
      console.log(`[director] URL: ${url}`);
      console.log(`[director] ========================================`);

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
      console.log(`[director] Now showing: ${scene.toUpperCase()}`);
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
    console.log(`[director] Manual override: forcing ${scene.toUpperCase()}`);
    await this.switchScene(scene);
  }

  /**
   * Reset cycle timer (starts fresh 3-hour cycle)
   */
  resetCycle(): void {
    this.cycleStartTime = Date.now();
    console.log('[director] Cycle reset - starting fresh BUILD phase');
  }
}
