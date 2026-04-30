# ── Estágio de Build ──────────────────────────────────────────────────────────

FROM node:20 AS build
WORKDIR /app


COPY package*.json ./
RUN npm ci --quiet --legacy-peer-deps --omit=dev

COPY . .
RUN npx ng build --configuration production

# ── Estágio de Execução ───────────────────────────────────────────────────────

FROM node:20-slim
WORKDIR /app


USER node

COPY --from=build --chown=node:node /app/dist/frontend /app/dist/frontend

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production


ENV NODE_OPTIONS="--max-old-space-size=400"

CMD ["node", "dist/frontend/server/server.mjs"]