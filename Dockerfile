# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lockb* ./
COPY apps/web/package.json ./apps/web/

RUN bun install --frozen-lockfile

COPY apps/web ./apps/web
COPY scripts ./scripts
COPY tsconfig.json ./

# This runs: prebuild (buildContentMetadata.mjs) → tsc → vite build
# Equivalent to local: bun --cwd apps/web build
RUN bun run --filter=@mike-os-x/web build

# Production stage
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

