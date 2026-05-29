import {
  boolean,
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { addressLabelEnum } from "./enums.js";
import { users } from "./users.js";

export const customerAddresses = pgTable(
  "customer_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    label: addressLabelEnum("label").notNull().default("home"),
    customLabel: text("custom_label"),

    recipientName: text("recipient_name"),
    recipientPhone: text("recipient_phone"),

    addressLine1: text("address_line1").notNull(),
    addressLine2: text("address_line2"),
    apartment: text("apartment"),
    floor: text("floor"),
    building: text("building"),
    city: text("city").notNull(),
    state: text("state"),
    postalCode: text("postal_code"),
    country: text("country").notNull().default("US"),

    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    geohash: text("geohash"),

    deliveryInstructions: text("delivery_instructions"),
    accessCode: text("access_code"),
    landmark: text("landmark"),

    isDefault: boolean("is_default").notNull().default(false),
    isVerified: boolean("is_verified").notNull().default(false),

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
    index("customer_addresses_user_id_idx").on(t.userId),
    index("customer_addresses_is_default_idx").on(t.isDefault),
    index("customer_addresses_geohash_idx").on(t.geohash),
    index("customer_addresses_city_idx").on(t.city),
    index("customer_addresses_deleted_at_idx").on(t.deletedAt),
  ],
);

export type CustomerAddress = typeof customerAddresses.$inferSelect;
export type NewCustomerAddress = typeof customerAddresses.$inferInsert;
