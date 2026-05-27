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
import { riderAvailabilityEnum, riderStatusEnum, vehicleTypeEnum } from "./enums.js";
import { users } from "./users.js";

export const riders = pgTable(
  "riders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "restrict" }),

    status: riderStatusEnum("status").notNull().default("pending_verification"),
    availability: riderAvailabilityEnum("availability").notNull().default("offline"),

    vehicleType: vehicleTypeEnum("vehicle_type").notNull().default("motorcycle"),
    vehicleMake: text("vehicle_make"),
    vehicleModel: text("vehicle_model"),
    vehicleYear: integer("vehicle_year"),
    vehiclePlate: text("vehicle_plate"),
    vehicleColor: text("vehicle_color"),
    vehicleRegistrationUrl: text("vehicle_registration_url"),

    licenseNumber: text("license_number"),
    licenseExpiryDate: text("license_expiry_date"),
    nationalIdUrl: text("national_id_url"),
    selfieUrl: text("selfie_url"),

    isVerified: boolean("is_verified").notNull().default(false),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedById: uuid("verified_by_id").references(() => users.id, {
      onDelete: "set null",
    }),

    currentLatitude: doublePrecision("current_latitude"),
    currentLongitude: doublePrecision("current_longitude"),
    currentGeohash: text("current_geohash"),
    locationUpdatedAt: timestamp("location_updated_at", { withTimezone: true }),

    lastOnlineAt: timestamp("last_online_at", { withTimezone: true }),
    totalDeliveries: integer("total_deliveries").notNull().default(0),
    totalEarningsCents: integer("total_earnings_cents").notNull().default(0),
    averageRating: doublePrecision("average_rating"),
    totalRatingCount: integer("total_rating_count").notNull().default(0),

    bankAccountDetails: jsonb("bank_account_details")
      .$type<{ bankName?: string; accountNumber?: string; routingNumber?: string }>()
      .default({}),

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
    index("riders_user_id_idx").on(t.userId),
    index("riders_status_idx").on(t.status),
    index("riders_availability_idx").on(t.availability),
    index("riders_vehicle_type_idx").on(t.vehicleType),
    index("riders_current_geohash_idx").on(t.currentGeohash),
    index("riders_is_verified_idx").on(t.isVerified),
    index("riders_last_online_at_idx").on(t.lastOnlineAt),
    index("riders_deleted_at_idx").on(t.deletedAt),
  ],
);

export type Rider = typeof riders.$inferSelect;
export type NewRider = typeof riders.$inferInsert;
