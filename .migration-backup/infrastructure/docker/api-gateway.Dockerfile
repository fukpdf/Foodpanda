FROM node:24-alpine AS base
RUN corepack enable pnpm
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/security-core/package.json ./packages/security-core/
COPY services/api-gateway/package.json ./services/api-gateway/
RUN pnpm install --frozen-lockfile --filter @deliveryos/api-gateway...

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/*/node_modules ./packages/
COPY packages/shared-types ./packages/shared-types
COPY packages/shared-utils ./packages/shared-utils
COPY packages/security-core ./packages/security-core
COPY services/api-gateway ./services/api-gateway
COPY tsconfig.base.json tsconfig.node.json ./
WORKDIR /app/services/api-gateway
RUN pnpm build

FROM node:24-alpine AS runner
RUN corepack enable pnpm
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/services/api-gateway/dist ./dist
COPY --from=builder /app/services/api-gateway/package.json ./
COPY --from=deps /app/node_modules ./node_modules

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 deliveryos && \
    chown -R deliveryos:nodejs /app

USER deliveryos
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/index.js"]
