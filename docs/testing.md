# Testing and Quality Strategy

## Layers
1. Type checking
2. Unit tests
3. Integration tests
4. API contract tests
5. Database/migration tests
6. Security/authorization tests
7. End-to-end tests
8. Build verification

## Critical scenarios
Authentication, restaurant discovery, menu availability, cart price revalidation, checkout/payment, order idempotency, restaurant workflow, state-machine transitions, dispatch retry, rider offer/timeout, pickup/delivery, cancellation/refund and privileged admin actions.

## Quality rule
No critical feature is complete from source inspection alone. PASS requires reproducible evidence from the relevant automated checks.

## CI
The repository has a GitHub Actions quality workflow for frozen dependency installation, typecheck and build. Runtime versions must match the supported repository runtime.