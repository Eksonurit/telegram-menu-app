# ── Stage 1: збірка client + server ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

RUN npm ci

COPY client ./client
COPY server ./server

# Змінні Vite підставляються під час збірки фронтенду.
# Railway передає Service Variables під час Docker build (TELEGRAM_BOT_USERNAME).
ARG VITE_API_URL=/api
ARG VITE_BASE_PATH=/
ARG TELEGRAM_BOT_USERNAME=

ENV VITE_API_URL=$VITE_API_URL \
    VITE_BASE_PATH=$VITE_BASE_PATH \
    VITE_TELEGRAM_BOT_USERNAME=$TELEGRAM_BOT_USERNAME

RUN npm run build

# ── Stage 2: production runtime ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Лише production-залежності сервера
RUN npm ci --omit=dev

COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

WORKDIR /app/server

EXPOSE 3000

# Express роздає client/dist з ../client/dist відносно cwd (/app/server)
CMD ["node", "dist/index.js"]
