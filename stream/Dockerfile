FROM node:22-bookworm-slim

# Install Chromium + FFmpeg + Xvfb + yt-dlp + fonts + unzip (for deno)
RUN apt-get update && apt-get install -y \
    chromium \
    ffmpeg \
    xvfb \
    python3-pip \
    curl \
    unzip \
    fonts-noto-color-emoji \
    fonts-noto-mono \
    && pip3 install --break-system-packages yt-dlp \
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -fv

# Install Deno (required by yt-dlp for YouTube extraction)
RUN curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh
ENV PATH="/usr/local/bin:$PATH"

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Display for Xvfb
ENV DISPLAY=:99

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Expose health endpoint port
EXPOSE 3002

# Start Xvfb (clean up stale lock first), then the stream service
CMD rm -f /tmp/.X99-lock && Xvfb :99 -screen 0 1280x720x24 & sleep 2 && node dist/index.js
