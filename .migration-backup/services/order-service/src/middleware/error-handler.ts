import type { FastifyError, FastifyRequest, FastifyReply } from "fastify";

const HTTP_STATUS_MAP: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "UNPROCESSABLE_ENTITY",
  429: "RATE_LIMITED",
  500: "INTERNAL_ERROR",
  503: "SERVICE_UNAVAILABLE",
};

export function registerErrorHandler(
  app: import("fastify").FastifyInstance,
): void {
  app.setErrorHandler(
    (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      const statusCode =
        error.statusCode ??
        ((error as Error & { status?: number }).status ?? 500);

      if (statusCode >= 500) {
        request.log.error({ err: error, requestId: request.id }, "Unhandled error");
      } else {
        request.log.warn({ err: error, requestId: request.id }, "Request error");
      }

      const code =
        (error as Error & { code?: string }).code ??
        HTTP_STATUS_MAP[statusCode] ??
        "INTERNAL_ERROR";

      return reply.status(statusCode).send({
        success: false,
        error: {
          code,
          message:
            statusCode < 500
              ? error.message
              : "An unexpected error occurred. Please try again later.",
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      });
    },
  );

  app.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `Route ${request.method} ${request.url} not found`,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      },
    });
  });
}
