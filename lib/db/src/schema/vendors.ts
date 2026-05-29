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
import { vendorStatusEnum } from "./enums.js";
import { users } from "./users.js";

export const vendors = pgTable(
  "vendors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    logoUrl: text("logo_url"),
    bannerUrl: text("banner_url"),

    cuisineTypes: jsonb("cuisine_types").$type<string[]>().default([]),
    tags: jsonb("tags").$type<string[]>().default([]),

    businessRegistrationNumber: text("business_registration_number"),
    taxId: text("tax_id"),
    businessEmail: text("business_email"),
    businessPhone: text("business_phone"),

    status: vendorStatusEnum("status").notNull().default("pending_approval"),
    isActive: boolean("is_active").notNull().default(false),
    isFeatured: boolean("is_featured").notNull().default(false),

    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedById: uuid("approved_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),

    commissionRateBps: integer("commission_rate_bps").notNull().default(2000),

    averageRating: doublePrecision("average_rating"),
    totalRatingCount: integer("total_rating_count").notNull().default(0),
    totalOrderCount: integer("total_order_count").notNull().default(0),

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
    index("vendors_owner_user_id_idx").on(t.ownerUserId),
    index("vendors_slug_idx").on(t.slug),
    index("vendors_status_idx").on(t.status),
    index("vendors_is_active_idx").on(t.isActive),
    index("vendors_is_featured_idx").on(t.isFeatured),
    index("vendors_created_at_idx").on(t.createdAt),
    index("vendors_deleted_at_idx").on(t.deletedAt),
  ],
);

export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;
