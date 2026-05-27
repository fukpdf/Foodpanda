import type { Database } from "@deliveryos/database";
import { dispatchAssignments } from "@deliveryos/database";
import type { DispatchAssignment } from "@deliveryos/database";
import { and, desc, eq } from "@deliveryos/database/drizzle";

export class DispatchRepository {
  constructor(private readonly db: Database) {}

  async findByOrder(orderId: string): Promise<DispatchAssignment[]> {
    return (await this.db
      .select()
      .from(dispatchAssignments)
      .where(eq(dispatchAssignments.orderId, orderId))
      .orderBy(desc(dispatchAssignments.assignedAt))) as DispatchAssignment[];
  }

  async findActivePendingForOrder(
    orderId: string,
  ): Promise<DispatchAssignment | null> {
    const result = await this.db
      .select()
      .from(dispatchAssignments)
      .where(
        and(
          eq(dispatchAssignments.orderId, orderId),
          eq(dispatchAssignments.status, "pending"),
        ),
      )
      .limit(1);
    return (result[0] as DispatchAssignment) ?? null;
  }

  async updateStatus(
    assignmentId: string,
    status: "accepted" | "rejected" | "cancelled" | "completed" | "expired",
    meta?: { respondedAt?: Date; rejectionReason?: string; completedAt?: Date },
  ): Promise<void> {
    await this.db
      .update(dispatchAssignments)
      .set({
        status,
        ...(meta?.respondedAt ? { respondedAt: meta.respondedAt } : {}),
        ...(meta?.rejectionReason
          ? { rejectionReason: meta.rejectionReason }
          : {}),
        ...(meta?.completedAt ? { completedAt: meta.completedAt } : {}),
        updatedAt: new Date(),
      })
      .where(eq(dispatchAssignments.id, assignmentId));
  }

  async countAttemptsForOrder(orderId: string): Promise<number> {
    const results = await this.db
      .select()
      .from(dispatchAssignments)
      .where(eq(dispatchAssignments.orderId, orderId));
    return results.length;
  }

  async findByRider(
    riderId: string,
    limit = 20,
  ): Promise<DispatchAssignment[]> {
    return (await this.db
      .select()
      .from(dispatchAssignments)
      .where(eq(dispatchAssignments.riderId, riderId))
      .orderBy(desc(dispatchAssignments.assignedAt))
      .limit(limit)) as DispatchAssignment[];
  }
}
