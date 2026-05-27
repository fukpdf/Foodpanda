export const LoginBodySchema = {
  type: "object",
  required: ["email", "password"],
  additionalProperties: false,
  properties: {
    email: { type: "string", format: "email", maxLength: 254 },
    password: { type: "string", minLength: 8, maxLength: 128 },
    deviceId: { type: "string", maxLength: 128 },
    deviceType: { type: "string", enum: ["web", "ios", "android"] },
  },
} as const;

export const RegisterBodySchema = {
  type: "object",
  required: ["email", "password", "firstName", "lastName"],
  additionalProperties: false,
  properties: {
    email: { type: "string", format: "email", maxLength: 254 },
    password: { type: "string", minLength: 8, maxLength: 128 },
    firstName: { type: "string", minLength: 1, maxLength: 64 },
    lastName: { type: "string", minLength: 1, maxLength: 64 },
    phone: { type: "string", maxLength: 20 },
    role: { type: "string", enum: ["customer", "vendor", "rider"] },
  },
} as const;

export const RefreshTokenBodySchema = {
  type: "object",
  required: ["refreshToken"],
  additionalProperties: false,
  properties: {
    refreshToken: { type: "string" },
  },
} as const;

export const ForgotPasswordBodySchema = {
  type: "object",
  required: ["email"],
  additionalProperties: false,
  properties: {
    email: { type: "string", format: "email", maxLength: 254 },
  },
} as const;

export const ResetPasswordBodySchema = {
  type: "object",
  required: ["token", "password"],
  additionalProperties: false,
  properties: {
    token: { type: "string" },
    password: { type: "string", minLength: 8, maxLength: 128 },
  },
} as const;

export const VerifyEmailBodySchema = {
  type: "object",
  required: ["token"],
  additionalProperties: false,
  properties: {
    token: { type: "string" },
  },
} as const;

export const AuthResponseSchema = {
  type: "object",
  properties: {
    success: { type: "boolean" },
    data: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        refreshToken: { type: "string" },
        expiresAt: { type: "string" },
        tokenType: { type: "string" },
        user: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            role: { type: "string" },
          },
        },
      },
    },
  },
} as const;
