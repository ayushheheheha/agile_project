# ── base image ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app

# ── dependencies ──────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ── production image ──────────────────────────────────────────────────────────
FROM base AS runner

# pdf-parse needs canvas/canvas dependencies on some platforms — install OS libs
RUN apk add --no-cache \
    python3 \
    make \
    g++

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "src/server.js"]
