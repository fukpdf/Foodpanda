# DeliveryOS

Enterprise-grade food delivery platform monorepo — Customer, Vendor, Rider, and Admin apps with a microservices-ready backend. Phases 1–5 complete (scaffolding, DB, auth, order lifecycle, realtime).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend apps: Next.js 15, Tailwind CSS v4, App Router (in `apps/` — not yet migrated to Vite artifacts)
- Backend services: Fastify 5 (in `services/` — api-gateway, auth-service, order-service, payment-service, realtime-service)
- Shared packages: ui-system, shared-types, shared-utils, security-core, database (in `packages/`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle for API server)
- Monorepo tooling: Turborepo (in migration-backup reference only; not in active workspace)

## Where things live

The original project lives in `.migration-backup/` (gitignored — Replit internal only).
The active Replit workspace currently has the scaffold skeleton only:

```
artifacts/api-server/    → Express API server scaffold (@workspace/api-server)
artifacts/mockup-sandbox/ → Canvas/mockup artifact
lib/api-spec/            → OpenAPI spec + Orval codegen
lib/api-client-react/    → Generated React Query hooks
lib/api-zod/             → Generated Zod schemas
lib/db/                  → Drizzle ORM client
scripts/                 → Workspace utility scripts
```

## Architecture decisions

- **Turborepo over Nx**: Simpler config, superior caching, native pnpm integration
- **App Router (Next.js 15)**: Server Components by default, co-located routes, streaming
- **Fastify over Express**: 2× faster, schema validation built-in, TypeScript-first
- **Shared types via workspace packages**: Single source of truth, no type drift between frontend/backend
- **`@deliveryos/*` namespace**: Avoids collision with `@workspace/*` Replit scaffold packages
- **Route groups `(auth)`, `(main)`, `(dashboard)`**: Zero-cost URL nesting, shared layouts per group
- **Tailwind v4 `@theme` blocks**: Design tokens per app (each app has its own brand color)

## Product

- **Customer PWA**: Browse vendors, place orders, track deliveries in real-time
- **Vendor PWA**: Accept/reject orders, manage menus, monitor store status and analytics
- **Rider PWA**: Go online, accept dispatch jobs, navigate to pickups/dropoffs
- **Admin Panel**: Platform operations — vendor approval, rider management, refunds, analytics

## User preferences

- Architecture-first, no premature features
- Production-grade from day one, no TODOs or placeholder hacks
- Modular, independently deployable services
- DO NOT migrate frameworks (Next.js → Vite, Fastify → Express, etc.)
- DO NOT rewrite configuration files without explicit instruction
- DO NOT alter pnpm workspace structure without explicit instruction
- DO NOT run DB migrations unless explicitly requested

## Gotchas

- `.migration-backup/` is gitignored — it is Replit-internal only and must never be pushed to GitHub
- Always run `pnpm run build:packages` before running apps if shared packages changed
- Tailwind v4 uses `@import "tailwindcss"` (not `@tailwind base/components/utilities`)
- Next.js apps use `postcss.config.mjs` with `@tailwindcss/postcss`
- Services use `"type": "module"` and NodeNext module resolution
- `pnpm-workspace.yaml` `minimumReleaseAge: 1440` may block same-day package installs
- `@deliveryos/database/drizzle` sub-path re-exports all drizzle-orm operators — services must import from there

## Completed phases (pre-Replit)

| Phase | Status | Summary |
|---|---|---|
| Phase 1 | ✅ Done | All 4 PWAs + 4 services scaffolded, shared packages, Turborepo pipeline |
| Phase 2 | ✅ Done | Drizzle ORM — 10 schemas, full DB client, repositories, validators, seed |
| Phase 3 | ✅ Done | RS256 JWT auth — keypair gen, signing, refresh tokens, Redis sessions |
| Phase 4 | ✅ Done | Order lifecycle service — state machine, dispatch engine, 30 source files |
| Phase 5 | ✅ Done | Realtime infrastructure — WebSocket + SSE gateway, JWT auth, channel subscriptions |

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Phase 6 target: Stripe payment-service integration
