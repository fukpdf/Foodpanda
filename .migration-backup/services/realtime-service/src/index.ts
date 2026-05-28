import { buildServer } from "./server/index.js";
import { env } from "./config/env.js";

type AppInstance = Awaited<ReturnType<typeof buildServer>>;

let _app: AppInstance | null = null;

async function shutdown(signal: string): Promise<void> {
  if (_app) {
    try {
      _app.log.info(`Received ${signal} — starting graceful shutdown`);
      await _app.close();
    } catch {
    }
  }
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});

async function main(): Promise<void> {
  _app = await buildServer();

  try {
    await _app.listen({ port: env.PORT, host: env.HOST });
    _app.log.info(
      `Realtime Service running on port ${env.PORT} [${env.NODE_ENV}]`,
    );
  } catch (error) {
    _app.log.error(error, "Failed to start Realtime Service");
    process.exit(1);
  }
}

main();
