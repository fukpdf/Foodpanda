import { requireEnv } from "@deliveryos/shared-utils";

function getEnv(key: string, fallback?: string): string {
  return process.env[key] ?? fallback ?? "";
}

function getEnvInt(key: string, fallback: number): number {
  const val = process.env[key];
  if (!val) return fallback;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? fallback : parsed;
}

export const env = {
  NODE_ENV: (getEnv("NODE_ENV", "development") as "development" | "production" | "test"),
  PORT: getEnvInt("PORT", 3000),
  HOST: getEnv("HOST", "0.0.0.0"),
  LOG_LEVEL: getEnv("LOG_LEVEL", "info"),

  CORS_ORIGINS: getEnv("CORS_ORIGINS", "http://localhost:3001,http://localhost:3002").split(","),

  RATE_LIMIT_MAX: getEnvInt("RATE_LIMIT_MAX", 200),
  RATE_LIMIT_WINDOW_MS: getEnvInt("RATE_LIMIT_WINDOW_MS", 60_000),

  AUTH_SERVICE_URL: getEnv("AUTH_SERVICE_URL", "http://localhost:3010"),
  USER_SERVICE_URL: getEnv("USER_SERVICE_URL", "http://localhost:3011"),
  VENDOR_SERVICE_URL: getEnv("VENDOR_SERVICE_URL", "http://localhost:3012"),
  ORDER_SERVICE_URL: getEnv("ORDER_SERVICE_URL", "http://localhost:3013"),
  PAYMENT_SERVICE_URL: getEnv("PAYMENT_SERVICE_URL", "http://localhost:3014"),
  NOTIFICATION_SERVICE_URL: getEnv("NOTIFICATION_SERVICE_URL", "http://localhost:3015"),

  JWT_PUBLIC_KEY: getEnv("JWT_PUBLIC_KEY"),
  INTERNAL_API_SECRET: getEnv("INTERNAL_API_SECRET"),

  isDev: process.env["NODE_ENV"] !== "production",
  isProd: process.env["NODE_ENV"] === "production",
} as const;
