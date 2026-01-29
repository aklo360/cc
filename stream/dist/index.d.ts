/**
 * Stream service HTTP server for Native Mac Mini
 *
 * Architecture:
 * - Chrome CDP screencast → FFmpeg VideoToolbox → RTMP
 * - YouTube lofi audio (residential IP works)
 * - Director switches /watch ↔ /vj on schedule
 * - Auto-restart on failure with health monitoring
 *
 * Endpoints:
 * - GET /health - Full health status
 * - GET /status - Quick status
 * - POST /start - Start stream
 * - POST /stop - Stop stream
 * - POST /scene - Switch scene ({"scene": "watch" | "vj"})
 * - POST /restart-capture - Hot-swap Chrome without dropping RTMP
 */
import 'dotenv/config';
//# sourceMappingURL=index.d.ts.map