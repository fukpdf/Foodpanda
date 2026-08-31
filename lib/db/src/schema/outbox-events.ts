import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const outboxStatusEnum = pgEnum("outbox_status", ["pending", "processing", "published", "dead_letter"]);\n\nexport const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventType: text("event_type").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),\n    status: outboxStatusEnum("status").notNull().default("pending"),\n    lockedAt: timestamp("locked_at", { withTimezone: true }),\n    lockedBy: text("locked_by"),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
  },
  (t) => [
    index("outbox_events_pending_idx").on(t.status, t.availableAt, t.occurredAt),
    index("outbox_events_aggregate_idx").on(t.aggregateType, t.aggregateId),
  ],
);

export type OutboxEvent = typeof outboxEvents.$inferSelect;
export type NewOutboxEvent = typeof outboxEvents.$inferInsert;
