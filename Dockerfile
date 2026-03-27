FROM node:20-alpine AS base
# openssl: requerido por Prisma para conectarse a PostgreSQL
# netcat-openbsd: para el health-check de DB en el entrypoint
RUN apk add --no-cache libc6-compat openssl netcat-openbsd
WORKDIR /app

# ── Dependencias ──────────────────────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# ── Build ─────────────────────────────────────────────────────────────────────
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN rm -f prisma.config.ts
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Runner ────────────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

# App standalone de Next.js
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Schema de Prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Cliente generado + CLI de Prisma — con ownership correcto (corre como nextjs)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# tsx — necesario para `prisma db seed` (seed.ts está en TypeScript)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin/tsx ./node_modules/.bin/tsx

COPY --from=builder /app/scripts/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
