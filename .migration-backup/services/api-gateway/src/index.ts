import { buildServer } from "./server.js";
import { env } from "./config/env.js";

async function main(): Promise<void> {
  const app = await buildServer();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`API Gateway running on port ${env.PORT} [${env.NODE_ENV}]`);
  } catch (error) {
    app.log.error(error, "Failed to start API Gateway");
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  process.exit(0);
});

process.on("SIGTERM", async () => {
  process.exit(0);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});

main();
