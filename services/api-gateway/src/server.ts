import Fastify from "fastify";
import helmet from "@fastify/helmet";
import { env } from "./config/env.js";
import { registerCors } from "./plugins/cors.js";
import { registerRateLimit } from "./plugins/rate-limit.js";
import { registerErrorHandler } from "./middlewares/error-handler.js";
import { registerRoutes } from "./routes/index.js";

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
    ajv: {
      customOptions: {
        strict: false,
        coerceTypes: "array",
        removeAdditional: "all",
        allErrors: false,
      },
    },
  });

  await app.register(helmet, {
    contentSecurityPolicy: env.isProd,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });

  await registerCors(app);
  await registerRateLimit(app);
  registerErrorHandler(app);
  await registerRoutes(app);

  app.addHook("onRequest", async (request) => {
    request.log.info(
      { method: request.method, url: request.url, ip: request.ip },
      "Incoming request"
    );
  });

  app.addHook("onResponse", async (request, reply) => {
    request.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.elapsedTime,
      },
      "Request completed"
    );
  });

  return app;
}
