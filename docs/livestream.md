# 24/7 Livestream Service

> Native Mac Mini streaming - streams `/watch` and `/vj` pages to Twitter/X + YouTube with full GPU acceleration

---

## Architecture

```
Chrome (Metal GPU)  →  CDP Screencast  →  FFmpeg (libx264)  →  tee muxer
      ↓                     ↓                    ↓                  ↓
  /watch or /vj      JPEG frames @30fps    H.264 software    Twitter + YouTube
```

### Multi-Platform Streaming

The stream uses FFmpeg's `tee` muxer to simultaneously broadcast to multiple RTMP destinations:

```
                                    ┌─→ [f=flv] Twitter (PRIMARY)
Chrome CDP → libx264 4000k → tee ──┤
                                    └─→ [f=flv] YouTube (ACTIVE)
```

| Platform | URL | Stream Key Env Var | Status |
|----------|-----|-------------------|--------|
| **Twitter/X** | `rtmp://de.pscp.tv:80/x/` | `RTMP_TWITTER_KEY` | ✅ PRIMARY |
| **YouTube** | `rtmp://x.rtmp.youtube.com/live2/` | `RTMP_YOUTUBE_KEY` | ✅ ACTIVE |
| **Kick** | `rtmp://127.0.0.1:1936/app/` (via stunnel) | `RTMP_KICK_KEY` | ✅ ACTIVE |

### Live Stream URLs

- **Twitter/X:** https://x.com/ClaudeCodeWTF (always live)
- **YouTube:** https://www.youtube.com/live/JdSyXwI-DGw
- **Kick:** https://kick.com/pxpwtf

### Kick Stunnel Proxy

Kick requires RTMPS but macOS SecureTransport has TLS issues (-9806). We use stunnel to proxy:

```
FFmpeg (RTMP) → localhost:1936 → stunnel → Kick RTMPS (443)
```

**Files:**
- Config: `stream/kick-stunnel.conf`
- LaunchAgent: `~/Library/LaunchAgents/com.kick.stunnel.plist` (auto-starts on boot)

**Manual control:**
```bash
# Check if running
pgrep -f stunnel

# Restart
pkill -f stunnel && stunnel ~/ccwtf/stream/kick-stunnel.conf
```

---

## 24/7 Failsafes

The stream is designed to run indefinitely without manual intervention:

### 1. launchd Service
- Auto-starts on boot
- Auto-restarts on crash
- 10-second throttle between restarts

### 2. YouTube URL Auto-Refresh
- YouTube HLS URLs expire after ~6 hours
- System checks URL TTL every 30 minutes
- Triggers restart with fresh URL if <1 hour remaining
- Falls back to local lofi audio if YouTube fails

### 3. Watchdog Timer
- Checks for frames every 30 seconds
- Forces restart if no frames for 60 seconds

### 4. Health Monitoring
- 3-minute comprehensive health checks
- Validates FFmpeg, CDP, and RTMP status
- Auto-restart on any failure

### 5. CDP Page Recovery
- Detects empty/crashed pages
- Auto-refresh after 5 consecutive empty checks
- 2-minute periodic page refresh to pick up deployments

---

## Components

### Capture

