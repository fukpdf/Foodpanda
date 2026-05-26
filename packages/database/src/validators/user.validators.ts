import { z } from "zod";
import { emailSchema, passwordSchema, phoneSchema, uuidSchema } from "./common.validators.js";

export const createUserSchema = z.object({
  email: emailSchema,
  phone: phoneSchema.optional(),
  password: passwordSchema,
  primaryRole: z.enum(["customer", "vendor", "rider", "admin"]).default("customer"),
});

export const updateUserSchema = z.object({
  phone: phoneSchema.optional(),
  accountStatus: z
    .enum(["pending_verification", "active", "suspended", "banned", "deactivated"])
    .optional(),
});

export const createUserProfileSchema = z.object({
  userId: uuidSchema,
  firstName: z.string().min(1).max(64).trim(),
  lastName: z.string().min(1).max(64).trim(),
  displayName: z.string().min(1).max(128).trim().optional(),
  avatarUrl: z.string().url().optional(),
  bio: z.string().max(512).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: z.enum(["male", "female", "non_binary", "prefer_not_to_say"]).optional(),
  preferredLocale: z.string().length(2).default("en"),
  preferredCurrency: z.string().length(3).default("USD"),
  timezone: z.string().default("UTC"),
});

export const updateUserProfileSchema = createUserProfileSchema
  .omit({ userId: true })
  .partial();

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
  deviceType: z.enum(["web", "ios", "android", "unknown"]).optional(),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    firstName: z.string().min(1).max(64).trim(),
    lastName: z.string().min(1).max(64).trim(),
    phone: phoneSchema.optional(),
    primaryRole: z.enum(["customer", "vendor", "rider"]).default("customer"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateUserProfileInput = z.infer<typeof createUserProfileSchema>;
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
