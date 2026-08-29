# Production Engineering Standards

## Quality gates

Every production change must pass the checks applicable to the affected packages:

1. TypeScript typecheck.
2. Lint/format checks where configured.
3. Unit tests.
4. Integration tests for changed boundaries.
5. API contract validation for API changes.
6. Security checks for authentication, authorization, data exposure, dependencies, and secrets.
7. Build verification.
8. Documentation update for changed behavior or architecture.

## API standards

- OpenAPI is the source of truth for public HTTP contracts.
- Validate input at the boundary.
- Use stable machine-readable error codes.
- Propagate a request/correlation ID.
- Paginate collection endpoints.
- Do not expose internal database models directly.
- Sensitive fields require explicit authorization and response shaping.
- Mutating operations with retry risk use idempotency where applicable.

## Database standards

- Schema changes are migration-based.
- Development-only schema push must not be the production migration strategy.
- Business-critical multi-write operations use transactions.
- Foreign keys, uniqueness, and indexes reflect domain invariants and query patterns.
- Destructive migrations require an explicit rollout/rollback plan.

## Security standards

- No secrets in source control.
- No secrets/tokens/passwords in logs.
- Server-side authorization is mandatory.
- Production authentication uses secure token/session handling.
- Internal service calls are authenticated.
- Webhook signatures are verified.
- File/document access uses private storage and authorization/signed access where applicable.
- Security-sensitive changes are reviewed against OWASP ASVS requirements.

## Reliability standards

- Critical workflows are idempotent.
- Cross-service side effects are durable and retryable.
- Failed asynchronous work has retry and dead-letter handling.
- Services expose liveness/readiness health information.
- Graceful shutdown is implemented for long-running services/workers.

## Observability standards

Production services emit structured logs and metrics and propagate request/trace correlation. Operational logs must avoid credentials, payment secrets, and unnecessary sensitive personal data.

## Frontend standards

- Responsive by default.
- Accessible to WCAG 2.2 AA target.
- Consistent design tokens/components.
- Loading, empty, error, offline, and success states are designed explicitly.
- Client must never be trusted for price, permission, order state, or payment success.
