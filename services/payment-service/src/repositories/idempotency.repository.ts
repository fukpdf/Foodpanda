import { eq, lt } from "drizzle-orm";
import type { Database } from "@deliveryos/database";
import { idempotencyKeys } from "@deliveryos/database";
import type { IdempotencyKey, NewIdempotencyKey } from "@deliveryos/database";

export class IdempotencyRepository {
  constructor(private readonly db: Database) {}

  async findByKey(key: string): Promise<IdempotencyKey | null> {
    const now = new Date();
    const [row] = await this.db
      .select()
      .from(idempotencyKeys)
      .where(eq(idempotencyKeys.key, key))
      .limit(1);

    if (!row) return null;
    if (row.expiresAt < now) {
      await this.db
        .delete(idempotencyKeys)
        .where(eq(idempotencyKeys.id, row.id));
      return null;
    }

    return row;
  }

  async upsert(data: NewIdempotencyKey): Promise<IdempotencyKey> {
    const [row] = await this.db
      .insert(idempotencyKeys)
      .values(data)
      .onConflictDoNothing()
      .returning();

    if (row) return row;

    const [existing] = await this.db
      .select()
      .from(idempotencyKeys)
      .where(eq(idempotencyKeys.key, data.key))
      .limit(1);

    if (!existing) {
      throw new Error(
        `IdempotencyKey [${data.key}] not found after conflict resolution`,
      );
    }

    return existing;
  }

  async setResponse(
    key: string,
    responseStatus: number,
    responseBody: Record<string, unknown>,
  ): Promise<void> {
    await this.db
      .update(idempotencyKeys)
      .set({ responseStatus, responseBody })
      .where(eq(idempotencyKeys.key, key));
  }

  async deleteExpired(): Promise<number> {
    const now = new Date();
    const deleted = await this.db
      .delete(idempotencyKeys)
      .where(lt(idempotencyKeys.expiresAt, now))
      .returning({ id: idempotencyKeys.id });
    return deleted.length;
  }
}
