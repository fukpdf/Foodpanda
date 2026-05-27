import { z } from "zod";

const DatabaseEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .describe("PostgreSQL connection string (postgres://user:pass@host:port/db)"),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  DATABASE_POOL_IDLE_TIMEOUT: z.coerce.number().int().min(1000).default(30000),
  DATABASE_CONNECT_TIMEOUT: z.coerce.number().int().min(1000).default(10000),
  DATABASE_SSL: z
    .enum(["true", "false", "require", "prefer"])
    .default("prefer")
    .transform((v) => v === "true" || v === "require"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type DatabaseEnv = z.infer<typeof DatabaseEnvSchema>;

let _env: DatabaseEnv | null = null;

export function loadEnv(): DatabaseEnv {
  if (_env) return _env;

  const result = DatabaseEnvSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.format();
    const messages = Object.entries(formatted)
      .filter(([key]) => key !== "_errors")
      .map(([key, val]) => {
        const errs = (val as { _errors: string[] })._errors;
        return `  ${key}: ${errs.join(", ")}`;
      })
      .join("\n");
    throw new Error(`[database] Environment validation failed:\n${messages}`);
  }

  _env = result.data;
  return _env;
}

export function resetEnvCache(): void {
  _env = null;
}
