import type { FastifyInstance, FastifyError } from "fastify";

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    const statusCode = error.statusCode ?? 500;
    const isInternal = statusCode >= 500;

    if (isInternal) {
      app.log.error({ err: error }, "Unhandled server error");
    }

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: error.code ?? "INTERNAL_ERROR",
        message: isInternal ? "Internal server error" : error.message,
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Route not found",
        timestamp: new Date().toISOString(),
      },
    });
  });
}
