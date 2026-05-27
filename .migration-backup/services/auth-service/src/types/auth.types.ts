export interface AccessTokenPayload {
  sub: string;
  sessionId: string;
  role: string;
  email: string;
  jti: string;
  iss: string;
  aud: string | string[];
  iat: number;
  exp: number;
  nbf?: number;
}

export interface AuthenticatedUser {
  userId: string;
  sessionId: string;
  role: string;
  email: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

export interface RefreshTokenMeta {
  raw: string;
  hash: string;
  familyId: string;
  expiresAt: Date;
}

export interface DeviceInfo {
  deviceId?: string;
  deviceName?: string;
  deviceType?: string;
  userAgent?: string;
  ipAddress?: string;
}
