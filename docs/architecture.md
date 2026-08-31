# System Architecture

## Goal
Build a secure, observable, scalable multi-sided food-delivery marketplace without unnecessary microservices.

## Current boundaries
- lib/db: PostgreSQL/Drizzle data model
- lib/api-spec: API contract source
- lib/api-zod: runtime validation
- lib/api-client-react: client layer
- services/order-service: order lifecycle, state machine, idempotency and events
- services/dispatch-service: dispatch, rider offers, location/geo and events
- artifacts/api-server: current edge/API server artifact; ownership requires clarification
- artifacts/mockup-sandbox: mockup/UI surface, not the complete production application

## Target
Internet traffic terminates at a controlled API/BFF boundary. Internal services are not directly trusted by clients. New services are introduced only for independent scaling, ownership or failure isolation.

## Critical flow
Customer -> API/BFF -> order/payment validation -> restaurant -> READY_FOR_PICKUP -> reliable dispatch event -> rider -> delivery.

## Reliability
Business-critical cross-service events must use a transactional outbox with retry, deduplication and dead-letter handling. Fire-and-forget network calls must not be the source of truth for business state.

## Data
Prices, permissions, payment state, order transitions and delivery state are server-authoritative.

## Observability
Requests and asynchronous work should carry trace/request identifiers. Logs must not contain credentials, bearer tokens, payment secrets or unnecessary sensitive identity data.