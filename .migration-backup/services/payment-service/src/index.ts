import { buildServer } from "./server/index.js";
import { env } from "./config/env.js";

async function main(): Promise<void> {
  const app = await buildServer();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(
      { port: env.PORT, host: env.HOST },
      "[payment-service] Server listening",
    );
  } catch (err) {
    app.log.fatal({ err }, "[payment-service] Failed to start server");
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "[payment-service] Shutdown signal received");
    try {
      await app.close();
      app.log.info("[payment-service] Server closed gracefully");
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, "[payment-service] Error during shutdown");
      process.exit(1);
    }
  };

  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err: unknown) => {
  console.error("[payment-service] Fatal startup error:", err);
  process.exit(1);
});
