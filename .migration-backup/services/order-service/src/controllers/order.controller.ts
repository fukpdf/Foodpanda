import type { FastifyRequest, FastifyReply } from "fastify";
import type { OrderService } from "../services/order.service.js";
import type { DispatchService } from "../services/dispatch.service.js";
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
    private readonly dispatchService: DispatchService,
  ) {}

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

    const user = request.user!;
    if (
      user.role === "customer" &&
      result.order.customerId !== user.userId
    ) {
      return reply.status(403).send({
        ...fail("FORBIDDEN", "You do not have access to this order"),
        timestamp: new Date().toISOString(),
      });
    }

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
    const body = validateBody(transitionOrderSchema, request.body);

    const result = await this.orderService.transitionOrder(
      id,
      body.toState,
      user.userId,
      user.role,
      body.reason,
      body.note,
    );

    // Phase 7 dispatch gate: fire-and-forget dispatch initiation
    // when transitioning to DISPATCH_CREATED.
    // The state machine already enforces that DISPATCH_CREATED
    // is only reachable from READY_FOR_PICKUP.
    if (body.toState === "DISPATCH_CREATED") {
      await this.dispatchService.initiateDispatch(id).catch((err) => {
        request.log.error(
          { err, orderId: id },
          "dispatch.initiateDispatch failed (non-fatal)",
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

    const history = await this.orderService.getOrderHistory(id);

    return reply.status(200).send({
      ...ok(history),
      timestamp: new Date().toISOString(),
    });
  }
}
