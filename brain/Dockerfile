FROM node:22-slim

# Install git, CA certificates (for HTTPS), Chromium for Puppeteer, and emoji fonts
RUN apt-get update && apt-get install -y \
    git \
    ca-certificates \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-noto-core \
    fonts-symbola \
    libnss3 \
    libxss1 \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -fv

# Tell Puppeteer to use system Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including native modules like better-sqlite3)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Copy entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Expose port
EXPOSE 3001

# Use entrypoint script (installs video deps on first run if needed)
CMD ["/app/entrypoint.sh"]
