import type { FastifyInstance } from "fastify";

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (_request, reply) => {
    return reply.status(200).send({
      status: "ok",
      service: "order-service",
      version: process.env["npm_package_version"] ?? "0.1.0",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/health/ready", async (_request, reply) => {
    return reply.status(200).send({ ready: true });
  });

  app.get("/health/live", async (_request, reply) => {
    return reply.status(200).send({ alive: true });
  });
}
