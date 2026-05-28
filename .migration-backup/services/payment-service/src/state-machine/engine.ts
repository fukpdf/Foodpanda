import { sql } from "drizzle-orm";
import type { Database } from "@deliveryos/database";
import { paymentEvents, payments } from "@deliveryos/database";
import type { PaymentStatus, ActorType } from "../types/payment.types.js";
import { validateTransition } from "./states.js";
import { randomUUID } from "node:crypto";

export interface TransitionResult {
  success: boolean;
  previousStatus: PaymentStatus;
  newStatus: PaymentStatus;
  rowsUpdated: number;
}

export interface TransitionOptions {
  orderId: string;
  actorId?: string;
  actorType?: ActorType;
  metadata?: Record<string, unknown>;
  failureCode?: string | null;
  failureMessage?: string | null;
  providerPaymentId?: string | null;
  confirmedAt?: Date | null;
  failedAt?: Date | null;
  cancelledAt?: Date | null;
  expiredAt?: Date | null;
  requiresAction?: boolean;
  nextActionType?: string | null;
}

export class PaymentStateMachineEngine {
  constructor(private readonly db: Database) {}

  async transition(
    paymentId: string,
    currentStatus: PaymentStatus,
    nextStatus: PaymentStatus,
    options: TransitionOptions,
  ): Promise<TransitionResult> {
    validateTransition(paymentId, currentStatus, nextStatus);

    const now = new Date();

    const updateFields: Record<string, unknown> = {
      status: nextStatus,
      updatedAt: now,
    };

    if (options.failureCode !== undefined) updateFields["failureCode"] = options.failureCode;
    if (options.failureMessage !== undefined) updateFields["failureMessage"] = options.failureMessage;
    if (options.providerPaymentId !== undefined) updateFields["providerPaymentId"] = options.providerPaymentId;
    if (options.confirmedAt !== undefined) updateFields["confirmedAt"] = options.confirmedAt;
    if (options.failedAt !== undefined) updateFields["failedAt"] = options.failedAt;
    if (options.cancelledAt !== undefined) updateFields["cancelledAt"] = options.cancelledAt;
    if (options.expiredAt !== undefined) updateFields["expiredAt"] = options.expiredAt;
    if (options.requiresAction !== undefined) updateFields["requiresAction"] = options.requiresAction;
    if (options.nextActionType !== undefined) updateFields["nextActionType"] = options.nextActionType;

    return this.db.transaction(async (tx) => {
      const updated = await tx
        .update(payments)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set(updateFields as any)
        .where(
          sql`${payments.id} = ${paymentId} AND ${payments.status} = ${currentStatus}`,
        )
        .returning({ id: payments.id });

      if (updated.length === 0) {
        return {
          success: false,
          previousStatus: currentStatus,
          newStatus: nextStatus,
          rowsUpdated: 0,
        };
      }

      await tx.insert(paymentEvents).values({
        id: randomUUID(),
        paymentId,
        orderId: options.orderId,
        eventType: `payment.${nextStatus}`,
        fromStatus: currentStatus,
        toStatus: nextStatus,
        actorId: options.actorId ?? null,
        actorType: options.actorType ?? "system",
        metadata: options.metadata ?? null,
        occurredAt: now,
      });

      return {
        success: true,
        previousStatus: currentStatus,
        newStatus: nextStatus,
        rowsUpdated: 1,
      };
    });
  }
}
