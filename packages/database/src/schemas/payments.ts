import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { paymentProviderEnum, paymentStatusEnum } from "./enums.js";
import { ordersFoundation } from "./orders.js";
import { users } from "./users.js";

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    orderId: uuid("order_id")
      .notNull()
      .references(() => ordersFoundation.id, { onDelete: "restrict" }),

    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    provider: paymentProviderEnum("provider").notNull().default("stripe"),

    providerPaymentId: text("provider_payment_id"),

    status: paymentStatusEnum("status").notNull().default("pending_provider"),

    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("USD"),

    idempotencyKey: text("idempotency_key").notNull(),

    attemptNumber: integer("attempt_number").notNull().default(1),

    description: text("description"),

    failureCode: text("failure_code"),
    failureMessage: text("failure_message"),

    expiresAt: timestamp("expires_at", { withTimezone: true }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    expiredAt: timestamp("expired_at", { withTimezone: true }),

    requiresAction: boolean("requires_action").notNull().default(false),
    nextActionType: text("next_action_type"),

    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("payments_idempotency_key_idx").on(t.idempotencyKey),
    uniqueIndex("payments_provider_payment_id_idx").on(t.providerPaymentId),
    index("payments_order_id_idx").on(t.orderId),
    index("payments_customer_id_idx").on(t.customerId),
    index("payments_status_idx").on(t.status),
    index("payments_provider_id_idx").on(t.provider),
    index("payments_created_at_idx").on(t.createdAt),
    index("payments_order_status_idx").on(t.orderId, t.status),
    index("payments_customer_created_idx").on(t.customerId, t.createdAt),
    index("payments_expires_at_idx").on(t.expiresAt),
  ],
);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
