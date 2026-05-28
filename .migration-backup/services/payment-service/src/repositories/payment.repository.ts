import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import type { Database } from "@deliveryos/database";
import { payments } from "@deliveryos/database";
import type { Payment, NewPayment } from "@deliveryos/database";
import type { PaymentStatus } from "../types/payment.types.js";
import { ACTIVE_STATUSES } from "../types/payment.types.js";

export class PaymentRepository {
  constructor(private readonly db: Database) {}

  async create(data: NewPayment): Promise<Payment> {
    const [row] = await this.db.insert(payments).values(data).returning();
    if (!row) throw new Error("Payment insert returned no rows");
    return row;
  }

  async findById(id: string): Promise<Payment | null> {
    const [row] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);
    return row ?? null;
  }

  async findByProviderPaymentId(
    providerPaymentId: string,
  ): Promise<Payment | null> {
    const [row] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.providerPaymentId, providerPaymentId))
      .limit(1);
    return row ?? null;
  }

  async findByIdempotencyKey(key: string): Promise<Payment | null> {
    const [row] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.idempotencyKey, key))
      .limit(1);
    return row ?? null;
  }

  async findActiveForOrder(orderId: string): Promise<Payment | null> {
    const activeStatuses = Array.from(ACTIVE_STATUSES);
    const [row] = await this.db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.orderId, orderId),
          inArray(payments.status, activeStatuses),
        ),
      )
      .orderBy(desc(payments.createdAt))
      .limit(1);
    return row ?? null;
  }

  async findAllForOrder(orderId: string): Promise<Payment[]> {
    return this.db
      .select()
      .from(payments)
      .where(eq(payments.orderId, orderId))
      .orderBy(desc(payments.createdAt));
  }

  async findSucceededForOrder(orderId: string): Promise<Payment | null> {
    const [row] = await this.db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.orderId, orderId),
          eq(payments.status, "succeeded"),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async findStaleProcessing(
    olderThanMinutes: number,
    statuses: PaymentStatus[],
  ): Promise<Payment[]> {
    const threshold = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    return this.db
      .select()
      .from(payments)
      .where(
        and(
          inArray(payments.status, statuses),
          lt(payments.updatedAt, threshold),
          sql`${payments.providerPaymentId} IS NOT NULL`,
        ),
      )
      .orderBy(payments.updatedAt)
      .limit(100);
  }

  async findPendingProviderOlderThan(minutes: number): Promise<Payment[]> {
    const threshold = new Date(Date.now() - minutes * 60 * 1000);
    return this.db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.status, "pending_provider"),
          lt(payments.createdAt, threshold),
          sql`${payments.providerPaymentId} IS NULL`,
        ),
      )
      .orderBy(payments.createdAt)
      .limit(50);
  }

  async updateStatus(
    id: string,
    status: PaymentStatus,
    extra?: Partial<
      Pick<
        Payment,
        | "providerPaymentId"
        | "failureCode"
        | "failureMessage"
        | "confirmedAt"
        | "failedAt"
        | "cancelledAt"
        | "expiredAt"
        | "requiresAction"
        | "nextActionType"
      >
    >,
  ): Promise<Payment | null> {
    const [row] = await this.db
      .update(payments)
      .set({ status, updatedAt: new Date(), ...extra })
      .where(eq(payments.id, id))
      .returning();
    return row ?? null;
  }

  async updateProviderPaymentId(
    id: string,
    providerPaymentId: string,
  ): Promise<void> {
    await this.db
      .update(payments)
      .set({ providerPaymentId, updatedAt: new Date() })
      .where(eq(payments.id, id));
  }

  async listForCustomer(
    customerId: string,
    limit = 20,
    offset = 0,
  ): Promise<Payment[]> {
    return this.db
      .select()
      .from(payments)
      .where(eq(payments.customerId, customerId))
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);
  }
}
