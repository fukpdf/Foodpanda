import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { orderStatusEnum } from "./enums.js";
import { customerAddresses } from "./customer-addresses.js";
import { riders } from "./riders.js";
import { users } from "./users.js";
import { vendorBranches } from "./vendor-branches.js";

export const ordersFoundation = pgTable(
  "orders_foundation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderNumber: text("order_number").notNull().unique(),

    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    vendorBranchId: uuid("vendor_branch_id")
      .notNull()
      .references(() => vendorBranches.id, { onDelete: "restrict" }),
    riderId: uuid("rider_id").references(() => riders.id, {
      onDelete: "set null",
    }),
    deliveryAddressId: uuid("delivery_address_id").references(
      () => customerAddresses.id,
      { onDelete: "set null" },
    ),

    status: orderStatusEnum("status").notNull().default("draft"),

    subtotalCents: integer("subtotal_cents").notNull().default(0),
    deliveryFeeCents: integer("delivery_fee_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    discountCents: integer("discount_cents").notNull().default(0),
    tipCents: integer("tip_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),

    currency: text("currency").notNull().default("USD"),

    paymentStatus: text("payment_status").notNull().default("unpaid"),
    paymentMethod: text("payment_method"),
    paymentReference: text("payment_reference"),

    deliveryLatitude: doublePrecision("delivery_latitude"),
    deliveryLongitude: doublePrecision("delivery_longitude"),
    deliveryAddressSnapshot: jsonb("delivery_address_snapshot")
      .$type<Record<string, unknown>>(),

    customerNote: text("customer_note"),
    vendorNote: text("vendor_note"),
    riderNote: text("rider_note"),

    estimatedPickupAt: timestamp("estimated_pickup_at", { withTimezone: true }),
    estimatedDeliveryAt: timestamp("estimated_delivery_at", {
      withTimezone: true,
    }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    preparedAt: timestamp("prepared_at", { withTimezone: true }),
    pickedUpAt: timestamp("picked_up_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),
    cancelledById: uuid("cancelled_by_id").references(() => users.id, {
      onDelete: "set null",
    }),

    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("orders_customer_id_idx").on(t.customerId),
    index("orders_vendor_branch_id_idx").on(t.vendorBranchId),
    index("orders_rider_id_idx").on(t.riderId),
    index("orders_status_idx").on(t.status),
    index("orders_payment_status_idx").on(t.paymentStatus),
    index("orders_order_number_idx").on(t.orderNumber),
    index("orders_created_at_idx").on(t.createdAt),
    index("orders_customer_created_idx").on(t.customerId, t.createdAt),
    index("orders_vendor_branch_status_idx").on(t.vendorBranchId, t.status),
  ],
);

export type OrderFoundation = typeof ordersFoundation.$inferSelect;
export type NewOrderFoundation = typeof ordersFoundation.$inferInsert;
