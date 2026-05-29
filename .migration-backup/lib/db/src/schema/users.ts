import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { isNotNull } from "drizzle-orm";
import {
  accountStatusEnum,
  authProviderEnum,
  userRoleEnum,
  verificationStatusEnum,
} from "./enums.js";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    email: text("email").notNull(),
    emailNormalized: text("email_normalized").notNull(),
    phone: text("phone"),
    phoneNormalized: text("phone_normalized"),
    passwordHash: text("password_hash"),

    primaryRole: userRoleEnum("primary_role").notNull().default("customer"),
    accountStatus: accountStatusEnum("account_status")
      .notNull()
      .default("pending_verification"),
    verificationStatus: verificationStatusEnum("verification_status")
      .notNull()
      .default("unverified"),
    authProvider: authProviderEnum("auth_provider")
      .notNull()
      .default("email_password"),
    externalId: text("external_id"),

    isEmailVerified: boolean("is_email_verified").notNull().default(false),
    isPhoneVerified: boolean("is_phone_verified").notNull().default(false),
    isTwoFactorEnabled: boolean("is_two_factor_enabled").notNull().default(false),

    bannedAt: timestamp("banned_at", { withTimezone: true }),
    banReason: text("ban_reason"),
    suspendedUntil: timestamp("suspended_until", { withTimezone: true }),

    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    lastLoginIp: text("last_login_ip"),

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
    uniqueIndex("users_email_normalized_unique").on(t.emailNormalized),
    uniqueIndex("users_phone_normalized_unique")
      .on(t.phoneNormalized)
      .where(isNotNull(t.phoneNormalized)),
    uniqueIndex("users_external_id_provider_unique")
      .on(t.externalId, t.authProvider)
      .where(isNotNull(t.externalId)),
    index("users_primary_role_idx").on(t.primaryRole),
    index("users_account_status_idx").on(t.accountStatus),
    index("users_created_at_idx").on(t.createdAt),
    index("users_deleted_at_idx").on(t.deletedAt),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
