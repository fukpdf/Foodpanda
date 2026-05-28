import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { PaymentService } from "../services/payment.service.js";
import type { RefundService } from "../services/refund.service.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { success } from "../utils/response.js";

const createIntentSchema = z.object({
  orderId: z.string().uuid("orderId must be a valid UUID"),
  currency: z.string().length(3, "currency must be a 3-letter ISO code").default("USD"),
  description: z.string().max(500).optional(),
});

const cancelSchema = z.object({
  reason: z.string().max(500).optional(),
});

const refundSchema = z.object({
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
  idempotencyKey: z.string().min(1).max(200).optional(),
});

export async function registerPaymentRoutes(
  app: FastifyInstance,
  paymentService: PaymentService,
  refundService: RefundService,
): Promise<void> {
  app.post(
    "/payments/intents",
    { preHandler: [authenticate, requireRole("customer")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = createIntentSchema.parse(request.body);
      const user = request.user!;

      const result = await paymentService.createIntent(
        {
          orderId: body.orderId,
          currency: body.currency,
          description: body.description,
        },
        user.userId,
      );

      return reply.status(201).send(success(result));
    },
  );

  app.get(
    "/payments/orders/:orderId",
    {
      preHandler: [
        authenticate,
        requireRole("customer", "admin", "superadmin"),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { orderId } = request.params as { orderId: string };
      const user = request.user!;

      const result = await paymentService.getPaymentForOrder(
        orderId,
        user.userId,
        user.role,
      );

      if (!result) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `No payment found for order ${orderId}`,
            timestamp: new Date().toISOString(),
          },
        });
      }

      return reply.status(200).send(success(result));
    },
  );

  app.get(
    "/payments/:id",
    {
      preHandler: [
        authenticate,
        requireRole("customer", "admin", "superadmin"),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      const result = await paymentService.getPaymentStatus(
        id,
        user.userId,
        user.role,
      );

      return reply.status(200).send(success(result));
    },
  );

  app.post(
    "/payments/orders/:orderId/cancel",
    {
      preHandler: [
        authenticate,
        requireRole("customer", "admin", "superadmin"),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { orderId } = request.params as { orderId: string };
      const user = request.user!;
      const body = cancelSchema.parse(request.body ?? {});

      await paymentService.cancelPayment(
        orderId,
        user.userId,
        user.role,
        body.reason,
      );

      return reply
        .status(200)
        .send(success({ message: "Payment cancelled successfully" }));
    },
  );

  app.post(
    "/payments/:id/refund",
    {
      preHandler: [authenticate, requireRole("admin", "superadmin")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;
      const body = refundSchema.parse(request.body);

      const result = await refundService.createRefund(id, {
        amountCents: body.amountCents,
        reason: body.reason,
        idempotencyKey: body.idempotencyKey,
        initiatedById: user.userId,
        initiatedByRole: user.role,
      });

      return reply.status(201).send(success(result));
    },
  );
}
