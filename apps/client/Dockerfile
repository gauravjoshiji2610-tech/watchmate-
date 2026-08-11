# Multi-Stage Dockerfile for WatchMate Client

# Stage 1: Build Vite Production Bundle
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy root manifest and workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/client/ ./apps/client/

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

# Install dependencies and build shared packages + client bundle
RUN pnpm install --frozen-lockfile
RUN pnpm --filter "./packages/**" build
RUN pnpm --filter @antigravity/client build

# Stage 2: Serve Static Assets via Nginx
FROM nginx:alpine AS runner

# Copy compiled static assets from Vite build
COPY --from=builder /app/apps/client/dist /usr/share/nginx/html

# Nginx config: serve index.html for all routes (React Router SPA fallback)
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / {\n    try_files $uri $uri/ /index.html;\n  }\n}\n' > /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
