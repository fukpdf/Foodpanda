export class SubscriptionManager {
  private readonly channelToSessions = new Map<string, Set<string>>();
  private readonly sessionToChannels = new Map<string, Set<string>>();

  subscribe(sessionId: string, channel: string): void {
    if (!this.channelToSessions.has(channel)) {
      this.channelToSessions.set(channel, new Set());
    }
    this.channelToSessions.get(channel)!.add(sessionId);

    if (!this.sessionToChannels.has(sessionId)) {
      this.sessionToChannels.set(sessionId, new Set());
    }
    this.sessionToChannels.get(sessionId)!.add(channel);
  }

  unsubscribe(sessionId: string, channel: string): void {
    this.channelToSessions.get(channel)?.delete(sessionId);
    if (this.channelToSessions.get(channel)?.size === 0) {
      this.channelToSessions.delete(channel);
    }

    this.sessionToChannels.get(sessionId)?.delete(channel);
    if (this.sessionToChannels.get(sessionId)?.size === 0) {
      this.sessionToChannels.delete(sessionId);
    }
  }

  unsubscribeAll(sessionId: string): void {
    const channels = this.sessionToChannels.get(sessionId);
    if (!channels) return;

    for (const channel of channels) {
      const subs = this.channelToSessions.get(channel);
      if (subs) {
        subs.delete(sessionId);
        if (subs.size === 0) {
          this.channelToSessions.delete(channel);
        }
      }
    }

    this.sessionToChannels.delete(sessionId);
  }

  isSubscribed(sessionId: string, channel: string): boolean {
    return this.sessionToChannels.get(sessionId)?.has(channel) ?? false;
  }

  getSessionsForChannel(channel: string): ReadonlySet<string> {
    return this.channelToSessions.get(channel) ?? new Set();
  }

  getChannelsForSession(sessionId: string): ReadonlySet<string> {
    return this.sessionToChannels.get(sessionId) ?? new Set();
  }

  getSubscriptionCountForSession(sessionId: string): number {
    return this.sessionToChannels.get(sessionId)?.size ?? 0;
  }

  getStats(): { activeChannels: number; totalSubscriptions: number } {
    let totalSubscriptions = 0;
    for (const subs of this.channelToSessions.values()) {
      totalSubscriptions += subs.size;
    }
    return {
      activeChannels: this.channelToSessions.size,
      totalSubscriptions,
    };
  }
}
