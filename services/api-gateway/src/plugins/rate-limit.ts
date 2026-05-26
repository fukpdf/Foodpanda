import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { env } from "../config/env.js";

export async function registerRateLimit(app: FastifyInstance): Promise<void> {
  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    keyGenerator: (request) => {
      return (
        (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
        request.headers["x-real-ip"] as string ??
        request.ip
      );
    },
    errorResponseBuilder: (_request, context) => ({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: `Too many requests. Try again in ${Math.ceil(context.ttl / 1000)}s`,
        timestamp: new Date().toISOString(),
      },
    }),
    addHeadersOnExceeding: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
    },
  });
}
