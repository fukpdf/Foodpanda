import { z } from "zod";
import { emailSchema, phoneSchema, slugSchema, uuidSchema } from "./common.validators.js";

export const createVendorSchema = z.object({
  ownerUserId: uuidSchema,
  name: z.string().min(2).max(128).trim(),
  slug: slugSchema,
  description: z.string().max(1024).optional(),
  logoUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  cuisineTypes: z.array(z.string().min(1).max(64)).max(10).default([]),
  tags: z.array(z.string().min(1).max(32)).max(20).default([]),
  businessRegistrationNumber: z.string().max(64).optional(),
  taxId: z.string().max(64).optional(),
  businessEmail: emailSchema.optional(),
  businessPhone: phoneSchema.optional(),
  commissionRateBps: z.number().int().min(0).max(10000).default(2000),
});

export const updateVendorSchema = createVendorSchema
  .omit({ ownerUserId: true, slug: true })
  .partial();

export const createVendorBranchSchema = z.object({
  vendorId: uuidSchema,
  name: z.string().min(2).max(128).trim(),
  slug: slugSchema,
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  addressLine1: z.string().min(1).max(256).trim(),
  addressLine2: z.string().max(128).optional(),
  city: z.string().min(1).max(64).trim(),
  state: z.string().max(64).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().length(2).toUpperCase().default("US"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isMainBranch: z.boolean().default(false),
  preparationTimeMinutes: z.number().int().min(0).max(240).default(20),
  deliveryRadiusKm: z.number().min(0.5).max(100).optional(),
  minimumOrderCents: z.number().int().min(0).default(0),
  deliveryFeeCents: z.number().int().min(0).default(0),
});

export const updateVendorBranchSchema = createVendorBranchSchema
  .omit({ vendorId: true })
  .partial();

export const approveVendorSchema = z.object({
  vendorId: uuidSchema,
  approvedById: uuidSchema,
});

export const rejectVendorSchema = z.object({
  vendorId: uuidSchema,
  rejectedById: uuidSchema,
  reason: z.string().min(1).max(512),
});

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
export type CreateVendorBranchInput = z.infer<typeof createVendorBranchSchema>;
export type UpdateVendorBranchInput = z.infer<typeof updateVendorBranchSchema>;
