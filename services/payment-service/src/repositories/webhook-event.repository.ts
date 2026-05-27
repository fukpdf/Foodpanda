import { and, eq } from "drizzle-orm";
import type { Database } from "@deliveryos/database";
import { webhookEvents } from "@deliveryos/database";
import type { WebhookEvent, NewWebhookEvent } from "@deliveryos/database";

export class WebhookEventRepository {
  constructor(private readonly db: Database) {}

  async insertIfNotExists(
    data: NewWebhookEvent,
  ): Promise<{ inserted: boolean; row: WebhookEvent }> {
    const result = await this.db
      .insert(webhookEvents)
      .values(data)
      .onConflictDoNothing()
      .returning();

    if (result.length > 0 && result[0]) {
      return { inserted: true, row: result[0] };
    }

    const [existing] = await this.db
      .select()
      .from(webhookEvents)
      .where(
        and(
          eq(webhookEvents.provider, data.provider ?? "stripe"),
          eq(webhookEvents.providerEventId, data.providerEventId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new Error(
        `WebhookEvent [${data.providerEventId}] not found after conflict resolution`,
      );
    }

    return { inserted: false, row: existing };
  }

  async markProcessed(
    id: string,
    paymentId: string | null,
  ): Promise<void> {
    await this.db
      .update(webhookEvents)
      .set({
        status: "processed",
        paymentId: paymentId ?? undefined,
        processedAt: new Date(),
      })
      .where(eq(webhookEvents.id, id));
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.db
      .update(webhookEvents)
      .set({
        status: "failed",
        processingError: error,
        processedAt: new Date(),
      })
      .where(eq(webhookEvents.id, id));
  }

  async markIgnored(id: string, reason: string): Promise<void> {
    await this.db
      .update(webhookEvents)
      .set({
        status: "ignored",
        processingError: reason,
        processedAt: new Date(),
      })
      .where(eq(webhookEvents.id, id));
  }

  async findUnprocessed(limit = 50): Promise<WebhookEvent[]> {
    return this.db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.status, "received"))
      .limit(limit);
  }
}
