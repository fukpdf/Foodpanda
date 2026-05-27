import type { Database } from "@deliveryos/database";
import { UserRepository, UserProfileRepository } from "@deliveryos/database";
import type { User } from "@deliveryos/database";
import { env } from "../config/env.js";
import { hashPassword, verifyPassword } from "./password.service.js";
import { createSession, rotateSession, revokeSession, revokeAllUserSessions } from "./session.service.js";
import { writeAuditLog } from "./audit.service.js";
import { issueAccessToken } from "../tokens/access-token.js";
import { hashRefreshToken } from "../tokens/refresh-token.js";
import {
  AuthError,
  ConflictError,
  NotFoundError,
  TokenError,
} from "../utils/errors.js";
import type {
  TokenPair,
  DeviceInfo,
} from "../types/auth.types.js";
import type { RegisterInput, LoginInput } from "../validators/auth.validators.js";

async function buildTokenPair(
  db: Database,
  user: User,
  device: DeviceInfo,
): Promise<TokenPair & { sessionId: string }> {
  const { session, refreshMeta } = await createSession(db, user.id, device);

  const { token: accessToken, expiresAt: accessTokenExpiresAt } =
    await issueAccessToken({
      userId: user.id,
      sessionId: session.id,
      role: user.primaryRole,
      email: user.email,
      privateKeyPem: env.rsaKeys.privateKeyPem,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      ttlSeconds: env.JWT_ACCESS_TOKEN_TTL,
    });

  return {
    accessToken,
    refreshToken: refreshMeta.raw,
    accessTokenExpiresAt,
    refreshTokenExpiresAt: refreshMeta.expiresAt,
    sessionId: session.id,
  };
}

export interface RegisterResult {
  tokens: TokenPair;
  sessionId: string;
  userId: string;
  email: string;
  role: string;
}

