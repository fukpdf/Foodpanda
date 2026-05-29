---
name: DeliveryOS workspace layout
description: Active workspace conventions, package naming, and directory structure for the DeliveryOS monorepo port
---

## Package naming
- Active workspace: `@workspace/*` (NOT `@deliveryos/*`)
- Database package: `@workspace/db` at `lib/db/`
- Future dispatch service: `@workspace/dispatch-service` at `services/dispatch-service/`

## pnpm-workspace.yaml packages
- `artifacts/*`, `lib/*`, `lib/integrations/*`, `services/*`, `scripts`
- `services/*` was added in Batch 0 (was missing before)

## Schema directory
- Active workspace: `lib/db/src/schema/` (singular — NOT `schemas/`)
- Relations co-located in `lib/db/src/schema/relations.ts`
- Import from other services: `import { ... } from "@workspace/db"`

## .migration-backup isolation rules
- `.migration-backup/` is gitignored, disk-only
- NEVER import from `.migration-backup` in any active workspace file
- NEVER write files inside `.migration-backup/`
- Source of truth for porting: `.migration-backup/packages/database/src/schemas/`

## Internal service auth pattern
- `X-Internal-Key` header + `timingSafeEqual` (Node.js crypto / security-core `constantTimeEqual`)
- Each service has its own internal key env var

**Why:** The `.migration-backup/` directory contains the original monorepo and must remain read-only reference material only during the controlled port to the active Replit workspace.
