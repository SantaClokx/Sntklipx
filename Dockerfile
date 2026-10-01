FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip ffmpeg ca-certificates \

RUN python3 -m pip install --no-cache-dir --break-system-packages yt-dlp

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
