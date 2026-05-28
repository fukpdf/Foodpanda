import { z } from "zod";

const RealtimeEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3019),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),

  AUTH_PUBLIC_KEY_BASE64: z.string().optional(),
  AUTH_SERVICE_URL: z.string().url().default("http://localhost:3010"),
  JWT_ISSUER: z.string().min(1).default("deliveryos-auth"),
  JWT_AUDIENCE: z.string().min(1).default("deliveryos-api"),

  INTERNAL_API_KEY: z
    .string()
    .min(16)
    .default("dev-internal-key-change-in-production!!"),

  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60_000),

  MAX_CONNECTIONS_PER_IP: z.coerce.number().int().min(1).default(10),
  HEARTBEAT_INTERVAL_MS: z.coerce.number().int().min(1000).default(30_000),
  HEARTBEAT_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10_000),

  ALLOWED_ORIGINS: z
    .string()
    .default(
      "http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004",
    ),
});

export type RealtimeEnv = z.infer<typeof RealtimeEnvSchema>;

export interface ResolvedRealtimeEnv extends RealtimeEnv {
  isDev: boolean;
  isProd: boolean;
  allowedOrigins: string[];
}

let _env: ResolvedRealtimeEnv | null = null;

export function loadEnv(): ResolvedRealtimeEnv {
  if (_env) return _env;

  const result = RealtimeEnvSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `[realtime-service] Environment validation failed:\n${issues}`,
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

export const env = new Proxy({} as ResolvedRealtimeEnv, {
  get(_target, prop) {
    return loadEnv()[prop as keyof ResolvedRealtimeEnv];
  },
});
