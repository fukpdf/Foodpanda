import type { FastifyInstance } from "fastify";

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (_request, reply) => {
    return reply.status(200).send({
      status: "ok",
      service: "payment-service",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.get("/health/ready", async (_request, reply) => {
    return reply.status(200).send({
      status: "ready",
      service: "payment-service",
      timestamp: new Date().toISOString(),
    });
  });
}
