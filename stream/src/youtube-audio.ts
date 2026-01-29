/**
 * YouTube audio stream URL fetcher with auto-refresh
 *
 * YouTube HLS URLs expire after ~6 hours. This module:
 * - Fetches fresh URLs using yt-dlp
 * - Caches URLs with TTL tracking
 * - Auto-refreshes before expiry
 * - Provides fallback to local audio
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const LOFI_STREAM_URL = 'https://www.youtube.com/watch?v=jfKfPfyJRdk';

// YouTube URLs expire after ~6 hours, refresh every 4 hours to be safe
const URL_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const URL_FETCH_TIMEOUT = 30000; // 30 seconds

interface CachedUrl {
  url: string;
  fetchedAt: number;
  expiresAt: number;
}

let cachedUrl: CachedUrl | null = null;

/**
 * Get the live stream URL for YouTube lofi radio
 * Returns cached URL if still valid, otherwise fetches fresh
 */
export async function getYouTubeAudioUrl(): Promise<string | null> {
  // Check if cached URL is still valid
  if (cachedUrl && Date.now() < cachedUrl.expiresAt) {
    const remainingMs = cachedUrl.expiresAt - Date.now();
    console.log(`[youtube-audio] Using cached URL (expires in ${Math.round(remainingMs / 1000 / 60)} min)`);
    return cachedUrl.url;
  }

  return fetchFreshUrl();
}

/**
 * Force fetch a fresh URL (bypass cache)
 */
export async function refreshYouTubeUrl(): Promise<string | null> {
  console.log('[youtube-audio] Force refreshing URL...');
  return fetchFreshUrl();
}

/**
 * Check if the current URL is expired or about to expire
 */
export function isUrlExpiringSoon(thresholdMs: number = 30 * 60 * 1000): boolean {
  if (!cachedUrl) return true;
  return Date.now() + thresholdMs > cachedUrl.expiresAt;
}

/**
 * Get time until URL expires (ms), or 0 if no cached URL
 */
export function getUrlTtl(): number {
  if (!cachedUrl) return 0;
  return Math.max(0, cachedUrl.expiresAt - Date.now());
}

/**
 * Clear the cached URL
 */
export function clearCache(): void {
  cachedUrl = null;
}

async function fetchFreshUrl(): Promise<string | null> {
  try {
    console.log('[youtube-audio] Fetching stream URL from YouTube...');

    // Use format 91 (lowest quality with audio) - less bandwidth, still good audio
    const { stdout, stderr } = await execAsync(
      `yt-dlp -f 91 -g "${LOFI_STREAM_URL}"`,
      { timeout: URL_FETCH_TIMEOUT }
    );

    const url = stdout.trim();

    if (!url || !url.startsWith('http')) {
      console.error('[youtube-audio] Invalid URL returned:', url);
      if (stderr) console.error('[youtube-audio] stderr:', stderr);
      return null;
    }

    // Cache the URL with TTL
    const now = Date.now();
    cachedUrl = {
      url,
      fetchedAt: now,
      expiresAt: now + URL_TTL_MS,
    };

    console.log(`[youtube-audio] Got fresh stream URL (valid for ${URL_TTL_MS / 1000 / 60} min)`);
    return url;
  } catch (error) {
    console.error('[youtube-audio] Failed to get stream URL:', (error as Error).message);
    cachedUrl = null;
    return null;
  }
}
