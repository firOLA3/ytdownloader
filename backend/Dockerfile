# Use a lightweight Node.js image based on Debian (needed for ffmpeg)
FROM node:20-bookworm-slim

# Install system dependencies required by yt-dlp: Python3 and FFmpeg
RUN apt-get update && apt-get install -y \
    python3 \
    ffmpeg \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Download the nightly release of yt-dlp (required for bypassing YouTube 429 bot protection)
RUN curl -L https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Install Deno (The only supported JS runtime for yt-dlp's anti-bot extraction)
RUN curl -fsSL https://deno.land/x/install/install.sh | sh \
    && mv /root/.deno/bin/deno /usr/local/bin/deno

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the backend code
COPY . .

# Ensure the downloads directory exists
RUN mkdir -p downloads

# Expose port (Render sets the PORT environment variable automatically)
EXPOSE 5000

# Start the server
CMD [ "npm", "start" ]
