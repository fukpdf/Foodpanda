import type { RealtimeSseSession } from "./sse-session.js";

export class SseManager {
  private readonly sessions = new Map<string, RealtimeSseSession>();
  private readonly ipCount = new Map<string, number>();

  add(session: RealtimeSseSession): void {
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

  get(sessionId: string): RealtimeSseSession | undefined {
    return this.sessions.get(sessionId);
  }

  all(): IterableIterator<RealtimeSseSession> {
    return this.sessions.values();
  }

  getActiveCount(): number {
    return this.sessions.size;
  }

  getConnectionCountForIp(ip: string): number {
    return this.ipCount.get(ip) ?? 0;
  }

  send(sessionId: string, event: string, data: unknown): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    try {
      session.send(event, data);
      return true;
    } catch {
      return false;
    }
  }
}
