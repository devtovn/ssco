# Multi-stage Dockerfile for Express.js Backend with TypeScript
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
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=types-builder /packages/types /packages/types
COPY backend/ .

RUN npm run build

# Stage 3: Runner (Production)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

COPY --from=types-builder /packages/types /packages/types
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN chown -R expressjs:nodejs /app

USER expressjs

EXPOSE 4000

CMD ["node", "dist/index.js"]

# Stage 4: Development
FROM node:20-alpine AS development
WORKDIR /app

COPY --from=types-builder /packages/types /packages/types
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci

COPY backend/ .

EXPOSE 4000

CMD ["npm", "run", "dev"]
