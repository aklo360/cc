/**
 * YouTube audio stream URL fetcher
 * Uses yt-dlp to get the live stream URL, which FFmpeg can consume directly
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const LOFI_STREAM_URL = 'https://www.youtube.com/watch?v=jfKfPfyJRdk';

/**
 * Get the live stream URL for YouTube lofi radio
 * Returns the m3u8 URL that FFmpeg can stream directly
 */
export async function getYouTubeAudioUrl(): Promise<string | null> {
  try {
    console.log('[youtube-audio] Fetching stream URL from YouTube...');

    // Use format 91 (lowest quality with audio) - less bandwidth, still good audio
    const { stdout, stderr } = await execAsync(
      `yt-dlp -f 91 -g "${LOFI_STREAM_URL}"`,
      { timeout: 30000 }
    );

    const url = stdout.trim();

    if (!url || !url.startsWith('http')) {
      console.error('[youtube-audio] Invalid URL returned:', url);
      if (stderr) console.error('[youtube-audio] stderr:', stderr);
      return null;
    }

    console.log('[youtube-audio] Got stream URL successfully');
    return url;
  } catch (error) {
    console.error('[youtube-audio] Failed to get stream URL:', (error as Error).message);
    return null;
  }
}

/**
 * Refresh the stream URL (YouTube URLs expire after a few hours)
 * Call this periodically to keep the stream alive
 */
export async function refreshYouTubeUrl(): Promise<string | null> {
  return getYouTubeAudioUrl();
}
