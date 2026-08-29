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
  interface FastifyRequest { user?: AuthenticatedUser; }
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
  if (!response.ok) throw new Error(`Auth public-key request failed: ${response.status}`);
  const data = z.object({ publicKey: z.string().min(1) }).parse(await response.json());
  _publicKeyPem = data.publicKey;
  _publicKey = await importSPKI(data.publicKey, "RS256");
  return _publicKey;
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    await reply.status(401).send({ success: false, error: { code: "MISSING_TOKEN", message: "Authorization header with Bearer token is required", timestamp: new Date().toISOString() } });
    return;
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    await reply.status(401).send({ success: false, error: { code: "MISSING_TOKEN", message: "Bearer token is empty", timestamp: new Date().toISOString() } });
    return;
  }
  try {
    const { payload } = await jwtVerify(token, await getPublicKey(), {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      algorithms: ["RS256"],
    });
    const claims = AuthClaimsSchema.parse({
      sub: payload.sub,
      sessionId: payload["sessionId"],
      role: payload["role"],
      email: payload["email"],
    });
    request.user = { ...claims, userId: claims.sub };
  } catch {
    await reply.status(401).send({ success: false, error: { code: "INVALID_TOKEN", message: "Token is invalid or expired", timestamp: new Date().toISOString() } });
  }
}

export function requireRole(...roles: AuthenticatedUser["role"][]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      await reply.status(401).send({ success: false, error: { code: "UNAUTHENTICATED", message: "Authentication required", timestamp: new Date().toISOString() } });
      return;
    }
    if (!roles.includes(request.user.role)) {
      await reply.status(403).send({ success: false, error: { code: "FORBIDDEN", message: "You do not have permission to perform this action", timestamp: new Date().toISOString() } });
    }
  };
}
