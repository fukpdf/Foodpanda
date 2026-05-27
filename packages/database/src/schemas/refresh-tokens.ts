import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authSessions } from "./auth-sessions.js";
import { users } from "./users.js";

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => authSessions.id, { onDelete: "cascade" }),

    tokenHash: text("token_hash").notNull().unique(),
    familyId: uuid("family_id").notNull(),

    isUsed: boolean("is_used").notNull().default(false),
    isRevoked: boolean("is_revoked").notNull().default(false),

    usedAt: timestamp("used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("refresh_tokens_user_id_idx").on(t.userId),
    index("refresh_tokens_session_id_idx").on(t.sessionId),
    index("refresh_tokens_family_id_idx").on(t.familyId),
    index("refresh_tokens_token_hash_idx").on(t.tokenHash),
    index("refresh_tokens_expires_at_idx").on(t.expiresAt),
    index("refresh_tokens_is_used_idx").on(t.isUsed),
    index("refresh_tokens_is_revoked_idx").on(t.isRevoked),
  ],
);

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
