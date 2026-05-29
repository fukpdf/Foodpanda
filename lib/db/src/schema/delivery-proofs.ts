import {
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { dispatches } from "./dispatches.js";
import { riders } from "./riders.js";

export const deliveryProofs = pgTable(
  "delivery_proofs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dispatchId: uuid("dispatch_id")
      .notNull()
      .references(() => dispatches.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").notNull(),
    riderId: uuid("rider_id")
      .notNull()
      .references(() => riders.id, { onDelete: "restrict" }),

    proofType: text("proof_type").notNull(),

    imageUrl: text("image_url").notNull(),

    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),

    notes: text("notes"),

    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("delivery_proofs_dispatch_id_idx").on(t.dispatchId),
    index("delivery_proofs_order_id_idx").on(t.orderId),
    index("delivery_proofs_rider_id_idx").on(t.riderId),
    index("delivery_proofs_proof_type_idx").on(t.proofType),
    index("delivery_proofs_recorded_at_idx").on(t.recordedAt),
  ],
);

export type DeliveryProof = typeof deliveryProofs.$inferSelect;
export type NewDeliveryProof = typeof deliveryProofs.$inferInsert;
