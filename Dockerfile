# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma

# ---- dev: usado pelo docker-compose.dev.yml, roda com hot reload ----
FROM base AS dev
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---- deps: apenas dependências de produção ----
FROM base AS deps
RUN npm ci --omit=dev
RUN npx prisma generate

# ---- build: compila TypeScript ----
FROM base AS build
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- production: imagem final enxuta ----
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./
EXPOSE 3000
CMD ["node", "dist/api/server.js"]
