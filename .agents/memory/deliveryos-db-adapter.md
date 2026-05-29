---
name: DeliveryOS workspace DB adapter
description: How to use @workspace/db singleton in service packages — no createDatabase, drizzle-orm imports, type casting
---

# @workspace/db adapter pattern

## The rule
`@workspace/db` exports `db` as a pre-built singleton (`drizzle(pool, {schema})`). There is NO `createDatabase` function. Services import `db` directly and cast its type for internal use.

**Why:** The migration-backup used `@deliveryos/database` which had `createDatabase(url)`. The workspace DB package creates the drizzle instance once at load time using `process.env.DATABASE_URL`.

## How to apply

In any service that needs the DB:

```typescript
// server.ts
import { db } from "@workspace/db";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

const typedDb = db as NodePgDatabase<Record<string, unknown>>;
```

In repos/services, type the parameter as:
```typescript
type Database = NodePgDatabase<Record<string, unknown>>;
// constructor(private readonly db: Database) {}
```

For drizzle operators (`eq`, `and`, `desc`, `lt`, `isNull`, etc.) import from `drizzle-orm` directly:
```typescript
import { eq, and, desc } from "drizzle-orm";
```

NOT from `@deliveryos/database/drizzle` (migration-backup pattern, does not exist in workspace).

## Schema types
All schema row types (`OrderFoundation`, `OrderItem`, `OrderStateHistory`, `DispatchAssignment`, etc.) are re-exported via `export * from "./schema/index.js"` from `@workspace/db`. Import them as:
```typescript
import type { OrderFoundation } from "@workspace/db";
```

`PaginatedResult` is NOT in `@workspace/db` — define locally in each service.
`Database` type is NOT in `@workspace/db` — derive from `typeof db` or use `NodePgDatabase<Record<string,unknown>>`.
