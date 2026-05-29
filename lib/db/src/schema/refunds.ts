import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { refundReasonEnum, refundStatusEnum } from "./enums.js";
import { ordersFoundation } from "./orders.js";
import { payments } from "./payments.js";
import { users } from "./users.js";

export const refunds = pgTable(
  "refunds",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "restrict" }),

    orderId: uuid("order_id")
      .notNull()
      .references(() => ordersFoundation.id, { onDelete: "restrict" }),

    provider: text("provider").notNull().default("stripe"),

    providerRefundId: text("provider_refund_id"),

    status: refundStatusEnum("status").notNull().default("pending"),

    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("USD"),

    reason: refundReasonEnum("reason").notNull().default("requested_by_customer"),

    initiatedById: uuid("initiated_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    initiatedByRole: text("initiated_by_role"),

    idempotencyKey: text("idempotency_key").notNull(),

    failureReason: text("failure_reason"),

    processedAt: timestamp("processed_at", { withTimezone: true }),

    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("refunds_idempotency_key_idx").on(t.idempotencyKey),
    uniqueIndex("refunds_provider_refund_id_idx").on(t.providerRefundId),
    index("refunds_payment_id_idx").on(t.paymentId),
    index("refunds_order_id_idx").on(t.orderId),
    index("refunds_status_idx").on(t.status),
    index("refunds_created_at_idx").on(t.createdAt),
    index("refunds_provider_id_idx").on(t.provider, t.providerRefundId),
  ],
);

export type Refund = typeof refunds.$inferSelect;
export type NewRefund = typeof refunds.$inferInsert;
