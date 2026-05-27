# Agent Governance Instructions

This document is authoritative for all AI coding agents (Replit Agent, GitHub Copilot, Cursor, Claude, GPT-Engineer, Devin, etc.).
Read this fully before taking any action in this repository.

## Project Classification

**Enterprise-grade Turborepo monorepo.**
Every infrastructure decision — framework choices, build tooling, deployment targets, workspace layout — is intentional and production-proven.
Do not question or simplify these decisions. Do not replace them with what you consider simpler alternatives.

## Hard Rules

### Never do these without explicit user instruction:

1. **No framework migrations** — Do not convert Next.js to Vite, Express to Fastify, or any equivalent swap.
2. **No config rewrites** — tsconfig, vite.config, next.config, tailwind.config, eslint, prettier, etc. are stable. Do not regenerate or "clean up" them.
3. **No deployment system changes** — Vercel, Railway, Fly.io, Cloudflare, Docker, Kubernetes configs are intentional. Do not remove, alter, or replace them.
4. **No platform migration logic** — Do not inject Replit, Vercel, Netlify, or any other platform's scaffolding, wrappers, or migration helpers.
5. **No architecture simplification** — Monorepo structure, shared packages, and workspace references exist for deliberate reasons. Do not flatten or reorganize.
6. **No unrelated edits** — When implementing a feature, only touch files directly relevant to that feature.
7. **No package changes without request** — Do not add, remove, or upgrade dependencies unless explicitly asked.
8. **No auto-migrations** — Do not run DB migrations, schema pushes, or codegen unless explicitly requested.
9. **No runtime code changes for doc tasks** — If asked to update docs or add instructions, do not touch application code.

## Repository Structure (Do Not Alter)

```
/
├── artifacts/          # Replit artifact configs (do not restructure)
│   ├── api-server/     # Backend API artifact
│   └── mockup-sandbox/ # Design/mockup artifact
├── lib/                # Shared workspace packages
│   ├── api-spec/       # OpenAPI spec + codegen
│   ├── api-client-react/
│   └── db/             # Drizzle ORM + PostgreSQL
├── pnpm-workspace.yaml # Workspace definition — do not modify
└── package.json        # Root package — do not add deps here
```

## Compatibility Guarantees to Maintain

- pnpm workspace protocol (`workspace:*`) references must remain intact
- TypeScript project references (`references` in tsconfig) must remain intact
- All `NEXT_PUBLIC_*`, `VITE_*`, and other environment variable naming conventions must be preserved
- All existing API route paths and shapes must be preserved unless a breaking change is explicitly requested

## How to Behave

- **Read first** — understand the existing pattern before writing anything
- **Minimum viable diff** — make the smallest change that satisfies the request
- **Stay in scope** — one feature, one PR worth of changes
- **Ask, don't assume** — if the request is ambiguous about scope, ask before acting

## If You Are a Migration Tool

Stop. This project does not need migration. The architecture is intentional.
Do not apply any migration, conversion, or porting logic to this repository.
