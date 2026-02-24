# ── Estágio de Build ──────────────────────────────────────────────────────────
FROM node:20 AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Estágio de Execução ───────────────────────────────────────────────────────
FROM node:20-slim
WORKDIR /app

# Copia apenas o output do build (browser + server)
COPY --from=build /app/dist/frontend /app/dist/frontend

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "dist/frontend/server/server.mjs"]