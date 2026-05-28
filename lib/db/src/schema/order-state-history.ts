import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { orderStatusEnum } from "./enums.js";
import { ordersFoundation } from "./orders.js";
import { users } from "./users.js";

export const orderStateHistory = pgTable(
  "order_state_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => ordersFoundation.id, { onDelete: "cascade" }),

    fromState: orderStatusEnum("from_state"),
    toState: orderStatusEnum("to_state").notNull(),

    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorRole: text("actor_role"),

    reason: text("reason"),
    note: text("note"),

    eventType: text("event_type").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    transitionedAt: timestamp("transitioned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("order_state_history_order_id_idx").on(t.orderId),
    index("order_state_history_from_state_idx").on(t.fromState),
    index("order_state_history_to_state_idx").on(t.toState),
    index("order_state_history_transitioned_at_idx").on(t.transitionedAt),
    index("order_state_history_actor_id_idx").on(t.actorId),
  ],
);

export type OrderStateHistory = typeof orderStateHistory.$inferSelect;
export type NewOrderStateHistory = typeof orderStateHistory.$inferInsert;
