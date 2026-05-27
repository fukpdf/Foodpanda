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

export const dispatchAssignments = pgTable(
  "dispatch_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => ordersFoundation.id, { onDelete: "cascade" }),
    riderId: uuid("rider_id")
      .notNull()
      .references(() => riders.id, { onDelete: "restrict" }),

    status: dispatchStatusEnum("status").notNull().default("pending"),

    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),

    riderLatitudeAtAssignment: doublePrecision("rider_latitude_at_assignment"),
    riderLongitudeAtAssignment: doublePrecision("rider_longitude_at_assignment"),
    distanceToPickupMeters: integer("distance_to_pickup_meters"),
    estimatedPickupSeconds: integer("estimated_pickup_seconds"),
    estimatedDeliverySeconds: integer("estimated_delivery_seconds"),

    algorithm: text("algorithm").notNull().default("nearest_rider"),
    attemptNumber: integer("attempt_number").notNull().default(1),
    rejectionReason: text("rejection_reason"),

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
    index("dispatch_assignments_order_id_idx").on(t.orderId),
    index("dispatch_assignments_rider_id_idx").on(t.riderId),
    index("dispatch_assignments_status_idx").on(t.status),
    index("dispatch_assignments_assigned_at_idx").on(t.assignedAt),
    index("dispatch_assignments_order_status_idx").on(t.orderId, t.status),
  ],
);

export type DispatchAssignment = typeof dispatchAssignments.$inferSelect;
export type NewDispatchAssignment = typeof dispatchAssignments.$inferInsert;
