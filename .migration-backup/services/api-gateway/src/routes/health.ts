import type { FastifyInstance } from "fastify";
import type { HealthCheckResponse } from "@deliveryos/shared-types";

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/health",
    {
      schema: {
        tags: ["System"],
        summary: "Health check",
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              version: { type: "string" },
              uptime: { type: "number" },
              timestamp: { type: "string" },
            },
          },
        },
      },
      config: { rateLimit: { max: 60, timeWindow: 60_000 } },
    },
    async (_request, reply) => {
      const response: HealthCheckResponse = {
        status: "ok",
        version: process.env["npm_package_version"] ?? "0.1.0",
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      };
      return reply.status(200).send(response);
    }
  );

  app.get("/health/ready", async (_request, reply) => {
    return reply.status(200).send({ ready: true });
  });

  app.get("/health/live", async (_request, reply) => {
    return reply.status(200).send({ alive: true });
  });
}
