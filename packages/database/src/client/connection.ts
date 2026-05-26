import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { loadEnv } from "../config/env.js";
import * as relations from "../relations/index.js";
import * as schema from "../schemas/index.js";

export type Database = ReturnType<typeof createDatabase>;

let _db: Database | null = null;
let _sql: postgres.Sql | null = null;

export function createDatabase(databaseUrl?: string) {
  const env = loadEnv();
  const url = databaseUrl ?? env.DATABASE_URL;

  const sql = postgres(url, {
    max: env.DATABASE_POOL_MAX,
    idle_timeout: env.DATABASE_POOL_IDLE_TIMEOUT / 1000,
    connect_timeout: env.DATABASE_CONNECT_TIMEOUT / 1000,
    ssl: env.DATABASE_SSL ? "require" : false,
    prepare: true,
  });

  _sql = sql;

  return drizzle(sql, {
    schema: { ...schema, ...relations },
    logger: env.NODE_ENV === "development",
  });
}

export function getDatabase(): Database {
  if (!_db) {
    _db = createDatabase();
  }
  return _db;
}

export async function closeDatabase(): Promise<void> {
  if (_sql) {
    await _sql.end();
    _sql = null;
    _db = null;
  }
}

export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const db = getDatabase();
    await db.execute("SELECT 1");
    return { connected: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      connected: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
