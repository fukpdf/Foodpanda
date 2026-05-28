import type { FastifyInstance } from "fastify";
import type { WebSocket } from "@fastify/websocket";
import { randomUUID } from "node:crypto";

type RawData = Buffer | ArrayBuffer | Buffer[];

import type { ConnectionManager } from "../websocket/connection-manager.js";
import type { SubscriptionManager } from "../subscriptions/subscription-manager.js";
import { createWsSession } from "../websocket/session.js";
import { verifyToken, TokenVerificationError } from "../auth/jwt-verifier.js";
import { validateSubscription } from "../subscriptions/channel-rules.js";
import type { ClientMessage, ServerMessage } from "../types/message.types.js";
import { isClientMessage } from "../types/message.types.js";
import { env } from "../config/env.js";

const MAX_MESSAGE_BYTES = 4_096;

function send(socket: WebSocket, message: ServerMessage): void {
  try {
    if (socket.readyState === 1) {
      socket.send(JSON.stringify(message));
    }
  } catch {
  }
}

function measureBytes(raw: RawData): number {
  if (Buffer.isBuffer(raw)) return raw.length;
  if (raw instanceof ArrayBuffer) return raw.byteLength;
  return (raw as Buffer[]).reduce((sum, b) => sum + b.length, 0);
}

export async function registerWebSocketRoute(
  app: FastifyInstance,
  connections: ConnectionManager,
  subscriptions: SubscriptionManager,
): Promise<void> {
  app.get(
    "/ws",
    {
      websocket: true,
      config: {
        rateLimit: {
          max: 20,
          timeWindow: 60_000,
        },
      },
    },
    async (socket: WebSocket, request) => {
      const ip =
        (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
        request.ip ??
        "unknown";

      if (connections.getConnectionCountForIp(ip) >= env.MAX_CONNECTIONS_PER_IP) {
        send(socket, {
          type: "error",
          code: "TOO_MANY_CONNECTIONS",
          message: `Maximum connections per IP (${env.MAX_CONNECTIONS_PER_IP}) exceeded`,
        });
        socket.close(1008, "Too many connections");
        return;
      }

      const token = (request.query as Record<string, string>)["token"];
      if (!token) {
        send(socket, {
          type: "error",
          code: "MISSING_TOKEN",
          message: "Token query parameter is required",
        });
        socket.close(1008, "Missing token");
        return;
      }

      let principal;
      try {
        principal = await verifyToken(token);
      } catch (err) {
        const code = err instanceof TokenVerificationError ? err.code : "INVALID_TOKEN";
        const message = err instanceof Error ? err.message : "Token verification failed";
        send(socket, { type: "error", code, message });
        socket.close(1008, "Unauthorized");
        return;
      }

      const sessionId = randomUUID();
      const session = createWsSession({
        id: sessionId,
        socket,
        principal,
        ip,
        userAgent: request.headers["user-agent"] ?? "unknown",
      });

      connections.add(session);

      send(socket, {
        type: "connected",
        sessionId,
        timestamp: new Date().toISOString(),
      });

      app.log.info(
        { sessionId, userId: principal.userId, role: principal.role, ip },
        "WebSocket client connected",
      );

      socket.on("pong", () => {
        connections.markAlive(sessionId);
      });

      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        subscriptions.unsubscribeAll(sessionId);
        connections.remove(sessionId);
        app.log.info(
          { sessionId, userId: principal.userId },
          "WebSocket client disconnected",
        );
      };

      socket.on("message", (raw: RawData) => {
        try {
          const byteSize = measureBytes(raw);
          if (byteSize > MAX_MESSAGE_BYTES) {
            send(socket, {
              type: "error",
              code: "MESSAGE_TOO_LARGE",
              message: `Message exceeds maximum size of ${MAX_MESSAGE_BYTES} bytes`,
            });
            return;
          }

          let parsed: unknown;
          try {
            parsed = JSON.parse(raw.toString());
          } catch {
            send(socket, {
              type: "error",
              code: "INVALID_JSON",
              message: "Message must be valid JSON",
            });
            return;
          }

          if (!isClientMessage(parsed)) {
            send(socket, {
              type: "error",
              code: "UNKNOWN_MESSAGE_TYPE",
              message: "Unknown message type or missing required fields",
            });
            return;
          }

          const msg = parsed as ClientMessage;

          if (msg.type === "ping") {
            send(socket, { type: "pong", timestamp: new Date().toISOString() });
            connections.markAlive(sessionId);
            return;
          }

          if (msg.type === "subscribe") {
            const currentCount = subscriptions.getSubscriptionCountForSession(sessionId);
            const result = validateSubscription(msg.channel, principal, currentCount);

            if (!result.valid) {
              send(socket, {
                type: "error",
                code: "SUBSCRIPTION_DENIED",
                message: result.reason ?? "Subscription denied",
              });
              return;
            }

            subscriptions.subscribe(sessionId, msg.channel);
            send(socket, { type: "subscribed", channel: msg.channel });

            app.log.info(
              { sessionId, channel: msg.channel, userId: principal.userId },
              "WebSocket subscription added",
            );
            return;
          }

          if (msg.type === "unsubscribe") {
            subscriptions.unsubscribe(sessionId, msg.channel);
            send(socket, { type: "unsubscribed", channel: msg.channel });
            return;
          }
        } catch (err) {
          app.log.warn({ err, sessionId }, "Error processing WebSocket message");
          send(socket, {
            type: "error",
            code: "INTERNAL_ERROR",
            message: "Message processing failed",
          });
        }
      });

      socket.on("close", cleanup);

      socket.on("error", (err: Error) => {
        app.log.warn({ err, sessionId }, "WebSocket socket error");
        cleanup();
      });
    },
  );
}
