import type { FastifyBaseLogger } from "fastify";
import type { PaymentEventBus } from "../events/event-bus.js";
import type { PaymentEvent } from "../types/event.types.js";

export interface RealtimeConfig {
  realtimeServiceUrl: string;
  realtimeInternalKey: string;
  timeoutMs?: number;
}

export class PaymentRealtimeHandler {
  private readonly timeoutMs: number;

  constructor(
    private readonly config: RealtimeConfig,
    private readonly logger: FastifyBaseLogger,
  ) {
    this.timeoutMs = config.timeoutMs ?? 5_000;
  }

  register(bus: PaymentEventBus): void {
    bus.subscribeAll((event: PaymentEvent) => {
      this.publish(event).catch((err) => {
        this.logger.warn(
          { err, eventType: event.eventType, paymentId: event.paymentId },
          "[realtime] Failed to publish payment event to realtime-service",
        );
      });
    });
  }

  private async publish(event: PaymentEvent): Promise<void> {
    const channels = this.resolveChannels(event);
    if (channels.length === 0) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(
        `${this.config.realtimeServiceUrl}/internal/events`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Key": this.config.realtimeInternalKey,
          },
          body: JSON.stringify({
            channels,
            eventType: event.eventType,
            payload: this.buildPayload(event),
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `Realtime service returned ${response.status}: ${body}`,
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private resolveChannels(event: PaymentEvent): string[] {
    const channels = [`order:${event.orderId}`, `customer:${event.customerId}`];

    const adminEvents = new Set<string>([
      "payment.succeeded",
      "payment.refunded",
      "payment.partially_refunded",
      "payment.disputed",
      "payment.failed",
    ]);

    if (adminEvents.has(event.eventType)) {
      channels.push("admin:orders");
      channels.push("admin:payments");
    }

    return channels;
  }

  private buildPayload(event: PaymentEvent): Record<string, unknown> {
    return {
      eventType: event.eventType,
      paymentId: event.paymentId,
      orderId: event.orderId,
      occurredAt: event.occurredAt,
      data: event.payload,
    };
  }
}
