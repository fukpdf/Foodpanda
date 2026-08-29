import type { FastifyReply, FastifyRequest } from "fastify";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, and, gt } from "drizzle-orm";
import { idempotencyKeys } from "@workspace/db";

const HEADER = "idempotency-key";
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_KEY_LENGTH = 255;

type Database = NodePgDatabase<Record<string, unknown>>;

type StoredResponse = {
  status: number;
  body: unknown;
};

function validKey(value: string | undefined): value is string {
  return Boolean(value && value.length > 0 && value.length <= MAX_KEY_LENGTH);
}

export async function replayIdempotentResponse(
  db: Database,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<boolean> {
  const key = request.headers[HEADER];
  if (typeof key !== "string" || !validKey(key)) return false;

  const rows = await db
    .select()
    .from(idempotencyKeys)
    .where(and(eq(idempotencyKeys.key, key), gt(idempotencyKeys.expiresAt, new Date())))
    .limit(1);
  const stored = rows[0];
  if (!stored || stored.responseStatus == null || stored.responseBody == null) return false;

  const body = stored.responseBody as unknown as StoredResponse;
  if (typeof body !== "object" || body === null || typeof body.status !== "number") return false;
  await reply.status(stored.responseStatus).send(body.body);
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
    .insert(idempotencyKeys)
    .values({
      key,
      resourceType,
      resourceId,
      responseStatus: status,
      responseBody,
      expiresAt: new Date(Date.now() + ttlMs),
    })
    .onConflictDoUpdate({
      target: idempotencyKeys.key,
      set: { resourceType, resourceId, responseStatus: status, responseBody, expiresAt: new Date(Date.now() + ttlMs) },
    });
}

export function getIdempotencyKey(request: FastifyRequest): string | null {
  const value = request.headers[HEADER];
  return typeof value === "string" && validKey(value) ? value : null;
}

export const IDEMPOTENCY_HEADER = "Idempotency-Key";
