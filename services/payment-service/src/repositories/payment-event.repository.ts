import { desc, eq } from "drizzle-orm";
import type { Database } from "@deliveryos/database";
import { paymentEvents } from "@deliveryos/database";
import type { PaymentEvent, NewPaymentEvent } from "@deliveryos/database";

export class PaymentEventRepository {
  constructor(private readonly db: Database) {}

  async create(data: NewPaymentEvent): Promise<PaymentEvent> {
    const [row] = await this.db
      .insert(paymentEvents)
      .values(data)
      .returning();
    if (!row) throw new Error("PaymentEvent insert returned no rows");
    return row;
  }

  async findForPayment(paymentId: string): Promise<PaymentEvent[]> {
    return this.db
      .select()
      .from(paymentEvents)
      .where(eq(paymentEvents.paymentId, paymentId))
      .orderBy(desc(paymentEvents.occurredAt));
  }

  async findForOrder(orderId: string): Promise<PaymentEvent[]> {
    return this.db
      .select()
      .from(paymentEvents)
      .where(eq(paymentEvents.orderId, orderId))
      .orderBy(desc(paymentEvents.occurredAt));
  }
}
