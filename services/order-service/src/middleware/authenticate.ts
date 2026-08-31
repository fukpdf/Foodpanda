import { importSPKI, jwtVerify } from "jose";
import type { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { env } from "../config/env.js";

const AuthClaimsSchema = z.object({
  sub: z.string().min(1),
  sessionId: z.string().min(1),
  role: z.enum(["customer", "vendor", "rider", "admin", "superadmin"]),
  email: z.string().email(),
});

export type AuthenticatedUser = z.infer<typeof AuthClaimsSchema> & { userId: string };

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

let _publicKey: Awaited<ReturnType<typeof importSPKI>> | null = null;
let _publicKeyPem: string | null = null;

async function getPublicKey(): Promise<Awaited<ReturnType<typeof importSPKI>>> {
  const currentPem = env.AUTH_PUBLIC_KEY_BASE64
    ? Buffer.from(env.AUTH_PUBLIC_KEY_BASE64, "base64").toString("utf8")
    : null;

  if (_publicKey && _publicKeyPem === currentPem) return _publicKey;

  if (currentPem) {
    _publicKeyPem = currentPem;
    _publicKey = await importSPKI(currentPem, "RS256");
    return _publicKey;
  }

  const response = await fetch(`${env.AUTH_SERVICE_URL}/auth/public-key`, {
    signal: AbortSignal.timeout(5_000),
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Auth public-key request failed: ${response.status}`);
  }

  const data = z.object({ publicKey: z.string().min(1) }).parse(await response.json());
  _publicKeyPem = data.publicKey;
  _publicKey = await importSPKI(data.publicKey, "RS256");
  return _publicKey;
}

function unauthorized(reply: FastifyReply, code: string, message: string) {
  return reply.status(401).send({
    success: false,
    error: { code, message, timestamp: new Date().toISOString() },
  });
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    unauthorized(reply, "MISSING_TOKEN", "Authorization header with Bearer token is required");
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    unauthorized(reply, "MISSING_TOKEN", "Bearer token is empty");
    return;
  }

  try {
    const { payload } = await jwtVerify(token, await getPublicKey(), {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      algorithms: ["RS256"],
    });

    const claims = AuthClaimsSchema.safeParse({
      sub: payload.sub,
      sessionId: payload["sessionId"],
      role: payload["role"],
      email: payload["email"],
    });

    if (!claims.success) {
      unauthorized(reply, "INVALID_TOKEN", "Token claims are invalid");
      return;
    }
    request.user = { ...claims.data, userId: claims.data.sub };
  } catch {
    unauthorized(reply, "INVALID_TOKEN", "Token is invalid or expired");
  }
}

export function requireRole(...roles: AuthenticatedUser["role"][]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      unauthorized(reply, "UNAUTHENTICATED", "Authentication required");
      return;
    }
    if (!roles.includes(request.user.role)) {
      reply.status(403).send({
        success: false,
        error: { code: "FORBIDDEN", message: "You do not have permission to perform this action", timestamp: new Date().toISOString() },
      });
    }
  };
}
