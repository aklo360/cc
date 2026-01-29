#!/bin/bash
#
# Stream Service Manager
# Manages the ccwtf-stream launchd service for 24/7 operation
#
# Usage:
#   ./stream-service.sh install   - Install and start the service
#   ./stream-service.sh start     - Start the service
#   ./stream-service.sh stop      - Stop the service
#   ./stream-service.sh restart   - Restart the service
#   ./stream-service.sh status    - Check service status
#   ./stream-service.sh logs      - Tail the logs
#   ./stream-service.sh uninstall - Stop and remove the service
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLIST_NAME="com.ccwtf.stream"
PLIST_SRC="$SCRIPT_DIR/$PLIST_NAME.plist"
PLIST_DST="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"
LOG_FILE="$SCRIPT_DIR/stream.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_plist() {
    if [ ! -f "$PLIST_SRC" ]; then
        log_error "Plist file not found: $PLIST_SRC"
        exit 1
    fi
}

install_service() {
    check_plist

    # Create LaunchAgents directory if needed
    mkdir -p "$HOME/Library/LaunchAgents"

    # Stop existing service if running
    if launchctl list | grep -q "$PLIST_NAME"; then
        log_info "Stopping existing service..."
        launchctl unload "$PLIST_DST" 2>/dev/null || true
    fi

    # Copy plist
    log_info "Installing plist to $PLIST_DST..."
    cp "$PLIST_SRC" "$PLIST_DST"

    # Load and start
    log_info "Loading and starting service..."
    launchctl load "$PLIST_DST"

    sleep 2

    if launchctl list | grep -q "$PLIST_NAME"; then
        log_info "Service installed and running!"
        log_info "Logs: $LOG_FILE"
    else
        log_error "Service failed to start. Check logs: $LOG_FILE"
        exit 1
    fi
}

start_service() {
    if ! [ -f "$PLIST_DST" ]; then
        log_error "Service not installed. Run: $0 install"
        exit 1
    fi

    if launchctl list | grep -q "$PLIST_NAME"; then
        log_warn "Service already running"
    else
        log_info "Starting service..."
        launchctl load "$PLIST_DST"
        sleep 2
        log_info "Service started"
    fi
}

stop_service() {
    if launchctl list | grep -q "$PLIST_NAME"; then
        log_info "Stopping service..."
        launchctl unload "$PLIST_DST" 2>/dev/null || true

        # Kill any lingering processes
        pkill -f "node.*stream/dist/index.js" 2>/dev/null || true
        pkill -f "ffmpeg.*tee.*rtmp" 2>/dev/null || true
        pkill -f "Google Chrome.*--kiosk" 2>/dev/null || true

        log_info "Service stopped"
    else
        log_warn "Service not running"
    fi
}

restart_service() {
    log_info "Restarting service..."
    stop_service
    sleep 3
    start_service
}

status_service() {
    echo ""
    echo "=== Stream Service Status ==="
    echo ""

    if launchctl list | grep -q "$PLIST_NAME"; then
        echo -e "LaunchAgent: ${GREEN}LOADED${NC}"
    else
        echo -e "LaunchAgent: ${RED}NOT LOADED${NC}"
    fi

    if pgrep -f "node.*stream/dist/index.js" > /dev/null; then
        PID=$(pgrep -f "node.*stream/dist/index.js")
        echo -e "Node Process: ${GREEN}RUNNING${NC} (PID: $PID)"
    else
        echo -e "Node Process: ${RED}NOT RUNNING${NC}"
    fi

    if pgrep -f "ffmpeg.*tee" > /dev/null; then
        PID=$(pgrep -f "ffmpeg.*tee")
        echo -e "FFmpeg: ${GREEN}RUNNING${NC} (PID: $PID)"
    else
        echo -e "FFmpeg: ${YELLOW}NOT RUNNING${NC}"
    fi

    if pgrep -f "Google Chrome.*--kiosk" > /dev/null; then
        echo -e "Chrome: ${GREEN}RUNNING${NC}"
    else
        echo -e "Chrome: ${YELLOW}NOT RUNNING${NC}"
    fi

    echo ""

    # Try to get health from API
    if curl -s http://localhost:3002/health > /dev/null 2>&1; then
        echo "=== API Health ==="
        curl -s http://localhost:3002/health | head -30
        echo ""
    fi
}

logs_service() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        log_error "Log file not found: $LOG_FILE"
        exit 1
    fi
}

uninstall_service() {
    stop_service

    if [ -f "$PLIST_DST" ]; then
        log_info "Removing plist..."
        rm "$PLIST_DST"
    fi

    log_info "Service uninstalled"
}

# Main
case "$1" in
    install)
        install_service
        ;;
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        restart_service
        ;;
    status)
        status_service
        ;;
    logs)
        logs_service
        ;;
    uninstall)
        uninstall_service
        ;;
    *)
        echo "Usage: $0 {install|start|stop|restart|status|logs|uninstall}"
        exit 1
        ;;
esac
