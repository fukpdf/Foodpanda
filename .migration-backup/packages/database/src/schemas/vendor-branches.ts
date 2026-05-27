import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { branchStatusEnum } from "./enums.js";
import { vendors } from "./vendors.js";

export const vendorBranches = pgTable(
  "vendor_branches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    slug: text("slug").notNull(),
    phone: text("phone"),
    email: text("email"),

    addressLine1: text("address_line1").notNull(),
    addressLine2: text("address_line2"),
    city: text("city").notNull(),
    state: text("state"),
    postalCode: text("postal_code"),
    country: text("country").notNull().default("US"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    geohash: text("geohash"),

    status: branchStatusEnum("status").notNull().default("active"),
    isMainBranch: boolean("is_main_branch").notNull().default(false),
    isPaused: boolean("is_paused").notNull().default(false),
    pauseReason: text("pause_reason"),

    preparationTimeMinutes: integer("preparation_time_minutes")
      .notNull()
      .default(20),
    deliveryRadiusKm: doublePrecision("delivery_radius_km").default(10),
    minimumOrderCents: integer("minimum_order_cents").notNull().default(0),
    deliveryFeeCents: integer("delivery_fee_cents").notNull().default(0),

    operatingHours: jsonb("operating_hours")
      .$type<Record<string, { open: string; close: string; closed?: boolean }>>()
      .default({}),

    totalOrderCount: integer("total_order_count").notNull().default(0),
    averageRating: doublePrecision("average_rating"),

    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("vendor_branches_vendor_id_idx").on(t.vendorId),
    index("vendor_branches_status_idx").on(t.status),
    index("vendor_branches_geohash_idx").on(t.geohash),
    index("vendor_branches_city_idx").on(t.city),
    index("vendor_branches_is_main_idx").on(t.isMainBranch),
    index("vendor_branches_deleted_at_idx").on(t.deletedAt),
  ],
);

export type VendorBranch = typeof vendorBranches.$inferSelect;
export type NewVendorBranch = typeof vendorBranches.$inferInsert;
