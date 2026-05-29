import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { ordersFoundation } from "@workspace/db";
import { OrderStateMachine } from "../state-machine/engine.js";
import { eventBus } from "../events/event-bus.js";
import { timingSafeEqual } from "node:crypto";
import type { OrderState } from "../types/order.types.js";
import { DB_STATUS_TO_STATE } from "../types/order.types.js";

type Database = NodePgDatabase<Record<string, unknown>>;

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

// Phase 7 dispatch lifecycle schemas
const riderAssignedSchema = z.object({
  riderId: z.string().uuid(),
  estimatedDeliveryAt: z.string().datetime().optional(),
});

const dispatchEventSchema = z.object({
  actorId: z.string().uuid().optional(),
  note: z.string().max(500).optional(),
});

export async function registerInternalRoutes(
  app: FastifyInstance,
  db: Database,
  paymentInternalKey: string | undefined,
  dispatchInternalKey: string | undefined,
): Promise<void> {
  const engine = new OrderStateMachine(db, eventBus);

  function requireKey(
    request: FastifyRequest,
    reply: FastifyReply,
    key: string | undefined,
    errorMsg: string,
  ): boolean {
    if (!key) {
      reply.status(401).send({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: errorMsg,
          timestamp: new Date().toISOString(),
        },
      });
      return false;
    }
    const provided = request.headers["x-internal-key"] as string | undefined;
    if (!provided || !safeStringEqual(provided, key)) {
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

  async function fetchOrder(
    orderId: string,
    reply: FastifyReply,
  ) {
    const [order] = await db
      .select()
      .from(ordersFoundation)
      .where(eq(ordersFoundation.id, orderId))
      .limit(1);

    if (!order) {
      reply.status(404).send({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Order ${orderId} not found`,
          timestamp: new Date().toISOString(),
        },
      });
      return null;
    }
    return order;
  }

  // ── Payment-service internal routes ─────────────────────────────────────

  app.post(
    "/internal/orders/:id/confirm-payment",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (
        !requireKey(
          request,
          reply,
          paymentInternalKey,
          "PAYMENT_SERVICE_INTERNAL_KEY not configured",
        )
      )
        return;

      const { id: orderId } = request.params as { id: string };
      const body = confirmPaymentSchema.parse(request.body);

      const order = await fetchOrder(orderId, reply);
      if (!order) return;

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
      if (
        !requireKey(
          request,
          reply,
          paymentInternalKey,
          "PAYMENT_SERVICE_INTERNAL_KEY not configured",
        )
      )
        return;

      const { id: orderId } = request.params as { id: string };
      const body = failPaymentSchema.parse(request.body ?? {});

      const order = await fetchOrder(orderId, reply);
      if (!order) return;

      await db
        .update(ordersFoundation)
        .set({ paymentStatus: "failed", updatedAt: new Date() })
        .where(eq(ordersFoundation.id, orderId));

      return reply.status(200).send({
        success: true,
        data: { orderId, paymentStatus: "failed", reason: body.reason },
        timestamp: new Date().toISOString(),
      });
    },
  );

  // ── Dispatch-service internal routes (Phase 7) ───────────────────────────
  // Called by the dispatch-service to drive Phase 7 state transitions.
  // All routes are secured with DISPATCH_SERVICE_INTERNAL_KEY.

  // H. Idempotent dispatch lifecycle transition helper
  async function dispatchTransition(
    request: FastifyRequest,
    reply: FastifyReply,
    fromState: OrderState,
    toState: OrderState,
  ): Promise<void> {
    if (
      !requireKey(
        request,
        reply,
        dispatchInternalKey,
        "DISPATCH_SERVICE_INTERNAL_KEY not configured",
      )
    )
      return;

    const { id: orderId } = request.params as { id: string };
    const body = dispatchEventSchema.parse(request.body ?? {});
    const order = await fetchOrder(orderId, reply);
    if (!order) return;

    const currentState =
      DB_STATUS_TO_STATE[order.status as keyof typeof DB_STATUS_TO_STATE];

    // F. Idempotency: already at target state → return 200
    if (currentState === toState) {
      return reply.status(200).send({
        success: true,
        data: { orderId, toState, idempotent: true },
        timestamp: new Date().toISOString(),
      });
    }

    if (currentState !== fromState) {
      return reply.status(409).send({
        success: false,
        error: {
          code: "CONFLICT",
          message: `Order ${orderId} is in state '${order.status}', expected '${fromState.toLowerCase()}'`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    await engine.transition({
      orderId,
      fromState,
      toState,
      actorId: body.actorId,
      actorRole: "system",
      note: body.note,
    });

    return reply.status(200).send({
      success: true,
      data: { orderId, toState },
      timestamp: new Date().toISOString(),
    });
  }

  // dispatch-service → DISPATCH_CREATED → RIDER_ASSIGNED (includes riderId)
  app.post(
    "/internal/orders/:id/rider-assigned",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (
        !requireKey(
          request,
          reply,
          dispatchInternalKey,
          "DISPATCH_SERVICE_INTERNAL_KEY not configured",
        )
      )
        return;

      const { id: orderId } = request.params as { id: string };
      const body = riderAssignedSchema.parse(request.body);
      const order = await fetchOrder(orderId, reply);
      if (!order) return;

      const currentState =
        DB_STATUS_TO_STATE[order.status as keyof typeof DB_STATUS_TO_STATE];

      // F. Idempotency: already RIDER_ASSIGNED → return 200
      if (currentState === "RIDER_ASSIGNED") {
        return reply.status(200).send({
          success: true,
          data: {
            orderId,
            riderId: body.riderId,
            toState: "RIDER_ASSIGNED",
            idempotent: true,
          },
          timestamp: new Date().toISOString(),
        });
      }

      if (currentState !== "DISPATCH_CREATED") {
        return reply.status(409).send({
          success: false,
          error: {
            code: "CONFLICT",
            message: `Order ${orderId} is in state '${order.status}', expected 'dispatch_created'`,
            timestamp: new Date().toISOString(),
          },
        });
      }

      const estimatedDeliveryAt = body.estimatedDeliveryAt
        ? new Date(body.estimatedDeliveryAt)
        : undefined;

      await db
        .update(ordersFoundation)
        .set({
          riderId: body.riderId,
          estimatedDeliveryAt: estimatedDeliveryAt ?? null,
          updatedAt: new Date(),
        })
        .where(eq(ordersFoundation.id, orderId));

      await engine.transition({
        orderId,
        fromState: "DISPATCH_CREATED",
        toState: "RIDER_ASSIGNED",
        actorId: body.riderId,
        actorRole: "system",
        reason: "Rider assigned by dispatch-service",
      });

      return reply.status(200).send({
        success: true,
        data: { orderId, riderId: body.riderId, toState: "RIDER_ASSIGNED" },
        timestamp: new Date().toISOString(),
      });
    },
  );

  // H. Permanent dispatch failure — cancels order from DISPATCH_CREATED state
  app.post(
    "/internal/orders/:id/dispatch-failed",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (
        !requireKey(
          request,
          reply,
          dispatchInternalKey,
          "DISPATCH_SERVICE_INTERNAL_KEY not configured",
        )
      )
        return;

      const { id: orderId } = request.params as { id: string };
      const body = z
        .object({ reason: z.string().max(500).optional() })
        .parse(request.body ?? {});

      const order = await fetchOrder(orderId, reply);
      if (!order) return;

      const currentState =
        DB_STATUS_TO_STATE[order.status as keyof typeof DB_STATUS_TO_STATE];

      // F. Idempotency: already cancelled or in terminal state
      if (
        currentState === "CANCELLED" ||
        currentState === "DELIVERED" ||
        currentState === "REFUNDED"
      ) {
        return reply.status(200).send({
          success: true,
          data: { orderId, idempotent: true },
          timestamp: new Date().toISOString(),
        });
      }

      if (!currentState) {
        return reply.status(422).send({
          success: false,
          error: {
            code: "UNKNOWN_STATE",
            message: `Order ${orderId} has an unrecognised status '${order.status}'`,
            timestamp: new Date().toISOString(),
          },
        });
      }

      await engine.transition({
        orderId,
        fromState: currentState,
        toState: "CANCELLED",
        actorId: undefined,
        actorRole: "system",
        reason:
          body.reason ?? "Dispatch permanently failed — no rider available",
      });

      return reply.status(200).send({
        success: true,
        data: { orderId, toState: "CANCELLED" },
        timestamp: new Date().toISOString(),
      });
    },
  );

  app.post("/internal/orders/:id/rider-accepted", (req, reply) =>
    dispatchTransition(req, reply, "RIDER_ASSIGNED", "RIDER_ACCEPTED"),
  );

  app.post("/internal/orders/:id/arrived-at-vendor", (req, reply) =>
    dispatchTransition(req, reply, "RIDER_ACCEPTED", "ARRIVED_AT_VENDOR"),
  );

  app.post("/internal/orders/:id/picked-up", (req, reply) =>
    dispatchTransition(req, reply, "ARRIVED_AT_VENDOR", "PICKED_UP"),
  );

  app.post("/internal/orders/:id/in-transit", (req, reply) =>
    dispatchTransition(req, reply, "PICKED_UP", "ON_THE_WAY"),
  );

  app.post("/internal/orders/:id/arrived-at-customer", (req, reply) =>
    dispatchTransition(req, reply, "ON_THE_WAY", "ARRIVED_AT_CUSTOMER"),
  );

  app.post("/internal/orders/:id/delivered", (req, reply) =>
    dispatchTransition(req, reply, "ARRIVED_AT_CUSTOMER", "DELIVERED"),
  );
}
