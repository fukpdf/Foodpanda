import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { OrderController } from "../controllers/order.controller.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { claimIdempotencyKey, getIdempotencyKey, replayIdempotentResponse, storeIdempotentResponse } from "../middleware/idempotency.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

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

export async function registerOrderRoutes(app: FastifyInstance, controller: OrderController, db: Database): Promise<void> {
  app.post("/orders", { preHandler: [authenticate, requireRole("customer")] }, (req, reply) => idempotentMutation(db, "order-create", (r, p) => controller.createOrder(r, p), req, reply));
  app.get("/orders/me", { preHandler: [authenticate, requireRole("customer")] }, (req, reply) => controller.getMyOrders(req, reply));
  app.get("/orders/rider/me", { preHandler: [authenticate, requireRole("rider")] }, (req, reply) => controller.getRiderOrders(req, reply));
  app.get("/orders/vendor/branch/:branchId", { preHandler: [authenticate, requireRole("vendor", "admin", "superadmin")] }, (req, reply) => controller.getVendorBranchOrders(req, reply));
  app.get("/orders/:id", { preHandler: [authenticate] }, (req, reply) => controller.getOrder(req, reply));
  app.patch("/orders/:id/state", { preHandler: [authenticate, requireRole("vendor", "rider", "admin", "superadmin")] }, (req, reply) => idempotentMutation(db, "order-state-transition", (r, p) => controller.transitionOrder(r, p), req, reply));
  app.post("/orders/:id/cancel", { preHandler: [authenticate, requireRole("customer", "vendor", "admin", "superadmin")] }, (req, reply) => idempotentMutation(db, "order-cancel", (r, p) => controller.cancelOrder(r, p), req, reply));
  app.get("/orders/:id/history", { preHandler: [authenticate] }, (req, reply) => controller.getOrderHistory(req, reply));
}