export async function registerUser(
  db: Database,
  input: RegisterInput,
  device: DeviceInfo,
): Promise<RegisterResult> {
  const userRepo = new UserRepository(db);
  const profileRepo = new UserProfileRepository(db);

  const existing = await userRepo.findByEmail(input.email);
  if (existing) {
    throw new ConflictError("An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const normalized = input.email.toLowerCase().trim();

  const user = await userRepo.create({
    email: input.email,
    emailNormalized: normalized,
    phone: input.phone ?? null,
    phoneNormalized: input.phone ? input.phone.replace(/\s/g, "") : null,
    passwordHash,
    primaryRole: input.role as User["primaryRole"],
    accountStatus: "active",
    verificationStatus: "unverified",
    authProvider: "email_password",
  });

  await profileRepo.create({
    userId: user.id,
    firstName: input.firstName,
    lastName: input.lastName,
    displayName: `${input.firstName} ${input.lastName}`.trim(),
  });

  const tokens = await buildTokenPair(db, user, device);

  await writeAuditLog({
    db,
    actorId: user.id,
    actorRole: user.primaryRole,
    actorIp: device.ipAddress,
    actorUserAgent: device.userAgent,
    sessionId: tokens.sessionId,
    action: "create",
    entityType: "user",
    entityId: user.id,
    newValue: { email: user.email, role: user.primaryRole },
  });

  return {
    tokens,
    sessionId: tokens.sessionId,
    userId: user.id,
    email: user.email,
    role: user.primaryRole,
  };
}

export interface LoginResult {
  tokens: TokenPair;
  sessionId: string;
  userId: string;
  email: string;
  role: string;
}

export async function loginUser(
  db: Database,
  input: LoginInput,
  device: DeviceInfo,
): Promise<LoginResult> {
  const userRepo = new UserRepository(db);

  const user = await userRepo.findByEmail(input.email);

  // Timing-safe: always hash even if user not found to prevent enumeration
  const dummyHash = "$2b$12$invalidhashfortimingsafety.......";
  const isValid = await verifyPassword(
    input.password,
    user?.passwordHash ?? dummyHash,
  );

  if (!user || !isValid) {
    if (user) {
      await writeAuditLog({
        db,
        actorId: user.id,
        actorIp: device.ipAddress,
        actorUserAgent: device.userAgent,
        action: "login",
        entityType: "user",
        entityId: user.id,
        metadata: { success: false, reason: "invalid_password" },
      });
    }
    throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password", 401);
  }

  if (user.accountStatus === "banned") {
    throw new AuthError("ACCOUNT_BANNED", "This account has been banned", 403);
  }
  if (user.accountStatus === "suspended") {
    throw new AuthError(
      "ACCOUNT_SUSPENDED",
      "This account is temporarily suspended",
      403,
    );
  }
  if (user.accountStatus === "deactivated" || user.accountStatus === "deleted") {
    throw new AuthError("ACCOUNT_INACTIVE", "This account is no longer active", 403);
  }

  const tokens = await buildTokenPair(db, user, device);
  await userRepo.updateLastLogin(user.id, device.ipAddress ?? "unknown");

  await writeAuditLog({
    db,
    actorId: user.id,
    actorRole: user.primaryRole,
    actorIp: device.ipAddress,
    actorUserAgent: device.userAgent,
    sessionId: tokens.sessionId,
    action: "login",
    entityType: "user",
    entityId: user.id,
    metadata: { success: true },
  });

  return {
    tokens,
    sessionId: tokens.sessionId,
    userId: user.id,
    email: user.email,
    role: user.primaryRole,
  };
}

export interface RefreshResult {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export async function refreshTokens(
  db: Database,
  rawRefreshToken: string,
  device: DeviceInfo,
): Promise<RefreshResult> {
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const result = await rotateSession(db, tokenHash);

  if (!result) {
    throw new TokenError("Refresh token is invalid, expired, or already used");
  }

  const userRepo = new UserRepository(db);
  const user = await userRepo.findById(result.session.userId);
  if (!user) throw new NotFoundError("User not found");

  if (
    user.accountStatus === "banned" ||
    user.accountStatus === "suspended" ||
    user.accountStatus === "deleted"
  ) {
    await revokeAllUserSessions(db, user.id, "Account status changed");
    throw new AuthError("ACCOUNT_INACTIVE", "Account is not active", 403);
  }

  const { token: accessToken, expiresAt: accessTokenExpiresAt } =
    await issueAccessToken({
      userId: user.id,
      sessionId: result.session.id,
      role: user.primaryRole,
      email: user.email,
      privateKeyPem: env.rsaKeys.privateKeyPem,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      ttlSeconds: env.JWT_ACCESS_TOKEN_TTL,
    });

  return {
    accessToken,
    accessTokenExpiresAt,
    refreshToken: result.refreshMeta.raw,
    refreshTokenExpiresAt: result.refreshMeta.expiresAt,
  };
}

export async function logoutUser(
  db: Database,
  sessionId: string,
  userId: string,
  device: DeviceInfo,
): Promise<void> {
  await revokeSession(db, sessionId, "User logout");

  await writeAuditLog({
    db,
    actorId: userId,
    actorIp: device.ipAddress,
    actorUserAgent: device.userAgent,
    sessionId,
    action: "logout",
    entityType: "user",
    entityId: userId,
    metadata: { everywhere: false },
  });
}

export async function logoutAllDevices(
  db: Database,
  userId: string,
  device: DeviceInfo,
): Promise<number> {
  const count = await revokeAllUserSessions(db, userId, "User logout all devices");

  await writeAuditLog({
    db,
    actorId: userId,
    actorIp: device.ipAddress,
    actorUserAgent: device.userAgent,
    action: "logout",
    entityType: "user",
    entityId: userId,
    metadata: { everywhere: true, sessionsRevoked: count },
  });

  return count;
}

export async function getCurrentUser(db: Database, userId: string) {
  const userRepo = new UserRepository(db);
  return userRepo.findWithProfile(userId);
}
