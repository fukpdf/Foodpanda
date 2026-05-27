import Fastify from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import { env } from "../config/env.js";
import { registerErrorHandler } from "../middleware/error-handler.js";
import { registerRoutes } from "../routes/index.js";
import { ConnectionManager } from "../websocket/connection-manager.js";
import { HeartbeatManager } from "../websocket/heartbeat.js";
import { SseManager } from "../sse/sse-manager.js";
import { SubscriptionManager } from "../subscriptions/subscription-manager.js";
import { EventPublisher } from "../publishers/event-publisher.js";
import { EventHandler } from "../handlers/event.handler.js";
import { MetricsService } from "../services/metrics.service.js";

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.isDev
        ? {
            transport: {
              target: "pino-pretty",
              options: { colorize: true, translateTime: "SYS:standard" },
            },
          }
        : {}),
    },
    requestIdHeader: "x-request-id",
    requestIdLogLabel: "requestId",
    trustProxy: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });

  await app.register(cors, {
    origin: env.isDev ? true : env.allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-ID",
      "X-Internal-Key",
      "Cache-Control",
    ],
    exposedHeaders: ["X-Request-ID"],
  });

  await app.register(rateLimit, {
    global: false,
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    keyGenerator: (request) =>
      (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
      request.ip,
    errorResponseBuilder: (_request, context) => ({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: `Too many requests. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
        timestamp: new Date().toISOString(),
      },
    }),
  });

  await app.register(websocket);

  const connections = new ConnectionManager();
  const sse = new SseManager();
  const subscriptions = new SubscriptionManager();
  const publisher = new EventPublisher(subscriptions, connections, sse);
  const eventHandler = new EventHandler(publisher);
  const metrics = new MetricsService(connections, sse, subscriptions, eventHandler);
  const heartbeat = new HeartbeatManager(connections, subscriptions);

  registerErrorHandler(app);

  await registerRoutes(app, {
    connections,
    sse,
    subscriptions,
    eventHandler,
    metrics,
  });

  app.addHook("onReady", async () => {
    heartbeat.start();
    eventHandler.startGc();
    app.log.info("Heartbeat manager and cache GC started");
  });

  app.addHook("onClose", async () => {
    heartbeat.stop();
    eventHandler.stopGc();
    app.log.info("Heartbeat manager and cache GC stopped");
  });

  return app;
}
