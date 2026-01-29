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
    pollInterval: number;
}
type StreamScene = 'watch' | 'vj';
export declare class Director {
    private config;
    private page;
    private currentScene;
    private pollTimer;
    private isNavigating;
    private cycleStartTime;
    constructor(config: DirectorConfig);
    /**
     * Start directing - attach to browser page and begin time-based scheduling
     */
    start(page: Page): void;
    /**
     * Stop directing
     */
    stop(): void;
    /**
     * Get current scene
     */
    getScene(): StreamScene;
    /**
     * Get schedule info for health endpoint
     */
    getScheduleInfo(): {
        currentPhase: 'build' | 'break';
        minutesIntoPhase: number;
        minutesRemaining: number;
        nextSwitch: string;
    };
    /**
     * Get minutes into current 3-hour cycle
     */
    private getMinutesIntoCycle;
    /**
     * Determine which scene based on time
     *
     * 0-120 min: BUILD (/watch)
     * 120-180 min: BREAK (/vj)
     */
    private determineScene;
    /**
     * Check time and switch scenes if needed
     */
    private checkAndSwitch;
    /**
     * Switch to a new scene
     */
    private switchScene;
    /**
     * Force switch to a specific scene (manual override)
     */
    forceScene(scene: StreamScene): Promise<void>;
    /**
     * Reset cycle timer (starts fresh 3-hour cycle)
     */
    resetCycle(): void;
}
export {};
//# sourceMappingURL=director.d.ts.map