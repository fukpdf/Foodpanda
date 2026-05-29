import type { FastifyInstance } from "fastify";
import { registerHealthRoutes } from "./health.js";
import { registerDispatchRoutes } from "./dispatch.routes.js";
import type { DispatchService } from "../services/dispatch.service.js";

export async function registerRoutes(
  app: FastifyInstance,
  dispatchService: DispatchService,
  orderServiceInternalKey: string | undefined,
): Promise<void> {
  await registerHealthRoutes(app);
  await registerDispatchRoutes(app, dispatchService, orderServiceInternalKey);
}
