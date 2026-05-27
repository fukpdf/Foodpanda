import { desc, eq } from "drizzle-orm";
import type { Database } from "@deliveryos/database";
import { paymentAttempts } from "@deliveryos/database";
import type { PaymentAttempt, NewPaymentAttempt } from "@deliveryos/database";

export class PaymentAttemptRepository {
  constructor(private readonly db: Database) {}

  async create(data: NewPaymentAttempt): Promise<PaymentAttempt> {
    const [row] = await this.db
      .insert(paymentAttempts)
      .values(data)
      .returning();
    if (!row) throw new Error("PaymentAttempt insert returned no rows");
    return row;
  }

  async findById(id: string): Promise<PaymentAttempt | null> {
    const [row] = await this.db
      .select()
      .from(paymentAttempts)
      .where(eq(paymentAttempts.id, id))
      .limit(1);
    return row ?? null;
  }

  async findForPayment(paymentId: string): Promise<PaymentAttempt[]> {
    return this.db
      .select()
      .from(paymentAttempts)
      .where(eq(paymentAttempts.paymentId, paymentId))
      .orderBy(desc(paymentAttempts.requestedAt));
  }

  async countForPayment(paymentId: string): Promise<number> {
    const rows = await this.db
      .select({ id: paymentAttempts.id })
      .from(paymentAttempts)
      .where(eq(paymentAttempts.paymentId, paymentId));
    return rows.length;
  }

  async markResponded(
    id: string,
    status: string,
    respondedAt: Date,
    extra?: {
      providerAttemptId?: string;
      errorCode?: string;
      errorMessage?: string;
      providerResponse?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.db
      .update(paymentAttempts)
      .set({ status, respondedAt, ...extra })
      .where(eq(paymentAttempts.id, id));
  }
}
