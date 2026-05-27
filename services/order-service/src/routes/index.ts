import type { FastifyInstance } from "fastify";
import type { OrderController } from "../controllers/order.controller.js";
import { registerHealthRoutes } from "./health.js";
import { registerOrderRoutes } from "./orders.js";

export async function registerRoutes(
  app: FastifyInstance,
  controller: OrderController,
): Promise<void> {
  await registerHealthRoutes(app);
  await registerOrderRoutes(app, controller);
}
