# Database Governance

## Source of truth

`lib/db` owns the shared database schema/access foundation during the current architecture stage. Schema changes must be represented in reviewed migrations.

## Production rule

The development `db:push` workflow is not the production migration strategy. Production schema changes require a migration, review, validation against the expected current schema, and an explicit rollout/rollback plan for destructive changes.

## Integrity

Use foreign keys, unique constraints, check constraints, and not-null requirements for invariants that belong at the data layer. Application validation remains necessary but must not be the only protection for critical invariants.

## Transactions

Operations that must succeed or fail together use a database transaction. This includes critical order/payment state changes and other multi-record mutations where partial completion would create an inconsistent business state.

## Concurrency

Race-prone operations require appropriate database constraints, transactions, locking, optimistic concurrency, or idempotency. Examples include inventory/availability, coupon usage, order state transitions, payment processing, rider assignment, and refunds.

## Indexing

Indexes are based on actual access patterns. Common operational queries such as orders by customer/vendor/status, dispatch offers by rider/status, and time-bounded operational views should be reviewed for appropriate indexes.

## Data lifecycle

Document retention and deletion rules for accounts, orders, payments, addresses, rider documents, reviews, audit logs, and notifications. Sensitive data must not be retained indefinitely without a documented reason.

## Migration safety

Before a destructive migration:

1. Identify all code/query dependencies.
2. Add compatibility changes where required.
3. Backfill safely and in bounded batches when applicable.
4. Validate counts/invariants.
5. Remove obsolete structures only after dependent code is migrated.

## Phase 1 exit condition

Critical schema invariants, migration ownership, transaction boundaries, and operational migration procedures are documented and enforced for the domains being promoted to production readiness.
