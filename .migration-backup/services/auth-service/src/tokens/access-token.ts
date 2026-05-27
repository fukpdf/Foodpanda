import { SignJWT, jwtVerify, importPKCS8, importSPKI } from "jose";
import { randomUUID } from "node:crypto";
import type { AccessTokenPayload } from "../types/auth.types.js";
import { TokenError } from "../utils/errors.js";

const ALG = "RS256";

export interface IssueAccessTokenParams {
  userId: string;
  sessionId: string;
  role: string;
  email: string;
  privateKeyPem: string;
  issuer: string;
  audience: string;
  ttlSeconds: number;
}

export async function issueAccessToken(params: IssueAccessTokenParams): Promise<{
  token: string;
  expiresAt: Date;
  jti: string;
}> {
  const {
    userId,
    sessionId,
    role,
    email,
    privateKeyPem,
    issuer,
    audience,
    ttlSeconds,
  } = params;

  const privateKey = await importPKCS8(privateKeyPem, ALG);
  const jti = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

  const token = await new SignJWT({
    sub: userId,
    sessionId,
    role,
    email,
    jti,
  })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .setIssuer(issuer)
    .setAudience(audience)
    .setNotBefore(now)
    .sign(privateKey);

  return { token, expiresAt, jti };
}

export async function verifyAccessToken(
  token: string,
  publicKeyPem: string,
  issuer: string,
  audience: string,
): Promise<AccessTokenPayload> {
  try {
    const publicKey = await importSPKI(publicKeyPem, ALG);
    const { payload } = await jwtVerify(token, publicKey, {
      issuer,
      audience,
      algorithms: [ALG],
    });

    if (!payload.sub || !payload["sessionId"] || !payload["role"]) {
      throw new TokenError("Token is missing required claims");
    }

    return payload as unknown as AccessTokenPayload;
  } catch (err) {
    if (err instanceof TokenError) throw err;
    const message = err instanceof Error ? err.message : "Token verification failed";
    if (message.includes("expired")) {
      throw new TokenError("Access token has expired");
    }
    throw new TokenError("Access token is invalid");
  }
}
