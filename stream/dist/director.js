/**
 * Stream Director - Orchestrates what the stream shows based on brain state
 *
 * - Active cycle: Show /watch page (build logs)
 * - Cooldown: Show /vj page (Three.js branded visuals)
 */
export class Director {
    config;
    page = null;
    currentScene = 'watch';
    pollTimer = null;
    isNavigating = false;
    constructor(config) {
        this.config = config;
    }
    /**
     * Start directing - attach to browser page and begin polling
     */
    start(page) {
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
    stop() {
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
    getScene() {
        return this.currentScene;
    }
    /**
     * Check brain status and switch scenes if needed
     */
    async checkAndSwitch() {
        if (this.isNavigating || !this.page)
            return;
        try {
            const status = await this.fetchBrainStatus();
            const targetScene = this.determineScene(status);
            if (targetScene !== this.currentScene) {
                await this.switchScene(targetScene);
            }
        }
        catch (error) {
            // Brain might be down - stay on current scene
            console.error('[director] Failed to check brain status:', error);
        }
    }
    /**
     * Fetch brain status from API
     */
    async fetchBrainStatus() {
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
     *
     * Show /watch when:
     * - Brain is building (active cycle)
     * - Brain is generating memes (in_progress)
     *
     * Show /vj when:
     * - Brain is resting (cooldown, no active work)
     * - Brain is idle
     */
    determineScene(status) {
        // Show /watch if actively building
        if (status.mode === 'building') {
            return 'watch';
        }
        // Show /watch if generating memes
        if (status.memes?.in_progress) {
            return 'watch';
        }
        // Otherwise show VJ (resting or idle)
        return 'vj';
    }
    /**
     * Switch to a new scene
     */
    async switchScene(scene) {
        if (!this.page || this.isNavigating)
            return;
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
        }
        catch (error) {
            console.error(`[director] Failed to switch to ${scene}:`, error);
        }
        finally {
            this.isNavigating = false;
        }
    }
    /**
     * Force switch to a specific scene (manual override)
     */
    async forceScene(scene) {
        await this.switchScene(scene);
    }
}
//# sourceMappingURL=director.js.map