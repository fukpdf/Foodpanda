import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "@deliveryos/database";
import { ordersFoundation } from "@deliveryos/database";
import { OrderStateMachine } from "../state-machine/engine.js";
import { eventBus } from "../events/event-bus.js";
import { timingSafeEqual } from "node:crypto";

function safeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

const confirmPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  paymentReference: z.string().min(1),
  amountCents: z.number().int().positive().optional(),
  currency: z.string().length(3).optional(),
});

const failPaymentSchema = z.object({
  reason: z.string().min(1).max(500).default("Payment failed"),
});

export async function registerInternalRoutes(
  app: FastifyInstance,
  db: Database,
  internalKey: string | undefined,
): Promise<void> {
  const engine = new OrderStateMachine(db, eventBus);

  function requireInternalKey(
    request: FastifyRequest,
    reply: FastifyReply,
  ): boolean {
    if (!internalKey) {
      reply.status(401).send({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Internal key not configured",
          timestamp: new Date().toISOString(),
        },
      });
      return false;
    }

    const provided = request.headers["x-internal-key"] as string | undefined;
    if (!provided || !safeStringEqual(provided, internalKey)) {
      reply.status(401).send({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid internal key",
          timestamp: new Date().toISOString(),
        },
      });
      return false;
    }
    return true;
  }

  app.post(
    "/internal/orders/:id/confirm-payment",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireInternalKey(request, reply)) return;

      const { id: orderId } = request.params as { id: string };
      const body = confirmPaymentSchema.parse(request.body);

      const [order] = await db
        .select()
        .from(ordersFoundation)
        .where(eq(ordersFoundation.id, orderId))
        .limit(1);

      if (!order) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `Order ${orderId} not found`,
            timestamp: new Date().toISOString(),
          },
        });
      }

      if (order.status === "confirmed") {
        return reply.status(200).send({
          success: true,
          data: { confirmed: true, idempotent: true },
          timestamp: new Date().toISOString(),
        });
      }

      if (order.status !== "pending") {
        return reply.status(409).send({
          success: false,
          error: {
            code: "CONFLICT",
            message: `Order ${orderId} is in state '${order.status}', expected 'pending' (PAYMENT_PENDING)`,
            timestamp: new Date().toISOString(),
          },
        });
      }

      await engine.transition({
        orderId,
        fromState: "PAYMENT_PENDING",
        toState: "CONFIRMED",
        actorId: undefined,
        actorRole: "system",
        reason: "Payment confirmed",
        note: `Payment ID: ${body.paymentId}`,
      });

      await db
        .update(ordersFoundation)
        .set({
          paymentStatus: "paid",
          paymentReference: body.paymentReference,
          paymentMethod: "card",
          updatedAt: new Date(),
        })
        .where(eq(ordersFoundation.id, orderId));

      return reply.status(200).send({
        success: true,
        data: { confirmed: true, orderId },
        timestamp: new Date().toISOString(),
      });
    },
  );

  app.post(
    "/internal/orders/:id/fail-payment",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireInternalKey(request, reply)) return;

      const { id: orderId } = request.params as { id: string };
      const body = failPaymentSchema.parse(request.body ?? {});

      const [order] = await db
        .select()
        .from(ordersFoundation)
        .where(eq(ordersFoundation.id, orderId))
        .limit(1);

      if (!order) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `Order ${orderId} not found`,
            timestamp: new Date().toISOString(),
          },
        });
      }

      await db
        .update(ordersFoundation)
        .set({
          paymentStatus: "failed",
          updatedAt: new Date(),
        })
        .where(eq(ordersFoundation.id, orderId));

      return reply.status(200).send({
        success: true,
        data: {
          orderId,
          paymentStatus: "failed",
          reason: body.reason,
        },
        timestamp: new Date().toISOString(),
      });
    },
  );
}
