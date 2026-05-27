import { buildServer } from "./server/index.js";
import { env } from "./config/env.js";

async function main(): Promise<void> {
  const app = await buildServer();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(
      `Realtime Service running on port ${env.PORT} [${env.NODE_ENV}]`,
    );
  } catch (error) {
    app.log.error(error, "Failed to start Realtime Service");
    process.exit(1);
  }
}

process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});

main();
