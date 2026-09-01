import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { OrderController } from "../controllers/order.controller.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { claimIdempotencyKey, getIdempotencyKey, replayIdempotentResponse, storeIdempotentResponse } from "../middleware/idempotency.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, eq, isNull } from "drizzle-orm";
import { auditLogs, outboxEvents } from "@workspace/db";

type Database = NodePgDatabase<Record<string, unknown>>;

async function idempotentMutation(
  db: Database,
  resourceType: string,
  handler: (request: FastifyRequest, reply: FastifyReply) => Promise<void>,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const key = getIdempotencyKey(request);
  if (!key) {
    await reply.status(400).send({ success: false, error: { code: "IDEMPOTENCY_KEY_REQUIRED", message: "Idempotency-Key header is required for this mutation" }, timestamp: new Date().toISOString() });
    return;
  }

  const claim = await claimIdempotencyKey(db, request, resourceType, key);
  if (claim === "completed") {
    await replayIdempotentResponse(db, request, reply);
    return;
  }
  if (claim === "in_progress") {
    await reply.status(409).send({ success: false, error: { code: "IDEMPOTENCY_REQUEST_IN_PROGRESS", message: "Another request with this Idempotency-Key is still being processed" }, timestamp: new Date().toISOString() });
    return;
  }

  const originalSend = reply.send.bind(reply);
  let responseBody: unknown;
  let responseStatus = 200;
  reply.send = ((payload?: unknown) => {
    responseBody = payload;
    responseStatus = reply.statusCode;
    return originalSend(payload);
  }) as typeof reply.send;

  await handler(request, reply);
  if (responseBody !== undefined && responseStatus >= 200 && responseStatus < 300) {
    await storeIdempotentResponse(db, request, resourceType, null, responseStatus, responseBody);
  }
}

async function replayDeadLetter(
  db: Database,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const params = request.params as { id: string };
  const actor = (request as FastifyRequest & { user?: { id?: string; role?: string } }).user;
  if (!actor?.id) {
    await reply.status(401).send({ success: false, error: { code: "UNAUTHENTICATED", message: "Authentication required" } });
    return;
  }
  const rows = await db.select().from(outboxEvents).where(
    and(eq(outboxEvents.id, params.id), eq(outboxEvents.status, "dead_letter"), isNull(outboxEvents.publishedAt)),
  ).limit(1);
  const event = rows[0];
  if (!event) {
    await reply.status(404).send({ success: false, error: { code: "DLQ_EVENT_NOT_FOUND", message: "Dead-letter event not found" } });
    return;
  }
  const updated = await db.transaction(async (tx) => {
    const [replayed] = await tx.update(outboxEvents).set({
      status: "pending",
      availableAt: new Date(),
      lockedAt: null,
      lockedBy: null,
      replayCount: event.replayCount + 1,
      replayedAt: new Date(),
      replayedBy: actor.id,
      lastError: null,
      deadLetteredAt: null,
    }).where(and(eq(outboxEvents.id, event.id), eq(outboxEvents.status, "dead_letter"))).returning();
    if (!replayed) return null;
    await tx.insert(auditLogs).values({
      actorId: actor.id,
      actorRole: actor.role ?? null,
      action: "UPDATE",
      entityType: "outbox_event",
      entityId: event.id,
      reason: "Dead-letter event replayed",
      metadata: { replayCount: replayed.replayCount },
      previousValue: { status: "dead_letter" },
      newValue: { status: "pending" },
    });
    return replayed;
  });
  if (!updated) {
    await reply.status(409).send({ success: false, error: { code: "DLQ_REPLAY_CONFLICT", message: "Event was changed by another operator" } });
    return;
  }
  await reply.status(202).send({ success: true, data: { eventId: updated.id, status: updated.status, replayCount: updated.replayCount } });
}

export async function registerOrderRoutes(app: FastifyInstance, controller: OrderController, db: Database): Promise<void> {
  app.post("/orders", { preHandler: [authenticate, requireRole("customer")] }, (req, reply) => idempotentMutation(db, "order-create", (r, p) => controller.createOrder(r, p), req, reply));
  app.post("/admin/outbox/:id/replay", { preHandler: [authenticate, requireRole("admin", "superadmin")] }, (req, reply) => replayDeadLetter(db, req, reply));
  app.get("/orders/me", { preHandler: [authenticate, requireRole("customer")] }, (req, reply) => controller.getMyOrders(req, reply));
  app.get("/orders/rider/me", { preHandler: [authenticate, requireRole("rider")] }, (req, reply) => controller.getRiderOrders(req, reply));
  app.get("/orders/vendor/branch/:branchId", { preHandler: [authenticate, requireRole("vendor", "admin", "superadmin")] }, (req, reply) => controller.getVendorBranchOrders(req, reply));
  app.get("/orders/:id", { preHandler: [authenticate] }, (req, reply) => controller.getOrder(req, reply));
  app.patch("/orders/:id/state", { preHandler: [authenticate, requireRole("vendor", "rider", "admin", "superadmin")] }, (req, reply) => idempotentMutation(db, "order-state-transition", (r, p) => controller.transitionOrder(r, p), req, reply));
  app.post("/orders/:id/cancel", { preHandler: [authenticate, requireRole("customer", "vendor", "admin", "superadmin")] }, (req, reply) => idempotentMutation(db, "order-cancel", (r, p) => controller.cancelOrder(r, p), req, reply));
  app.get("/orders/:id/history", { preHandler: [authenticate] }, (req, reply) => controller.getOrderHistory(req, reply));
}
