import { and, asc, eq, isNull, lte, or } from "drizzle-orm";
import { outboxEvents } from "@workspace/db";
import { db, pool } from "@workspace/db";

const MAX_ATTEMPTS = Number(process.env.OUTBOX_MAX_ATTEMPTS ?? 8);
const BATCH_SIZE = Number(process.env.OUTBOX_BATCH_SIZE ?? 50);
const POLL_MS = Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 1000);
const BASE_BACKOFF_MS = Number(process.env.OUTBOX_BASE_BACKOFF_MS ?? 1000);
const WORKER_ID = process.env.HOSTNAME ?? `outbox-${process.pid}`;
const LEASE_MS = Number(process.env.OUTBOX_LEASE_MS ?? 30_000);

async function publish(event: typeof outboxEvents.$inferSelect): Promise<void> {
  const target = process.env.OUTBOX_PUBLISH_URL;
  if (!target) throw new Error("OUTBOX_PUBLISH_URL is required");
  const response = await fetch(target, {
    method: "POST",
    headers: { "content-type": "application/json", "x-outbox-event-id": event.id },
    body: JSON.stringify(event),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Outbox publish failed: ${response.status}`);
}

function backoff(attempts: number): Date {
  const delay = Math.min(BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1), 60_000);
  return new Date(Date.now() + delay);
}

async function drain(): Promise<void> {
  const events = await db
    .select()
    .from(outboxEvents)
    .where(and(
      lte(outboxEvents.availableAt, now),
      isNull(outboxEvents.publishedAt),\n      or(isNull(outboxEvents.lockedAt), lte(outboxEvents.lockedAt, stale)),
    ))
    .orderBy(asc(outboxEvents.occurredAt))
    .limit(BATCH_SIZE);

  for (const event of events) {
    const claimed = await db.update(outboxEvents)
      .set({ status: "processing", lockedAt: new Date(), lockedBy: WORKER_ID })
      .where(and(eq(outboxEvents.id, event.id), isNull(outboxEvents.publishedAt)))
      .returning({ id: outboxEvents.id });
    if (!claimed.length) continue;
    try {
      await publish(event);
      await db.update(outboxEvents)
        .set({ publishedAt: new Date(), status: "published", lockedAt: null, lockedBy: null, lastError: null })
        .where(eq(outboxEvents.id, event.id));
    } catch (error) {
      const attempts = event.attempts + 1;
      await db.update(outboxEvents)
        .set({
          attempts,
          lastError: error instanceof Error ? error.message.slice(0, 2000) : "Unknown publish error",
          availableAt: backoff(attempts),
          status: attempts >= MAX_ATTEMPTS ? "dead_letter" : "pending",
          lockedAt: null,
          lockedBy: null,
        })
        .where(eq(outboxEvents.id, event.id));
      if (attempts >= MAX_ATTEMPTS) {
        console.error(JSON.stringify({ level: "error", event: "outbox.dead-letter-threshold", eventId: event.id, attempts }));
      }
    }
  }
}

async function main(): Promise<void> {
  process.on("SIGTERM", async () => { await pool.end(); process.exit(0); });
  process.on("SIGINT", async () => { await pool.end(); process.exit(0); });
  for (;;) {
    await drain();
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}
void main().catch(async (error) => { console.error(error); await pool.end(); process.exit(1); });
