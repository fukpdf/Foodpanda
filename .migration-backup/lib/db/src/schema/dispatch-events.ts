import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { dispatches } from "./dispatches.js";
import { riders } from "./riders.js";
import { users } from "./users.js";

export const dispatchEvents = pgTable(
  "dispatch_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dispatchId: uuid("dispatch_id")
      .notNull()
      .references(() => dispatches.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").notNull(),

    riderId: uuid("rider_id").references(() => riders.id, {
      onDelete: "set null",
    }),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    actorRole: text("actor_role"),

    eventType: text("event_type").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),

    payload: jsonb("payload").$type<Record<string, unknown>>(),

    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("dispatch_events_dispatch_id_idx").on(t.dispatchId),
    index("dispatch_events_order_id_idx").on(t.orderId),
    index("dispatch_events_rider_id_idx").on(t.riderId),
    index("dispatch_events_event_type_idx").on(t.eventType),
    index("dispatch_events_occurred_at_idx").on(t.occurredAt),
    index("dispatch_events_dispatch_occurred_idx").on(t.dispatchId, t.occurredAt),
  ],
);

export type DispatchEvent = typeof dispatchEvents.$inferSelect;
export type NewDispatchEvent = typeof dispatchEvents.$inferInsert;
