# Docker Container Management

> **RULE #4: DOCKER-FIRST ARCHITECTURE**

---

## The Rule

```
1. DEFAULT: All new services MUST run in Docker
2. EXCEPTION: Only if service requires:
   - GPU access (Metal, CUDA, etc.)
   - Display/screen capture (CDP, avfoundation)
   - Hardware audio (system audio capture)
   - Native macOS APIs that don't work in containers
3. JUSTIFY: Any host service must document WHY it can't be containerized
```

**Philosophy:** Everything that CAN run in a container SHOULD run in a container. Docker provides isolation, reproducibility, and easier deployment. Only services with hardware requirements that CANNOT be containerized should run on host.

---

## Service Matrix

### Services in Docker (CORRECT)

| Service | Container | Port | Why Docker Works |
|---------|-----------|------|------------------|
| **Brain** | `ccwtf-brain` | 3001 | CPU/RAM/Network only - no hardware deps |

### Services on Host (NECESSARY - can't be containerized)

| Service | Process | Port | Why Docker Fails |
|---------|---------|------|------------------|
| **Stream** | Native Node.js | 3002 | Chrome CDP needs display, Metal GPU for VideoToolbox H.264, system audio capture |
| **Cloudflare Tunnel** | LaunchAgent | - | Simple binary, runs as LaunchAgent (could technically containerize but no benefit) |

### External Services (Cloudflare - not on Mac Mini)

| Service | Type | URL |
|---------|------|-----|
| **Frontend** | Cloudflare Pages | https://claudecode.wtf |
| **Worker API** | Cloudflare Workers | https://ccwtf-api.aklo.workers.dev |

---

## Hardware Exception Criteria

A service MUST run on host (not Docker) only if it requires:

| Requirement | Example | Why Docker Fails |
|-------------|---------|------------------|
| **GPU Access** | VideoToolbox H.264 encoding | macOS Metal not exposed to containers |
| **Display Capture** | Chrome CDP screencast | No display server in container |
| **Window Management** | AppleScript window IDs | macOS WindowServer not available |
| **System Audio** | avfoundation audio capture | Audio devices not passed through |
| **Hardware Peripherals** | USB, Bluetooth | Requires privileged mode + device mapping |

If your service doesn't need any of the above, it MUST go in Docker.

---

## Docker Commands Reference

### Container Management

```bash
# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# Start/stop/restart
docker compose up -d brain         # Start brain
docker compose stop brain          # Stop brain
docker compose restart brain       # Restart brain

# Rebuild after code changes
docker compose build brain
docker compose up -d brain

# Full rebuild (no cache)
docker compose build --no-cache brain
```

### Logs & Debugging

```bash
# View logs (follow mode)
docker logs ccwtf-brain -f

# View last 100 lines
docker logs ccwtf-brain --tail 100

# View logs with timestamps
docker logs ccwtf-brain -t

# Execute shell in container
docker exec -it ccwtf-brain sh

# Check container health
docker inspect ccwtf-brain --format='{{.State.Health.Status}}'
```

### Cleanup

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes (CAREFUL - data loss!)
docker volume prune

# Nuclear option - remove everything unused
docker system prune -a
```

---

## Adding New Services Checklist

When adding a new service, follow this decision tree:

```
Does the service need GPU access?
├─ YES → Run on HOST
└─ NO → Continue...

Does the service need display/screen capture?
├─ YES → Run on HOST
└─ NO → Continue...

Does the service need system audio?
├─ YES → Run on HOST
└─ NO → Continue...

