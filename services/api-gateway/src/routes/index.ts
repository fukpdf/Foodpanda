import type { FastifyInstance } from "fastify";
import { registerHealthRoutes } from "./health.js";

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(
    async (api) => {
      await registerHealthRoutes(api);
    },
    { prefix: "/api/v1" }
  );
}
