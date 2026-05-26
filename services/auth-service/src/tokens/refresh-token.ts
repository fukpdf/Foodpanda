import { randomBytes, createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import type { RefreshTokenMeta } from "../types/auth.types.js";

const TOKEN_BYTES = 48;

export function generateRefreshToken(ttlSeconds: number): RefreshTokenMeta {
  const raw = randomBytes(TOKEN_BYTES).toString("base64url");
  const hash = hashRefreshToken(raw);
  const familyId = randomUUID();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  return { raw, hash, familyId, expiresAt };
}

export function rotateRefreshToken(
  existingFamilyId: string,
  ttlSeconds: number,
): RefreshTokenMeta {
  const raw = randomBytes(TOKEN_BYTES).toString("base64url");
  const hash = hashRefreshToken(raw);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  return { raw, hash, familyId: existingFamilyId, expiresAt };
}

export function hashRefreshToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function isRefreshTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}
