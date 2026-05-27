import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { RefundService } from "../services/refund.service.js";
import type { PaymentService } from "../services/payment.service.js";
import { success, failure, ERROR_CODES } from "../utils/response.js";
import { timingSafeEqual } from "node:crypto";

function safeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function registerInternalRoutes(
  app: FastifyInstance,
  services: {
    paymentService: PaymentService;
    refundService: RefundService;
  },
  internalKey: string | undefined,
): Promise<void> {
  const { refundService } = services;

  function requireInternalKey(
    request: FastifyRequest,
    reply: FastifyReply,
  ): boolean {
    if (!internalKey) return true;

    const provided = request.headers["x-internal-key"] as string | undefined;
    if (!provided || !safeStringEqual(provided, internalKey)) {
      reply.status(401).send(failure(ERROR_CODES.UNAUTHORIZED, "Unauthorized"));
      return false;
    }
    return true;
  }

  const refundBodySchema = z.object({
    amountCents: z.number().int().positive().optional(),
    reason: z
      .enum([
        "duplicate",
        "fraudulent",
        "requested_by_customer",
        "order_cancelled",
        "system",
      ])
      .optional(),
    idempotencyKey: z.string().min(1).optional(),
    initiatedById: z.string().uuid().optional(),
    initiatedByRole: z.string().min(1).optional(),
  });

  app.post(
    "/internal/payments/:paymentId/refund",
    async (request, reply) => {
      if (!requireInternalKey(request, reply)) return;

      const { paymentId } = request.params as { paymentId: string };
      const body = refundBodySchema.parse(request.body);

      const refund = await refundService.createRefund(paymentId, {
        amountCents: body.amountCents,
        reason: body.reason,
        idempotencyKey: body.idempotencyKey,
        initiatedById: body.initiatedById,
        initiatedByRole: body.initiatedByRole,
      });

      return reply.status(201).send(success(refund));
    },
  );

  app.get(
    "/internal/payments/:paymentId",
    async (request, reply) => {
      if (!requireInternalKey(request, reply)) return;

      const { paymentId } = request.params as { paymentId: string };

      const status = await services.paymentService.getPaymentStatus(
        paymentId,
        "",
        "admin",
      );

      return reply.status(200).send(success(status));
    },
  );
}
