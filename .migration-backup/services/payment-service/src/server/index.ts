import Fastify from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { createDatabase } from "@deliveryos/database";
import { env } from "../config/env.js";
import { registerErrorHandler } from "../middleware/error-handler.js";
import { registerRoutes } from "../routes/index.js";
import { paymentEventBus } from "../events/event-bus.js";
import { createStripeClient } from "../providers/stripe/stripe.client.js";
import { StripeProvider } from "../providers/stripe/stripe.provider.js";
import { StripeWebhookVerifier } from "../providers/stripe/webhook.verifier.js";
import { PaymentService } from "../services/payment.service.js";
import { RefundService } from "../services/refund.service.js";
import { ReconciliationService } from "../services/reconciliation.service.js";
import { WebhookHandler } from "../handlers/webhook.handler.js";
import { WebhookEventRepository } from "../repositories/webhook-event.repository.js";
import {
  OrderConfirmationHandler,
  type OrderConfirmationConfig,
} from "../handlers/order-confirmation.handler.js";
import {
  PaymentRealtimeHandler,
  type RealtimeConfig,
} from "../handlers/realtime.handler.js";

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.isDev
        ? {
            transport: {
              target: "pino-pretty",
              options: { colorize: true, translateTime: "SYS:standard" },
            },
          }
        : {}),
    },
    requestIdHeader: "x-request-id",
    trustProxy: true,
    disableRequestLogging: false,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });

  await app.register(cors, {
    origin: env.isDev ? true : env.allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-ID",
      "Stripe-Signature",
    ],
    exposedHeaders: ["X-Request-ID"],
  });

  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    keyGenerator: (request) =>
      (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
      request.ip,
    errorResponseBuilder: (_request, context) => ({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: `Too many requests. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
        timestamp: new Date().toISOString(),
      },
    }),
  });

  registerErrorHandler(app);

  const db = createDatabase(env.DATABASE_URL);
  const stripeClient = createStripeClient(env);
  const stripeProvider = new StripeProvider(stripeClient);
  const webhookVerifier = new StripeWebhookVerifier(
    stripeClient,
    env.STRIPE_WEBHOOK_SECRET,
  );

  const paymentConfig = {
    maxPaymentAttempts: env.MAX_PAYMENT_ATTEMPTS,
    paymentIntentExpiryHours: env.PAYMENT_INTENT_EXPIRY_HOURS,
    idempotencyKeyTtlHours: env.IDEMPOTENCY_KEY_TTL_HOURS,
  };

  const paymentService = new PaymentService(db, stripeProvider, paymentConfig);

  const refundService = new RefundService(db, stripeProvider, {
    idempotencyKeyTtlHours: env.IDEMPOTENCY_KEY_TTL_HOURS,
  });

  const webhookEventRepo = new WebhookEventRepository(db);

  const webhookHandler = new WebhookHandler(
    webhookVerifier,
    webhookEventRepo,
    paymentService,
    refundService,
    app.log,
  );

  if (env.ORDER_SERVICE_URL && env.ORDER_INTERNAL_KEY) {
    const orderConfirmationConfig: OrderConfirmationConfig = {
      orderServiceUrl: env.ORDER_SERVICE_URL,
      orderInternalKey: env.ORDER_INTERNAL_KEY,
    };
    const orderConfirmationHandler = new OrderConfirmationHandler(
      orderConfirmationConfig,
      app.log,
    );
    orderConfirmationHandler.register(paymentEventBus);
  } else {
    app.log.warn(
      "[payment-service] ORDER_SERVICE_URL or ORDER_INTERNAL_KEY not set — order confirmation disabled",
    );
  }

  if (env.REALTIME_SERVICE_URL && env.REALTIME_INTERNAL_KEY) {
    const realtimeConfig: RealtimeConfig = {
      realtimeServiceUrl: env.REALTIME_SERVICE_URL,
      realtimeInternalKey: env.REALTIME_INTERNAL_KEY,
    };
    const realtimeHandler = new PaymentRealtimeHandler(realtimeConfig, app.log);
    realtimeHandler.register(paymentEventBus);
  } else {
    app.log.warn(
      "[payment-service] REALTIME_SERVICE_URL or REALTIME_INTERNAL_KEY not set — realtime disabled",
    );
  }

  const reconciliationService = new ReconciliationService(
    db,
    stripeProvider,
    paymentService,
    {
      intervalMs: env.RECONCILIATION_INTERVAL_MS,
      staleThresholdMinutes: env.RECONCILIATION_STALE_THRESHOLD_MINUTES,
      paymentIntentExpiryHours: env.PAYMENT_INTENT_EXPIRY_HOURS,
    },
    app.log,
  );

  await registerRoutes(app, {
    paymentService,
    refundService,
    webhookHandler,
    internalKey: env.PAYMENT_INTERNAL_KEY,
  });

  app.addHook("onReady", async () => {
    reconciliationService.start();
  });

  app.addHook("onClose", async () => {
    reconciliationService.stop();
    paymentEventBus.removeAllListeners();
  });

  return app;
}
