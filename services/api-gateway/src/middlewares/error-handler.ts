import type { FastifyInstance, FastifyError } from "fastify";
import type { ApiErrorResponse, ApiErrorCode } from "@deliveryos/shared-types";
import { HTTP_STATUS } from "@deliveryos/shared-utils";

const HTTP_STATUS_TO_ERROR_CODE: Record<number, ApiErrorCode> = {
  400: "VALIDATION_ERROR",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  429: "RATE_LIMITED",
  500: "INTERNAL_ERROR",
  502: "SERVICE_UNAVAILABLE",
  503: "SERVICE_UNAVAILABLE",
};

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    const statusCode = error.statusCode ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const code: ApiErrorCode =
      HTTP_STATUS_TO_ERROR_CODE[statusCode] ?? "INTERNAL_ERROR";

    const requestId =
      (request.headers["x-request-id"] as string) ?? request.id;

    if (statusCode >= 500) {
      request.log.error({ err: error, requestId }, "Unhandled error");
    } else {
      request.log.warn({ err: error, requestId }, "Request error");
    }

    const response: ApiErrorResponse = {
      success: false,
      error: {
        code,
        message:
          statusCode < 500
            ? error.message
            : "An unexpected error occurred. Please try again.",
        requestId,
        timestamp: new Date().toISOString(),
        details:
          error.validation
            ? error.validation.map((v) => ({
                field: v.instancePath?.replace("/", "") ?? v.schemaPath,
                message: v.message ?? "Invalid value",
              }))
            : undefined,
      },
    };

    reply.status(statusCode).send(response);
  });

  app.setNotFoundHandler((request, reply) => {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `Route ${request.method} ${request.url} not found`,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      },
    };
    reply.status(HTTP_STATUS.NOT_FOUND).send(response);
  });
}
