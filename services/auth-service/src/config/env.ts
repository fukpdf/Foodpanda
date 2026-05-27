import { z } from "zod";
import { generateKeyPairSync } from "node:crypto";

const AuthEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3010),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),

  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid postgres:// connection string")
    .refine((v) => v.startsWith("postgres"), "DATABASE_URL must use postgres protocol"),

  JWT_PRIVATE_KEY_BASE64: z.string().optional(),
  JWT_PUBLIC_KEY_BASE64: z.string().optional(),
  JWT_ACCESS_TOKEN_TTL: z.coerce.number().int().min(60).max(3600).default(900),
  JWT_REFRESH_TOKEN_TTL: z.coerce.number().int().min(86400).default(2592000),
  JWT_ISSUER: z.string().min(1).default("deliveryos-auth"),
  JWT_AUDIENCE: z.string().min(1).default("deliveryos-api"),

  COOKIE_SECRET: z.string().min(32).default("dev-cookie-secret-change-in-production!!"),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SAME_SITE: z.enum(["strict", "lax", "none"]).default("lax"),

  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().min(1).default(20),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60_000),
  RATE_LIMIT_REGISTER_MAX: z.coerce.number().int().min(1).default(5),

  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),

  REDIS_URL: z.string().optional(),

  ALLOWED_ORIGINS: z.string().default("http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004"),
});

export type AuthEnv = z.infer<typeof AuthEnvSchema>;

export interface RsaKeyPair {
  privateKeyPem: string;
  publicKeyPem: string;
}

function generateEphemeralKeyPair(): RsaKeyPair {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { privateKeyPem: privateKey as string, publicKeyPem: publicKey as string };
}

function loadKeyPair(raw: AuthEnv): RsaKeyPair {
  if (raw.JWT_PRIVATE_KEY_BASE64 && raw.JWT_PUBLIC_KEY_BASE64) {
    return {
      privateKeyPem: Buffer.from(raw.JWT_PRIVATE_KEY_BASE64, "base64").toString("utf8"),
      publicKeyPem: Buffer.from(raw.JWT_PUBLIC_KEY_BASE64, "base64").toString("utf8"),
    };
  }

  if (raw.NODE_ENV === "production") {
    throw new Error(
      "[auth-service] JWT_PRIVATE_KEY_BASE64 and JWT_PUBLIC_KEY_BASE64 must be set in production. " +
      "Generate with: openssl genrsa 2048 | openssl pkcs8 -topk8 -nocrypt -outform PEM"
    );
  }

  console.warn(
    "[auth-service] WARNING: Using ephemeral RSA key pair for development. " +
    "Set JWT_PRIVATE_KEY_BASE64 and JWT_PUBLIC_KEY_BASE64 for stable tokens across restarts."
  );
  return generateEphemeralKeyPair();
}

export interface ResolvedEnv extends AuthEnv {
  rsaKeys: RsaKeyPair;
  isDev: boolean;
  isProd: boolean;
  allowedOrigins: string[];
}

let _env: ResolvedEnv | null = null;

export function loadEnv(): ResolvedEnv {
  if (_env) return _env;

  const result = AuthEnvSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`[auth-service] Environment validation failed:\n${issues}`);
  }

  const raw = result.data;
  const rsaKeys = loadKeyPair(raw);

  _env = {
    ...raw,
    rsaKeys,
    isDev: raw.NODE_ENV !== "production",
    isProd: raw.NODE_ENV === "production",
    allowedOrigins: raw.ALLOWED_ORIGINS.split(",").map((o) => o.trim()),
  };

  return _env;
}

export function resetEnvCache(): void {
  _env = null;
}

export const env = new Proxy({} as ResolvedEnv, {
  get(_target, prop) {
    return loadEnv()[prop as keyof ResolvedEnv];
  },
});
