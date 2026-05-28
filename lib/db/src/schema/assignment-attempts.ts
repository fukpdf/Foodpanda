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
import { dispatches } from "./dispatches.js";
import { riders } from "./riders.js";

export const assignmentAttempts = pgTable(
  "assignment_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dispatchId: uuid("dispatch_id")
      .notNull()
      .references(() => dispatches.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").notNull(),
    riderId: uuid("rider_id")
      .notNull()
      .references(() => riders.id, { onDelete: "restrict" }),

    attemptNumber: integer("attempt_number").notNull(),
    status: dispatchStatusEnum("status").notNull().default("offer_pending"),

    scoreTotal: doublePrecision("score_total"),
    scoreDistance: doublePrecision("score_distance"),
    scoreWorkload: doublePrecision("score_workload"),
    scoreAcceptanceRate: doublePrecision("score_acceptance_rate"),
    scoreRating: doublePrecision("score_rating"),
    scoreVendorProximity: doublePrecision("score_vendor_proximity"),

    riderLatitude: doublePrecision("rider_latitude"),
    riderLongitude: doublePrecision("rider_longitude"),
    distanceToPickupM: integer("distance_to_pickup_m"),
    estimatedPickupSecs: integer("estimated_pickup_secs"),
    estimatedDeliverySecs: integer("estimated_delivery_secs"),

    offeredAt: timestamp("offered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
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
    index("assignment_attempts_dispatch_id_idx").on(t.dispatchId),
    index("assignment_attempts_rider_id_idx").on(t.riderId),
    index("assignment_attempts_order_id_idx").on(t.orderId),
    index("assignment_attempts_status_idx").on(t.status),
    index("assignment_attempts_expires_at_idx").on(t.expiresAt),
    index("assignment_attempts_dispatch_attempt_idx").on(
      t.dispatchId,
      t.attemptNumber,
    ),
  ],
);

export type AssignmentAttempt = typeof assignmentAttempts.$inferSelect;
export type NewAssignmentAttempt = typeof assignmentAttempts.$inferInsert;
