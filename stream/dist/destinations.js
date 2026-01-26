/**
 * RTMP destination configuration
 * Loads from environment variables and builds FFmpeg tee muxer output string
 */
/**
 * Load RTMP destinations from environment variables
 */
export function loadDestinations() {
    const destinations = [];
    // Kick
    const kickUrl = process.env.RTMP_KICK_URL || '';
    const kickKey = process.env.RTMP_KICK_KEY || '';
    if (kickUrl && kickKey) {
        destinations.push({
            name: 'Kick',
            url: kickUrl,
            key: kickKey,
            enabled: true,
        });
    }
    // YouTube
    const youtubeUrl = process.env.RTMP_YOUTUBE_URL || '';
    const youtubeKey = process.env.RTMP_YOUTUBE_KEY || '';
    if (youtubeUrl && youtubeKey) {
        destinations.push({
            name: 'YouTube',
            url: youtubeUrl,
            key: youtubeKey,
            enabled: true,
        });
    }
    // Twitter/X
    const twitterUrl = process.env.RTMP_TWITTER_URL || '';
    const twitterKey = process.env.RTMP_TWITTER_KEY || '';
    if (twitterUrl && twitterKey) {
        destinations.push({
            name: 'Twitter',
            url: twitterUrl,
            key: twitterKey,
            enabled: true,
        });
    }
    // Build tee muxer output string for FFmpeg
    // Format: "[f=flv]rtmp://url/key|[f=flv]rtmp://url2/key2"
    const teeOutput = destinations
        .filter((d) => d.enabled)
        .map((d) => `[f=flv]${d.url}${d.key}`)
        .join('|');
    return { destinations, teeOutput };
}
/**
 * Get human-readable list of enabled destinations
 */
export function getDestinationNames(config) {
    return config.destinations.filter((d) => d.enabled).map((d) => d.name);
}
//# sourceMappingURL=destinations.js.map