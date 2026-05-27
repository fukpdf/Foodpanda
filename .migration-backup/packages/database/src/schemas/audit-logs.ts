import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { auditActionEnum } from "./enums.js";
import { users } from "./users.js";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    actorRole: text("actor_role"),
    actorIp: text("actor_ip"),
    actorUserAgent: text("actor_user_agent"),
    sessionId: uuid("session_id"),

    action: auditActionEnum("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),

    previousValue: jsonb("previous_value").$type<Record<string, unknown>>(),
    newValue: jsonb("new_value").$type<Record<string, unknown>>(),
    diff: jsonb("diff").$type<Record<string, unknown>>(),

    reason: text("reason"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_logs_actor_id_idx").on(t.actorId),
    index("audit_logs_action_idx").on(t.action),
    index("audit_logs_entity_type_idx").on(t.entityType),
    index("audit_logs_entity_id_idx").on(t.entityId),
    index("audit_logs_entity_type_entity_id_idx").on(t.entityType, t.entityId),
    index("audit_logs_occurred_at_idx").on(t.occurredAt),
    index("audit_logs_actor_occurred_idx").on(t.actorId, t.occurredAt),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
