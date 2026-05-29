import {
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { ordersFoundation } from "./orders.js";
import { riders } from "./riders.js";

export const riderLocations = pgTable(
  "rider_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    riderId: uuid("rider_id")
      .notNull()
      .references(() => riders.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => ordersFoundation.id, {
      onDelete: "set null",
    }),

    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    geohash: text("geohash").notNull(),

    accuracyMeters: doublePrecision("accuracy_meters"),
    speedMps: doublePrecision("speed_mps"),
    headingDegrees: doublePrecision("heading_degrees"),

    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("rider_locations_rider_id_idx").on(t.riderId),
    index("rider_locations_order_id_idx").on(t.orderId),
    index("rider_locations_geohash_idx").on(t.geohash),
    index("rider_locations_recorded_at_idx").on(t.recordedAt),
    index("rider_locations_rider_recorded_idx").on(t.riderId, t.recordedAt),
  ],
);

export type RiderLocation = typeof riderLocations.$inferSelect;
export type NewRiderLocation = typeof riderLocations.$inferInsert;