Does the service need native macOS APIs (AppleScript, etc.)?
├─ YES → Run on HOST
└─ NO → PUT IT IN DOCKER
```

### Adding to Docker

1. Create `Dockerfile` in service directory
2. Add service to `docker-compose.yml`
3. Configure ports, volumes, env_file
4. Add healthcheck
5. Test with `docker compose up -d`
6. Document in this file

### Adding to Host (with justification)

1. Create LaunchAgent plist (for auto-start)
2. Document in `docker-compose.yml` comments (see stream example)
3. Document WHY it can't be containerized in this file
4. Add to "Services on Host" table above

---

## Current Container: Brain

The Central Brain runs in Docker because it only needs:
- CPU for running Claude Agent SDK
- RAM for Node.js process
- Network for HTTP/WebSocket server
- File access (mounted volumes)

None of these require hardware access.

### docker-compose.yml Configuration

```yaml
services:
  brain:
    build:
      context: ./brain
      dockerfile: Dockerfile
    container_name: ccwtf-brain
    restart: unless-stopped
    ports:
      - "127.0.0.1:3001:3001"
    env_file:
      - ./brain/.env
    volumes:
      - ./brain/recordings:/app/recordings
      - /Users/claude/.local/bin:/Users/claude/.local/bin:ro
      - /Users/claude/.local/share/claude:/Users/claude/.local/share/claude:ro
      - /Users/claude/.nvm:/Users/claude/.nvm:ro
      - /Users/claude/ccwtf:/Users/claude/ccwtf
      - /Users/claude/.gitconfig:/Users/claude/.gitconfig:ro
      - /Users/claude/.config/solana:/data/wallet:ro
    healthcheck:
      test: ["CMD", "node", "-e", "..."]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Key Volume Mounts

| Mount | Purpose |
|-------|---------|
| `./brain/recordings` | Video recordings persist across restarts |
| `/Users/claude/.local/bin` | Claude CLI binary access |
| `/Users/claude/.nvm` | Node.js version manager |
| `/Users/claude/ccwtf` | Project files for Claude to modify |
| `/Users/claude/.gitconfig` | Git authentication |
| `/Users/claude/.config/solana` | Solana wallet for GameFi |

---

## Current Host Service: Stream

The Stream service MUST run on host because it requires:

1. **Chrome CDP with Display** - Screencast API needs a window to capture
2. **Metal GPU** - VideoToolbox hardware H.264 encoding
3. **System Audio** - avfoundation audio capture from system output

### Why Docker Fails for Stream

```
Docker on macOS:
├─ No display server (X11/Wayland)
├─ No Metal GPU passthrough
├─ No audio device access
└─ No window management APIs
```

### How Stream Runs

```bash
# Manual start
cd stream && CAPTURE_MODE=window npm run start

# Or via LaunchAgent (auto-start on boot)
# ~/Library/LaunchAgents/com.ccwtf.stream.plist
```

---

## Troubleshooting

### Container won't start

```bash
# Check logs for errors
docker logs ccwtf-brain

# Check if port is in use
lsof -i :3001

# Rebuild from scratch
docker compose down
docker compose build --no-cache brain
docker compose up -d brain
```

### Container keeps restarting

```bash
# Check health status
docker inspect ccwtf-brain --format='{{json .State.Health}}'

# Check restart count
docker inspect ccwtf-brain --format='{{.RestartCount}}'

# View events
docker events --filter container=ccwtf-brain
```

### Volume permission issues

```bash
# Check volume mounts
docker inspect ccwtf-brain --format='{{json .Mounts}}'

# Fix permissions (if needed)
chmod 755 /path/to/volume
```

### Network issues

```bash
# Check network exists
docker network ls | grep llphant

# Create if missing
docker network create llphant

# Check container is on network
docker network inspect llphant
```

### Out of disk space

```bash
# Check Docker disk usage
docker system df

# Clean up
docker system prune -a
```

---

## Why Docker-First?

1. **Isolation** - Services can't interfere with each other
2. **Reproducibility** - Same environment everywhere
3. **Easy deployment** - `docker compose up -d` just works
4. **Resource limits** - CPU/memory constraints per service
5. **Health checks** - Automatic restart on failure
6. **Rollback** - Easy to revert to previous image

The only exception is when hardware access makes Docker impossible.
