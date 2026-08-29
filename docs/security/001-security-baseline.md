# Security Baseline

## Principles

The platform follows least privilege, deny-by-default authorization, server-side validation, secure secret handling, and explicit trust boundaries.

## Secrets

Production credentials must come from the deployment secret manager/environment. Never commit passwords, API keys, private keys, signing secrets, session tokens, or payment credentials. Do not use production fallback secrets.

## Authentication

The identity layer owns credential verification and session/token lifecycle. Access tokens/sessions must have bounded lifetime, explicit revocation/logout behavior, and secure transport. Passwords are stored only as strong one-way password hashes using an approved password-hashing scheme; plaintext or reversible password storage is prohibited.

## Authorization

Authentication answers who the caller is; authorization answers what they may do. Every privileged mutation checks the authenticated principal and resource ownership/role/permission on the server. Client-supplied role, price, order status, payment status, or vendor identity is never trusted.

## Service-to-service trust

Internal endpoints are not public endpoints. Service calls require authenticated service identity and least-privilege credentials. Internal credentials are not returned to client applications.

## Payments and webhooks

Payment success is confirmed from the trusted payment provider/server-side state. Webhooks require signature verification, replay/idempotency protection, and durable processing. Payment secrets must never be logged.

## Sensitive data

Customer addresses/location, rider identity documents, financial information, and other sensitive data are exposed only by explicitly authorized endpoints. Private files use private storage and controlled/signed access where appropriate.

## Input and output safety

Validate untrusted input at boundaries. Apply size/type limits to uploads. Shape API responses deliberately and avoid returning internal database records wholesale. Prevent injection by using parameterized/typed database APIs and safe query construction.

## Abuse controls

Authentication, checkout, payment, coupon, review, password-reset, and webhook endpoints require appropriate rate limits or replay protection. Expensive operations must have bounded resource consumption.

## Logging

Logs may contain operational identifiers such as request ID and event type, but must not contain passwords, raw tokens, private keys, payment secrets, or unnecessary sensitive personal data.

## Security testing

Security-sensitive changes should be reviewed against OWASP ASVS principles and covered by negative authorization tests, validation tests, dependency scanning, secret scanning, and relevant end-to-end scenarios.

## Incident response

Security incidents require credential rotation/revocation, containment, evidence preservation, impact assessment, remediation, and a documented post-incident review. Recovery procedures belong under `docs/operations/`.
