import { z } from "zod";

export const orderItemSchema = z.object({
  menuItemId: z.string().uuid().optional(),
  menuItemName: z.string().min(1).max(255),
  menuItemDescription: z.string().max(1000).optional(),
  menuItemImageUrl: z.string().url().optional(),
  quantity: z.number().int().min(1).max(99),
  unitPriceCents: z.number().int().min(1).max(100_000_00),
  modifiers: z
    .array(
      z.object({
        name: z.string().min(1),
        priceCents: z.number().int().min(0),
        quantity: z.number().int().min(1).optional(),
      }),
    )
    .max(20)
    .optional()
    .default([]),
  specialInstructions: z.string().max(500).optional(),
});

export const createOrderSchema = z.object({
  vendorBranchId: z.string().uuid("vendorBranchId must be a valid UUID"),
  deliveryAddressId: z.string().uuid().optional(),
  items: z
    .array(orderItemSchema)
    .min(1, "Order must have at least one item")
    .max(50, "Order cannot exceed 50 items"),
  deliveryLatitude: z.number().min(-90).max(90).optional(),
  deliveryLongitude: z.number().min(-180).max(180).optional(),
  deliveryAddressSnapshot: z.record(z.unknown()).optional(),
  customerNote: z.string().max(500).optional(),
  paymentMethod: z
    .enum(["card", "cash", "wallet", "apple_pay", "google_pay"])
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const transitionOrderSchema = z.object({
  toState: z.enum([
    "CREATED",
    "PAYMENT_PENDING",
    "CONFIRMED",
    "ACCEPTED_BY_VENDOR",
    "PREPARING",
    "READY_FOR_PICKUP",
    "RIDER_ASSIGNED",
    "PICKED_UP",
    "ON_THE_WAY",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
  ]),
  reason: z.string().max(500).optional(),
  note: z.string().max(1000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().min(1, "Cancellation reason is required").max(500),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum([
      "draft",
      "pending",
      "confirmed",
      "accepted_by_vendor",
      "preparing",
      "ready_for_pickup",
      "assigned_to_rider",
      "picked_up",
      "in_transit",
      "delivered",
      "cancelled",
      "refunded",
      "failed",
    ])
    .optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type TransitionOrderInput = z.infer<typeof transitionOrderSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;

export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown,
): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    const err = new Error(message) as Error & {
      statusCode: number;
      code: string;
    };
    err.statusCode = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }
  return result.data;
}

export function validateQuery<T>(
  schema: z.ZodSchema<T>,
  query: unknown,
): T {
  return validateBody(schema, query);
}
