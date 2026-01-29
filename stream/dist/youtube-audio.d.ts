/**
 * YouTube audio stream URL fetcher with auto-refresh
 *
 * YouTube HLS URLs expire after ~6 hours. This module:
 * - Fetches fresh URLs using yt-dlp
 * - Caches URLs with TTL tracking
 * - Auto-refreshes before expiry
 * - Provides fallback to local audio
 */
/**
 * Get the live stream URL for YouTube lofi radio
 * Returns cached URL if still valid, otherwise fetches fresh
 */
export declare function getYouTubeAudioUrl(): Promise<string | null>;
/**
 * Force fetch a fresh URL (bypass cache)
 */
export declare function refreshYouTubeUrl(): Promise<string | null>;
/**
 * Check if the current URL is expired or about to expire
 */
export declare function isUrlExpiringSoon(thresholdMs?: number): boolean;
/**
 * Get time until URL expires (ms), or 0 if no cached URL
 */
export declare function getUrlTtl(): number;
/**
 * Clear the cached URL
 */
export declare function clearCache(): void;
//# sourceMappingURL=youtube-audio.d.ts.map