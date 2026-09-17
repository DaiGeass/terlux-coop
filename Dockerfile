# ============================================
# TERLUX COOP — App web (Next.js)
# Build de producción servida en el puerto 8443.
# ============================================

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_APP_URL=http://localhost:8443
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ARG DATABASE_URL=postgresql://postgres:postgres@postgres:5432/app_db
ENV DATABASE_URL=$DATABASE_URL
RUN npm run build

FROM node:22-alpine AS migrate
# Sincroniza el esquema de Drizzle con la base de datos (crea las tablas).
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY drizzle.config.json ./drizzle.config.json
COPY docker/drizzle.config.ts ./drizzle.config.ts
COPY src/db ./src/db
CMD ["npx", "drizzle-kit", "push", "--config=drizzle.config.ts", "--force"]

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/templates ./templates
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/next-env.d.ts ./next-env.d.ts

EXPOSE 8443
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8443/api/health || exit 1

CMD ["npm", "start"]