import type { FastifyInstance } from "fastify";
import { registerHealthRoutes } from "./health.js";
import { registerAuthRoutes } from "./auth.js";

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(
    async (api) => {
      await registerHealthRoutes(api);

      await api.register(
        async (authApi) => {
          await registerAuthRoutes(authApi);
        },
        { prefix: "/auth" },
      );
    },
    { prefix: "/api/v1" },
  );
}
