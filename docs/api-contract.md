# API Contract Standard

## Source of truth
OpenAPI is the public API contract. Zod schemas and generated clients must remain aligned with it.

## Every production endpoint defines
- method/path
- authentication and authorization
- request schema
- success response
- documented errors
- idempotency requirements where applicable
- pagination/filter semantics where applicable
- examples for non-trivial payloads

## Response envelope
Success: { success: true, data, meta }
Error: { success: false, error: { code, message, requestId } }

## Security
Never expose password hashes, refresh-token material, internal service credentials, payment secrets, rider identity documents or bank information through generic APIs.

## Idempotency
Order creation, payment mutations, refunds, webhook processing and dispatch initiation must be safe against retries.

## Current gap
The existing OpenAPI specification does not yet describe the full order/dispatch/platform surface. Expanding implementation without updating the contract is prohibited by the Phase 1 quality gate.