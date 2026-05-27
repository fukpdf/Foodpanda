import type { RealtimeSseSession } from "./sse-session.js";

export class SseManager {
  private readonly sessions = new Map<string, RealtimeSseSession>();

  add(session: RealtimeSseSession): void {
    this.sessions.set(session.id, session);
  }

  remove(sessionId: string): void {
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
