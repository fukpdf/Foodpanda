import { pool } from "@workspace/db";
import { buildServer } from "./server.js";
import { env } from "./config/env.js";

async function main(): Promise<void> {
  const app = await buildServer();

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, "Shutting down Dispatch Service");
    try {
      await app.close();
      await pool.end();
      process.exit(0);
    } catch (error) {
      app.log.error(error, "Graceful shutdown failed");
      process.exit(1);
    }
  };

  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(
      `Dispatch Service running on port ${env.PORT} [${env.NODE_ENV}]`,
    );
  } catch (error) {
    app.log.error(error, "Failed to start Dispatch Service");
    await pool.end();
    process.exit(1);
  }
}

void main();
