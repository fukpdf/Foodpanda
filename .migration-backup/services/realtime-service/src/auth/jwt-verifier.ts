import { importSPKI, jwtVerify } from "jose";
import { env } from "../config/env.js";
import type { AuthenticatedPrincipal } from "../types/realtime.types.js";

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
      `[realtime-service] Failed to fetch public key from auth-service: ${response.status}`,
    );
  }

  const data = (await response.json()) as { publicKey: string };
  _publicKeyPem = data.publicKey;
  _publicKey = await importSPKI(_publicKeyPem, "RS256");
  return _publicKey;
}

export class TokenVerificationError extends Error {
  readonly code: string;
  constructor(message: string, code = "INVALID_TOKEN") {
    super(message);
    this.name = "TokenVerificationError";
    this.code = code;
  }
}

export async function verifyToken(token: string): Promise<AuthenticatedPrincipal> {
  try {
    const publicKey = await getPublicKey();
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      algorithms: ["RS256"],
    });

    if (!payload["sub"] || !payload["sessionId"] || !payload["role"]) {
      throw new TokenVerificationError("Token is missing required claims");
    }

    return {
      userId: payload["sub"] as string,
      sessionId: payload["sessionId"] as string,
      role: payload["role"] as AuthenticatedPrincipal["role"],
      email: payload["email"] as string,
    };
  } catch (err) {
    if (err instanceof TokenVerificationError) throw err;
    const msg = err instanceof Error ? err.message : "Token verification failed";
    if (msg.includes("expired")) {
      throw new TokenVerificationError("Token has expired", "TOKEN_EXPIRED");
    }
    throw new TokenVerificationError("Token is invalid or malformed", "INVALID_TOKEN");
  }
}

export function resetPublicKeyCache(): void {
  _publicKey = null;
  _publicKeyPem = null;
}
