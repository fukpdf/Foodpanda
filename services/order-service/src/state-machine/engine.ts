import { randomUUID } from "node:crypto";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  ordersFoundation,
  orderStateHistory,
  outboxEvents,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import type { TransitionContext } from "./transitions.js";
import { validateTransition } from "./transitions.js";
import type { OrderState, DBOrderStatus } from "../types/order.types.js";
import {
  ORDER_STATE_TO_DB,
  DB_STATUS_TO_STATE,
} from "../types/order.types.js";
import type { EventBus } from "../events/event-bus.js";
import type { OrderStateChangedEvent } from "../types/event.types.js";

export type Database = NodePgDatabase<Record<string, unknown>>;

function eventTypeForState(state: OrderState): string {
  return `order.${state.toLowerCase()}`;
}

export interface StateMachineResult {
  orderId: string;
  previousState: OrderState | null;
  newState: OrderState;
  dbStatus: DBOrderStatus;
  historyId: string;
}

export class OrderStateMachine {
  constructor(
    private readonly db: Database,
    private readonly eventBus: EventBus,
  ) {}

  async transition(ctx: TransitionContext): Promise<StateMachineResult> {
    validateTransition(ctx);

    const newDbStatus = ORDER_STATE_TO_DB[ctx.toState];
    const previousDbStatus = ORDER_STATE_TO_DB[ctx.fromState];

    const timestampUpdates: Partial<typeof ordersFoundation.$inferInsert> = {
      status: newDbStatus,
      updatedAt: new Date(),
    };

    if (ctx.toState === "ACCEPTED_BY_VENDOR") {
      timestampUpdates.acceptedAt = new Date();
    } else if (ctx.toState === "PREPARING") {
      timestampUpdates.preparedAt = undefined;
    } else if (ctx.toState === "READY_FOR_PICKUP") {
      timestampUpdates.preparedAt = new Date();
    } else if (ctx.toState === "PICKED_UP") {
      timestampUpdates.pickedUpAt = new Date();
    } else if (ctx.toState === "DELIVERED") {
      timestampUpdates.deliveredAt = new Date();
    } else if (ctx.toState === "CANCELLED") {
      timestampUpdates.cancelledAt = new Date();
      if (ctx.reason) timestampUpdates.cancellationReason = ctx.reason;
      if (ctx.actorId) timestampUpdates.cancelledById = ctx.actorId;
    }

    const historyId = randomUUID();
    const eventType = eventTypeForState(ctx.toState);

    await this.db.transaction(async (tx) => {
      await tx
        .update(ordersFoundation)
        .set(timestampUpdates)
        .where(eq(ordersFoundation.id, ctx.orderId));

      await tx.insert(orderStateHistory).values({
        id: historyId,
        orderId: ctx.orderId,
        fromState: previousDbStatus,
        toState: newDbStatus,
        actorId: ctx.actorId ?? null,
        actorRole: ctx.actorRole ?? null,
        reason: ctx.reason ?? null,
        note: ctx.note ?? null,
        eventType,

        metadata: {
          transitionedAt: new Date().toISOString(),
        },
      });

      await tx.insert(outboxEvents).values({
        eventType,
        aggregateType: "order",
        aggregateId: ctx.orderId,
        payload: {
          orderId: ctx.orderId,
          fromState: ctx.fromState,
          toState: ctx.toState,
          actorId: ctx.actorId ?? null,
          actorRole: ctx.actorRole ?? null,
          reason: ctx.reason ?? null,
          note: ctx.note ?? null,
          version: 1,
          source: "order-service",
        },
      });
    });

    const event: OrderStateChangedEvent = {
      eventId: randomUUID(),
      eventType: "order.state_changed",
      orderId: ctx.orderId,
      occurredAt: new Date().toISOString(),
      version: 1,
      source: "order-service",
      payload: {
        fromState: ctx.fromState,
        toState: ctx.toState,
        actorId: ctx.actorId ?? null,
        actorRole: ctx.actorRole ?? null,
        reason: ctx.reason ?? null,
      },
    };
    this.eventBus.emit(event);

    return {
      orderId: ctx.orderId,
      previousState: DB_STATUS_TO_STATE[previousDbStatus],
      newState: ctx.toState,
      dbStatus: newDbStatus,
      historyId,
    };
  }

  static resolveState(dbStatus: DBOrderStatus): OrderState | null {
    return DB_STATUS_TO_STATE[dbStatus];
  }
}
