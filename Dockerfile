# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

ARG VITE_API_URL

COPY package.json bun.lockb* ./
COPY apps/web/package.json ./apps/web/

RUN bun install --frozen-lockfile

COPY apps/web ./apps/web
COPY scripts ./scripts
COPY tsconfig.json ./

ENV VITE_API_URL=$VITE_API_URL

RUN bun run --filter=@mike-os-x/web build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/work/index.html /usr/share/nginx/work/index.html
COPY apps/work/styles.css /usr/share/nginx/work/styles.css
COPY apps/work/scrollbar.js /usr/share/nginx/work/scrollbar.js
COPY apps/work/projects /usr/share/nginx/work/projects

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY mime.types /etc/nginx/mime.types

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

