import type { ConnectionManager } from "../websocket/connection-manager.js";
import type { SseManager } from "../sse/sse-manager.js";
import type { SubscriptionManager } from "../subscriptions/subscription-manager.js";
import type { EventHandler } from "../handlers/event.handler.js";
import type { ConnectionStats } from "../types/realtime.types.js";

export class MetricsService {
  private readonly startedAt = new Date();

  constructor(
    private readonly connections: ConnectionManager,
    private readonly sse: SseManager,
    private readonly subscriptions: SubscriptionManager,
    private readonly eventHandler: EventHandler,
  ) {}

  getStats(): ConnectionStats & {
    orderContextCacheSize: number;
    uptimeSeconds: number;
    startedAt: string;
  } {
    const { activeChannels, totalSubscriptions } = this.subscriptions.getStats();
    const wsCount = this.connections.getActiveCount();
    const sseCount = this.sse.getActiveCount();

    return {
      activeWsConnections: wsCount,
      activeSseConnections: sseCount,
      totalConnections: wsCount + sseCount,
      activeChannels,
      totalSubscriptions,
      orderContextCacheSize: this.eventHandler.getCacheSize(),
      uptimeSeconds: Math.floor(
        (Date.now() - this.startedAt.getTime()) / 1000,
      ),
      startedAt: this.startedAt.toISOString(),
    };
  }
}
