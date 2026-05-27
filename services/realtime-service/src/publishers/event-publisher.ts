import type { ConnectionManager } from "../websocket/connection-manager.js";
import type { SseManager } from "../sse/sse-manager.js";
import type { SubscriptionManager } from "../subscriptions/subscription-manager.js";
import type { RealtimeEventMessage } from "../types/message.types.js";
import type { InternalEventPayload } from "../types/realtime.types.js";

export class EventPublisher {
  constructor(
    private readonly subscriptions: SubscriptionManager,
    private readonly connections: ConnectionManager,
    private readonly sse: SseManager,
  ) {}

  publish(channels: string[], incoming: InternalEventPayload): void {
    const { event } = incoming;

    const message: RealtimeEventMessage = {
      type: "event",
      channel: channels[0] ?? incoming.channel,
      eventType: event.eventType,
      eventId: event.eventId,
      orderId: event.orderId,
      occurredAt: event.occurredAt,
      payload: event.payload,
    };

    const notified = new Set<string>();

    for (const channel of channels) {
      const subscriberIds = this.subscriptions.getSessionsForChannel(channel);
      const channelMessage: RealtimeEventMessage = { ...message, channel };

      for (const sessionId of subscriberIds) {
        if (notified.has(sessionId)) continue;
        notified.add(sessionId);

        const wsSent = this.connections.send(sessionId, channelMessage);
        if (!wsSent) {
          this.sse.send(sessionId, "message", channelMessage);
        }
      }
    }
  }

  getDeliveryStats(channels: string[]): {
    subscriberCount: number;
    channelCount: number;
  } {
    const uniqueSubscribers = new Set<string>();
    for (const channel of channels) {
      for (const id of this.subscriptions.getSessionsForChannel(channel)) {
        uniqueSubscribers.add(id);
      }
    }
    return {
      subscriberCount: uniqueSubscribers.size,
      channelCount: channels.length,
    };
  }
}
