import { randomUUID } from "node:crypto";
import type { Database } from "@deliveryos/database";
import { AuthSessionRepository, RefreshTokenRepository } from "@deliveryos/database";
import type { AuthSession } from "@deliveryos/database";
import { generateRefreshToken, rotateRefreshToken } from "../tokens/index.js";
import { env } from "../config/env.js";
import type { DeviceInfo, RefreshTokenMeta } from "../types/auth.types.js";

export interface CreateSessionResult {
  session: AuthSession;
  refreshMeta: RefreshTokenMeta;
}

export async function createSession(
  db: Database,
  userId: string,
  device: DeviceInfo,
): Promise<CreateSessionResult> {
  const sessionRepo = new AuthSessionRepository(db);
  const tokenRepo = new RefreshTokenRepository(db);

  const sessionToken = randomUUID();
  const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TOKEN_TTL * 1000);

  const session = await sessionRepo.create({
    userId: userId as `${string}-${string}-${string}-${string}-${string}`,
    sessionToken,
    status: "active",
    deviceId: device.deviceId,
    deviceName: device.deviceName,
    deviceType: device.deviceType,
    userAgent: device.userAgent,
    ipAddress: device.ipAddress,
    expiresAt,
    lastActiveAt: new Date(),
  });

  const refreshMeta = generateRefreshToken(env.JWT_REFRESH_TOKEN_TTL);

  await tokenRepo.create({
    userId: userId as `${string}-${string}-${string}-${string}-${string}`,
    sessionId: session.id,
    tokenHash: refreshMeta.hash,
    familyId: refreshMeta.familyId as `${string}-${string}-${string}-${string}-${string}`,
    expiresAt: refreshMeta.expiresAt,
    ipAddress: device.ipAddress,
    userAgent: device.userAgent,
  });

  return { session, refreshMeta };
}

export async function rotateSession(
  db: Database,
  tokenHash: string,
): Promise<{ session: AuthSession; refreshMeta: RefreshTokenMeta } | null> {
  const tokenRepo = new RefreshTokenRepository(db);
  const sessionRepo = new AuthSessionRepository(db);

  const existingToken = await tokenRepo.findActiveByTokenHash(tokenHash);
  if (!existingToken) {
    const usedToken = await tokenRepo.findByTokenHash(tokenHash);
    if (usedToken) {
      await tokenRepo.revokeFamily(usedToken.familyId);
      await sessionRepo.revokeSession(
        usedToken.sessionId,
        "Refresh token replay attack detected",
      );
    }
    return null;
  }

  const session = await sessionRepo.findActiveByToken(
    (await sessionRepo.findById(existingToken.sessionId))?.sessionToken ?? "",
  );
  if (!session) return null;

  await tokenRepo.markUsed(existingToken.id);

  const refreshMeta = rotateRefreshToken(
    existingToken.familyId,
    env.JWT_REFRESH_TOKEN_TTL,
  );

  await tokenRepo.create({
    userId: existingToken.userId,
    sessionId: existingToken.sessionId,
    tokenHash: refreshMeta.hash,
    familyId: existingToken.familyId,
    expiresAt: refreshMeta.expiresAt,
  });

  await sessionRepo.updateLastActive(session.id);

  return { session, refreshMeta };
}

export async function revokeSession(
  db: Database,
  sessionId: string,
  reason: string,
): Promise<void> {
  const sessionRepo = new AuthSessionRepository(db);
  const tokenRepo = new RefreshTokenRepository(db);
  await tokenRepo.revokeBySessionId(sessionId);
  await sessionRepo.revokeSession(sessionId, reason);
}

export async function revokeAllUserSessions(
  db: Database,
  userId: string,
  reason: string,
): Promise<number> {
  const sessionRepo = new AuthSessionRepository(db);
  const sessions = await sessionRepo.findByUserId(userId);
  for (const session of sessions) {
    const tokenRepo = new RefreshTokenRepository(db);
    await tokenRepo.revokeBySessionId(session.id);
  }
  return sessionRepo.revokeAllUserSessions(userId, reason);
}

export async function getUserActiveSessions(
  db: Database,
  userId: string,
): Promise<AuthSession[]> {
  const sessionRepo = new AuthSessionRepository(db);
  return sessionRepo.findByUserId(userId);
}
