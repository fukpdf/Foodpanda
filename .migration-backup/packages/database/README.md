# @deliveryos/database

Shared database layer for the DeliveryOS platform. Provides Drizzle ORM schemas, typed repositories, Zod validators, a migration system, and a seed runner.

## Usage

```ts
import { getDatabase, UserRepository } from "@deliveryos/database";

const db = getDatabase();
const userRepo = new UserRepository(db);

const user = await userRepo.findByEmail("alice@example.com");
```

## Scripts

| Command | Description |
|---|---|
| `pnpm db:generate` | Generate SQL migrations from schema changes |
| `pnpm db:migrate` | Apply pending migrations to the database |
| `pnpm db:push` | Push schema directly (dev only — skips migration files) |
| `pnpm db:studio` | Open Drizzle Studio (visual DB browser) |
| `pnpm db:seed` | Seed roles, permissions, and demo admin user |

Run from the workspace root with `--filter`:
```sh
pnpm --filter @deliveryos/database run db:generate
pnpm --filter @deliveryos/database run db:migrate
pnpm --filter @deliveryos/database run db:seed
```

## Environment variables

Copy `.env.example` to `.env` in this package or set at the service level:

```env
DATABASE_URL=postgres://deliveryos:secret@localhost:5432/deliveryos_dev
DATABASE_POOL_MAX=10
DATABASE_SSL=prefer
NODE_ENV=development
```

## Schema map

| Table | Description |
|---|---|
| `users` | Core identity — email, phone, role, status |
| `user_profiles` | Display info, wallet balance, referral tracking |
| `auth_sessions` | Device sessions with IP, UA, revocation |
| `refresh_tokens` | Token rotation with family-based theft detection |
| `roles` | System and custom roles |
| `user_roles` | Many-to-many user ↔ role with expiry |
| `permissions` | Resource:action pairs |
| `role_permissions` | Many-to-many role ↔ permission |
| `user_permissions` | Per-user permission overrides (grant or deny) |
| `vendors` | Restaurant/merchant entities |
| `vendor_branches` | Physical locations with geo + operating hours |
| `riders` | Delivery partners with vehicle + location data |
| `customer_addresses` | Saved delivery addresses with geo + instructions |
| `orders_foundation` | Order lifecycle foundation with full status machine |
| `audit_logs` | Immutable audit trail for all mutations |
