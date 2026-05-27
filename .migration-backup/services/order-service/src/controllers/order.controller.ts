import type { FastifyRequest, FastifyReply } from "fastify";
import type { OrderService } from "../services/order.service.js";
import type { DispatchService } from "../services/dispatch.service.js";
import {
  validateBody,
  validateQuery,
  createOrderSchema,
  transitionOrderSchema,
  cancelOrderSchema,
  paginationSchema,
} from "../validators/order.validators.js";
import { ok, fail } from "../utils/response.js";

export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly dispatchService: DispatchService,
  ) {}

  createOrder = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const customerId = request.user!.userId;
    const body = validateBody(createOrderSchema, request.body);

    const order = await this.orderService.createOrder(body, customerId);

    return reply.status(201).send(ok(order));
  };

  getOrder = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const { id } = request.params;
    const requesterId = request.user?.userId;
    const requesterRole = request.user?.role;

    const result = await this.orderService.getOrder(id, requesterId, requesterRole);

    return reply.status(200).send(ok(result));
  };

  getOrdersByUser = async (
    request: FastifyRequest<{
      Params: { userId: string };
      Querystring: Record<string, unknown>;
    }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const { userId } = request.params;
    const query = validateQuery(paginationSchema, request.query);

    if (
      request.user?.role === "customer" &&
      request.user.userId !== userId
    ) {
      return reply.status(403).send(
        fail("FORBIDDEN", "Cannot access other users' orders"),
      );
    }

    const result = await this.orderService.getOrdersByCustomer(userId, query);

    return reply.status(200).send(ok(result.data, { pagination: result }));
  };

  transitionOrder = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const { id } = request.params;
    const body = validateBody(transitionOrderSchema, request.body);

    const result = await this.orderService.transitionOrder({
      orderId: id,
      toState: body.toState,
      actorId: request.user?.userId,
      actorRole: request.user?.role,
      reason: body.reason,
      note: body.note,
      metadata: body.metadata,
    });

    if (
      result.order.status === "ready_for_pickup" &&
      body.toState === "RIDER_ASSIGNED"
    ) {
      await this.dispatchService.initiateDispatch(id).catch(() => {});
    }

    return reply.status(200).send(ok(result));
  };

  cancelOrder = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const { id } = request.params;
    const body = validateBody(cancelOrderSchema, request.body);

    const actorRole = request.user?.role ?? "customer";

    const result = await this.orderService.cancelOrder({
      orderId: id,
      actorId: request.user!.userId,
      actorRole: actorRole as "customer" | "vendor" | "rider" | "system" | "admin",
      reason: body.reason,
    });

    return reply.status(200).send(ok(result));
  };

  getVendorOrders = async (
    request: FastifyRequest<{
      Params: { vendorId: string };
      Querystring: Record<string, unknown>;
    }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const { vendorId } = request.params;
    const query = validateQuery(paginationSchema, request.query);

    const result = await this.orderService.getOrdersByVendor(vendorId, query);

    return reply.status(200).send(ok(result.data, { pagination: result }));
  };

  getRiderOrders = async (
    request: FastifyRequest<{
      Params: { riderId: string };
      Querystring: Record<string, unknown>;
    }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const { riderId } = request.params;
    const query = validateQuery(paginationSchema, request.query);

    if (
      request.user?.role === "rider" &&
      request.user.userId !== riderId
    ) {
      return reply.status(403).send(
        fail("FORBIDDEN", "Riders can only view their own assigned orders"),
      );
    }

    const result = await this.orderService.getOrdersByRider(riderId, query);

    return reply.status(200).send(ok(result.data, { pagination: result }));
  };

  initiateDispatch = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const { id } = request.params;

    const dispatched = await this.dispatchService.initiateDispatch(id);

    if (!dispatched) {
      return reply.status(503).send(
        fail(
          "DISPATCH_FAILED",
          "No available riders found. Dispatch will retry automatically.",
        ),
      );
    }

    return reply.status(200).send(ok({ dispatched: true, orderId: id }));
  };
}
