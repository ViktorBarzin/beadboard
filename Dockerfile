# syntax=docker/dockerfile:1.7

# bd (beads CLI). Creating, updating, closing and commenting on beads from the
# board, and the swarm and mission views, shell out to `bd` (src/lib/bridge.ts);
# reads go straight to Dolt. Built from source against musl because the release
# tarballs are glibc builds that need fcntl64, which Alpine's gcompat lacks.
# Keep BD_VERSION equal to claude-agent-service's: every client of the shared
# beads database moves together (infra docs/runbooks/beads-bd-upgrade.md).
FROM golang:1.26.9-alpine3.23 AS bd
ARG BD_VERSION=1.3.1
ARG BD_COMMIT=c1c4b642ac1c08d8c828007a1c2f96e47e43ef7c
RUN apk add --no-cache gcc g++ musl-dev git \
    && CGO_ENABLED=1 GOBIN=/out go install -tags gms_pure_go \
       -ldflags "-s -w -X main.Version=${BD_VERSION} -X main.Build=$(echo ${BD_COMMIT} | cut -c1-9) -X main.Commit=${BD_COMMIT}" \
       "github.com/steveyegge/beads/cmd/bd@v${BD_VERSION}" \
    && /out/bd version


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
 && adduser -S nextjs -u 1001 -G nextjs \
 && chown nextjs:nextjs /app

# bd writes a lock file next to .beads (/app/.beads.gate.lock) on every run,
# hence the /app ownership above. Metrics off: bd 1.3 sends anonymous usage
# metrics to gastownhall-eventsapi.com by default. BEADS_ACTOR is the audit
# name for writes made without a name typed into the board.
COPY --from=bd /out/bd /usr/local/bin/bd
ENV BD_DISABLE_METRICS=1
ENV BEADS_ACTOR=beadboard

COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next ./.next
COPY --from=builder --chown=nextjs:nextjs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nextjs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nextjs /app/next.config.ts ./next.config.ts

USER nextjs
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start"]
