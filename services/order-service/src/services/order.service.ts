import { randomUUID } from "node:crypto";
import type { Database } from "@deliveryos/database";
import type { OrderFoundation } from "@deliveryos/database";
import type { CreateOrderInput as CreateOrderInputType, OrderWithItems, OrderFilters, TransitionOrderInput, CancelOrderInput } from "../types/order.types.js";
import { DB_STATUS_TO_STATE, ORDER_STATE_TO_DB } from "../types/order.types.js";
import { OrderRepository } from "../repositories/order.repository.js";
import { OrderStateRepository } from "../repositories/order-state.repository.js";
import { DispatchRepository } from "../repositories/dispatch.repository.js";
import { OrderStateMachine } from "../state-machine/engine.js";
import { validateCancellation, validateTransition } from "../state-machine/transitions.js";
import type { EventBus } from "../events/event-bus.js";
import type { OrderCreatedEvent, OrderCancelledEvent } from "../types/event.types.js";

export class OrderNotFoundError extends Error {
  readonly code = "ORDER_NOT_FOUND";
  readonly statusCode = 404;
  constructor(orderId: string) {
    super(`Order ${orderId} not found`);
    this.name = "OrderNotFoundError";
  }
}

export class OrderAccessDeniedError extends Error {
  readonly code = "FORBIDDEN";
  readonly statusCode = 403;
  constructor(orderId: string) {
    super(`Access denied to order ${orderId}`);
    this.name = "OrderAccessDeniedError";
  }
}

export class OrderService {
  private readonly orderRepo: OrderRepository;
  private readonly stateRepo: OrderStateRepository;
  private readonly dispatchRepo: DispatchRepository;
  private readonly stateMachine: OrderStateMachine;

  constructor(
    private readonly db: Database,
    private readonly eventBus: EventBus,
  ) {
    this.orderRepo = new OrderRepository(db);
    this.stateRepo = new OrderStateRepository(db);
    this.dispatchRepo = new DispatchRepository(db);
    this.stateMachine = new OrderStateMachine(db, eventBus);
  }

  async createOrder(
    input: CreateOrderInputType,
    customerId: string,
  ): Promise<OrderFoundation> {
    const order = await this.orderRepo.create({
      ...input,
      customerId,
    } as Parameters<typeof this.orderRepo.create>[0]);

    const createdEvent: OrderCreatedEvent = {
      eventId: randomUUID(),
      eventType: "order.created",
      orderId: order.id,
      occurredAt: new Date().toISOString(),
      version: 1,
      source: "order-service",
      payload: {
        customerId,
        vendorBranchId: order.vendorBranchId,
        orderNumber: order.orderNumber,
        totalCents: order.totalCents,
        itemCount: input.items.length,
      },
    };
    this.eventBus.emit(createdEvent);

    await this.stateMachine.transition({
      orderId: order.id,
      fromState: "CREATED",
      toState: "PAYMENT_PENDING",
      actorId: customerId,
      actorRole: "customer",
      note: "Order submitted — awaiting payment",
    });

    return (await this.orderRepo.findById(order.id))!;
  }

  async getOrder(
    orderId: string,
    requesterId?: string,
    requesterRole?: string,
  ): Promise<OrderWithItems> {
    const result = await this.orderRepo.findWithDetails(orderId);
    if (!result) throw new OrderNotFoundError(orderId);

    if (
      requesterId &&
      requesterRole === "customer" &&
      result.order.customerId !== requesterId
    ) {
      throw new OrderAccessDeniedError(orderId);
    }

    return result;
  }

  async getOrdersByCustomer(
    customerId: string,
    filters: OrderFilters = {},
  ): Promise<import("@deliveryos/database").PaginatedResult<OrderFoundation>> {
    return this.orderRepo.findByCustomer(customerId, filters);
  }

  async getOrdersByVendor(
    vendorBranchId: string,
    filters: OrderFilters = {},
  ): Promise<import("@deliveryos/database").PaginatedResult<OrderFoundation>> {
    return this.orderRepo.findByVendorBranch(vendorBranchId, filters);
  }

  async getOrdersByRider(
    riderId: string,
    filters: OrderFilters = {},
  ): Promise<import("@deliveryos/database").PaginatedResult<OrderFoundation>> {
    return this.orderRepo.findByRider(riderId, filters);
  }

  async transitionOrder(input: TransitionOrderInput): Promise<OrderWithItems> {
    const existing = await this.orderRepo.findById(input.orderId);
    if (!existing) throw new OrderNotFoundError(input.orderId);

    const fromState = DB_STATUS_TO_STATE[existing.status];
    if (!fromState) {
      throw new Error(`Order ${input.orderId} has unrecognized status: ${existing.status}`);
    }

    validateTransition({
      orderId: input.orderId,
      fromState,
      toState: input.toState,
      actorId: input.actorId,
      actorRole: input.actorRole,
      reason: input.reason,
      note: input.note,
    });

    await this.stateMachine.transition({
      orderId: input.orderId,
      fromState,
      toState: input.toState,
      actorId: input.actorId,
      actorRole: input.actorRole,
      reason: input.reason,
      note: input.note,
      metadata: input.metadata,
    });

    return (await this.orderRepo.findWithDetails(input.orderId))!;
  }

  async cancelOrder(input: CancelOrderInput): Promise<OrderWithItems> {
    const existing = await this.orderRepo.findById(input.orderId);
    if (!existing) throw new OrderNotFoundError(input.orderId);

    const currentState = DB_STATUS_TO_STATE[existing.status];
    if (!currentState) {
      throw new Error(`Order ${input.orderId} has unrecognized status`);
    }

    validateCancellation({
      orderId: input.orderId,
      currentState,
      actorId: input.actorId,
      actorRole: input.actorRole,
      reason: input.reason,
    });

    await this.stateMachine.transition({
      orderId: input.orderId,
      fromState: currentState,
      toState: "CANCELLED",
      actorId: input.actorId,
      actorRole: input.actorRole,
      reason: input.reason,
    });

    const cancelledEvent: OrderCancelledEvent = {
      eventId: randomUUID(),
      eventType: "order.cancelled",
      orderId: input.orderId,
      occurredAt: new Date().toISOString(),
      version: 1,
      source: "order-service",
      payload: {
        cancelledById: input.actorId,
        cancellationReason: input.reason,
        actorRole: input.actorRole,
        previousState: currentState,
      },
    };
    this.eventBus.emit(cancelledEvent);

    const activeDispatch = await this.dispatchRepo.findActivePendingForOrder(input.orderId);
    if (activeDispatch) {
      await this.dispatchRepo.updateStatus(activeDispatch.id, "cancelled", {
        respondedAt: new Date(),
      });
    }

    return (await this.orderRepo.findWithDetails(input.orderId))!;
  }

  async assignRider(
    orderId: string,
    riderId: string,
    estimatedDeliveryAt?: Date,
  ): Promise<void> {
    const existing = await this.orderRepo.findById(orderId);
    if (!existing) throw new OrderNotFoundError(orderId);

    await this.orderRepo.assignRider(orderId, riderId, estimatedDeliveryAt);

    const fromState = DB_STATUS_TO_STATE[existing.status] ?? "READY_FOR_PICKUP";
    await this.stateMachine.transition({
      orderId,
      fromState,
      toState: "RIDER_ASSIGNED",
      actorId: riderId,
      actorRole: "system",
      note: `Rider ${riderId} assigned via dispatch engine`,
    });
  }
}
