import { desc, eq } from "drizzle-orm";
import type { Database } from "@deliveryos/database";
import { refunds } from "@deliveryos/database";
import type { Refund, NewRefund } from "@deliveryos/database";

export class RefundRepository {
  constructor(private readonly db: Database) {}

  async create(data: NewRefund): Promise<Refund> {
    const [row] = await this.db.insert(refunds).values(data).returning();
    if (!row) throw new Error("Refund insert returned no rows");
    return row;
  }

  async findById(id: string): Promise<Refund | null> {
    const [row] = await this.db
      .select()
      .from(refunds)
      .where(eq(refunds.id, id))
      .limit(1);
    return row ?? null;
  }

  async findByProviderRefundId(providerRefundId: string): Promise<Refund | null> {
    const [row] = await this.db
      .select()
      .from(refunds)
      .where(eq(refunds.providerRefundId, providerRefundId))
      .limit(1);
    return row ?? null;
  }

  async findByIdempotencyKey(key: string): Promise<Refund | null> {
    const [row] = await this.db
      .select()
      .from(refunds)
      .where(eq(refunds.idempotencyKey, key))
      .limit(1);
    return row ?? null;
  }

  async findForPayment(paymentId: string): Promise<Refund[]> {
    return this.db
      .select()
      .from(refunds)
      .where(eq(refunds.paymentId, paymentId))
      .orderBy(desc(refunds.createdAt));
  }

  async findForOrder(orderId: string): Promise<Refund[]> {
    return this.db
      .select()
      .from(refunds)
      .where(eq(refunds.orderId, orderId))
      .orderBy(desc(refunds.createdAt));
  }

  async updateStatus(
    id: string,
    status: string,
    extra?: {
      providerRefundId?: string | null;
      failureReason?: string | null;
      processedAt?: Date | null;
    },
  ): Promise<Refund | null> {
    const [row] = await this.db
      .update(refunds)
      .set({ status: status as Refund["status"], updatedAt: new Date(), ...extra })
      .where(eq(refunds.id, id))
      .returning();
    return row ?? null;
  }

  async sumRefundedCents(paymentId: string): Promise<number> {
    const rows = await this.db
      .select({ amountCents: refunds.amountCents })
      .from(refunds)
      .where(eq(refunds.paymentId, paymentId));

    return rows.reduce((sum, r) => sum + r.amountCents, 0);
  }
}
