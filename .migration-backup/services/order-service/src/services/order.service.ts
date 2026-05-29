import { randomUUID } from "node:crypto";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { ordersFoundation } from "@workspace/db";
import type { OrderFoundation } from "@workspace/db";
import { eq } from "drizzle-orm";

import type { EventBus } from "../events/event-bus.js";
import {
  OrderRepository,
  type OrderWithItems,
} from "../repositories/order.repository.js";
import { OrderStateRepository } from "../repositories/order-state.repository.js";
import { OrderStateMachine } from "../state-machine/engine.js";
import {
  validateCancellation,
  type TransitionContext,
} from "../state-machine/transitions.js";
import type {
  CreateOrderInput,
  OrderState,
  PaginatedResult,
  OrderFilters,
  CancellationActor,
} from "../types/order.types.js";
import { DB_STATUS_TO_STATE, ORDER_STATE_TO_DB } from "../types/order.types.js";
import type { OrderCreatedEvent, OrderCancelledEvent } from "../types/event.types.js";

type Database = NodePgDatabase<Record<string, unknown>>;

export class OrderService {
  private readonly orderRepo: OrderRepository;
  private readonly stateRepo: OrderStateRepository;
  private readonly stateMachine: OrderStateMachine;

  constructor(
    private readonly db: Database,
    private readonly eventBus: EventBus,
  ) {
    this.orderRepo = new OrderRepository(db);
    this.stateRepo = new OrderStateRepository(db);
    this.stateMachine = new OrderStateMachine(db, eventBus);
  }

  async createOrder(
    customerId: string,
    input: CreateOrderInput,
  ): Promise<OrderFoundation> {
    const order = await this.orderRepo.create({ ...input, customerId });

    await this.stateMachine.transition({
      orderId: order.id,
      fromState: "CREATED",
      toState: "PAYMENT_PENDING",
      actorId: customerId,
      actorRole: "customer",
      reason: "Order placed",
    });

    const freshOrder = await this.orderRepo.findById(order.id);

    const event: OrderCreatedEvent = {
      eventId: randomUUID(),
      eventType: "order.created",
      orderId: order.id,
      occurredAt: new Date().toISOString(),
      version: 1,
      source: "order-service",
      payload: {
        customerId,
        vendorBranchId: input.vendorBranchId,
        orderNumber: order.orderNumber,
        totalCents: order.totalCents,
        itemCount: input.items.length,
      },
    };
    this.eventBus.emit(event);

    return freshOrder ?? order;
  }

  async getOrder(orderId: string): Promise<OrderWithItems | null> {
    return this.orderRepo.findWithDetails(orderId);
  }

  async getOrderById(orderId: string): Promise<OrderFoundation | null> {
    return this.orderRepo.findById(orderId);
  }

