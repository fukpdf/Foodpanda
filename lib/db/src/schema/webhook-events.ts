import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    provider: text("provider").notNull().default("stripe"),

    providerEventId: text("provider_event_id").notNull(),

    type: text("type").notNull(),

    paymentId: uuid("payment_id"),

    status: text("status").notNull().default("received"),

    processingError: text("processing_error"),

    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>(),

    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("webhook_events_provider_event_id_idx").on(t.provider, t.providerEventId),
    index("webhook_events_type_idx").on(t.type),
    index("webhook_events_status_idx").on(t.status),
    index("webhook_events_payment_id_idx").on(t.paymentId),
    index("webhook_events_received_at_idx").on(t.receivedAt),
  ],
);

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
