export type UserRole = "customer" | "vendor" | "rider" | "admin" | "superadmin";

export type ChannelCategory = "order" | "customer" | "vendor" | "rider" | "admin";

export type Channel =
  | `order:${string}`
  | `customer:${string}`
  | `vendor:${string}`
  | `rider:${string}`
  | "admin:dispatch"
  | "admin:orders";

export interface AuthenticatedPrincipal {
  userId: string;
  sessionId: string;
  role: UserRole;
  email: string;
}

export interface RealtimeWsSession {
  id: string;
  principal: AuthenticatedPrincipal;
  connectedAt: Date;
  lastActivityAt: Date;
  ip: string;
  userAgent: string;
}

export interface RealtimeSseSession {
  id: string;
  principal: AuthenticatedPrincipal;
  connectedAt: Date;
  channel: string;
  ip: string;
  userAgent: string;
  write: (event: string, data: unknown) => void;
  writeComment: (comment: string) => void;
  end: () => void;
}

export interface OrderContextEntry {
  orderId: string;
  customerId: string;
  vendorBranchId: string;
  riderId?: string;
  cachedAt: Date;
}

export interface InternalEventPayload {
  channel: string;
  event: {
    eventId: string;
    eventType: string;
    orderId: string;
    occurredAt: string;
    version: number;
    source: string;
    payload: Record<string, unknown>;
  };
}

export interface ConnectionStats {
  activeWsConnections: number;
  activeSseConnections: number;
  totalConnections: number;
  activeChannels: number;
  totalSubscriptions: number;
  uptimeSeconds: number;
}
