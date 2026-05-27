import type { FastifyInstance } from "fastify";
import type { OrderController } from "../controllers/order.controller.js";
import { registerHealthRoutes } from "./health.js";
import { registerOrderRoutes } from "./orders.js";
import { registerInternalRoutes } from "./internal.js";
import type { Database } from "@deliveryos/database";

export async function registerRoutes(
  app: FastifyInstance,
  controller: OrderController,
  db: Database,
  paymentServiceInternalKey: string | undefined,
): Promise<void> {
  await registerHealthRoutes(app);
  await registerOrderRoutes(app, controller);
  await registerInternalRoutes(app, db, paymentServiceInternalKey);
}
