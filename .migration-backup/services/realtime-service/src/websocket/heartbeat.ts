import type { ConnectionManager } from "./connection-manager.js";
import type { SubscriptionManager } from "../subscriptions/subscription-manager.js";
import { env } from "../config/env.js";

export class HeartbeatManager {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly connections: ConnectionManager,
    private readonly subscriptions: SubscriptionManager,
  ) {}

  start(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.tick();
    }, env.HEARTBEAT_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private tick(): void {
    const deadIds: string[] = [];

    for (const session of this.connections.all()) {
      if (!session.isAlive) {
        deadIds.push(session.id);
        continue;
      }
      session.isAlive = false;
      try {
        session.socket.ping();
      } catch {
        deadIds.push(session.id);
      }
    }

    for (const id of deadIds) {
      const session = this.connections.get(id);
      if (session) {
        try {
          session.socket.terminate();
        } catch {
        }
        this.subscriptions.unsubscribeAll(id);
        this.connections.remove(id);
      }
    }
  }
}
