import type { FastifyInstance, FastifyError } from "fastify";
import type { ApiErrorResponse, ApiErrorCode } from "@deliveryos/shared-types";
import { HTTP_STATUS } from "@deliveryos/shared-utils";

const HTTP_TO_CODE: Record<number, ApiErrorCode> = {
  400: "VALIDATION_ERROR",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  429: "RATE_LIMITED",
  500: "INTERNAL_ERROR",
};

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    const statusCode = error.statusCode ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const code: ApiErrorCode = HTTP_TO_CODE[statusCode] ?? "INTERNAL_ERROR";

    if (statusCode >= 500) {
      request.log.error({ err: error }, "Unhandled error in auth-service");
    }

    const response: ApiErrorResponse = {
      success: false,
      error: {
        code,
        message: statusCode < 500 ? error.message : "An unexpected error occurred.",
        requestId: request.id,
        timestamp: new Date().toISOString(),
      },
    };

    reply.status(statusCode).send(response);
  });
}
