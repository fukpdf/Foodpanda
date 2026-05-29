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
import { ordersFoundation } from "./orders.js";
import { payments } from "./payments.js";

export const paymentAttempts = pgTable(
  "payment_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),

    orderId: uuid("order_id")
      .notNull()
      .references(() => ordersFoundation.id, { onDelete: "restrict" }),

    attemptNumber: integer("attempt_number").notNull(),

    provider: text("provider").notNull().default("stripe"),

    providerAttemptId: text("provider_attempt_id"),

    status: text("status").notNull().default("initiated"),

    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("USD"),

    idempotencyKey: text("idempotency_key").notNull(),

    errorCode: text("error_code"),
    errorMessage: text("error_message"),

    providerResponse: jsonb("provider_response").$type<Record<string, unknown>>(),

    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("payment_attempts_idempotency_key_idx").on(t.idempotencyKey),
    index("payment_attempts_payment_id_idx").on(t.paymentId),
    index("payment_attempts_order_id_idx").on(t.orderId),
    index("payment_attempts_status_idx").on(t.status),
    index("payment_attempts_requested_at_idx").on(t.requestedAt),
  ],
);

export type PaymentAttempt = typeof paymentAttempts.$inferSelect;
export type NewPaymentAttempt = typeof paymentAttempts.$inferInsert;
