# ADR-001: System Architecture

## Status

Accepted as the target architecture for the production-grade platform. Existing implementation may differ while migration is in progress.

## Context

The repository already contains shared libraries plus separate order and dispatch services. It also contains an API-server application. A production food-delivery marketplace needs clear boundaries between public client traffic, identity, catalog, ordering, dispatch, payments, notifications, and operational tooling without creating unnecessary microservices.

## Decision

Use a contract-first, domain-oriented architecture with a controlled public API/BFF boundary and independently deployable services where operational scaling or ownership justifies separation.

Target logical flow:

```text
Client Applications
        |
        v
   CDN / WAF
        |
        v
 Public API / BFF
   |     |      |
   v     v      v
Identity Catalog Orders
               |
               v
            Dispatch

Shared platform capabilities:
- PostgreSQL / domain data
- durable event/outbox delivery
- payment provider adapters
- notifications
- object storage
- observability
```

The initial implementation should not split every domain into a microservice. Domain boundaries must be explicit first; extraction is justified by independent scaling, deployment, security, or ownership requirements.

## Non-negotiable boundaries

- Internal service endpoints are not public APIs.
- Authentication and authorization are enforced server-side.
- Order state transitions are owned by the order domain/state machine.
- Payment state is confirmed by trusted provider events, not client claims.
- Dispatch state is owned by the dispatch domain.
- Sensitive identity, financial, and location data is exposed only through explicitly authorized APIs.
- Cross-service side effects use durable events/outbox mechanisms rather than unreliable fire-and-forget calls.

## Consequences

### Positive

- Clear ownership and reduced coupling.
- Safer evolution of customer, vendor, rider, and admin applications.
- API contracts can generate shared clients and validation.
- Critical workflows can be made idempotent and retryable.
- Services can scale independently when required.

### Trade-offs

- More operational complexity than a single application.
- Requires contract, observability, and integration testing discipline.
- Distributed workflows need explicit retry and failure handling.

## Migration priority

1. Define API ownership and public boundary.
2. Complete OpenAPI contract.
3. Standardize errors, request IDs, authentication, and authorization.
4. Replace fragile cross-service side effects with durable outbox/retry handling.
5. Add contract/integration tests before expanding domain functionality.
