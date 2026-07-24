# Build stage
FROM oven/bun:1.2.11@sha256:66b431441dc4c36d7e8164bfc61e6348ec1d7ce2862fc3a29f5dc9856e8205e4 AS builder

WORKDIR /app

ARG VITE_API_URL

COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/

RUN bun install --frozen-lockfile

COPY apps/web ./apps/web
COPY scripts ./scripts
COPY tsconfig.json ./

ENV VITE_API_URL=$VITE_API_URL

RUN bun run --filter=@mike-os-x/web build

# Production stage
FROM nginx:alpine@sha256:4a73073bd557c65b759505da037898b61f1be6cbcc3c2c3aeac22d2a470c1752

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY mime.types /etc/nginx/mime.types

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

