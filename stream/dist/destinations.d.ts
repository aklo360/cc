/**
 * RTMP destination configuration
 * Loads from environment variables and builds FFmpeg tee muxer output string
 */
export interface RtmpDestination {
    name: string;
    url: string;
    key: string;
    enabled: boolean;
}
export interface DestinationConfig {
    destinations: RtmpDestination[];
    teeOutput: string;
}
/**
 * Load RTMP destinations from environment variables
 */
export declare function loadDestinations(): DestinationConfig;
/**
 * Get human-readable list of enabled destinations
 */
export declare function getDestinationNames(config: DestinationConfig): string[];
//# sourceMappingURL=destinations.d.ts.map