  async transitionOrder(
    orderId: string,
    toState: OrderState,
    actorId?: string,
    actorRole?: string,
    reason?: string,
    note?: string,
  ): Promise<OrderWithItems> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      const err = new Error(`Order ${orderId} not found`) as Error & {
        statusCode: number;
        code: string;
      };
      err.statusCode = 404;
      err.code = "ORDER_NOT_FOUND";
      throw err;
    }

    const fromState = DB_STATUS_TO_STATE[order.status as keyof typeof DB_STATUS_TO_STATE];
    if (!fromState) {
      const err = new Error(
        `Order ${orderId} has unrecognised status: ${order.status}`,
      ) as Error & { statusCode: number; code: string };
      err.statusCode = 409;
      err.code = "INVALID_ORDER_STATE";
      throw err;
    }

    const ctx: TransitionContext = {
      orderId,
      fromState,
      toState,
      actorId,
      actorRole,
      reason,
      note,
    };

    try {
      await this.stateMachine.transition(ctx);
    } catch (e) {
      const err = e as Error & { code?: string };
      const httpErr = new Error(err.message) as Error & {
        statusCode: number;
        code: string;
      };
      httpErr.statusCode = 409;
      httpErr.code = err.code ?? "INVALID_STATE_TRANSITION";
      throw httpErr;
    }

    const updated = await this.orderRepo.findWithDetails(orderId);
    if (!updated) throw new Error(`Order ${orderId} not found after transition`);
    return updated;
  }

  async cancelOrder(
    orderId: string,
    actorId: string,
    actorRole: CancellationActor,
    reason: string,
  ): Promise<OrderWithItems> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      const err = new Error(`Order ${orderId} not found`) as Error & {
        statusCode: number;
        code: string;
      };
      err.statusCode = 404;
      err.code = "ORDER_NOT_FOUND";
      throw err;
    }

    const currentState = DB_STATUS_TO_STATE[order.status as keyof typeof DB_STATUS_TO_STATE];
    if (!currentState) {
      const err = new Error(
        `Order ${orderId} has unrecognised status: ${order.status}`,
      ) as Error & { statusCode: number; code: string };
      err.statusCode = 409;
      err.code = "INVALID_ORDER_STATE";
      throw err;
    }

    validateCancellation({ orderId, currentState, actorId, actorRole, reason });

    await this.stateMachine.transition({
      orderId,
      fromState: currentState,
      toState: "CANCELLED",
      actorId,
      actorRole,
      reason,
    });

    const event: OrderCancelledEvent = {
      eventId: randomUUID(),
      eventType: "order.cancelled",
      orderId,
      occurredAt: new Date().toISOString(),
      version: 1,
      source: "order-service",
      payload: {
        cancelledById: actorId,
        cancellationReason: reason,
        actorRole,
        previousState: currentState,
      },
    };
    this.eventBus.emit(event);

    const updated = await this.orderRepo.findWithDetails(orderId);
    if (!updated) throw new Error(`Order ${orderId} not found after cancellation`);
    return updated;
  }

  async assignRider(
    orderId: string,
    riderId: string,
    estimatedDeliveryAt?: Date,
  ): Promise<void> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    const fromState =
      DB_STATUS_TO_STATE[order.status as keyof typeof DB_STATUS_TO_STATE] ??
      "READY_FOR_PICKUP";

    await this.orderRepo.assignRider(orderId, riderId, estimatedDeliveryAt);

    await this.stateMachine.transition({
      orderId,
      fromState,
      toState: "RIDER_ASSIGNED",
      actorId: riderId,
      actorRole: "system",
      reason: "Rider assigned by dispatch engine",
    });
  }

  async getOrdersByCustomer(
    customerId: string,
    filters: OrderFilters,
  ): Promise<PaginatedResult<OrderFoundation>> {
    return this.orderRepo.findByCustomer(customerId, filters);
  }

  async getOrdersByVendorBranch(
    vendorBranchId: string,
    filters: OrderFilters,
  ): Promise<PaginatedResult<OrderFoundation>> {
    return this.orderRepo.findByVendorBranch(vendorBranchId, filters);
  }

  async getOrdersByRider(
    riderId: string,
    filters: OrderFilters,
  ): Promise<PaginatedResult<OrderFoundation>> {
    return this.orderRepo.findByRider(riderId, filters);
  }

  async getOrderHistory(orderId: string) {
    return this.stateRepo.findByOrder(orderId);
  }

  async setPaymentConfirmed(
    orderId: string,
    paymentReference: string,
  ): Promise<void> {
    await this.db
      .update(ordersFoundation)
      .set({
        paymentStatus: "paid",
        paymentReference,
        paymentMethod: "card",
        updatedAt: new Date(),
      })
      .where(eq(ordersFoundation.id, orderId));
  }

  async setPaymentFailed(orderId: string): Promise<void> {
    await this.db
      .update(ordersFoundation)
      .set({
        paymentStatus: "failed",
        updatedAt: new Date(),
      })
      .where(eq(ordersFoundation.id, orderId));
  }

  resolveMachineState(dbStatus: string): OrderState | null {
    return DB_STATUS_TO_STATE[dbStatus as keyof typeof DB_STATUS_TO_STATE] ?? null;
  }
}
