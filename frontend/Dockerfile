# Multi-stage Dockerfile for Next.js 14 Frontend
# Build context: repository root (see docker-compose.yml)

# Shared workspace package (@price-comparison/types)
FROM node:20-alpine AS types-builder
WORKDIR /packages/types
COPY packages/types/package.json ./
RUN npm install
COPY packages/types/ ./
RUN npm run build

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

COPY --from=types-builder /packages/types /packages/types
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=types-builder /packages/types /packages/types
COPY frontend/ .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# Stage 3: Runner (Production)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]

# Stage 4: Development
FROM node:20-alpine AS development
WORKDIR /app

COPY --from=types-builder /packages/types /packages/types
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ .

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["npm", "run", "dev"]
