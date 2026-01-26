/**
 * YouTube audio stream URL fetcher
 * Uses yt-dlp to get the live stream URL, which FFmpeg can consume directly
 */
/**
 * Get the live stream URL for YouTube lofi radio
 * Returns the m3u8 URL that FFmpeg can stream directly
 */
export declare function getYouTubeAudioUrl(): Promise<string | null>;
/**
 * Refresh the stream URL (YouTube URLs expire after a few hours)
 * Call this periodically to keep the stream alive
 */
export declare function refreshYouTubeUrl(): Promise<string | null>;
//# sourceMappingURL=youtube-audio.d.ts.map