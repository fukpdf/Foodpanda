import { z } from "zod";
import { uuidSchema } from "./common.validators.js";

export const createOrderSchema = z.object({
  customerId: uuidSchema,
  vendorBranchId: uuidSchema,
  deliveryAddressId: uuidSchema.optional(),
  customerNote: z.string().max(512).optional(),
  tipCents: z.number().int().min(0).default(0),
  currency: z.string().length(3).toUpperCase().default("USD"),
});

export const updateOrderStatusSchema = z.object({
  orderId: uuidSchema,
  status: z.enum([
    "confirmed",
    "preparing",
    "ready_for_pickup",
    "assigned_to_rider",
    "picked_up",
    "in_transit",
    "delivered",
    "cancelled",
  ]),
  note: z.string().max(512).optional(),
  actorId: uuidSchema,
});

export const assignRiderSchema = z.object({
  orderId: uuidSchema,
  riderId: uuidSchema,
  assignedById: uuidSchema.optional(),
});

export const cancelOrderSchema = z.object({
  orderId: uuidSchema,
  cancelledById: uuidSchema,
  reason: z.string().min(1).max(512),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type AssignRiderInput = z.infer<typeof assignRiderSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
