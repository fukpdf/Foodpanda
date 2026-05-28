import type { FastifyInstance } from "fastify";
import type { PaymentService } from "../services/payment.service.js";
import type { RefundService } from "../services/refund.service.js";
import type { WebhookHandler } from "../handlers/webhook.handler.js";
import { registerHealthRoutes } from "./health.js";
import { registerPaymentRoutes } from "./payments.js";
import { registerWebhookRoutes } from "./webhooks.js";
import { registerInternalRoutes } from "./internal.js";

export async function registerRoutes(
  app: FastifyInstance,
  services: {
    paymentService: PaymentService;
    refundService: RefundService;
    webhookHandler: WebhookHandler;
    internalKey: string | undefined;
  },
): Promise<void> {
  await registerHealthRoutes(app);
  await registerPaymentRoutes(app, services.paymentService, services.refundService);
  await registerWebhookRoutes(app, services.webhookHandler);
  await registerInternalRoutes(
    app,
    {
      paymentService: services.paymentService,
      refundService: services.refundService,
    },
    services.internalKey,
  );
}
