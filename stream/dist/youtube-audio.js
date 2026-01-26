/**
 * YouTube audio URL fetcher using yt-dlp
 * Extracts direct audio stream URL from YouTube live streams
 * URLs expire after ~6 hours, so we refresh periodically
 */
import { spawn } from 'child_process';
import { existsSync } from 'fs';
let cache = null;
// URLs expire after ~6 hours, refresh every 4 hours to be safe
const CACHE_TTL_MS = 4 * 60 * 60 * 1000;
/**
 * Fetch audio stream URL from YouTube using yt-dlp
 */
export async function fetchAudioUrl(youtubeUrl) {
    return new Promise((resolve, reject) => {
        const cookiesPath = process.env.YOUTUBE_COOKIES_PATH || '/app/cookies.txt';
        const hasCookies = existsSync(cookiesPath);
        const args = [
            '-f', 'bestaudio',
            '-g', // Get URL only, don't download
        ];
        // Add cookies if available (bypasses bot detection)
        if (hasCookies) {
            args.push('--cookies', cookiesPath);
            console.log('[audio] Using cookies for authentication');
        }
        else {
            // Try with some workarounds for bot detection
            args.push('--extractor-args', 'youtube:player_client=web');
        }
        args.push(youtubeUrl);
        const proc = spawn('yt-dlp', args);
        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        proc.on('close', (code) => {
            if (code === 0) {
                const url = stdout.trim();
                if (url) {
                    resolve(url);
                }
                else {
                    reject(new Error('yt-dlp returned empty URL'));
                }
            }
            else {
                reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
            }
        });
        proc.on('error', (err) => {
            reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
        });
    });
}
/**
 * Get audio URL with caching
 * Returns cached URL if still valid, otherwise fetches a new one
 */
export async function getAudioUrl(youtubeUrl) {
    const now = Date.now();
    // Check if cached URL is still valid
    if (cache && (now - cache.fetchedAt) < CACHE_TTL_MS) {
        return cache.url;
    }
    // Fetch new URL
    console.log('[audio] Fetching new audio URL from YouTube...');
    const url = await fetchAudioUrl(youtubeUrl);
    cache = {
        url,
        fetchedAt: now,
    };
    console.log('[audio] Got new audio URL (expires in 4 hours)');
    return url;
}
/**
 * Clear the cached URL (force refresh on next call)
 */
export function clearAudioCache() {
    cache = null;
}
/**
 * Check if we have a valid cached URL
 */
export function hasValidCache() {
    if (!cache)
        return false;
    return (Date.now() - cache.fetchedAt) < CACHE_TTL_MS;
}
//# sourceMappingURL=youtube-audio.js.map