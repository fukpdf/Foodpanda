import type { FastifyInstance, FastifyError } from "fastify";
import { AuthError } from "../utils/errors.js";

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AuthError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const fastifyErr = error as FastifyError;
    const statusCode = fastifyErr.statusCode ?? 500;

    if (statusCode >= 500) {
      request.log.error({ err: error }, "Unhandled error in auth-service");
    }

    const codeMap: Record<number, string> = {
      400: "VALIDATION_ERROR",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
      429: "RATE_LIMITED",
      500: "INTERNAL_ERROR",
    };

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: codeMap[statusCode] ?? "INTERNAL_ERROR",
        message: statusCode < 500 ? (error as Error).message : "An unexpected error occurred.",
        requestId: request.id,
        timestamp: new Date().toISOString(),
      },
    });
  });
}