Chrome's native CDP `Page.startScreencast` API:
- Captures ONLY the Chrome window (macOS Space switches don't disrupt!)
- Uses requestAnimationFrame injection to force continuous frame delivery
- Push-based frame delivery at ~30fps

### Encoding

libx264 software H.264 (YouTube-compatible):
- 720p @ 30fps
- 4000kbps video (maxrate 6000k, bufsize 12000k)
- 128kbps AAC audio
- Preset: `veryfast`, Tune: `zerolatency`
- Profile: `high`, Level: `4.1`

**Note:** VideoToolbox hardware encoding doesn't work reliably with YouTube's RTMP ingest. Using libx264 software encoding ensures compatibility with all platforms.

### Audio

YouTube lofi hip hop radio via yt-dlp:
- **Primary:** `https://www.youtube.com/watch?v=jfKfPfyJRdk`
- **Fallback:** `lofi-fallback.mp3` (Chad Crouch "Shipping Lanes", CC BY-NC)
- **Auto-refresh:** URLs refreshed every 4 hours (before 6hr expiry)

### Director

Time-based scene switching:
- 2h BUILD phase → /watch
- 1h BREAK phase → /vj (Hydra auto mode)

### GPU

Chrome with `--use-angle=metal` for WebGL/VJ visuals

---

## Service Management

**Manage with the helper script:**

```bash
cd ~/ccwtf/stream

# Install and start (first time)
./stream-service.sh install

# Check status
./stream-service.sh status

# View logs
./stream-service.sh logs

# Restart
./stream-service.sh restart

# Stop
./stream-service.sh stop

# Uninstall
./stream-service.sh uninstall
```

**Manual launchd commands:**

```bash
# Load (start)
launchctl load ~/Library/LaunchAgents/com.ccwtf.stream.plist

# Unload (stop)
launchctl unload ~/Library/LaunchAgents/com.ccwtf.stream.plist
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Full health status with architecture info |
| `/status` | GET | Quick status check |
| `/start` | POST | Start stream |
| `/stop` | POST | Stop stream |
| `/scene` | POST | Switch scene (`{"scene": "watch" \| "vj"}`) |
| `/restart-capture` | POST | Hot-swap Chrome without dropping RTMP |
| `/refresh` | POST | Force page refresh to pick up deployments |

### Health Response Example

```json
{
  "status": "ok",
  "service": "ccwtf-stream",
  "stream": {
    "state": "streaming",
    "currentScene": "watch",
    "frameCount": 123456,
    "uptimeMs": 3600000,
    "uptimeFormatted": "1h 0m 0s",
    "restarts": 0,
    "destinations": ["YouTube", "Twitter"],
    "lastError": null,
    "audioSource": "youtube",
    "youtubeUrlTtlFormatted": "3h 45m 30s"
  },
  "schedule": {
    "currentPhase": "build",
    "minutesIntoPhase": 45,
    "minutesRemaining": 75,
    "nextSwitch": "75min until break",
    "pattern": "2h BUILD → 1h BREAK → repeat"
  }
}
```

---

## Key Files

| File | Purpose |
|------|---------|
| `stream/src/index.ts` | HTTP server (port 3002) + control API |
| `stream/src/streamer.ts` | Orchestrator with auto-restart, watchdog, health checks |
| `stream/src/cdp-capture.ts` | CDP screencast with rAF animation trigger |
| `stream/src/ffmpeg-pipeline.ts` | VideoToolbox H.264 encoding |
| `stream/src/youtube-audio.ts` | YouTube lofi stream URL fetcher with TTL cache |
| `stream/src/director.ts` | Time-based scene switching |
| `stream/src/destinations.ts` | RTMP config loader |
| `stream/lofi-fallback.mp3` | Fallback audio (Chad Crouch "Shipping Lanes", CC) |
| `stream/com.ccwtf.stream.plist` | launchd plist for auto-start |
| `stream/stream-service.sh` | Service management script |
| `stream/.env` | RTMP keys (gitignored) |

---

## Troubleshooting

### Stream not starting

1. Check if launchd is loaded: `launchctl list | grep ccwtf`
2. Check logs: `tail -f ~/ccwtf/stream/stream.log`
3. Verify RTMP keys in `.env`
4. Try manual start: `cd ~/ccwtf/stream && node dist/index.js`

### Audio issues

1. Check if yt-dlp is installed: `which yt-dlp`
2. Test YouTube URL fetch: `yt-dlp -f 91 -g "https://www.youtube.com/watch?v=jfKfPfyJRdk"`
3. Verify `lofi-fallback.mp3` exists

### No frames / stalled

1. Kill stale Chrome: `pkill -f "Google Chrome.*--kiosk"`
2. Restart service: `./stream-service.sh restart`
3. Check Chrome errors in logs

### RTMP connection failures

1. Verify stream key in `.env`
2. Check if platform stream is active
3. Try different RTMP server (Twitter has multiple)
