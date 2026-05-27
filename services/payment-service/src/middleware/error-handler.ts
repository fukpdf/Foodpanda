import type { FastifyInstance, FastifyError } from "fastify";
import { failure, ERROR_CODES } from "../utils/response.js";
import {
  PaymentNotFoundError,
  ActivePaymentExistsError,
  MaxAttemptsReachedError,
  OrderNotFoundError,
  PaymentOwnershipError,
} from "../services/payment.service.js";
import {
  RefundNotEligibleError,
  RefundAmountExceededError,
  RefundNotFoundError,
} from "../services/refund.service.js";
import {
  InvalidPaymentTransitionError,
  TerminalPaymentStateError,
} from "../state-machine/states.js";
import { WebhookVerificationError } from "../providers/stripe/webhook.verifier.js";
import { ZodError } from "zod";

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | Error, request, reply) => {
    const log = request.log ?? app.log;

    if (error instanceof ZodError) {
      return reply.status(422).send(
        failure(ERROR_CODES.VALIDATION_ERROR, "Validation failed", {
          issues: error.issues,
        }),
      );
    }

    if (error instanceof PaymentNotFoundError || error instanceof RefundNotFoundError) {
      return reply.status(404).send(failure(ERROR_CODES.NOT_FOUND, error.message));
    }

    if (error instanceof PaymentOwnershipError) {
      return reply.status(403).send(failure(ERROR_CODES.FORBIDDEN, error.message));
    }

    if (error instanceof ActivePaymentExistsError) {
      return reply.status(409).send(
        failure(ERROR_CODES.ACTIVE_PAYMENT_EXISTS, error.message, {
          paymentId: error.paymentId,
        }),
      );
    }

    if (error instanceof OrderNotFoundError) {
      return reply.status(422).send(
        failure(ERROR_CODES.ORDER_NOT_ELIGIBLE, error.message),
      );
    }

    if (error instanceof MaxAttemptsReachedError) {
      return reply.status(422).send(
        failure(ERROR_CODES.MAX_ATTEMPTS_REACHED, error.message, {
          attempts: error.attempts,
        }),
      );
    }

    if (error instanceof RefundNotEligibleError) {
      return reply.status(422).send(
        failure(ERROR_CODES.REFUND_NOT_ELIGIBLE, error.message),
      );
    }

    if (error instanceof RefundAmountExceededError) {
      return reply.status(422).send(
        failure(ERROR_CODES.REFUND_AMOUNT_EXCEEDED, error.message, {
          requestedCents: error.requestedCents,
          availableCents: error.availableCents,
        }),
      );
    }

    if (error instanceof WebhookVerificationError) {
      log.warn({ err: error }, "Stripe webhook verification failed");
      return reply.status(400).send(
        failure(ERROR_CODES.WEBHOOK_VERIFICATION_FAILED, error.message),
      );
    }

    if (error instanceof InvalidPaymentTransitionError) {
      return reply.status(409).send(
        failure(ERROR_CODES.CONFLICT, error.message, {
          from: error.from,
          to: error.to,
        }),
      );
    }

    if (error instanceof TerminalPaymentStateError) {
      return reply.status(409).send(
        failure(ERROR_CODES.CONFLICT, error.message),
      );
    }

    const statusCode =
      "statusCode" in error && typeof error.statusCode === "number"
        ? error.statusCode
        : 500;

    if (statusCode === 429) {
      return reply.status(429).send(
        failure(ERROR_CODES.RATE_LIMITED, "Too many requests. Please try again later."),
      );
    }

    if (statusCode >= 400 && statusCode < 500) {
      return reply.status(statusCode).send(
        failure(ERROR_CODES.VALIDATION_ERROR, error.message),
      );
    }

    log.error({ err: error }, "Unhandled internal error");
    return reply.status(500).send(
      failure(ERROR_CODES.INTERNAL_ERROR, "An unexpected error occurred"),
    );
  });
}
