import { z } from "zod";

const isProduction = process.env.NODE_ENV === "production";

const optionalSecret = (minLength: number) =>
  z
    .string()
    .min(minLength)
    .optional()
    .refine((value) => !isProduction || Boolean(value), {
      message: `Required in production and must be at least ${minLength} characters`,
    });

const OrderEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3014),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),

  DATABASE_URL: z.string().url().refine((v) => v.startsWith("postgres"), "DATABASE_URL must use postgres protocol"),

  AUTH_PUBLIC_KEY_BASE64: z.string().optional(),
  AUTH_SERVICE_URL: z.string().url().default("http://localhost:3010"),
  JWT_ISSUER: z.string().min(1).default("deliveryos-auth"),
  JWT_AUDIENCE: z.string().min(1).default("deliveryos-api"),

  DISPATCH_SERVICE_URL: z.string().url().default("http://localhost:3015"),
  ORDER_SERVICE_INTERNAL_KEY: optionalSecret(32),
  DISPATCH_SERVICE_INTERNAL_KEY: optionalSecret(32),
  PAYMENT_SERVICE_INTERNAL_KEY: optionalSecret(32),
  REALTIME_INTERNAL_KEY: z.string().min(1).optional(),

  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60_000),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004"),
  REALTIME_SERVICE_URL: z.string().url().optional(),
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
    const issues = result.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`[order-service] Environment validation failed:\n${issues}`);
  }
  const raw = result.data;
  _env = {
    ...raw,
    isDev: raw.NODE_ENV !== "production",
    isProd: raw.NODE_ENV === "production",
    allowedOrigins: raw.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean),
  };
  return _env;
}

export const env = new Proxy({} as ResolvedOrderEnv, {
  get(_target, prop) {
    return loadEnv()[prop as keyof ResolvedOrderEnv];
  },
});
