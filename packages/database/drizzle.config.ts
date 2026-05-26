import { defineConfig } from "drizzle-kit";
import { loadEnv } from "./src/config/env.js";

const env = loadEnv();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schemas/index.ts",
  out: "./src/migrations",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
  migrations: {
    table: "_drizzle_migrations",
    schema: "public",
  },
});
