import { z } from "zod";

export const uuidSchema = z.string().uuid("Must be a valid UUID");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const softDeleteFilterSchema = z.object({
  includeDeleted: z.coerce.boolean().default(false),
});

export const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const geolocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusKm: z.number().min(0.1).max(100).default(10),
});

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{7,14}$/, "Must be a valid international phone number")
  .transform((v) => v.replace(/\s/g, ""));

export const emailSchema = z
  .string()
  .email("Must be a valid email address")
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const slugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Must be a valid slug (lowercase, hyphens only)");

export const cursorSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  direction: z.enum(["forward", "backward"]).default("forward"),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
export type GeolocationInput = z.infer<typeof geolocationSchema>;
export type CursorInput = z.infer<typeof cursorSchema>;
