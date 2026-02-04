FROM node:22-slim AS deps
WORKDIR /app

# Build tools required by better-sqlite3 (native addon) when prebuilt
# binaries are unavailable for the target platform.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
FROM node:22-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npx next build

# ---------------------------------------------------------------------------
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Standalone bundle — server.js + a trimmed node_modules produced by Next.js.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Public and pre-built static assets.
COPY --from=builder --chown=nextjs:nodejs /app/public      ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Drizzle migration SQL — consumed by instrumentation.ts on every startup.
COPY --from=builder --chown=nextjs:nodejs /app/drizzle      ./drizzle

# better-sqlite3 native binary — copy explicitly because the standalone file
# tracer can miss prebuild-install artifacts.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/better-sqlite3 \
     ./node_modules/better-sqlite3

# Mount point for the persistent SQLite database volume.
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
