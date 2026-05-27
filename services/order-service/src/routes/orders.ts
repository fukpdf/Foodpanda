import type { FastifyInstance } from "fastify";
import type { OrderController } from "../controllers/order.controller.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";

export async function registerOrderRoutes(
  app: FastifyInstance,
  controller: OrderController,
): Promise<void> {
  // POST /orders — Create a new order (customer only)
  app.post(
    "/orders",
    { preHandler: [authenticate, requireRole("customer")] },
    controller.createOrder as any,
  );

  // GET /orders/user/:userId — before /orders/:id to avoid param collision
  app.get(
    "/orders/user/:userId",
    { preHandler: [authenticate] },
    controller.getOrdersByUser as any,
  );

  // GET /orders/vendor/:vendorId
  app.get(
    "/orders/vendor/:vendorId",
    {
      preHandler: [
        authenticate,
        requireRole("vendor", "admin", "superadmin"),
      ],
    },
    controller.getVendorOrders as any,
  );

  // GET /orders/rider/:riderId
  app.get(
    "/orders/rider/:riderId",
    {
      preHandler: [
        authenticate,
        requireRole("rider", "admin", "superadmin"),
      ],
    },
    controller.getRiderOrders as any,
  );

  // GET /orders/:id — after static segments
  app.get(
    "/orders/:id",
    { preHandler: [authenticate] },
    controller.getOrder as any,
  );

  // PATCH /orders/:id/state
  app.patch(
    "/orders/:id/state",
    {
      preHandler: [
        authenticate,
        requireRole("customer", "vendor", "rider", "admin", "superadmin"),
      ],
    },
    controller.transitionOrder as any,
  );

  // POST /orders/:id/cancel
  app.post(
    "/orders/:id/cancel",
    {
      preHandler: [
        authenticate,
        requireRole("customer", "vendor", "admin", "superadmin"),
      ],
    },
    controller.cancelOrder as any,
  );

  // POST /orders/:id/dispatch — admin-triggered dispatch
  app.post(
    "/orders/:id/dispatch",
    {
      preHandler: [authenticate, requireRole("admin", "superadmin")],
    },
    controller.initiateDispatch as any,
  );
}
