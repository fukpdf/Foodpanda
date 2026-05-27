import type { FastifyRequest, FastifyReply } from "fastify";
import { verifyAccessToken } from "../tokens/access-token.js";
import { env } from "../config/env.js";
import { fail } from "../utils/response.js";

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return reply.status(401).send(
      fail("UNAUTHORIZED", "Authentication required — provide a Bearer token"),
    );
  }

  const token = authHeader.slice(7);
  try {
    const payload = await verifyAccessToken(
      token,
      env.rsaKeys.publicKeyPem,
      env.JWT_ISSUER,
      env.JWT_AUDIENCE,
    );

    request.user = {
      userId: payload.sub,
      sessionId: payload.sessionId,
      role: payload.role,
      email: payload["email"] as string,
    };
    request.sessionId = payload.sessionId;
  } catch {
    return reply.status(401).send(
      fail("TOKEN_INVALID", "Access token is invalid or expired"),
    );
  }
}

export function extractDeviceInfo(request: FastifyRequest) {
  return {
    ipAddress: (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      ?? request.ip
      ?? "unknown",
    userAgent: request.headers["user-agent"] ?? "unknown",
    deviceId: request.headers["x-device-id"] as string | undefined,
  };
}
