import type { EventPublisher } from "../publishers/event-publisher.js";
import type { InternalEventPayload, OrderContextEntry } from "../types/realtime.types.js";

const TERMINAL_STATES = new Set([
  "order.delivered",
  "order.refunded",
  "order.cancelled",
]);

const CACHE_EVICTION_DELAY_MS = 5 * 60 * 1000;
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const CACHE_GC_INTERVAL_MS = 60 * 60 * 1000;

export class EventHandler {
  private readonly orderContextCache = new Map<string, OrderContextEntry>();
  private gcIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly publisher: EventPublisher) {}

  handle(incoming: InternalEventPayload): void {
    const { event } = incoming;

    this.updateOrderContext(event);

    const channels = this.resolveChannels(incoming);

    this.publisher.publish(channels, incoming);

    if (TERMINAL_STATES.has(event.eventType)) {
      this.scheduleContextEviction(event.orderId);
    }
  }

  startGc(): void {
    if (this.gcIntervalId) return;
    this.gcIntervalId = setInterval(() => {
      this.runCacheGc();
    }, CACHE_GC_INTERVAL_MS);
  }

  stopGc(): void {
    if (this.gcIntervalId) {
      clearInterval(this.gcIntervalId);
      this.gcIntervalId = null;
    }
  }

  private runCacheGc(): void {
    const cutoff = Date.now() - CACHE_MAX_AGE_MS;
    let evicted = 0;
    for (const [orderId, entry] of this.orderContextCache) {
      if (entry.cachedAt.getTime() < cutoff) {
        this.orderContextCache.delete(orderId);
        evicted++;
      }
    }
    if (evicted > 0) {
    }
  }

  private resolveChannels(incoming: InternalEventPayload): string[] {
    const { event } = incoming;
    const channels = new Set<string>();

    channels.add(`order:${event.orderId}`);

    channels.add("admin:orders");

    if (
      event.eventType.startsWith("dispatch.") ||
      event.eventType === "order.rider_assigned"
    ) {
      channels.add("admin:dispatch");
    }

    const { customerId, vendorBranchId, riderId } = event.payload;

    if (typeof customerId === "string") {
      channels.add(`customer:${customerId}`);
    }

    if (typeof vendorBranchId === "string") {
      channels.add(`vendor:${vendorBranchId}`);
    }

    if (typeof riderId === "string") {
      channels.add(`rider:${riderId}`);
    }

    const cached = this.orderContextCache.get(event.orderId);
    if (cached) {
      channels.add(`customer:${cached.customerId}`);
      channels.add(`vendor:${cached.vendorBranchId}`);
      if (cached.riderId) {
        channels.add(`rider:${cached.riderId}`);
      }
    }

    return [...channels];
  }

  private updateOrderContext(event: InternalEventPayload["event"]): void {
    const existing = this.orderContextCache.get(event.orderId);

    if (event.eventType === "order.created") {
      const { customerId, vendorBranchId } = event.payload;
      if (typeof customerId === "string" && typeof vendorBranchId === "string") {
        this.orderContextCache.set(event.orderId, {
          orderId: event.orderId,
          customerId,
          vendorBranchId,
          cachedAt: new Date(),
        });
      }
      return;
    }

    if (
      event.eventType === "dispatch.rider_assigned" ||
      event.eventType === "order.state_changed"
    ) {
      const { riderId } = event.payload;
      if (typeof riderId === "string" && existing) {
        this.orderContextCache.set(event.orderId, {
          ...existing,
          riderId,
        });
      }
    }
  }

  private scheduleContextEviction(orderId: string): void {
    setTimeout(() => {
      this.orderContextCache.delete(orderId);
    }, CACHE_EVICTION_DELAY_MS);
  }

  getCacheSize(): number {
    return this.orderContextCache.size;
  }
}
