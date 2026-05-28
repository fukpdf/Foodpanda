---
name: Batch 0 + Batch 1 schema state
description: State of lib/db after Batch 0 (port) and Batch 1 (Phase 7 additions) — what exists, what is pending
---

## Batch 0 — ported (complete)
All 22 original DeliveryOS tables in lib/db/src/schema/ — enums, users,
user-profiles, auth-sessions, refresh-tokens, roles, permissions, vendors,
vendor-branches, riders, customer-addresses, orders (ordersFoundation),
order-items, order-state-history, dispatch-assignments (legacy), payments,
payment-attempts, payment-events, refunds, audit-logs, webhook-events,
idempotency-keys + relations.ts

## Batch 1 — Phase 7 additions (complete)
orderStatusEnum additions: dispatch_created, rider_accepted, arrived_at_vendor, arrived_at_customer
dispatchStatusEnum additions: offer_pending, arrived_vendor, in_transit, arrived_customer
riders table additions: acceptanceRate, totalOffersReceived, totalOffersAccepted, activeDeliveryCount

New tables created:
- dispatches.ts (master dispatch lifecycle, unique FK to ordersFoundation)
- dispatch-events.ts (event sourcing, cascade from dispatches)
- rider-locations.ts (high-frequency location history)
- assignment-attempts.ts (per-attempt scoring + offer expiry)
- delivery-proofs.ts (photo evidence at pickup/dropoff)

schema/index.ts exports 28 modules. relations.ts has 5 new relation blocks.

## Typecheck status (after Batch 1)
- pnpm --filter @workspace/db run typecheck → 0 errors
- pnpm run typecheck (full workspace) → 0 errors
- Circular import check → CLEAN
- All 28 exports resolve

## What comes next (NOT yet started)
- Batch 2: order-service state machine extension (new OrderState values,
  ORDER_STATE_TO_DB mapping, new internal routes for dispatch lifecycle transitions)
- Batch 3+: dispatch-service scaffold and implementation

**Why:** Phase 7 adds dispatch as a first-class service with its own lifecycle,
separate from the existing embedded dispatch engine in order-service.
