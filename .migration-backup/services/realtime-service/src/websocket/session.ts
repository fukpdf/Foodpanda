import type { WebSocket } from "@fastify/websocket";
import type { AuthenticatedPrincipal } from "../types/realtime.types.js";

export interface RealtimeWsSession {
  id: string;
  socket: WebSocket;
  principal: AuthenticatedPrincipal;
  connectedAt: Date;
  lastActivityAt: Date;
  ip: string;
  userAgent: string;
  isAlive: boolean;
}

export function createWsSession(params: {
  id: string;
  socket: WebSocket;
  principal: AuthenticatedPrincipal;
  ip: string;
  userAgent: string;
}): RealtimeWsSession {
  return {
    ...params,
    connectedAt: new Date(),
    lastActivityAt: new Date(),
    isAlive: true,
  };
}
