# Enterprise Monorepo

A production-grade Turborepo pnpm monorepo. All architectural decisions are intentional — do not migrate, simplify, or restructure without explicit instruction.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/` — backend Express API artifact
- `artifacts/mockup-sandbox/` — design/mockup sandbox artifact
- `lib/api-spec/` — OpenAPI spec, source of truth for all API contracts
- `lib/api-client-react/` — generated React query hooks (do not edit by hand)
- `lib/db/` — Drizzle ORM schema and migrations

## Architecture decisions

- Turborepo monorepo with pnpm workspaces — all packages share a single lockfile
- Orval codegen from OpenAPI spec keeps API client and server in sync
- Drizzle ORM with `drizzle-zod` for end-to-end type-safe DB access
- Express 5 API artifact is the sole backend — no serverless functions
- All deployment infrastructure is pre-configured and intentional; do not alter

## User preferences

- **Do not migrate frameworks** — the stack is final
- **Do not rewrite configs** — tsconfig, vite.config, next.config, etc. are stable
- **Do not regenerate deployment systems** — Vercel/Railway/Fly/Docker/K8s configs are intentional
- **Do not simplify the architecture** — monorepo structure exists for deliberate reasons
- **Do not auto-create platform migration logic** — no Replit, Vercel, or other platform scaffolding
- **Scope all edits tightly** — only touch files directly required by the requested feature
- **Minimize unrelated edits** — every changed file must be justified by the request
- **Preserve all deployment configs** exactly as they exist
- **Preserve pnpm workspace structure** — do not alter `pnpm-workspace.yaml` or workspace references
- **Preserve Docker/Kubernetes/Cloudflare configs** — do not remove or modify
- **Preserve compatibility** — existing API contracts, env var names, and route paths must not change

## Gotchas

- Do not run `pnpm dev` or `pnpm build` at the workspace root — artifacts have their own dev scripts
- Do not add dependencies to the root `package.json` — add them to the correct workspace package
- Codegen (`api-spec run codegen`) must be re-run after any OpenAPI spec change
- DB schema changes require `db run push` in dev; production uses proper migrations

## Pointers

- See `.cursorrules` and `AGENTS.md` for AI governance rules that apply to all agents
- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
