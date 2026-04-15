FROM node:20-alpine AS development

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 5174

CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "5174"]

FROM node:20-alpine AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# --- Servir con nginx ---
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# SPA: redirigir todo a index.html
RUN echo 'server { \
  listen 5174; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { try_files $uri $uri/ /index.html; } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 5174

CMD ["nginx", "-g", "daemon off;"]
