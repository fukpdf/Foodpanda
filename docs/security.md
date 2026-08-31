# Security Baseline

## Target
OWASP ASVS Level 2 is the practical application-security baseline, with stronger controls for payments, privileged administration and highly sensitive identity data.

## Authentication
Registration, login, logout, session/access-token handling, refresh, verification, recovery and optional MFA are required capabilities.

## Authorization
Use deny-by-default server-side authorization with explicit permissions for customer, vendor owner, vendor staff, rider, support, finance and admin roles.

## Sensitive data
Classify data as public, internal, confidential or highly sensitive. Rider identity documents, bank information, precise location history and authentication material require strict access controls and must not appear in logs or broad API responses.

## Secrets
Secrets come from runtime secret management. No production fallback secrets. Current-tree secret pattern scans found no obvious committed live secret, but historical scanning remains required.

## Supply chain
Keep pnpm minimum release-age protection. Every allowlist exception needs a documented reason, owner and review/removal date.

## Gates
Dependency scan, secret/history scan, authentication tests, authorization matrix tests, webhook signature tests, validation/rate-limit tests, CORS/security-header review and audit-log review.