---
name: Batch 0 schema port
description: State of lib/db after Batch 0 — what was ported, what is still missing for Phase 7
---

## What was ported (Batch 0 — complete)
All 22 original DeliveryOS tables are now in `lib/db/src/schema/`:
enums, users, user-profiles, auth-sessions, refresh-tokens, roles, permissions,
vendors, vendor-branches, riders, customer-addresses, orders (ordersFoundation),
order-items, order-state-history, dispatch-assignments (legacy), payments,
payment-attempts, payment-events, refunds, audit-logs, webhook-events, idempotency-keys
+ relations.ts (full Drizzle relations graph)

## Typecheck result
`pnpm --filter @workspace/db run typecheck` → 0 errors
`pnpm run typecheck` (full workspace) → 0 errors

## What is NOT yet in lib/db (Phase 7 Batch 1 will add)
- `orderStatusEnum` missing: `dispatch_created`, `rider_accepted`, `arrived_at_vendor`, `arrived_at_customer`
- `dispatchStatusEnum` missing: `offer_pending`, `arrived_vendor`, `in_transit`, `arrived_customer`
- New table: `dispatches` (master dispatch lifecycle)
- New table: `dispatch-events` (event sourcing)
- New table: `rider-locations` (high-frequency location history)
- New table: `assignment-attempts` (per-attempt scoring + offer)
- New table: `delivery-proofs` (photo evidence)
- `riders` table missing: `acceptanceRate`, `totalOffersReceived`, `totalOffersAccepted`, `activeDeliveryCount`

**Why:** Phase 7 adds these incrementally in Batch 1 after Batch 0 typecheck confirmed clean.
