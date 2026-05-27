import type { Database } from "@deliveryos/database";
import { auditLogs } from "@deliveryos/database";
import type { EventBus } from "../event-bus.js";
import type { OrderEvent } from "../../types/event.types.js";

export function registerAuditHandler(db: Database, bus: EventBus): void {
  bus.subscribeAll(async (event: OrderEvent) => {
    try {
      const actorId =
        "payload" in event && "actorId" in event.payload
          ? (event.payload.actorId as string | null) ?? null
          : null;

      const actorRole =
        "payload" in event && "actorRole" in event.payload
          ? (event.payload.actorRole as string | null) ?? null
          : null;

      await db.insert(auditLogs).values({
        actorId,
        actorRole,
        action: "update",
        entityType: "orders",
        entityId: event.orderId,
        newValue: event.payload as Record<string, unknown>,
        metadata: {
          eventId: event.eventId,
          eventType: event.eventType,
          source: event.source,
          occurredAt: event.occurredAt,
        },
      });
    } catch {
      // Audit failures must never crash the order flow
    }
  });
}
