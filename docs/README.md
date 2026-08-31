# Foodpanda Platform Engineering Documentation

This directory is the authoritative engineering documentation for the platform.

## Map
- architecture.md — system boundaries and reliability
- api-contract.md — public API contract rules
- security.md — security baseline
- testing.md — quality and verification
- product-capabilities.md — product capability matrix
- roadmap.md — phase roadmap

## Rules
1. Cross-service architecture decisions are documented before implementation.
2. Public APIs are represented by OpenAPI and validated at runtime.
3. Security-sensitive behavior documents authentication, authorization and data exposure.
4. Production capabilities require automated regression coverage.
5. PASS means repository/build/test evidence has verified the requirement.

## Current truth
The repository contains meaningful order and dispatch backend foundations, shared database/API libraries and workspace tooling. Customer, vendor, rider and admin surfaces are not yet a complete end-to-end marketplace.