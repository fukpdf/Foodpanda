# API Governance

## Contract ownership

`lib/api-spec/openapi.yaml` is the source of truth for public HTTP APIs. Generated Zod schemas and React clients are derived artifacts and must not be edited as the primary contract.

## Current baseline

The OpenAPI contract currently describes the health endpoint. The application/services contain additional domain behavior that is not yet represented in the public contract. This is an explicit Phase 1 gap, not evidence that undocumented endpoints are production-ready.

## Rules for adding/changing an endpoint

1. Define the operation in OpenAPI first or in the same change.
2. Give the operation a stable `operationId`.
3. Define request parameters/body and response schemas.
4. Define authentication/security requirements explicitly.
5. Define stable error codes and HTTP status behavior.
6. Define pagination/filter/sort semantics for collections.
7. Add examples for non-trivial requests/responses.
8. Generate/update derived Zod/client artifacts using repository tooling.
9. Add integration/contract tests for the changed boundary.
10. Document backward-compatibility impact.

## Response principles

Public APIs must not expose raw database rows. Responses should be deliberately shaped for the consumer. Sensitive fields require explicit authorization. Mutation endpoints that may be retried must use idempotency where duplicate execution could create an incorrect financial or business result.

## Errors

Use machine-readable error codes, a human-readable message, and a request/correlation identifier. Do not expose stack traces, SQL details, secrets, internal hostnames, or provider credentials.

## Authentication

Authentication and authorization are server-side concerns. Client-provided roles, prices, payment state, delivery state, or permission claims are never trusted without verification.

## Compatibility

Prefer additive changes. Breaking changes require a documented migration plan and, where needed, an explicit API versioning/deprecation strategy.

## Phase 1 exit condition

All production-intended public endpoints have an OpenAPI definition, generated validation/client artifacts where applicable, integration/contract tests, documented authentication requirements, and stable error behavior.
