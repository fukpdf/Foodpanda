import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { dispatchStatusEnum } from "./enums.js";
import { ordersFoundation } from "./orders.js";
import { riders } from "./riders.js";

export const dispatches = pgTable(
  "dispatches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .unique()
      .references(() => ordersFoundation.id, { onDelete: "restrict" }),

    status: dispatchStatusEnum("status").notNull().default("offer_pending"),

    currentRiderId: uuid("current_rider_id").references(() => riders.id, {
      onDelete: "set null",
    }),

    totalAttempts: integer("total_attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(10),
    algorithm: text("algorithm").notNull().default("multi_factor"),

    pickupLatitude: doublePrecision("pickup_latitude").notNull(),
    pickupLongitude: doublePrecision("pickup_longitude").notNull(),
    dropoffLatitude: doublePrecision("dropoff_latitude").notNull(),
    dropoffLongitude: doublePrecision("dropoff_longitude").notNull(),

    dispatchedAt: timestamp("dispatched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    riderAcceptedAt: timestamp("rider_accepted_at", { withTimezone: true }),
    arrivedVendorAt: timestamp("arrived_vendor_at", { withTimezone: true }),
    pickedUpAt: timestamp("picked_up_at", { withTimezone: true }),
    inTransitAt: timestamp("in_transit_at", { withTimezone: true }),
    arrivedCustomerAt: timestamp("arrived_customer_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),

    estimatedPickupAt: timestamp("estimated_pickup_at", { withTimezone: true }),
    estimatedDeliveryAt: timestamp("estimated_delivery_at", {
      withTimezone: true,
    }),

    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("dispatches_order_id_idx").on(t.orderId),
    index("dispatches_status_idx").on(t.status),
    index("dispatches_current_rider_id_idx").on(t.currentRiderId),
    index("dispatches_dispatched_at_idx").on(t.dispatchedAt),
    index("dispatches_status_dispatched_idx").on(t.status, t.dispatchedAt),
  ],
);

export type Dispatch = typeof dispatches.$inferSelect;
export type NewDispatch = typeof dispatches.$inferInsert;
