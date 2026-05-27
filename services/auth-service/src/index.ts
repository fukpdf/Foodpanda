import { buildServer } from "./server.js";
import { env } from "./config/env.js";

async function main(): Promise<void> {
  const app = await buildServer();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`Auth Service running on port ${env.PORT} [${env.NODE_ENV}]`);
  } catch (error) {
    app.log.error(error, "Failed to start Auth Service");
    process.exit(1);
  }
}

process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

main();
