import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import type { SseManager } from "../sse/sse-manager.js";
import type { SubscriptionManager } from "../subscriptions/subscription-manager.js";
import { createSseSession } from "../sse/sse-session.js";
import { verifyToken, TokenVerificationError } from "../auth/jwt-verifier.js";
import { validateSubscription } from "../subscriptions/channel-rules.js";
import { env } from "../config/env.js";

export async function registerSseRoute(
  app: FastifyInstance,
  sse: SseManager,
  subscriptions: SubscriptionManager,
): Promise<void> {
  app.get("/sse", async (request, reply) => {
    const ip =
      (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
      request.ip ??
      "unknown";

    const query = request.query as Record<string, string>;
    const token = query["token"];
    const channel = query["channel"];

    if (!token) {
      return reply.status(401).send({
        success: false,
        error: { code: "MISSING_TOKEN", message: "Token query parameter is required" },
      });
    }

    if (!channel) {
      return reply.status(400).send({
        success: false,
        error: { code: "MISSING_CHANNEL", message: "Channel query parameter is required" },
      });
    }

    let principal;
    try {
      principal = await verifyToken(token);
    } catch (err) {
      const message = err instanceof TokenVerificationError ? err.message : "Unauthorized";
      return reply.status(401).send({
        success: false,
        error: { code: "INVALID_TOKEN", message },
      });
    }

    const authResult = validateSubscription(channel, principal, 0);
    if (!authResult.valid) {
      return reply.status(403).send({
        success: false,
        error: { code: "SUBSCRIPTION_DENIED", message: authResult.reason ?? "Forbidden" },
      });
    }

    const sessionId = randomUUID();

    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("X-Accel-Buffering", "no");
    reply.raw.setHeader("Access-Control-Allow-Origin", "*");
    reply.raw.flushHeaders();

    const session = createSseSession({
      id: sessionId,
      principal,
      channel,
      ip,
      userAgent: request.headers["user-agent"] ?? "unknown",
      request,
      reply,
    });

    sse.add(session);
    subscriptions.subscribe(sessionId, channel);

    session.send("connected", {
      sessionId,
      channel,
      timestamp: new Date().toISOString(),
    });

    app.log.info(
      { sessionId, channel, userId: principal.userId, role: principal.role, ip },
      "SSE client connected",
    );

    const heartbeat = setInterval(() => {
      session.sendComment("heartbeat");
    }, env.HEARTBEAT_INTERVAL_MS);

    const cleanup = () => {
      clearInterval(heartbeat);
      subscriptions.unsubscribeAll(sessionId);
      sse.remove(sessionId);
      app.log.info({ sessionId, userId: principal.userId }, "SSE client disconnected");
    };

    request.raw.on("close", cleanup);
    request.raw.on("error", cleanup);

    await new Promise<void>((resolve) => {
      request.raw.on("close", resolve);
    });
  });
}
