# Multi-Stage Dockerfile for AntiGravity Server

# Stage 1: Build Workspace Dependencies
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy root manifest and workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/server/ ./apps/server/

# Install all dependencies and build shared packages + server
RUN pnpm install --frozen-lockfile
RUN pnpm --filter "./packages/**" build
RUN pnpm --filter @antigravity/server build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy compiled dist and manifests
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/apps/server/dist ./apps/server/dist

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["node", "apps/server/dist/index.js"]
