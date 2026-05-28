import { z } from "zod";

const PaymentEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3017),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),

  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid postgres:// connection string")
    .refine(
      (v) => v.startsWith("postgres"),
      "DATABASE_URL must use postgres protocol",
    ),

  STRIPE_SECRET_KEY: z
    .string()
    .min(1, "STRIPE_SECRET_KEY is required")
    .refine(
      (v) => v.startsWith("sk_"),
      "STRIPE_SECRET_KEY must start with sk_",
    ),

  STRIPE_WEBHOOK_SECRET: z
    .string()
    .min(1, "STRIPE_WEBHOOK_SECRET is required")
    .refine(
      (v) => v.startsWith("whsec_"),
      "STRIPE_WEBHOOK_SECRET must start with whsec_",
    ),

  STRIPE_API_VERSION: z.string().default("2025-04-30"),

  STRIPE_MAX_NETWORK_RETRIES: z.coerce.number().int().min(0).max(5).default(3),

  ORDER_SERVICE_URL: z
    .string()
    .url()
    .default("http://localhost:3014"),

  ORDER_INTERNAL_KEY: z
    .string()
    .min(32, "ORDER_INTERNAL_KEY must be at least 32 chars")
    .optional(),

  REALTIME_SERVICE_URL: z.string().url().optional(),
  REALTIME_INTERNAL_KEY: z.string().min(1).optional(),

  JWT_ISSUER: z.string().min(1).default("deliveryos-auth"),
  JWT_AUDIENCE: z.string().min(1).default("deliveryos-api"),
  AUTH_PUBLIC_KEY_BASE64: z.string().optional(),
  AUTH_SERVICE_URL: z.string().url().default("http://localhost:3010"),

  PAYMENT_INTERNAL_KEY: z
    .string()
    .min(32, "PAYMENT_INTERNAL_KEY must be at least 32 chars")
    .optional(),

  MAX_PAYMENT_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),

  PAYMENT_INTENT_EXPIRY_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .max(168)
    .default(24),

  PAYMENT_ORDER_TIMEOUT_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .max(168)
    .default(24),

  RECONCILIATION_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(60_000)
    .default(300_000),

  RECONCILIATION_STALE_THRESHOLD_MINUTES: z.coerce
    .number()
    .int()
    .min(5)
    .default(15),

  IDEMPOTENCY_KEY_TTL_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .max(168)
    .default(24),

  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60_000),

  ALLOWED_ORIGINS: z
    .string()
    .default(
      "http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004",
    ),
});

export type PaymentEnv = z.infer<typeof PaymentEnvSchema>;

export interface ResolvedPaymentEnv extends PaymentEnv {
  isDev: boolean;
  isProd: boolean;
  allowedOrigins: string[];
}

let _env: ResolvedPaymentEnv | null = null;

export function loadEnv(): ResolvedPaymentEnv {
  if (_env) return _env;

  const result = PaymentEnvSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `[payment-service] Environment validation failed:\n${issues}`,
    );
  }

  const raw = result.data;
  _env = {
    ...raw,
    isDev: raw.NODE_ENV !== "production",
    isProd: raw.NODE_ENV === "production",
    allowedOrigins: raw.ALLOWED_ORIGINS.split(",").map((o) => o.trim()),
  };

  return _env;
}

export const env = new Proxy({} as ResolvedPaymentEnv, {
  get(_target, prop) {
    return loadEnv()[prop as keyof ResolvedPaymentEnv];
  },
});
