import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { dispatches } from "@workspace/db";
import type { Dispatch } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

type Database = NodePgDatabase<Record<string, unknown>>;

export type DispatchRecordStatus =
  | "pending"
  | "offer_pending"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "completed"
  | "expired"
  | "arrived_vendor"
  | "in_transit"
  | "arrived_customer";

export interface UpsertDispatchData {
  status: DispatchRecordStatus;
  pickupLatitude?: number;
  pickupLongitude?: number;
  dropoffLatitude?: number;
  dropoffLongitude?: number;
  maxAttempts?: number;
  totalAttempts?: number;
  currentRiderId?: string | null;
}

export interface UpdateDispatchStatusMeta {
  cancellationReason?: string;
  riderAcceptedAt?: Date;
  arrivedVendorAt?: Date;
  pickedUpAt?: Date;
  inTransitAt?: Date;
  arrivedCustomerAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

export class DispatchRecordRepository {
  constructor(private readonly db: Database) {}

  async findByOrder(orderId: string): Promise<Dispatch | null> {
    const [record] = await this.db
      .select()
      .from(dispatches)
      .where(eq(dispatches.orderId, orderId))
      .limit(1);
    return (record as Dispatch) ?? null;
  }

  async upsert(orderId: string, data: UpsertDispatchData): Promise<void> {
    await this.db
      .insert(dispatches)
      .values({
        id: randomUUID(),
        orderId,
        status: data.status,
        pickupLatitude: data.pickupLatitude ?? 0,
        pickupLongitude: data.pickupLongitude ?? 0,
        dropoffLatitude: data.dropoffLatitude ?? 0,
        dropoffLongitude: data.dropoffLongitude ?? 0,
        maxAttempts: data.maxAttempts ?? 5,
        totalAttempts: data.totalAttempts ?? 1,
        currentRiderId: data.currentRiderId ?? null,
      })
      .onConflictDoUpdate({
        target: dispatches.orderId,
        set: {
          status: data.status,
          ...(data.currentRiderId !== undefined
            ? { currentRiderId: data.currentRiderId }
            : {}),
          ...(data.totalAttempts !== undefined
            ? { totalAttempts: data.totalAttempts }
            : {}),
          updatedAt: new Date(),
        },
      });
  }

  async updateStatus(
    orderId: string,
    status: DispatchRecordStatus,
    meta?: UpdateDispatchStatusMeta,
  ): Promise<void> {
    await this.db
      .update(dispatches)
      .set({
        status,
        ...(meta?.cancellationReason
          ? { cancellationReason: meta.cancellationReason }
          : {}),
        ...(meta?.riderAcceptedAt
          ? { riderAcceptedAt: meta.riderAcceptedAt }
          : {}),
        ...(meta?.arrivedVendorAt
          ? { arrivedVendorAt: meta.arrivedVendorAt }
          : {}),
        ...(meta?.pickedUpAt ? { pickedUpAt: meta.pickedUpAt } : {}),
        ...(meta?.inTransitAt ? { inTransitAt: meta.inTransitAt } : {}),
        ...(meta?.arrivedCustomerAt
          ? { arrivedCustomerAt: meta.arrivedCustomerAt }
          : {}),
        ...(meta?.completedAt ? { completedAt: meta.completedAt } : {}),
        ...(meta?.cancelledAt ? { cancelledAt: meta.cancelledAt } : {}),
        updatedAt: new Date(),
      })
      .where(eq(dispatches.orderId, orderId));
  }
}
