import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { timingSafeEqual } from "node:crypto";
import type { DispatchService } from "../services/dispatch.service.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { ok, fail } from "../utils/response.js";

function safeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

const initiateSchema = z.object({
  orderId: z.string().uuid(),
});

const acknowledgeSchema = z.object({
  reason: z.string().max(500).optional(),
});

export async function registerDispatchRoutes(
  app: FastifyInstance,
  dispatchService: DispatchService,
  orderServiceInternalKey: string | undefined,
): Promise<void> {
  function requireInternalKey(
    request: FastifyRequest,
    reply: FastifyReply,
    key: string | undefined,
    label: string,
  ): boolean {
    if (!key) {
      void reply.status(401).send({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: `${label} not configured`,
          timestamp: new Date().toISOString(),
        },
      });
      return false;
    }
    const provided = request.headers["x-internal-key"] as string | undefined;
    if (!provided || !safeStringEqual(provided, key)) {
      void reply.status(401).send({
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

  // ── F. Idempotent dispatch initiation (called by order-service) ──────────

  app.post(
    "/internal/dispatch/initiate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (
        !requireInternalKey(
          request,
          reply,
          orderServiceInternalKey,
          "ORDER_SERVICE_INTERNAL_KEY",
        )
      )
        return;

      const body = initiateSchema.parse(request.body);

      try {
        const dispatched = await dispatchService.initiateDispatch(body.orderId);
        return reply.status(200).send({
          ...ok({ orderId: body.orderId, dispatched }),
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Dispatch failed";
        return reply.status(500).send({
          ...fail("DISPATCH_ERROR", message),
          timestamp: new Date().toISOString(),
        });
      }
    },
  );

  // ── G. Rider accept assignment ────────────────────────────────────────────

  app.post(
    "/dispatch/assignments/:id/accept",
    { preHandler: [authenticate, requireRole("rider")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: assignmentId } = request.params as { id: string };
      const user = request.user!;

      try {
        const { orderId, idempotent } =
          await dispatchService.acknowledgeDispatch(
            assignmentId,
            user.userId,
            true,
          );

        // F. Idempotency: only notify order-service if not already accepted
        if (!idempotent) {
          await dispatchService.orderServiceClient.notifyRiderAccepted(
            orderId,
            user.userId,
          );
        }

        return reply.status(200).send({
          ...ok({ assignmentId, accepted: true, orderId, idempotent: idempotent ?? false }),
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to accept assignment";
        const status = message.includes("not found") ? 404 : 400;
        return reply.status(status).send({
          ...fail("ACCEPT_ERROR", message),
          timestamp: new Date().toISOString(),
        });
      }
    },
  );

  // ── G. Rider reject assignment ────────────────────────────────────────────

  app.post(
    "/dispatch/assignments/:id/reject",
    { preHandler: [authenticate, requireRole("rider")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: assignmentId } = request.params as { id: string };
      const user = request.user!;
      const body = acknowledgeSchema.parse(request.body ?? {});

      try {
        const { orderId, idempotent } =
          await dispatchService.acknowledgeDispatch(
            assignmentId,
            user.userId,
            false,
            body.reason,
          );

        return reply.status(200).send({
          ...ok({ assignmentId, accepted: false, orderId, idempotent: idempotent ?? false }),
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to reject assignment";
        const status = message.includes("not found") ? 404 : 400;
        return reply.status(status).send({
          ...fail("REJECT_ERROR", message),
          timestamp: new Date().toISOString(),
        });
      }
    },
  );

  // ── G. Rider lifecycle events (dispatch-service → order-service) ─────────
  // These rider-authenticated endpoints proxy lifecycle events to order-service
  // and update the dispatch record timestamps.

  async function lifecycleEvent(
    request: FastifyRequest,
    reply: FastifyReply,
    notifyFn: (orderId: string, actorId?: string) => Promise<void>,
    recordFn?: (orderId: string) => Promise<void>,
  ): Promise<void> {
    const { id: orderId } = request.params as { id: string };
    const user = request.user!;

    try {
      await notifyFn(orderId, user.userId);
      if (recordFn) await recordFn(orderId).catch(() => {});
      return reply.status(200).send({
        ...ok({ orderId }),
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Lifecycle update failed";
      const status = message.includes("not found") ? 404 : 409;
      return reply.status(status).send({
        ...fail("LIFECYCLE_ERROR", message),
        timestamp: new Date().toISOString(),
      });
    }
  }

  app.post(
    "/dispatch/orders/:id/arrived-at-vendor",
    { preHandler: [authenticate, requireRole("rider")] },
    (request, reply) =>
      lifecycleEvent(
        request,
        reply,
        (id, actor) =>
          dispatchService.orderServiceClient.notifyArrivedAtVendor(id, actor),
        (id) => dispatchService.recordArrivedAtVendor(id),
      ),
  );

  app.post(
    "/dispatch/orders/:id/picked-up",
    { preHandler: [authenticate, requireRole("rider")] },
    (request, reply) =>
      lifecycleEvent(
        request,
        reply,
        (id, actor) =>
          dispatchService.orderServiceClient.notifyPickedUp(id, actor),
        (id) => dispatchService.recordPickedUp(id),
      ),
  );

  app.post(
    "/dispatch/orders/:id/in-transit",
    { preHandler: [authenticate, requireRole("rider")] },
    (request, reply) =>
      lifecycleEvent(
        request,
        reply,
        (id, actor) =>
          dispatchService.orderServiceClient.notifyInTransit(id, actor),
        (id) => dispatchService.recordInTransit(id),
      ),
  );

  app.post(
    "/dispatch/orders/:id/arrived-at-customer",
    { preHandler: [authenticate, requireRole("rider")] },
    (request, reply) =>
      lifecycleEvent(
        request,
        reply,
        (id, actor) =>
          dispatchService.orderServiceClient.notifyArrivedAtCustomer(
            id,
            actor,
          ),
        (id) => dispatchService.recordArrivedAtCustomer(id),
      ),
  );

  app.post(
    "/dispatch/orders/:id/delivered",
    { preHandler: [authenticate, requireRole("rider")] },
    (request, reply) =>
      lifecycleEvent(
        request,
        reply,
        (id, actor) =>
          dispatchService.orderServiceClient.notifyDelivered(id, actor),
        (id) => dispatchService.recordDelivered(id),
      ),
  );
}
