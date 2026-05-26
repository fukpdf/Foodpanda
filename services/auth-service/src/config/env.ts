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
  PORT: getEnvInt("PORT", 3010),
  HOST: getEnv("HOST", "0.0.0.0"),
  LOG_LEVEL: getEnv("LOG_LEVEL", "info"),

  DATABASE_URL: getEnv("DATABASE_URL"),

  JWT_SECRET: getEnv("JWT_SECRET", "change-me-in-production-min-32-chars!!"),
  JWT_ACCESS_TOKEN_TTL: getEnvInt("JWT_ACCESS_TOKEN_TTL", 900),
  JWT_REFRESH_TOKEN_TTL: getEnvInt("JWT_REFRESH_TOKEN_TTL", 2592000),
  JWT_ISSUER: getEnv("JWT_ISSUER", "deliveryos-auth"),
  JWT_AUDIENCE: getEnv("JWT_AUDIENCE", "deliveryos-api"),

  BCRYPT_ROUNDS: getEnvInt("BCRYPT_ROUNDS", 12),

  REDIS_URL: getEnv("REDIS_URL", "redis://localhost:6379"),

  COOKIE_SECRET: getEnv("COOKIE_SECRET", "change-me-in-production-min-32-chars!!"),
  COOKIE_SECURE: getEnv("COOKIE_SECURE", "false") === "true",
  COOKIE_DOMAIN: getEnv("COOKIE_DOMAIN"),

  RATE_LIMIT_AUTH_MAX: getEnvInt("RATE_LIMIT_AUTH_MAX", 20),
  RATE_LIMIT_WINDOW_MS: getEnvInt("RATE_LIMIT_WINDOW_MS", 60_000),

  isDev: process.env["NODE_ENV"] !== "production",
  isProd: process.env["NODE_ENV"] === "production",
} as const;
