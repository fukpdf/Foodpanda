---
name: DeliveryOS order-service Phase 7 state machine
description: Phase 7 state machine layout, transition chain, timestamp gaps, dispatch gate change, internal route inventory
---

# Phase 7 order-service state machine (Batch 2)

## Transition chain (full)
```
CREATED → PAYMENT_PENDING → CONFIRMED → ACCEPTED_BY_VENDOR → PREPARING
  → READY_FOR_PICKUP → DISPATCH_CREATED → RIDER_ASSIGNED → RIDER_ACCEPTED
  → ARRIVED_AT_VENDOR → PICKED_UP → ON_THE_WAY → ARRIVED_AT_CUSTOMER → DELIVERED → REFUNDED

CREATED/PAYMENT_PENDING/CONFIRMED/ACCEPTED_BY_VENDOR/PREPARING → CANCELLED → REFUNDED
```

## CANCELLABLE_STATES (unchanged from pre-Phase-7)
`CREATED, PAYMENT_PENDING, CONFIRMED, ACCEPTED_BY_VENDOR, PREPARING`
READY_FOR_PICKUP and all downstream states are NOT cancellable.

## DB status ↔ OrderState mappings (new Phase 7 additions)
| OrderState         | DBOrderStatus        |
|--------------------|----------------------|
| DISPATCH_CREATED   | dispatch_created     |
| RIDER_ACCEPTED     | rider_accepted       |
| ARRIVED_AT_VENDOR  | arrived_at_vendor    |
| ARRIVED_AT_CUSTOMER| arrived_at_customer  |

## Timestamp audit — ordersFoundation columns
Existing timestamp writes (columns exist):
- ACCEPTED_BY_VENDOR → acceptedAt
- PREPARING → clears preparedAt
- READY_FOR_PICKUP → preparedAt
- PICKED_UP → pickedUpAt
- DELIVERED → deliveredAt
- CANCELLED → cancelledAt, cancellationReason, cancelledById

**GAP — no timestamp columns for:**
- DISPATCH_CREATED, RIDER_ACCEPTED, ARRIVED_AT_VENDOR, ARRIVED_AT_CUSTOMER
- These 4 states update only `status + updatedAt`. No columns invented.

## Dispatch gate (Batch 2 change)
OLD: `result.order.status === "ready_for_pickup" && body.toState === "RIDER_ASSIGNED"`
NEW: `body.toState === "DISPATCH_CREATED"` (in OrderController.transitionOrder)
The state machine already enforces DISPATCH_CREATED is only reachable from READY_FOR_PICKUP.

## Internal routes inventory (services/order-service/src/routes/internal.ts)
Payment-service routes (PAYMENT_SERVICE_INTERNAL_KEY):
- POST /internal/orders/:id/confirm-payment
- POST /internal/orders/:id/fail-payment

Dispatch-service routes (DISPATCH_SERVICE_INTERNAL_KEY) — Phase 7 lifecycle:
- POST /internal/orders/:id/rider-assigned (includes riderId, sets riderId on order)
- POST /internal/orders/:id/rider-accepted
- POST /internal/orders/:id/arrived-at-vendor
- POST /internal/orders/:id/picked-up
- POST /internal/orders/:id/in-transit
- POST /internal/orders/:id/arrived-at-customer
- POST /internal/orders/:id/delivered

## Batch 3 notes
DispatchEngine, DispatchService, DispatchRepository kept in order-service for Batch 3 extraction.
The embedded DispatchService.initiateDispatch still fires on DISPATCH_CREATED until Batch 3.
