import Fastify from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env.js";
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
    trustProxy: true,
  });

  await app.register(helmet, { contentSecurityPolicy: false });

  await app.register(cors, {
    origin: env.isDev ? true : ["https://deliveryos.com"],
    credentials: true,
  });

  await app.register(rateLimit, {
    global: false,
    max: env.RATE_LIMIT_AUTH_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
  });

  registerErrorHandler(app);
  await registerRoutes(app);

  return app;
}
