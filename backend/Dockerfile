# Node 22 is required: the bgutil PO-token provider declares engines.node >= 22
# (jsdom's dependency chain needs require(esm), default from Node 22.12).
FROM node:22-bookworm-slim

ARG BGUTIL_VERSION=2.0.0

# Deterministic plugin location that does not depend on which user runs the container.
ENV YTDLP_PLUGIN_DIRS=/opt/yt-dlp-plugins
ENV YTDLP_POT_PROVIDER_URL=http://127.0.0.1:4416

# System dependencies required by yt-dlp: Python3 and FFmpeg.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    ffmpeg \
    curl \
    ca-certificates \
    git \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Nightly yt-dlp. YouTube changes its anti-bot handling constantly and only
# recent builds carry the counter-fixes, so this is pinned to the nightly channel.
RUN curl -L https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# ---------------------------------------------------------------------------
# bgutil PO-token provider
#
# This is the piece that makes YouTube work from a datacentre IP such as
# Render's. yt-dlp's default clients ('visionos', 'web') are the ones YouTube
# bot-checks hardest on cloud IPs, producing "Sign in to confirm you're not a
# bot". The 'mweb' client clears that check but needs a proof-of-origin token,
# which only this provider can generate.
# ---------------------------------------------------------------------------
RUN git clone --depth 1 --single-branch --branch ${BGUTIL_VERSION} \
        https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /opt/bgutil \
    && cd /opt/bgutil/server \
    && npm ci \
    && npx tsc \
    && npm prune --omit=dev \
    && npm cache clean --force

# Install the yt-dlp plugin in two places:
#   /opt/yt-dlp-plugins  -> referenced explicitly via YTDLP_PLUGIN_DIRS
#   /etc/yt-dlp/plugins  -> a default search path, so `yt-dlp` works by hand too
RUN mkdir -p /opt/yt-dlp-plugins /etc/yt-dlp/plugins \
    && cd /opt/bgutil/plugin \
    && zip -9 -r /opt/yt-dlp-plugins/bgutil-ytdlp-pot-provider.zip . \
    && cp /opt/yt-dlp-plugins/bgutil-ytdlp-pot-provider.zip /etc/yt-dlp/plugins/

WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy the rest of the backend code
COPY . .

# Ensure the downloads directory exists
RUN mkdir -p downloads && chmod +x /usr/src/app/entrypoint.sh

# Expose port (Render sets the PORT environment variable automatically)
EXPOSE 5000

# entrypoint.sh starts the PO-token provider, then the API.
ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
