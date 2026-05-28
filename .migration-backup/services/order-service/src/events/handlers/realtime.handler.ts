import type { EventBus } from "../event-bus.js";
import type { OrderEvent } from "../../types/event.types.js";

export interface RealtimeAdapter {
  broadcast(channel: string, payload: OrderEvent): void | Promise<void>;
}

export class InMemoryRealtimeAdapter implements RealtimeAdapter {
  private readonly subscribers = new Map<string, Set<(payload: OrderEvent) => void>>();

  broadcast(channel: string, payload: OrderEvent): void {
    const subs = this.subscribers.get(channel);
    if (!subs) return;
    subs.forEach((fn) => fn(payload));
  }

  subscribe(channel: string, handler: (payload: OrderEvent) => void): void {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    this.subscribers.get(channel)!.add(handler);
  }

  unsubscribe(channel: string, handler: (payload: OrderEvent) => void): void {
    this.subscribers.get(channel)?.delete(handler);
  }
}

export class HttpRealtimeAdapter implements RealtimeAdapter {
  constructor(
    private readonly realtimeServiceUrl: string,
    private readonly internalApiKey: string,
  ) {}

  async broadcast(channel: string, payload: OrderEvent): Promise<void> {
    try {
      await fetch(`${this.realtimeServiceUrl}/internal/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Key": this.internalApiKey,
        },
        body: JSON.stringify({ channel, event: payload }),
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
    }
  }
}

export function registerRealtimeHandler(
  bus: EventBus,
  adapter: RealtimeAdapter,
): void {
  bus.subscribeAll(async (event: OrderEvent) => {
    await adapter.broadcast(`order:${event.orderId}`, event);
  });
}
