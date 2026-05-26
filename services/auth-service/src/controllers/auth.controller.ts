import type { FastifyRequest, FastifyReply } from "fastify";
import { getDatabase } from "@deliveryos/database";
import {
  registerUser,
  loginUser,
  refreshTokens,
  logoutUser,
  logoutAllDevices,
  getCurrentUser,
  getUserActiveSessions,
} from "../services/index.js";
import { extractDeviceInfo } from "../middleware/authenticate.js";
import { ok, fail } from "../utils/response.js";
import { AuthError, ValidationError } from "../utils/errors.js";
import type {
  RegisterInput,
  LoginInput,
  RefreshInput,
} from "../validators/auth.validators.js";

function handleError(err: unknown, request: FastifyRequest, reply: FastifyReply) {
  if (err instanceof AuthError) {
    return reply.status(err.statusCode).send(
      fail(err.code, err.message, undefined, request.id),
    );
  }
  if (err instanceof ValidationError) {
    return reply.status(400).send(
      fail("VALIDATION_ERROR", err.message, err.details, request.id),
    );
  }
  request.log.error({ err }, "Unhandled auth controller error");
  return reply.status(500).send(
    fail("INTERNAL_ERROR", "An unexpected error occurred", undefined, request.id),
  );
}

export async function registerController(
  request: FastifyRequest<{ Body: RegisterInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const db = getDatabase();
    const device = extractDeviceInfo(request);
    const result = await registerUser(db, request.body, device);

    return reply.status(201).send(
      ok({
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        tokenType: "Bearer",
        expiresAt: result.tokens.accessTokenExpiresAt.toISOString(),
        user: {
          id: result.userId,
          email: result.email,
          role: result.role,
        },
      }),
    );
  } catch (err) {
    return handleError(err, request, reply);
  }
}

export async function loginController(
  request: FastifyRequest<{ Body: LoginInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const db = getDatabase();
    const device = {
      ...extractDeviceInfo(request),
      deviceId: request.body.device?.deviceId,
      deviceName: request.body.device?.deviceName,
      deviceType: request.body.device?.deviceType,
    };
    const result = await loginUser(db, request.body, device);

    return reply.status(200).send(
      ok({
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        tokenType: "Bearer",
        expiresAt: result.tokens.accessTokenExpiresAt.toISOString(),
        user: {
          id: result.userId,
          email: result.email,
          role: result.role,
        },
      }),
    );
  } catch (err) {
    return handleError(err, request, reply);
  }
}

export async function refreshController(
  request: FastifyRequest<{ Body: RefreshInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const db = getDatabase();
    const device = extractDeviceInfo(request);
    const result = await refreshTokens(db, request.body.refreshToken, device);

    return reply.status(200).send(
      ok({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        tokenType: "Bearer",
        expiresAt: result.accessTokenExpiresAt.toISOString(),
      }),
    );
  } catch (err) {
    return handleError(err, request, reply);
  }
}

export async function logoutController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    if (!request.user) {
      return reply.status(401).send(fail("UNAUTHORIZED", "Authentication required"));
    }
    const db = getDatabase();
    const device = extractDeviceInfo(request);
    await logoutUser(db, request.user.sessionId, request.user.userId, device);
    return reply.status(204).send();
  } catch (err) {
    return handleError(err, request, reply);
  }
}

export async function logoutAllController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    if (!request.user) {
      return reply.status(401).send(fail("UNAUTHORIZED", "Authentication required"));
    }
    const db = getDatabase();
    const device = extractDeviceInfo(request);
    const count = await logoutAllDevices(db, request.user.userId, device);
    return reply.status(200).send(ok({ sessionsRevoked: count }));
  } catch (err) {
    return handleError(err, request, reply);
  }
}

export async function meController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    if (!request.user) {
      return reply.status(401).send(fail("UNAUTHORIZED", "Authentication required"));
    }
    const db = getDatabase();
    const userWithProfile = await getCurrentUser(db, request.user.userId);
    if (!userWithProfile) {
      return reply.status(404).send(fail("NOT_FOUND", "User not found"));
    }
    return reply.status(200).send(
      ok({
        id: userWithProfile.id,
        email: userWithProfile.email,
        role: userWithProfile.primaryRole,
        accountStatus: userWithProfile.accountStatus,
        verificationStatus: userWithProfile.verificationStatus,
        isEmailVerified: userWithProfile.isEmailVerified,
        profile: userWithProfile.profile
          ? {
              firstName: userWithProfile.profile.firstName,
              lastName: userWithProfile.profile.lastName,
              displayName: userWithProfile.profile.displayName,
              avatarUrl: userWithProfile.profile.avatarUrl,
            }
          : null,
      }),
    );
  } catch (err) {
    return handleError(err, request, reply);
  }
}

export async function sessionsController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    if (!request.user) {
      return reply.status(401).send(fail("UNAUTHORIZED", "Authentication required"));
    }
    const db = getDatabase();
    const sessions = await getUserActiveSessions(db, request.user.userId);
    return reply.status(200).send(
      ok(
        sessions.map((s) => ({
          id: s.id,
          deviceName: s.deviceName,
          deviceType: s.deviceType,
          ipAddress: s.ipAddress,
          lastActiveAt: s.lastActiveAt,
          createdAt: s.createdAt,
          isCurrent: s.id === request.user!.sessionId,
        })),
      ),
    );
  } catch (err) {
    return handleError(err, request, reply);
  }
}
