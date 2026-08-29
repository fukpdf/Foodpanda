# ADR-002: Service and Domain Boundaries

## Status

Accepted target; implementation migration is incremental.

## Domain ownership

| Domain | Primary responsibility | Source of truth |
|---|---|---|
| Identity & Access | users, sessions, authentication, roles, permissions | identity/auth domain |
| Catalog | vendors, branches, menus, items, modifiers, availability | catalog domain |
| Cart & Checkout | cart validation and server-side pricing | checkout domain |
| Orders | order creation, lifecycle, cancellation rules | order service |
| Dispatch | rider eligibility, offers, assignment, delivery lifecycle | dispatch service |
| Payments | payment intents, attempts, provider webhooks, refunds | payment domain |
| Notifications | in-app, email, SMS, push delivery | notification domain |
| Reviews | eligible reviews, ratings, moderation | review domain |
| Promotions | coupons, campaigns, eligibility, discount rules | promotion domain |
| Administration | privileged operational workflows | admin/application layer |

## Rules

- A domain may read another domain only through an approved API/event boundary; no cross-domain database writes.
- Orders own order state; clients and downstream services cannot invent arbitrary transitions.
- Dispatch consumes order events and owns rider assignment state.
- Payment providers are accessed through adapters; provider-specific details do not leak throughout business logic.
- Shared libraries contain stable cross-cutting contracts/utilities, not hidden business ownership.

## Existing repository mapping

- `services/order-service` — order domain implementation.
- `services/dispatch-service` — dispatch implementation.
- `lib/db` — shared database schema/access layer during the current architecture stage.
- `lib/api-spec` — public API contract/code-generation source.
- `lib/api-zod` — generated/derived validation layer.
- `lib/api-client-react` — client integration layer.
- `artifacts/api-server` — current public API/server application; its long-term gateway/BFF role must be made explicit.

## Migration rule

Do not create a new service merely because a folder can be separated. Extract a domain only when its ownership, contract, data boundary, operational needs, and test strategy are defined.
