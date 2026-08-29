# Product Capability Matrix

This is the master capability inventory for a production-grade food-delivery marketplace. A capability is not considered complete until backend behavior, client UX, authorization, validation, observability, tests, and documentation are addressed as applicable.

## Customer

- Account registration/login/session management
- Address management and location selection
- Restaurant discovery, search, filtering, sorting
- Restaurant/branch detail
- Menu categories, items, variants, add-ons, availability
- Cart and server-side price validation
- Checkout and payment
- Coupons/promotions
- Order history and reorder
- Live order status and rider tracking
- Cancellation/refund eligibility
- Favorites
- Ratings/reviews
- Notifications
- Customer support

## Vendor / Restaurant

- Vendor onboarding and verification
- Branches and operating hours
- Delivery configuration
- Menu/category/item/modifier management
- Availability and stock-like controls
- Incoming order queue
- Accept/reject/preparation/ready workflow
- Promotions
- Reviews
- Earnings/payouts
- Analytics
- Staff roles and permissions

## Rider

- Onboarding and document verification
- Availability/online state
- Location updates
- Delivery offers
- Accept/reject/timeout
- Navigation/pickup/drop-off workflow
- Proof of delivery
- Earnings and history
- Performance metrics
- Support

## Admin / Operations

- Dashboard
- Customer/vendor/rider management
- Vendor and rider verification
- Order operations
- Payment/refund operations
- Promotions/campaigns
- Reviews/moderation
- Complaints/support
- Payout/commission operations
- Audit logs
- Feature flags/settings
- Analytics/reporting

## Platform capabilities

- Identity/authentication and RBAC
- API contract and versioning
- Idempotency
- Durable events/outbox
- Notifications
- Object storage
- Search
- Geolocation/distance/ETA
- Observability
- Rate limiting and abuse controls
- Security and privacy controls
- Automated testing and CI/CD
- Backup/restore and disaster recovery

## Completion rule

Each capability receives a status during implementation: `planned`, `in-progress`, `implemented`, `tested`, and `production-ready`. `implemented` alone does not mean production-ready.
