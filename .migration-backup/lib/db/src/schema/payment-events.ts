import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { paymentStatusEnum } from "./enums.js";
import { ordersFoundation } from "./orders.js";
import { payments } from "./payments.js";

export const paymentEvents = pgTable(
  "payment_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),

    orderId: uuid("order_id")
      .notNull()
      .references(() => ordersFoundation.id, { onDelete: "restrict" }),

    eventType: text("event_type").notNull(),

    fromStatus: paymentStatusEnum("from_status"),
    toStatus: paymentStatusEnum("to_status").notNull(),

    actorId: uuid("actor_id"),
    actorType: text("actor_type").notNull().default("system"),

    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("payment_events_payment_id_idx").on(t.paymentId),
    index("payment_events_order_id_idx").on(t.orderId),
    index("payment_events_event_type_idx").on(t.eventType),
    index("payment_events_occurred_at_idx").on(t.occurredAt),
    index("payment_events_payment_occurred_idx").on(t.paymentId, t.occurredAt),
  ],
);

export type PaymentEvent = typeof paymentEvents.$inferSelect;
export type NewPaymentEvent = typeof paymentEvents.$inferInsert;
