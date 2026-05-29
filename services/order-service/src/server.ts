import Fastify from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { db } from "@workspace/db";
import { env } from "./config/env.js";
import { registerErrorHandler } from "./middleware/error-handler.js";
import { registerRoutes } from "./routes/index.js";
import { eventBus } from "./events/event-bus.js";
import { registerAuditHandler } from "./events/handlers/audit.handler.js";
import {
  registerRealtimeHandler,
  InMemoryRealtimeAdapter,
  HttpRealtimeAdapter,
} from "./events/handlers/realtime.handler.js";
import { OrderService } from "./services/order.service.js";
import { OrderController } from "./controllers/order.controller.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

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
    trustProxy: true,
    disableRequestLogging: false,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });

  await app.register(cors, {
    origin: env.isDev ? true : env.allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID", "X-Internal-Key"],
    exposedHeaders: ["X-Request-ID"],
  });

  await app.register(rateLimit, {
    global: true,
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

  registerErrorHandler(app);

  // Use @workspace/db singleton — type cast to satisfy generic parameter
  const typedDb = db as NodePgDatabase<Record<string, unknown>>;

  registerAuditHandler(typedDb, eventBus);

  const realtimeAdapter =
    env.REALTIME_SERVICE_URL && env.REALTIME_INTERNAL_KEY
      ? new HttpRealtimeAdapter(
          env.REALTIME_SERVICE_URL,
          env.REALTIME_INTERNAL_KEY,
        )
      : new InMemoryRealtimeAdapter();

  registerRealtimeHandler(eventBus, realtimeAdapter);

  const orderService = new OrderService(typedDb, eventBus);
  const controller = new OrderController(orderService);

  await registerRoutes(
    app,
    controller,
    typedDb,
    env.PAYMENT_SERVICE_INTERNAL_KEY,
    env.DISPATCH_SERVICE_INTERNAL_KEY,
  );

  return app;
}
