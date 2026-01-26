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
    pollInterval: number;
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
export declare class Director {
    private config;
    private page;
    private currentScene;
    private pollTimer;
    private isNavigating;
    constructor(config: DirectorConfig);
    /**
     * Start directing - attach to browser page and begin polling
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
     * Check brain status and switch scenes if needed
     */
    private checkAndSwitch;
    /**
     * Fetch brain status from API
     */
    private fetchBrainStatus;
    /**
     * Determine which scene to show based on brain status
     */
    private determineScene;
    /**
     * Switch to a new scene
     */
    private switchScene;
    /**
     * Force switch to a specific scene (manual override)
     */
    forceScene(scene: StreamScene): Promise<void>;
}
export {};
//# sourceMappingURL=director.d.ts.map