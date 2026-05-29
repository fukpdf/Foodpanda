import type { FastifyInstance } from "fastify";
import type { OrderController } from "../controllers/order.controller.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";

export async function registerOrderRoutes(
  app: FastifyInstance,
  controller: OrderController,
): Promise<void> {
  // Customer: create an order
  app.post(
    "/orders",
    { preHandler: [authenticate, requireRole("customer")] },
    (req, reply) => controller.createOrder(req, reply),
  );

  // Customer: list own orders
  app.get(
    "/orders/me",
    { preHandler: [authenticate, requireRole("customer")] },
    (req, reply) => controller.getMyOrders(req, reply),
  );

  // Rider: list own assigned orders
  app.get(
    "/orders/rider/me",
    { preHandler: [authenticate, requireRole("rider")] },
    (req, reply) => controller.getRiderOrders(req, reply),
  );

  // Vendor: list orders for a specific branch
  app.get(
    "/orders/vendor/branch/:branchId",
    {
      preHandler: [
        authenticate,
        requireRole("vendor", "admin", "superadmin"),
      ],
    },
    (req, reply) => controller.getVendorBranchOrders(req, reply),
  );

  // Any authenticated: get a single order by ID
  app.get(
    "/orders/:id",
    { preHandler: [authenticate] },
    (req, reply) => controller.getOrder(req, reply),
  );

  // State transition (vendor, rider, admin)
  app.patch(
    "/orders/:id/state",
    {
      preHandler: [
        authenticate,
        requireRole("vendor", "rider", "admin", "superadmin"),
      ],
    },
    (req, reply) => controller.transitionOrder(req, reply),
  );

  // Cancel (customer, vendor, admin)
  app.post(
    "/orders/:id/cancel",
    {
      preHandler: [
        authenticate,
        requireRole("customer", "vendor", "admin", "superadmin"),
      ],
    },
    (req, reply) => controller.cancelOrder(req, reply),
  );

  // State history
  app.get(
    "/orders/:id/history",
    { preHandler: [authenticate] },
    (req, reply) => controller.getOrderHistory(req, reply),
  );
}
