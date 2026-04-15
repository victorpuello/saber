FROM node:20-alpine

WORKDIR /app

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Dependencias primero para cache de capas
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod

COPY src/ ./src/

EXPOSE 3000

USER node

CMD ["node", "src/index.js"]
