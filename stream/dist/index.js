/**
 * Stream service HTTP server
 * Provides health endpoint and control API
 */
import { createServer } from 'http';
import { Streamer } from './streamer.js';
import 'dotenv/config';
// Configuration from environment
const PORT = parseInt(process.env.PORT || '3002', 10);
const WATCH_URL = process.env.WATCH_URL || 'https://claudecode.wtf/watch?lite=1';
const VJ_URL = process.env.VJ_URL || 'https://claudecode.wtf/vj?engine=hydra&mode=auto&hideUI=true';
const BRAIN_URL = process.env.BRAIN_URL || 'https://brain.claudecode.wtf';
const YOUTUBE_AUDIO_URL = process.env.YOUTUBE_AUDIO_URL || 'https://www.youtube.com/watch?v=jfKfPfyJRdk';
const STREAM_WIDTH = parseInt(process.env.STREAM_WIDTH || '1280', 10);
const STREAM_HEIGHT = parseInt(process.env.STREAM_HEIGHT || '720', 10);
const STREAM_FPS = parseInt(process.env.STREAM_FPS || '30', 10);
const STREAM_BITRATE = process.env.STREAM_BITRATE || '2500k';
// Create streamer
const streamerConfig = {
    watchUrl: WATCH_URL,
    vjUrl: VJ_URL,
    brainUrl: BRAIN_URL,
    youtubeAudioUrl: YOUTUBE_AUDIO_URL,
    width: STREAM_WIDTH,
    height: STREAM_HEIGHT,
    fps: STREAM_FPS,
    bitrate: STREAM_BITRATE,
    jpegQuality: 80,
    maxRestarts: 10,
    restartDelayMs: 5000,
};
const streamer = new Streamer(streamerConfig);
// Event logging
streamer.on('stateChange', (newState, oldState) => {
    console.log(`[server] Stream state: ${oldState} -> ${newState}`);
});
streamer.on('restarted', (count) => {
    console.log(`[server] Stream restarted (attempt ${count})`);
});
streamer.on('maxRestartsReached', () => {
    console.error('[server] Stream failed permanently - max restarts reached');
});
// HTTP request handler
function handleRequest(req, res) {
    const url = req.url || '/';
    const method = req.method || 'GET';
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Content-Type', 'application/json');
    // Handle OPTIONS (CORS preflight)
    if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    // Route: GET /health
    if (url === '/health' && method === 'GET') {
        const stats = streamer.getStats();
        const memUsage = process.memoryUsage();
        const health = {
            status: 'ok',
            service: 'ccwtf-stream',
            stream: {
                state: stats.state,
                currentScene: stats.currentScene,
                frameCount: stats.frameCount,
                uptimeMs: stats.uptime,
                uptimeFormatted: formatUptime(stats.uptime),
                restarts: stats.restarts,
                destinations: stats.destinations,
                lastError: stats.lastError,
            },
            config: {
                watchUrl: WATCH_URL,
                vjUrl: VJ_URL,
                brainUrl: BRAIN_URL,
                resolution: `${STREAM_WIDTH}x${STREAM_HEIGHT}`,
                fps: STREAM_FPS,
                bitrate: STREAM_BITRATE,
            },
            memory: {
                heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
                heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
                rssMB: Math.round(memUsage.rss / 1024 / 1024),
            },
            timestamp: new Date().toISOString(),
        };
        res.writeHead(200);
        res.end(JSON.stringify(health, null, 2));
        return;
    }
    // Route: POST /start
    if (url === '/start' && method === 'POST') {
        if (streamer.getState() === 'streaming') {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Stream already running' }));
            return;
        }
        streamer.start()
            .then(() => {
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, message: 'Stream started' }));
        })
            .catch((error) => {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
        });
        return;
    }
    // Route: POST /stop
    if (url === '/stop' && method === 'POST') {
        if (streamer.getState() === 'stopped') {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Stream already stopped' }));
            return;
        }
        streamer.stop()
            .then(() => {
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, message: 'Stream stopped' }));
        })
            .catch((error) => {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
        });
        return;
    }
    // Route: GET /status (alias for health)
    if (url === '/status' && method === 'GET') {
        const stats = streamer.getStats();
        res.writeHead(200);
        res.end(JSON.stringify({
            state: stats.state,
            currentScene: stats.currentScene,
            frameCount: stats.frameCount,
            uptime: stats.uptime,
            restarts: stats.restarts,
            destinations: stats.destinations,
        }));
        return;
    }
    // 404 for unknown routes
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
}
function formatUptime(ms) {
    if (ms === 0)
        return '0s';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0)
        return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0)
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0)
        return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}
// Create and start server
const server = createServer(handleRequest);
server.listen(PORT, () => {
    console.log(`[server] Stream service listening on port ${PORT}`);
    console.log(`[server] Health endpoint: http://localhost:${PORT}/health`);
    console.log(`[server] Config: ${STREAM_WIDTH}x${STREAM_HEIGHT}@${STREAM_FPS}fps, ${STREAM_BITRATE}`);
    console.log(`[server] Watch URL: ${WATCH_URL}`);
    // Auto-start stream on container launch
    console.log('[server] Auto-starting stream...');
    streamer.start().catch((error) => {
        console.error('[server] Failed to auto-start stream:', error.message);
        console.log('[server] Use POST /start to retry manually');
    });
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[server] Received SIGTERM, shutting down...');
    await streamer.stop();
    server.close(() => {
        console.log('[server] Server closed');
        process.exit(0);
    });
});
process.on('SIGINT', async () => {
    console.log('[server] Received SIGINT, shutting down...');
    await streamer.stop();
    server.close(() => {
        console.log('[server] Server closed');
        process.exit(0);
    });
});
//# sourceMappingURL=index.js.map