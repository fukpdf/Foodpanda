import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { ordersFoundation } from "./orders.js";

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => ordersFoundation.id, { onDelete: "cascade" }),

    menuItemId: uuid("menu_item_id"),
    menuItemName: text("menu_item_name").notNull(),
    menuItemDescription: text("menu_item_description"),
    menuItemImageUrl: text("menu_item_image_url"),

    quantity: integer("quantity").notNull().default(1),
    unitPriceCents: integer("unit_price_cents").notNull(),
    totalPriceCents: integer("total_price_cents").notNull(),

    modifiers: jsonb("modifiers")
      .$type<Array<{ name: string; priceCents: number; quantity?: number }>>()
      .default([]),

    specialInstructions: text("special_instructions"),

    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("order_items_order_id_idx").on(t.orderId),
    index("order_items_menu_item_id_idx").on(t.menuItemId),
  ],
);

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
