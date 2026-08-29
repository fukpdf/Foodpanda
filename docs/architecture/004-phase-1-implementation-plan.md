# Phase 1 Implementation Plan

## Objective

Turn the existing repository foundation into a governed production-grade platform without prematurely splitting everything into microservices or discarding working domain code.

## Workstreams

### 1. Architecture and contracts

- Define the public API/BFF boundary.
- Inventory every existing HTTP endpoint.
- Make OpenAPI authoritative for public APIs.
- Standardize response envelopes, errors, pagination, request IDs, idempotency and versioning.
- Keep internal service endpoints private and authenticated.

### 2. Configuration and secrets

- Centralize environment parsing and validation per runtime.
- Fail closed when required production secrets/configuration are missing.
- Remove unsafe defaults and accidental credential logging.
- Document development/staging/production configuration separately.

### 3. Identity and access

- Establish authentication/session model.
- Implement refresh-token/session rotation and revocation where applicable.
- Define RBAC and least-privilege permissions for customer, vendor owner/staff, rider, admin, support and finance roles.
- Ensure every privileged endpoint performs server-side authorization.

### 4. Database governance

- Inventory schema ownership and migrations.
- Treat development schema push as development-only.
- Add/verify integrity constraints and indexes based on access patterns.
- Define transaction boundaries for business-critical operations.
- Define data classification and retention rules for sensitive customer/rider/payment data.

### 5. Reliable distributed workflows

- Replace critical fire-and-forget cross-service mutations with durable outbox events.
- Add retry/backoff and dead-letter handling.
- Make consumers idempotent.
- Define event names, payload versions, ownership and delivery guarantees.

### 6. Observability and operations

- Standardize structured logging and request correlation.
- Add service health/readiness checks.
- Define metrics for API latency, errors, database health, queue/outbox lag, dispatch success and payment failures.
- Ensure graceful shutdown for services/workers.

### 7. Testing and CI

- Establish unit, integration, API contract and end-to-end test conventions.
- Cover order state transitions and authorization as mandatory business-critical tests.
- Add CI quality gates for typecheck, tests, contract validation, build, dependency/security checks and migration validation.

### 8. Documentation

- Maintain ADRs for architectural decisions.
- Maintain product capability matrix.
- Document local development, environment variables, database lifecycle, deployment, rollback and incident procedures.
- Update docs whenever implementation changes the contract.

## Implementation order

1. Configuration baseline and API inventory.
2. Public API contract and shared error conventions.
3. Authentication/RBAC boundary.
4. Database/migration governance.
5. Outbox/retry reliability.
6. Observability.
7. Testing foundation and CI.
8. Documentation and final Phase 1 audit.

## Exit criteria

Phase 1 is complete only when:

- public API ownership is unambiguous;
- OpenAPI covers the implemented public API surface;
- configuration is validated and unsafe defaults are removed;
- authentication and authorization have explicit tests;
- critical cross-service effects are durable/idempotent;
- migration and data-protection rules are documented;
- health, logging and correlation are standardized;
- CI runs the agreed quality gates;
- critical order/payment/dispatch workflows have automated coverage;
- documentation reflects the implementation;
- a final regression/security audit finds no unresolved critical or high-severity Phase-1 blocker.

## Non-goals

Do not build the full customer/vendor/rider/admin product in this phase. Those are downstream product implementation phases. Do not add microservices merely for architectural appearance.
