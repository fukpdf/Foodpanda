export type ClientMessageType = "subscribe" | "unsubscribe" | "ping";

export interface SubscribeMessage {
  type: "subscribe";
  channel: string;
}

export interface UnsubscribeMessage {
  type: "unsubscribe";
  channel: string;
}

export interface PingMessage {
  type: "ping";
}

export type ClientMessage = SubscribeMessage | UnsubscribeMessage | PingMessage;

export type ServerMessageType =
  | "connected"
  | "subscribed"
  | "unsubscribed"
  | "event"
  | "pong"
  | "error";

export interface ConnectedMessage {
  type: "connected";
  sessionId: string;
  timestamp: string;
}

export interface SubscribedMessage {
  type: "subscribed";
  channel: string;
}

export interface UnsubscribedMessage {
  type: "unsubscribed";
  channel: string;
}

export interface PongMessage {
  type: "pong";
  timestamp: string;
}

export interface RealtimeEventMessage {
  type: "event";
  channel: string;
  eventType: string;
  eventId: string;
  orderId: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

export interface ErrorMessage {
  type: "error";
  code: string;
  message: string;
}

export type ServerMessage =
  | ConnectedMessage
  | SubscribedMessage
  | UnsubscribedMessage
  | PongMessage
  | RealtimeEventMessage
  | ErrorMessage;

export function isClientMessage(raw: unknown): raw is ClientMessage {
  if (typeof raw !== "object" || raw === null) return false;
  const obj = raw as Record<string, unknown>;
  return (
    obj["type"] === "subscribe" ||
    obj["type"] === "unsubscribe" ||
    obj["type"] === "ping"
  );
}
