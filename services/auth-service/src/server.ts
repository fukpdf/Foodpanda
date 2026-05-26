import Fastify from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import cookie from "@fastify/cookie";
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
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-ID",
      "X-Device-ID",
    ],
    exposedHeaders: ["X-Request-ID"],
  });

  await app.register(rateLimit, {
    global: false,
    max: env.RATE_LIMIT_AUTH_MAX,
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

  await app.register(cookie, {
    secret: env.COOKIE_SECRET,
    parseOptions: {
      secure: env.COOKIE_SECURE,
      httpOnly: true,
      sameSite: env.COOKIE_SAME_SITE,
      ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    },
  });

  app.addHook("onRequest", async (request) => {
    (request as any).deviceInfo = {
      ipAddress:
        (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
        request.ip ??
        "unknown",
      userAgent: request.headers["user-agent"] ?? "unknown",
      deviceId: request.headers["x-device-id"] as string | undefined,
    };
  });

  registerErrorHandler(app);
  await registerRoutes(app);

  return app;
}
