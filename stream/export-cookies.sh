#!/bin/bash
# Export YouTube cookies from Firefox or Chrome for yt-dlp
# Run this on your local machine where you're logged into YouTube

echo "YouTube Cookie Exporter for $CC Stream"
echo "======================================="
echo ""
echo "This script will help you export YouTube cookies to bypass bot detection."
echo ""
echo "Option 1: Use yt-dlp directly (if you have it installed)"
echo "  yt-dlp --cookies-from-browser firefox --cookies cookies.txt https://www.youtube.com"
echo "  yt-dlp --cookies-from-browser chrome --cookies cookies.txt https://www.youtube.com"
echo ""
echo "Option 2: Use a browser extension like 'Get cookies.txt LOCALLY'"
echo "  1. Install the extension"
echo "  2. Go to youtube.com while logged in"
echo "  3. Export cookies to cookies.txt"
echo ""
echo "Once you have cookies.txt, copy it to the VPS:"
echo "  scp cookies.txt root@5.161.107.128:/root/ccwtf/stream/cookies.txt"
echo ""
echo "Then restart the stream:"
echo "  docker compose up -d stream"
