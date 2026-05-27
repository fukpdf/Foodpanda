import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sessionStatusEnum } from "./enums.js";
import { users } from "./users.js";

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    sessionToken: text("session_token").notNull().unique(),
    status: sessionStatusEnum("status").notNull().default("active"),

    deviceId: text("device_id"),
    deviceName: text("device_name"),
    deviceType: text("device_type"),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    country: text("country"),
    city: text("city"),

    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokeReason: text("revoke_reason"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("auth_sessions_user_id_idx").on(t.userId),
    index("auth_sessions_token_idx").on(t.sessionToken),
    index("auth_sessions_status_idx").on(t.status),
    index("auth_sessions_expires_at_idx").on(t.expiresAt),
    index("auth_sessions_device_id_idx").on(t.deviceId),
  ],
);

export type AuthSession = typeof authSessions.$inferSelect;
export type NewAuthSession = typeof authSessions.$inferInsert;
