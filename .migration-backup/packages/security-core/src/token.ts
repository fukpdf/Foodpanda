import type { TokenPayload, RefreshTokenPayload, AuthTokens } from "@deliveryos/shared-types";
import { TOKEN_CONFIG } from "@deliveryos/shared-utils";

export type TokenVerifyResult<T> =
  | { valid: true; payload: T }
  | { valid: false; error: "expired" | "invalid" | "malformed" };

export interface ITokenService {
  signAccessToken(payload: Omit<TokenPayload, "iat" | "exp" | "iss" | "aud">): Promise<string>;
  signRefreshToken(payload: Omit<RefreshTokenPayload, "iat" | "exp">): Promise<string>;
  verifyAccessToken(token: string): Promise<TokenVerifyResult<TokenPayload>>;
  verifyRefreshToken(token: string): Promise<TokenVerifyResult<RefreshTokenPayload>>;
  generateTokenPair(
    payload: Omit<TokenPayload, "iat" | "exp" | "iss" | "aud">,
    family?: string
  ): Promise<AuthTokens>;
  revokeToken(jti: string): Promise<void>;
  isTokenRevoked(jti: string): Promise<boolean>;
}

export const TOKEN_HEADER_SCHEME = "Bearer";

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== TOKEN_HEADER_SCHEME) return null;
  return parts[1] ?? null;
}

export function buildTokenExpiry(ttlSeconds = TOKEN_CONFIG.ACCESS_TOKEN_TTL_SECONDS): Date {
  return new Date(Date.now() + ttlSeconds * 1000);
}

export function isTokenExpiringSoon(
  expiresAt: string | Date,
  thresholdSeconds = 60
): boolean {
  const expiryMs = new Date(expiresAt).getTime();
  return expiryMs - Date.now() < thresholdSeconds * 1000;
}
