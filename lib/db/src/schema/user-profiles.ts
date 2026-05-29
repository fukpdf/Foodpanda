import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),

    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),

    dateOfBirth: text("date_of_birth"),
    gender: text("gender"),
    preferredLocale: text("preferred_locale").notNull().default("en"),
    preferredCurrency: text("preferred_currency").notNull().default("USD"),
    timezone: text("timezone").notNull().default("UTC"),

    referralCode: text("referral_code").unique(),
    referredByUserId: uuid("referred_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    totalOrderCount: integer("total_order_count").notNull().default(0),
    totalSpent: integer("total_spent_cents").notNull().default(0),
    walletBalanceCents: integer("wallet_balance_cents").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("user_profiles_user_id_idx").on(t.userId),
    index("user_profiles_referral_code_idx").on(t.referralCode),
    index("user_profiles_referred_by_idx").on(t.referredByUserId),
  ],
);

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
