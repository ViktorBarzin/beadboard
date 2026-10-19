# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS deps
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev=false


FROM node:24-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build with the full tree, then drop devDependencies so the runner copies only
# what `next start` needs. remotion and its rspack bundler (which vendors a
# vulnerable tinypool) are dev-only: they render the promo video, never the app.
# typescript is a runtime dependency on purpose: `next start` compiles
# next.config.ts, and without typescript it tries to `npm install` it.
RUN npm run build \
 && npm prune --omit=dev


FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# npm is removed: the server starts through node directly (CMD below), and the
# npm bundled with the base image carries tar, undici, ip-address and
# brace-expansion copies with CRITICAL/HIGH CVEs.
RUN apk add --no-cache curl ca-certificates \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx \
 && addgroup -S nextjs -g 1001 \
 && adduser -S nextjs -u 1001 -G nextjs

COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next ./.next
COPY --from=builder --chown=nextjs:nextjs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nextjs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nextjs /app/next.config.ts ./next.config.ts

USER nextjs
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start"]
