import type { FastifyRequest, FastifyReply } from "fastify";
import type { OrderService } from "../services/order.service.js";
import { env } from "../config/env.js";
import {
  createOrderSchema,
  transitionOrderSchema,
  cancelOrderSchema,
  paginationSchema,
  validateBody,
  validateQuery,
} from "../validators/order.validators.js";
import type { CancellationActor } from "../types/order.types.js";
import { ok, fail } from "../utils/response.js";

export class OrderController {
  constructor(
    private readonly orderService: OrderService,
  ) {}

  private async ensureOrderAccess(
    orderId: string,
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<boolean> {
    const user = request.user!;
    const allowed = await this.orderService.canAccessOrder(
      orderId,
      user.userId,
      user.role,
    );
    if (!allowed) {
      await reply.status(404).send({
        ...fail("NOT_FOUND", "Order not found"),
        timestamp: new Date().toISOString(),
      });
      return false;
    }
    return true;
  }

  async createOrder(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const user = request.user!;
    const body = validateBody(createOrderSchema, request.body);

    const order = await this.orderService.createOrder(user.userId, body);

    return reply.status(201).send({
      ...ok(order),
      timestamp: new Date().toISOString(),
    });
  }

  async getOrder(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = request.params as { id: string };

    const result = await this.orderService.getOrder(id);
    if (!result) {
      return reply.status(404).send({
        ...fail("NOT_FOUND", `Order ${id} not found`),
        timestamp: new Date().toISOString(),
      });
    }

    if (!(await this.ensureOrderAccess(id, request, reply))) return;

    return reply.status(200).send({
      ...ok(result),
      timestamp: new Date().toISOString(),
    });
  }

  async transitionOrder(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = request.params as { id: string };
    const user = request.user!;
    if (!(await this.ensureOrderAccess(id, request, reply))) return;
    const body = validateBody(transitionOrderSchema, request.body);

    const result = await this.orderService.transitionOrder(
      id,
      body.toState,
      user.userId,
      user.role,
      body.reason,
      body.note,
    );

    // Phase 7 dispatch gate: fire-and-forget HTTP call to dispatch-service.
    // When an order enters DISPATCH_CREATED, notify dispatch-service to begin
    // the rider search. The state machine already enforces that DISPATCH_CREATED
    // is only reachable from READY_FOR_PICKUP.
    if (body.toState === "DISPATCH_CREATED") {
      void fetch(`${env.DISPATCH_SERVICE_URL}/internal/dispatch/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(env.ORDER_SERVICE_INTERNAL_KEY
            ? { "X-Internal-Key": env.ORDER_SERVICE_INTERNAL_KEY }
            : {}),
        },
        body: JSON.stringify({ orderId: id }),
        signal: AbortSignal.timeout(5_000),
      }).catch((err: unknown) => {
        request.log.error(
          { err, orderId: id },
          "dispatch-service HTTP call failed (non-fatal)",
        );
      });
    }

    return reply.status(200).send({
      ...ok(result),
      timestamp: new Date().toISOString(),
    });
  }

  async cancelOrder(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = request.params as { id: string };
    const user = request.user!;
    if (!(await this.ensureOrderAccess(id, request, reply))) return;
    const body = validateBody(cancelOrderSchema, request.body);

    const result = await this.orderService.cancelOrder(
      id,
      user.userId,
      user.role as CancellationActor,
      body.reason,
    );

    return reply.status(200).send({
      ...ok(result),
      timestamp: new Date().toISOString(),
    });
  }

  async getMyOrders(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const user = request.user!;
    const query = validateQuery(paginationSchema, request.query);

    const result = await this.orderService.getOrdersByCustomer(user.userId, {
      page: query.page,
      limit: query.limit,
      status: query.status,
    });

    return reply.status(200).send({
      ...ok(result.data, {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPreviousPage: result.hasPreviousPage,
      }),
      timestamp: new Date().toISOString(),
    });
  }

  async getVendorBranchOrders(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const { branchId } = request.params as { branchId: string };
    const user = request.user!;
    if (!(await this.orderService.canAccessVendorBranch(branchId, user.userId, user.role))) {
      return reply.status(403).send({
        ...fail("FORBIDDEN", "You do not have access to this vendor branch"),
        timestamp: new Date().toISOString(),
      });
    }
    const query = validateQuery(paginationSchema, request.query);

    const result = await this.orderService.getOrdersByVendorBranch(branchId, {
      page: query.page,
      limit: query.limit,
      status: query.status,
    });

    return reply.status(200).send({
      ...ok(result.data, {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPreviousPage: result.hasPreviousPage,
      }),
      timestamp: new Date().toISOString(),
    });
  }

  async getRiderOrders(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const user = request.user!;
    const query = validateQuery(paginationSchema, request.query);

    const result = await this.orderService.getOrdersByRider(user.userId, {
      page: query.page,
      limit: query.limit,
      status: query.status,
    });

    return reply.status(200).send({
      ...ok(result.data, {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPreviousPage: result.hasPreviousPage,
      }),
      timestamp: new Date().toISOString(),
    });
  }

  async getOrderHistory(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = request.params as { id: string };
    if (!(await this.ensureOrderAccess(id, request, reply))) return;

    const history = await this.orderService.getOrderHistory(id);

    return reply.status(200).send({
      ...ok(history),
      timestamp: new Date().toISOString(),
    });
  }
}
