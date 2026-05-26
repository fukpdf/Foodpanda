import { and, eq, gt, lt, sql } from "drizzle-orm";
import type { Database } from "../client/index.js";
import { authSessions, refreshTokens } from "../schemas/index.js";
import type {
  AuthSession,
  NewAuthSession,
  NewRefreshToken,
  RefreshToken,
} from "../schemas/index.js";
import { BaseRepository } from "./base.repository.js";

export class AuthSessionRepository extends BaseRepository<
  typeof authSessions,
  AuthSession,
  NewAuthSession
> {
  constructor(db: Database) {
    super(db, authSessions);
  }

  async findByToken(token: string): Promise<AuthSession | null> {
    const result = await this.db
      .select()
      .from(authSessions)
      .where(eq(authSessions.sessionToken, token))
      .limit(1);
    return result[0] ?? null;
  }

  async findActiveByToken(token: string): Promise<AuthSession | null> {
    const result = await this.db
      .select()
      .from(authSessions)
      .where(
        and(
          eq(authSessions.sessionToken, token),
          eq(authSessions.status, "active"),
          gt(authSessions.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  }

  async findByUserId(userId: string): Promise<AuthSession[]> {
    return this.db
      .select()
      .from(authSessions)
      .where(
        and(
          eq(authSessions.userId, userId),
          eq(authSessions.status, "active"),
          gt(authSessions.expiresAt, new Date()),
        ),
      );
  }

  async revokeSession(
    sessionId: string,
    reason: string,
  ): Promise<AuthSession | null> {
    return this.update(sessionId, {
      status: "revoked",
      revokedAt: new Date(),
      revokeReason: reason,
    });
  }

  async revokeAllUserSessions(userId: string, reason: string): Promise<number> {
    const result = await this.db
      .update(authSessions)
      .set({ status: "revoked", revokedAt: new Date(), revokeReason: reason })
      .where(
        and(
          eq(authSessions.userId, userId),
          eq(authSessions.status, "active"),
        ),
      )
      .returning();
    return result.length;
  }

  async updateLastActive(sessionId: string): Promise<void> {
    await this.db
      .update(authSessions)
      .set({ lastActiveAt: new Date() })
      .where(eq(authSessions.id, sessionId));
  }

  async pruneExpired(): Promise<number> {
    const result = await this.db
      .delete(authSessions)
      .where(lt(authSessions.expiresAt, new Date()))
      .returning();
    return result.length;
  }
}

export class RefreshTokenRepository extends BaseRepository<
  typeof refreshTokens,
  RefreshToken,
  NewRefreshToken
> {
  constructor(db: Database) {
    super(db, refreshTokens);
  }

  async findByTokenHash(hash: string): Promise<RefreshToken | null> {
    const result = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hash))
      .limit(1);
    return result[0] ?? null;
  }

  async findActiveByTokenHash(hash: string): Promise<RefreshToken | null> {
    const result = await this.db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, hash),
          eq(refreshTokens.isUsed, false),
          eq(refreshTokens.isRevoked, false),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  }

  async markUsed(tokenId: string): Promise<RefreshToken | null> {
    return this.update(tokenId, { isUsed: true, usedAt: new Date() });
  }

  async revokeFamily(familyId: string): Promise<number> {
    const result = await this.db
      .update(refreshTokens)
      .set({ isRevoked: true, revokedAt: new Date() })
      .where(eq(refreshTokens.familyId, familyId))
      .returning();
    return result.length;
  }

  async revokeBySessionId(sessionId: string): Promise<number> {
    const result = await this.db
      .update(refreshTokens)
      .set({ isRevoked: true, revokedAt: new Date() })
      .where(eq(refreshTokens.sessionId, sessionId))
      .returning();
    return result.length;
  }

  async pruneExpired(): Promise<number> {
    const result = await this.db
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, new Date()))
      .returning();
    return result.length;
  }
}
