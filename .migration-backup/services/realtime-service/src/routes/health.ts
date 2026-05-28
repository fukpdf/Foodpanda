import type { FastifyInstance } from "fastify";
import type { MetricsService } from "../services/metrics.service.js";

export async function registerHealthRoutes(
  app: FastifyInstance,
  metrics: MetricsService,
): Promise<void> {
  app.get("/health", async (_request, reply) => {
    const stats = metrics.getStats();
    return reply.status(200).send({
      status: "ok",
      service: "realtime-service",
      version: process.env["npm_package_version"] ?? "0.1.0",
      uptime: stats.uptimeSeconds,
      timestamp: new Date().toISOString(),
      connections: {
        websocket: stats.activeWsConnections,
        sse: stats.activeSseConnections,
        total: stats.totalConnections,
      },
      subscriptions: {
        channels: stats.activeChannels,
        total: stats.totalSubscriptions,
      },
    });
  });

  app.get("/health/ready", async (_request, reply) => {
    return reply.status(200).send({ ready: true });
  });

  app.get("/health/live", async (_request, reply) => {
    return reply.status(200).send({ alive: true });
  });

  app.get("/health/metrics", async (_request, reply) => {
    return reply.status(200).send(metrics.getStats());
  });
}
