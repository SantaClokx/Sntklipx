FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 yt-dlp ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

ENV NODE_ENV=production
ENV PORT=8080
ENV YTDLP_BIN=yt-dlp
ENV TEMP_DIR=/tmp/sntklipx

EXPOSE 8080

CMD ["node", "src/server.js"]
