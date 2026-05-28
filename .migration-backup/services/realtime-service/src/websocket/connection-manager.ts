import type { ServerMessage } from "../types/message.types.js";
import type { RealtimeWsSession } from "./session.js";

export class ConnectionManager {
  private readonly sessions = new Map<string, RealtimeWsSession>();
  private readonly ipCount = new Map<string, number>();

  add(session: RealtimeWsSession): void {
    this.sessions.set(session.id, session);
    this.ipCount.set(session.ip, (this.ipCount.get(session.ip) ?? 0) + 1);
  }

  remove(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const count = this.ipCount.get(session.ip) ?? 1;
    if (count <= 1) {
      this.ipCount.delete(session.ip);
    } else {
      this.ipCount.set(session.ip, count - 1);
    }

    this.sessions.delete(sessionId);
  }

  get(sessionId: string): RealtimeWsSession | undefined {
    return this.sessions.get(sessionId);
  }

  all(): IterableIterator<RealtimeWsSession> {
    return this.sessions.values();
  }

  getActiveCount(): number {
    return this.sessions.size;
  }

  getConnectionCountForIp(ip: string): number {
    return this.ipCount.get(ip) ?? 0;
  }

  send(sessionId: string, message: ServerMessage): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    try {
      const payload = JSON.stringify(message);
      if (session.socket.readyState === 1) {
        session.socket.send(payload);
        session.lastActivityAt = new Date();
        return true;
      }
    } catch {
    }
    return false;
  }

  markAlive(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isAlive = true;
      session.lastActivityAt = new Date();
    }
  }
}
