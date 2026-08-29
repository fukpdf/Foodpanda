import type { FastifyReply, FastifyRequest } from "fastify";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, eq, gt } from "drizzle-orm";
import { idempotencyKeys } from "@workspace/db";

const HEADER = "idempotency-key";
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_KEY_LENGTH = 255;
const WAIT_MS = 100;
const MAX_WAIT_MS = 15_000;

type Database = NodePgDatabase<Record<string, unknown>>;
type StoredResponse = { status: number; body: unknown };

function validKey(value: string | undefined): value is string {
  return Boolean(value && value.length > 0 && value.length <= MAX_KEY_LENGTH);
}

async function readCompleted(db: Database, key: string) {
  const rows = await db
    .select()
    .from(idempotencyKeys)
    .where(and(eq(idempotencyKeys.key, key), gt(idempotencyKeys.expiresAt, new Date())))
    .limit(1);
  const stored = rows[0];
  if (!stored || stored.responseStatus == null || stored.responseBody == null) return null;
  const body = stored.responseBody as unknown as StoredResponse;
  if (typeof body !== "object" || body === null || typeof body.status !== "number") return null;
  return body;
}

/**
 * Atomically claims a key using the database UNIQUE constraint. A concurrent
 * request that loses the claim waits for the winner to persist its response.
 */
export async function claimIdempotencyKey(db: Database, key: string, resourceType: string): Promise<"claimed" | "completed" | "in_progress"> {
  const existing = await readCompleted(db, key);
  if (existing) return "completed";

  const inserted = await db
    .insert(idempotencyKeys)
    .values({
      key,
      resourceType,
      responseStatus: null,
      responseBody: null,
      expiresAt: new Date(Date.now() + DEFAULT_TTL_MS),
    })
    .onConflictDoNothing({ target: idempotencyKeys.key })
    .returning({ id: idempotencyKeys.id });

  if (inserted.length > 0) return "claimed";

  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    const completed = await readCompleted(db, key);
    if (completed) return "completed";
    await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
  }
  return "in_progress";
}

export async function replayIdempotentResponse(db: Database, request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const key = request.headers[HEADER];
  if (typeof key !== "string" || !validKey(key)) return false;
  const body = await readCompleted(db, key);
  if (!body) return false;
  await reply.status(body.status).send(body.body);
  return true;
}

export async function storeIdempotentResponse(
  db: Database,
  key: string,
  resourceType: string,
  resourceId: string | null,
  status: number,
  body: unknown,
  ttlMs = DEFAULT_TTL_MS,
): Promise<void> {
  if (!validKey(key)) throw new Error("Invalid Idempotency-Key");
  const responseBody = { status, body } as Record<string, unknown>;
  await db
    .update(idempotencyKeys)
    .set({ resourceType, resourceId, responseStatus: status, responseBody, expiresAt: new Date(Date.now() + ttlMs) })
    .where(eq(idempotencyKeys.key, key));
}

export function getIdempotencyKey(request: FastifyRequest): string | null {
  const value = request.headers[HEADER];
  return typeof value === "string" && validKey(value) ? value : null;
}

export const IDEMPOTENCY_HEADER = "Idempotency-Key";
