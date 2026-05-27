import type { ID, Timestamp } from "./common.types.js";

export type UserRole = "customer" | "vendor" | "rider" | "admin" | "superadmin";

export type Permission =
  | "orders:read"
  | "orders:write"
  | "orders:delete"
  | "vendors:read"
  | "vendors:write"
  | "vendors:delete"
  | "riders:read"
  | "riders:write"
  | "users:read"
  | "users:write"
  | "users:delete"
  | "analytics:read"
  | "payments:read"
  | "payments:write"
  | "settings:read"
  | "settings:write";

export type RolePermissions = Record<UserRole, Permission[]>;

export type TokenPayload = {
  sub: ID;
  email: string;
  role: UserRole;
  sessionId: ID;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
};

export type RefreshTokenPayload = {
  sub: ID;
  sessionId: ID;
  family: string;
  iat: number;
  exp: number;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Timestamp;
  tokenType: "Bearer";
};

export type LoginCredentials = {
  email: string;
  password: string;
  deviceId?: string;
  deviceType?: "web" | "ios" | "android";
};

export type RegisterPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: Extract<UserRole, "customer" | "vendor" | "rider">;
};

export type OAuthProvider = "google" | "facebook" | "apple";

export type OAuthPayload = {
  provider: OAuthProvider;
  idToken: string;
  deviceId?: string;
};

export type Session = {
  id: ID;
  userId: ID;
  deviceId?: string;
  deviceType?: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  lastActivityAt: Timestamp;
  createdAt: Timestamp;
  expiresAt: Timestamp;
};

export type AuthContext = {
  userId: ID;
  email: string;
  role: UserRole;
  permissions: Permission[];
  sessionId: ID;
};
