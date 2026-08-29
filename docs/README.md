# Food Delivery Platform — Engineering Documentation

## Purpose

This directory is the engineering source of truth for the Food Delivery Platform. It documents architecture, service boundaries, API contracts, data ownership, security, operations, testing, and product requirements.

## Documentation rules

1. Code, API contracts, database migrations, and documentation must remain consistent.
2. Every significant architectural decision must be documented before or with its implementation.
3. Public API behavior is contract-first: OpenAPI is the source of truth for externally consumed HTTP APIs.
4. Production changes must be validated by typecheck, tests, build, and the applicable security/reliability checks.
5. Secrets, credentials, tokens, private keys, and sensitive personal data must never be committed or written to logs.
6. Destructive repository cleanup must be preceded by dependency/reference verification.

## Planned documentation

- `architecture/` — system architecture and ADRs
- `api/` — API conventions and endpoint ownership
- `database/` — schema ownership, migrations, and data lifecycle
- `security/` — authentication, authorization, secrets, privacy, and threat model
- `operations/` — deployment, observability, incident response, backups, and recovery
- `testing/` — unit, integration, contract, security, and end-to-end strategy
- `product/` — customer, vendor, rider, admin, marketplace, payment, and delivery requirements

## Current baseline

The repository is a pnpm TypeScript monorepo with shared libraries and dedicated order/dispatch services. Existing architecture is being hardened incrementally; incomplete scaffolding is not considered production-ready until the relevant quality gates pass.

## Phase model

- Phase 0 — inventory, baseline audit, risk discovery
- Phase 1 — production architecture and engineering foundation
- Phase 2+ — domain/product implementation and integration
- Final release gate — security, reliability, performance, accessibility, testing, deployment, and documentation verification
