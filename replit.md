# Food Delivery Platform

Production-oriented multi-sided food-delivery marketplace. The platform is designed around customers, vendors/restaurants, riders, administrators, orders, payments, dispatch, notifications, reviews, promotions, and operational tooling.

## Run & Operate

- `pnpm run typecheck` — typecheck workspace libraries and configured application packages.
- `pnpm run build` — typecheck and build all packages that expose a build script.
- `pnpm run typecheck:libs` — TypeScript project-reference check for libraries.
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client/Zod artifacts from the OpenAPI contract.
- `pnpm --filter @workspace/db run push` — development-only schema push; production changes must use reviewed migrations.
- Use Node.js 24 and pnpm. The repository contains a committed lockfile; do not use npm/yarn lockfiles.
- Required environment varies by service; `DATABASE_URL` is the baseline database setting. Production secrets must be provided through the deployment secret manager.

## Repository Map

- `artifacts/api-server/` — HTTP application/gateway foundation; its public API surface must be governed by the OpenAPI contract.
- `artifacts/mockup-sandbox/` — UI/mockup experimentation; not a production substitute for customer/vendor/rider/admin applications.
- `lib/db/` — PostgreSQL/Drizzle schema and database access foundation; database ownership and migration rules are documented under `docs/`.
- `lib/api-spec/` — OpenAPI source contract and code generation.
- `lib/api-zod/` — generated/validated API schemas.
- `lib/api-client-react/` — generated React API client integration.
- `services/order-service/` — order lifecycle, validation, repositories, state machine, events and order APIs.
- `services/dispatch-service/` — delivery dispatch, rider offers, workers, events and realtime integration.
- `docs/` — engineering source of truth for architecture, product requirements, security, testing and operations.

## Architecture Decisions

- Domain boundaries are explicit; order and dispatch remain independently structured services while shared libraries contain reusable contracts and persistence primitives.
- Public HTTP APIs are contract-first. OpenAPI is the source of truth for externally consumed endpoints; generated clients/schemas must not become a competing contract.
- Business-critical mutations are transactional and idempotent. Cross-service side effects should use durable events/outbox/retry mechanisms rather than untracked fire-and-forget operations.
- Authentication and authorization are separate concerns. Sensitive vendor, rider, customer, payment and administrative data require explicit least-privilege authorization.
- Production readiness requires automated typecheck, tests, build, security checks, migration validation, observability and documented operational procedures.

## Product Scope

### Customer

Discovery, location/address management, restaurant browsing, search, menu customization, cart, checkout, payment, order tracking, history, reorder, favorites, promotions, notifications, support, ratings and reviews.

### Vendor / Restaurant

Onboarding and verification, branches, hours, menus, categories, modifiers, availability, pricing, incoming orders, preparation workflow, promotions, reviews, earnings, payouts and analytics.

### Rider

Onboarding/verification, online status, delivery offers, acceptance, navigation, pickup/drop-off workflow, proof of delivery, location updates, earnings, performance, documents and support.

### Administration

Users, vendors, riders, orders, payments, refunds, disputes, promotions, reviews, payouts, audit logs, configuration, feature flags and operational analytics.

## Security

- Never commit credentials, private keys, tokens or production secrets.
- Do not log passwords, authentication tokens, payment secrets or unnecessary sensitive personal data.
- Validate environment variables at startup and fail closed when mandatory production configuration is missing.
- Verify authentication and authorization at the service boundary; never trust client-supplied roles, prices, payment status or order state.
- Webhooks require provider signature verification and idempotent processing.
- Sensitive rider/customer data must be returned only by narrowly authorized endpoints and stored using appropriate private storage/access controls.

## Engineering Standards

- Prefer strict TypeScript and explicit domain types.
- Validate external input at API boundaries.
- Use centralized error codes and stable response contracts.
- Add indexes/constraints based on actual access patterns and integrity requirements.
- Keep migrations reviewed and reversible where practical.
- Add unit/integration/contract/E2E coverage for critical business workflows.
- Preserve request IDs and structured logs across service boundaries without leaking sensitive data.
- Document significant architectural changes with an ADR.

## Development Rules

1. Read the relevant documentation before changing a domain boundary.
2. Update the OpenAPI contract when public API behavior changes.
3. Update generated artifacts using the repository's codegen command rather than editing generated output as the source of truth.
4. Run typecheck and the applicable tests before considering a change complete.
5. Do not delete or replace existing services/data models until references, migrations and production implications have been audited.
6. Do not treat mockups or scaffolding as evidence that a production capability is implemented.

## Quality Gates

A phase or production feature is complete only when implementation, tests, security review, API contract, database changes, documentation and operational considerations are all aligned. A passing build alone does not constitute production readiness.

## Known Baseline Gaps

The repository is under active hardening. The remaining roadmap includes completing the authoritative API contract, authentication/RBAC, catalog/search/cart/checkout, payment integration, reliable cross-service events, customer/vendor/rider/admin applications, notifications, promotions, reviews, CI/CD, comprehensive automated tests, observability and production operations.

## Phase Model

- Phase 0 — inventory, baseline audit and risk discovery.
- Phase 1 — production architecture and engineering foundation.
- Phase 2+ — domain implementation and product integration.
- Final release gate — security, reliability, performance, accessibility, testing, deployment and documentation verification.
