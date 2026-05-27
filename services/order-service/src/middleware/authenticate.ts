import { importSPKI, jwtVerify } from "jose";
import type { FastifyRequest, FastifyReply } from "fastify";
import { env } from "../config/env.js";

export interface AuthenticatedUser {
  userId: string;
  sessionId: string;
  role: string;
  email: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

let _publicKey: CryptoKey | null = null;
let _publicKeyPem: string | null = null;

async function getPublicKey(): Promise<CryptoKey> {
  const currentPem = env.AUTH_PUBLIC_KEY_BASE64
    ? Buffer.from(env.AUTH_PUBLIC_KEY_BASE64, "base64").toString("utf8")
    : null;

  if (_publicKey && _publicKeyPem && _publicKeyPem === currentPem) {
    return _publicKey;
  }

  if (currentPem) {
    _publicKeyPem = currentPem;
    _publicKey = await importSPKI(currentPem, "RS256");
    return _publicKey;
  }

  const response = await fetch(`${env.AUTH_SERVICE_URL}/auth/public-key`);
  if (!response.ok) {
    throw new Error(
      `[order-service] Failed to fetch public key from auth-service: ${response.status}`,
    );
  }

  const data = (await response.json()) as { publicKey: string };
  _publicKeyPem = data.publicKey;
  _publicKey = await importSPKI(_publicKeyPem, "RS256");
  return _publicKey;
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return reply.status(401).send({
      success: false,
      error: {
        code: "MISSING_TOKEN",
        message: "Authorization header with Bearer token is required",
        timestamp: new Date().toISOString(),
      },
    });
  }

  const token = authHeader.slice(7);

  try {
    const publicKey = await getPublicKey();
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      algorithms: ["RS256"],
    });

    request.user = {
      userId: payload["sub"] as string,
      sessionId: payload["sessionId"] as string,
      role: payload["role"] as string,
      email: payload["email"] as string,
    };
  } catch {
    return reply.status(401).send({
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: "Token is invalid or expired",
        timestamp: new Date().toISOString(),
      },
    });
  }
}

export function requireRole(...roles: string[]) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (!roles.includes(request.user.role)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `Access denied. Required role: ${roles.join(" or ")}`,
          timestamp: new Date().toISOString(),
        },
      });
    }
  };
}
