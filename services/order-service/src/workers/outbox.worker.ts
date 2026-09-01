import { sql } from "drizzle-orm";
import { outboxEvents } from "@workspace/db";
import { db, pool } from "@workspace/db";

const MAX_ATTEMPTS = Number(process.env.OUTBOX_MAX_ATTEMPTS ?? 8);
const BATCH_SIZE = Number(process.env.OUTBOX_BATCH_SIZE ?? 50);
const POLL_MS = Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 1000);
const BASE_BACKOFF_MS = Number(process.env.OUTBOX_BASE_BACKOFF_MS ?? 1000);
const WORKER_ID = process.env.HOSTNAME ?? `outbox-${process.pid}`;
const LEASE_MS = Number(process.env.OUTBOX_LEASE_MS ?? 30_000);

type OutboxEvent = typeof outboxEvents.$inferSelect;

async function publish(event: OutboxEvent): Promise<void> {
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

async function claimEvents(): Promise<OutboxEvent[]> {
  const stale = new Date(Date.now() - LEASE_MS);
  const result = await db.execute(sql`
    UPDATE ${outboxEvents}
    SET status = 'processing', locked_at = NOW(), locked_by = ${WORKER_ID}
    WHERE id IN (
      SELECT id
      FROM ${outboxEvents}
      WHERE published_at IS NULL
        AND available_at <= NOW()
        AND (
          status = 'pending'
          OR (status = 'processing' AND locked_at <= ${stale})
        )
      ORDER BY occurred_at
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `);
  return result as unknown as OutboxEvent[];
}

async function drain(): Promise<void> {
  const events = await claimEvents();
  for (const event of events) {
    try {
      await publish(event);
      await db.execute(sql`
        UPDATE ${outboxEvents}
        SET published_at = NOW(), status = 'published', locked_at = NULL, locked_by = NULL, last_error = NULL
        WHERE id = ${event.id} AND locked_by = ${WORKER_ID} AND published_at IS NULL
      `);
    } catch (error) {
      const attempts = event.attempts + 1;
      const status = attempts >= MAX_ATTEMPTS ? "dead_letter" : "pending";
      await db.execute(sql`
        UPDATE ${outboxEvents}
        SET attempts = ${attempts},
            last_error = ${error instanceof Error ? error.message.slice(0, 2000) : "Unknown publish error"},
            last_attempt_at = NOW(),
            dead_lettered_at = CASE WHEN ${status} = 'dead_letter' THEN NOW() ELSE dead_lettered_at END,
            available_at = ${backoff(attempts)},
            status = ${status}, locked_at = NULL, locked_by = NULL
        WHERE id = ${event.id} AND locked_by = ${WORKER_ID} AND published_at IS NULL
      `);
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
