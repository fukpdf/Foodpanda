import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { orderStateHistory } from "@workspace/db";
import type { OrderStateHistory } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";

type Database = NodePgDatabase<Record<string, unknown>>;

export class OrderStateRepository {
  constructor(private readonly db: Database) {}

  async findByOrder(orderId: string): Promise<OrderStateHistory[]> {
    return (await this.db
      .select()
      .from(orderStateHistory)
      .where(eq(orderStateHistory.orderId, orderId))
      .orderBy(desc(orderStateHistory.transitionedAt))) as OrderStateHistory[];
  }

  async findLatest(orderId: string): Promise<OrderStateHistory | null> {
    const result = await this.db
      .select()
      .from(orderStateHistory)
      .where(eq(orderStateHistory.orderId, orderId))
      .orderBy(desc(orderStateHistory.transitionedAt))
      .limit(1);
    return (result[0] as OrderStateHistory) ?? null;
  }

  async countTransitions(orderId: string): Promise<number> {
    const results = await this.db
      .select()
      .from(orderStateHistory)
      .where(eq(orderStateHistory.orderId, orderId));
    return results.length;
  }

  async findByActor(
    actorId: string,
    limit = 50,
  ): Promise<OrderStateHistory[]> {
    return (await this.db
      .select()
      .from(orderStateHistory)
      .where(and(eq(orderStateHistory.actorId, actorId)))
      .orderBy(desc(orderStateHistory.transitionedAt))
      .limit(limit)) as OrderStateHistory[];
  }
}
