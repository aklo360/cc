/**
 * YouTube audio URL fetcher using yt-dlp
 * Extracts direct audio stream URL from YouTube live streams
 * URLs expire after ~6 hours, so we refresh periodically
 */
/**
 * Fetch audio stream URL from YouTube using yt-dlp
 */
export declare function fetchAudioUrl(youtubeUrl: string): Promise<string>;
/**
 * Get audio URL with caching
 * Returns cached URL if still valid, otherwise fetches a new one
 */
export declare function getAudioUrl(youtubeUrl: string): Promise<string>;
/**
 * Clear the cached URL (force refresh on next call)
 */
export declare function clearAudioCache(): void;
/**
 * Check if we have a valid cached URL
 */
export declare function hasValidCache(): boolean;
//# sourceMappingURL=youtube-audio.d.ts.map