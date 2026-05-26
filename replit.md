# DeliveryOS

Enterprise-grade food delivery ecosystem — a scalable, modular monorepo supporting Customer, Vendor, Rider, and Admin apps with a microservices-ready backend.

## Run & Operate

### Start individual apps
- `pnpm run dev:customer` — Customer PWA (port 3001)
- `pnpm run dev:vendor` — Vendor PWA (port 3002)
- `pnpm run dev:rider` — Rider PWA (port 3003)
- `pnpm run dev:admin` — Admin Panel (port 3004)
- `pnpm run dev:api-gateway` — API Gateway (port 3000)
- `pnpm run dev:auth` — Auth Service (port 3010)

### Start everything
- `pnpm run dev` — Start all apps and services in parallel (via Turborepo)
- `pnpm run dev:apps` — Start all Next.js apps only
- `pnpm run dev:services` — Start all Fastify services only

### Build & quality
- `pnpm run build` — Build all packages, services, and apps
- `pnpm run typecheck` — Typecheck all workspaces
- `pnpm run lint` — Lint all workspaces
- `pnpm run format` — Format all files with Prettier
- `pnpm run clean` — Remove all build artifacts

### Infrastructure
- `docker compose -f infrastructure/docker/docker-compose.yml up -d` — Start Postgres, Redis, RabbitMQ
- `sh tools/scripts/setup.sh` — First-time dev environment setup

## Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Frontend apps**: Next.js 15, TypeScript, Tailwind CSS v4, App Router, PWA-ready
- **Backend services**: Fastify 5, TypeScript, Node.js 24
- **Shared packages**: ui-system, shared-types, shared-utils, security-core
- **Code quality**: ESLint 9 (flat config), Prettier, Husky, lint-staged
- **Infrastructure**: Docker Compose, Kubernetes manifests, Cloudflare Workers

## Where things live

```
/apps
  /customer-pwa    → Customer ordering app  (@deliveryos/customer-pwa, port 3001)
  /vendor-pwa      → Restaurant dashboard   (@deliveryos/vendor-pwa, port 3002)
  /rider-pwa       → Rider delivery app     (@deliveryos/rider-pwa, port 3003)
  /admin-panel     → Ops admin panel        (@deliveryos/admin-panel, port 3004)

/services
  /api-gateway     → Single entry point     (@deliveryos/api-gateway, port 3000)
  /auth-service    → JWT auth & sessions    (@deliveryos/auth-service, port 3010)

/packages
  /ui-system       → Shared React components (Button, Input, Card, Badge, Text, Spinner)
  /shared-types    → All TypeScript interfaces (User, Order, Vendor, Auth, API types)
  /shared-utils    → Constants, validators, formatters, helpers
  /security-core   → Token, encryption, and signing interfaces

/infrastructure
  /docker          → docker-compose.yml + Dockerfiles
  /kubernetes      → K8s manifests (namespace, deployments, HPA, PDB)
  /cloudflare      → Wrangler config + edge Worker (rate limiting, CORS, headers)

/tools/scripts     → setup.sh, clean.sh, build-all.sh

turbo.json         → Turborepo task pipeline (build, dev, typecheck, lint, clean)
eslint.config.js   → ESLint 9 flat config (TS, React, import rules)
.prettierrc        → Prettier config with import ordering
.lintstagedrc.js   → lint-staged: ESLint + Prettier on staged files
.husky/pre-commit  → Runs lint-staged before every commit
tsconfig.nextjs.json → Shared base tsconfig for Next.js apps
tsconfig.node.json   → Shared base tsconfig for Node.js services
```

## Architecture decisions

- **Turborepo over Nx**: Simpler config, superior caching, native pnpm integration
- **App Router (Next.js 15)**: Server Components by default, co-located routes, streaming
- **Fastify over Express**: 2× faster, schema validation built-in, TypeScript-first
- **Shared types via workspace packages**: Single source of truth, no type drift between frontend/backend
- **`@deliveryos/*` namespace**: Avoids collision with `@workspace/*` legacy packages; signals ecosystem ownership
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

## Gotchas

- Always run `pnpm run build:packages` before running apps if shared packages changed
- Tailwind v4 uses `@import "tailwindcss"` (not `@tailwind base/components/utilities`)
- Next.js apps use `postcss.config.mjs` with `@tailwindcss/postcss` (not `tailwindcss` plugin directly)
- Services use `"type": "module"` and NodeNext module resolution
- Each app has its own brand color palette defined in `globals.css` via `@theme {}`
- The `pnpm-workspace.yaml` `minimumReleaseAge: 1440` may block same-day package installs

## Future microservices (ports 3011–3020)

| Service | Port | Purpose |
|---|---|---|
| user-service | 3011 | Profile & address management |
| vendor-service | 3012 | Vendor registration & settings |
| menu-service | 3013 | Menu CRUD & availability |
| order-service | 3014 | Order lifecycle management |
| dispatch-service | 3015 | Rider matching & routing |
| wallet-service | 3016 | In-app wallet & credits |
| payment-service | 3017 | Stripe/payment gateway integration |
| notification-service | 3018 | Push/SMS/email notifications |
| realtime-service | 3019 | WebSocket / SSE for live tracking |
| analytics-service | 3020 | Metrics, reporting, BI |

## Recommended next phases

- **Phase 2**: Database layer — Drizzle ORM schemas per service, migrations
- **Phase 3**: Auth implementation — bcrypt, JWT signing, Redis session store
- **Phase 4**: Order flow — full CRUD for orders with state machine
- **Phase 5**: Realtime — WebSocket server for live order tracking
- **Phase 6**: Payments — Stripe integration in payment-service
