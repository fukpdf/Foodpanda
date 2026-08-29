import { randomUUID } from "node:crypto";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  ordersFoundation,
  orderItems,
  orderStateHistory,
  dispatchAssignments,
} from "@workspace/db";
import type {
  OrderFoundation,
  OrderItem,
  OrderStateHistory,
  DispatchAssignment,
} from "@workspace/db";
import { and, count, desc, eq, lt } from "drizzle-orm";

import type {
  CreateOrderInput,
  PaginatedResult,
  OrderFilters,
} from "../types/order.types.js";

type Database = NodePgDatabase<Record<string, unknown>>;

export interface OrderWithItems {
  order: OrderFoundation;
  items: OrderItem[];
  stateHistory: OrderStateHistory[];
  activeDispatch: DispatchAssignment | null;
}

interface CreateOrderRepositoryInput extends CreateOrderInput {
  customerId: string;
}

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${ts}-${rand}`;
}

export class OrderRepository {
  constructor(private readonly db: Database) {}

  async create(input: CreateOrderRepositoryInput): Promise<OrderFoundation> {
    const subtotalCents = input.items.reduce(
      (sum, item) =>
        sum +
        item.unitPriceCents * item.quantity +
        (item.modifiers?.reduce(
          (ms, m) => ms + m.priceCents * (m.quantity ?? 1),
          0,
        ) ?? 0),
      0,
    );

    const deliveryFeeCents = 199;
    const taxCents = Math.round(subtotalCents * 0.1);
    const totalCents = subtotalCents + deliveryFeeCents + taxCents;

    const orderId = randomUUID();
    const orderNumber = generateOrderNumber();

    await this.db.transaction(async (tx) => {
      await tx.insert(ordersFoundation).values({
        id: orderId,
        orderNumber,
        customerId: input.customerId,
        vendorBranchId: input.vendorBranchId,
        deliveryAddressId: input.deliveryAddressId ?? null,
        status: "draft",
        subtotalCents,
        deliveryFeeCents,
        taxCents,
        discountCents: 0,
        tipCents: 0,
        totalCents,
        currency: "USD",
        paymentStatus: "unpaid",
        paymentMethod: input.paymentMethod ?? null,
        deliveryLatitude: input.deliveryLatitude ?? null,
        deliveryLongitude: input.deliveryLongitude ?? null,
        deliveryAddressSnapshot: input.deliveryAddressSnapshot ?? null,
        customerNote: input.customerNote ?? null,
        metadata: input.metadata ?? null,
      });

      if (input.items.length > 0) {
        await tx.insert(orderItems).values(
          input.items.map((item) => ({
            id: randomUUID(),
            orderId,
            menuItemId: item.menuItemId ?? null,
            menuItemName: item.menuItemName,
            menuItemDescription: item.menuItemDescription ?? null,
            menuItemImageUrl: item.menuItemImageUrl ?? null,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            totalPriceCents:
              item.unitPriceCents * item.quantity +
              (item.modifiers?.reduce(
                (ms, m) => ms + m.priceCents * (m.quantity ?? 1),
                0,
              ) ?? 0),
            modifiers: item.modifiers ?? [],
            specialInstructions: item.specialInstructions ?? null,
          })),
        );
      }
    });

    return (await this.findById(orderId))!;
  }

  async findById(id: string): Promise<OrderFoundation | null> {
    const result = await this.db
      .select()
      .from(ordersFoundation)
      .where(eq(ordersFoundation.id, id))
      .limit(1);
    return (result[0] as OrderFoundation) ?? null;
  }

  async findWithDetails(id: string): Promise<OrderWithItems | null> {
    const order = await this.findById(id);
    if (!order) return null;

    const [items, stateHistory, dispatches] = await Promise.all([
      this.db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, id))
        .orderBy(orderItems.createdAt),
      this.db
        .select()
        .from(orderStateHistory)
        .where(eq(orderStateHistory.orderId, id))
        .orderBy(desc(orderStateHistory.transitionedAt)),
      this.db
        .select()
        .from(dispatchAssignments)
        .where(
          and(
            eq(dispatchAssignments.orderId, id),
            eq(dispatchAssignments.status, "pending"),
          ),
        )
        .limit(1),
    ]);

    return {
      order,
      items: items as OrderItem[],
      stateHistory: stateHistory as OrderStateHistory[],
      activeDispatch: (dispatches[0] as DispatchAssignment) ?? null,
    };
  }

  private async findPage(
    customerId: string,
    filters: OrderFilters,
  ): Promise<PaginatedResult<OrderFoundation>> {
    const { page = 1, limit = 20, status } = filters;
    const offset = (page - 1) * limit;
    const conditions = [eq(ordersFoundation.customerId, customerId)];
    if (status) conditions.push(eq(ordersFoundation.status, status));

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(ordersFoundation)
        .where(and(...conditions))
        .orderBy(desc(ordersFoundation.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(ordersFoundation).where(and(...conditions)),
    ]);
    const totalCount = Number(total);
    const totalPages = Math.ceil(totalCount / limit);
    return {
      data: rows as OrderFoundation[],
      total: totalCount,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  private async findVendorPage(
    vendorBranchId: string,
    filters: OrderFilters,
  ): Promise<PaginatedResult<OrderFoundation>> {
    const { page = 1, limit = 20, status } = filters;
    const offset = (page - 1) * limit;
    const conditions = [eq(ordersFoundation.vendorBranchId, vendorBranchId)];
    if (status) conditions.push(eq(ordersFoundation.status, status));

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(ordersFoundation)
        .where(and(...conditions))
        .orderBy(desc(ordersFoundation.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(ordersFoundation).where(and(...conditions)),
    ]);
    const totalCount = Number(total);
    const totalPages = Math.ceil(totalCount / limit);
    return {
      data: rows as OrderFoundation[],
      total: totalCount,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  private async findRiderPage(
    riderId: string,
    filters: OrderFilters,
  ): Promise<PaginatedResult<OrderFoundation>> {
    const { page = 1, limit = 20, status } = filters;
    const offset = (page - 1) * limit;
    const conditions = [eq(ordersFoundation.riderId, riderId)];
    if (status) conditions.push(eq(ordersFoundation.status, status));

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(ordersFoundation)
        .where(and(...conditions))
        .orderBy(desc(ordersFoundation.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(ordersFoundation).where(and(...conditions)),
    ]);
    const totalCount = Number(total);
    const totalPages = Math.ceil(totalCount / limit);
    return {
      data: rows as OrderFoundation[],
      total: totalCount,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  async findByCustomer(customerId: string, filters: OrderFilters = {}): Promise<PaginatedResult<OrderFoundation>> {
    return this.findPage(customerId, filters);
  }

  async findByVendorBranch(vendorBranchId: string, filters: OrderFilters = {}): Promise<PaginatedResult<OrderFoundation>> {
    return this.findVendorPage(vendorBranchId, filters);
  }

  async findByRider(riderId: string, filters: OrderFilters = {}): Promise<PaginatedResult<OrderFoundation>> {
    return this.findRiderPage(riderId, filters);
  }

  async assignRider(orderId: string, riderId: string, estimatedDeliveryAt?: Date): Promise<void> {
    await this.db
      .update(ordersFoundation)
      .set({ riderId, estimatedDeliveryAt: estimatedDeliveryAt ?? null, updatedAt: new Date() })
      .where(eq(ordersFoundation.id, orderId));
  }

  async findActiveOrdersForRider(riderId: string): Promise<OrderFoundation[]> {
    return (await this.db
      .select()
      .from(ordersFoundation)
      .where(and(eq(ordersFoundation.riderId, riderId), eq(ordersFoundation.status, "assigned_to_rider")))
      .limit(10)) as OrderFoundation[];
  }

  async findExpiredOffers(): Promise<DispatchAssignment[]> {
    return (await this.db
      .select()
      .from(dispatchAssignments)
      .where(and(eq(dispatchAssignments.status, "pending"), lt(dispatchAssignments.expiresAt, new Date())))) as DispatchAssignment[];
  }
}
