import type { FastifyInstance } from "fastify";
import type { ConnectionManager } from "../websocket/connection-manager.js";
import type { SseManager } from "../sse/sse-manager.js";
import type { SubscriptionManager } from "../subscriptions/subscription-manager.js";
import type { EventHandler } from "../handlers/event.handler.js";
import type { MetricsService } from "../services/metrics.service.js";
import { registerHealthRoutes } from "./health.js";
import { registerEventsRoute } from "./events.js";
import { registerWebSocketRoute } from "./websocket.js";
import { registerSseRoute } from "./sse.js";

export interface RoutesDeps {
  connections: ConnectionManager;
  sse: SseManager;
  subscriptions: SubscriptionManager;
  eventHandler: EventHandler;
  metrics: MetricsService;
}

export async function registerRoutes(
  app: FastifyInstance,
  deps: RoutesDeps,
): Promise<void> {
  await registerHealthRoutes(app, deps.metrics);
  await registerEventsRoute(app, deps.eventHandler);
  await registerWebSocketRoute(app, deps.connections, deps.subscriptions);
  await registerSseRoute(app, deps.sse, deps.subscriptions);
}
