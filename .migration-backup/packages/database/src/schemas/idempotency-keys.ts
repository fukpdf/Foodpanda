import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    key: text("key").notNull(),

    resourceType: text("resource_type").notNull(),

    resourceId: uuid("resource_id"),

    responseStatus: integer("response_status"),

    responseBody: jsonb("response_body").$type<Record<string, unknown>>(),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("idempotency_keys_key_idx").on(t.key),
    index("idempotency_keys_expires_at_idx").on(t.expiresAt),
    index("idempotency_keys_resource_idx").on(t.resourceType, t.resourceId),
  ],
);

export type IdempotencyKey = typeof idempotencyKeys.$inferSelect;
export type NewIdempotencyKey = typeof idempotencyKeys.$inferInsert;
