import { z } from "zod";

const OrderEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3014),
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

  AUTH_PUBLIC_KEY_BASE64: z.string().optional(),
  AUTH_SERVICE_URL: z
    .string()
    .url()
    .default("http://localhost:3010"),

  JWT_ISSUER: z.string().min(1).default("deliveryos-auth"),
  JWT_AUDIENCE: z.string().min(1).default("deliveryos-api"),

  DISPATCH_MAX_RADIUS_METERS: z.coerce
    .number()
    .int()
    .min(500)
    .default(10_000),
  DISPATCH_OFFER_TIMEOUT_SECONDS: z.coerce
    .number()
    .int()
    .min(15)
    .default(60),
  DISPATCH_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(5),
  DISPATCH_CANDIDATE_LIMIT: z.coerce.number().int().min(1).default(20),

  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60_000),

  ALLOWED_ORIGINS: z
    .string()
    .default(
      "http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004",
    ),

  REALTIME_SERVICE_URL: z.string().url().optional(),
  REALTIME_INTERNAL_KEY: z.string().min(1).optional(),
});

export type OrderEnv = z.infer<typeof OrderEnvSchema>;

export interface ResolvedOrderEnv extends OrderEnv {
  isDev: boolean;
  isProd: boolean;
  allowedOrigins: string[];
}

let _env: ResolvedOrderEnv | null = null;

export function loadEnv(): ResolvedOrderEnv {
  if (_env) return _env;

  const result = OrderEnvSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `[order-service] Environment validation failed:\n${issues}`,
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

export const env = new Proxy({} as ResolvedOrderEnv, {
  get(_target, prop) {
    return loadEnv()[prop as keyof ResolvedOrderEnv];
  },
});
