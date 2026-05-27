import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Database } from "@deliveryos/database";
import { ordersFoundation, payments, paymentAttempts } from "@deliveryos/database";
import type { PaymentProvider } from "../providers/provider.interface.js";
import { PaymentRepository } from "../repositories/payment.repository.js";
import { PaymentAttemptRepository } from "../repositories/payment-attempt.repository.js";
import { IdempotencyRepository } from "../repositories/idempotency.repository.js";
import { PaymentStateMachineEngine } from "../state-machine/engine.js";
import { paymentEventBus } from "../events/event-bus.js";
import type {
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
  PaymentRecord,
  PaymentStatus,
  PaymentStatusResponse,
} from "../types/payment.types.js";
import { ACTIVE_STATUSES, stripeStatusToPaymentStatus } from "../types/payment.types.js";
import type {
  PaymentFailedEvent,
  PaymentInitiatedEvent,
  PaymentProcessingEvent,
  PaymentSucceededEvent,
  PaymentCancelledEvent,
  PaymentRequiresActionEvent,
  PaymentExpiredEvent,
} from "../types/event.types.js";

export class PaymentNotFoundError extends Error {
  constructor(public readonly paymentId: string) {
    super(`Payment [${paymentId}] not found`);
    this.name = "PaymentNotFoundError";
  }
}

export class OrderNotFoundError extends Error {
  constructor(public readonly orderId: string) {
    super(`Order [${orderId}] not found or not in PAYMENT_PENDING state`);
    this.name = "OrderNotFoundError";
  }
}

export class ActivePaymentExistsError extends Error {
  constructor(
    public readonly orderId: string,
    public readonly paymentId: string,
  ) {
    super(
      `Order [${orderId}] already has an active payment [${paymentId}]`,
    );
    this.name = "ActivePaymentExistsError";
  }
}

export class MaxAttemptsReachedError extends Error {
  constructor(
    public readonly orderId: string,
    public readonly attempts: number,
  ) {
    super(
      `Order [${orderId}] has reached the maximum of ${attempts} payment attempts`,
    );
    this.name = "MaxAttemptsReachedError";
  }
}

export class PaymentOwnershipError extends Error {
  constructor() {
    super("You do not have permission to access this payment");
    this.name = "PaymentOwnershipError";
  }
}

export class PaymentService {
  private readonly paymentRepo: PaymentRepository;
  private readonly attemptRepo: PaymentAttemptRepository;
  private readonly idempotencyRepo: IdempotencyRepository;
  private readonly engine: PaymentStateMachineEngine;

  constructor(
    private readonly db: Database,
    private readonly provider: PaymentProvider,
    private readonly config: {
      maxPaymentAttempts: number;
      paymentIntentExpiryHours: number;
      idempotencyKeyTtlHours: number;
    },
  ) {
    this.paymentRepo = new PaymentRepository(db);
    this.attemptRepo = new PaymentAttemptRepository(db);
    this.idempotencyRepo = new IdempotencyRepository(db);
    this.engine = new PaymentStateMachineEngine(db);
  }

  async createIntent(
    request: CreatePaymentIntentRequest,
    customerId: string,
  ): Promise<CreatePaymentIntentResponse> {
    const { orderId, currency = "USD", description } = request;

    const order = await this.db
      .select()
      .from(ordersFoundation)
      .where(eq(ordersFoundation.id, orderId))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!order || order.status !== "pending") {
      throw new OrderNotFoundError(orderId);
    }

    if (order.customerId !== customerId) {
      throw new PaymentOwnershipError();
    }

    const existing = await this.paymentRepo.findActiveForOrder(orderId);
    if (existing) {
      const stripeResult = await this.provider.retrievePaymentIntent(
        existing.providerPaymentId!,
      );
      const expiresAt = existing.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000);
      return {
        paymentId: existing.id,
        clientSecret: stripeResult.providerPaymentId + "_secret_placeholder",
        providerPaymentId: existing.providerPaymentId!,
        amountCents: existing.amountCents,
        currency: existing.currency,
        status: existing.status as PaymentStatus,
        expiresAt: expiresAt.toISOString(),
      };
    }

    const allPayments = await this.paymentRepo.findAllForOrder(orderId);
    const failedAttempts = allPayments.filter(
      (p) =>
        p.status === "failed" ||
        p.status === "cancelled" ||
        p.status === "expired",
    );

    if (failedAttempts.length >= this.config.maxPaymentAttempts) {
      throw new MaxAttemptsReachedError(orderId, this.config.maxPaymentAttempts);
    }

    const attemptNumber = failedAttempts.length + 1;
    const paymentId = randomUUID();
    const idempotencyKey = `pi-create-${paymentId}`;
    const expiresAt = new Date(
      Date.now() + this.config.paymentIntentExpiryHours * 60 * 60 * 1000,
    );
    const idempotencyExpiresAt = new Date(
      Date.now() + this.config.idempotencyKeyTtlHours * 60 * 60 * 1000,
    );

    const existingIdempotency = await this.idempotencyRepo.findByKey(idempotencyKey);
    if (
      existingIdempotency?.responseBody &&
      existingIdempotency.responseStatus === 201
    ) {
      return existingIdempotency.responseBody as unknown as CreatePaymentIntentResponse;
    }

    const amountCents = order.totalCents;

    const payment = await this.paymentRepo.create({
      id: paymentId,
      orderId,
      customerId,
      provider: "stripe",
      providerPaymentId: null,
      status: "pending_provider",
      amountCents,
      currency: currency.toUpperCase(),
      idempotencyKey,
      attemptNumber,
      description: description ?? `Order ${order.orderNumber ?? orderId}`,
      expiresAt,
      metadata: { attemptNumber },
    });

    const attemptId = randomUUID();
    const attemptIdempotencyKey = `attempt-${paymentId}-${attemptNumber}`;

    await this.attemptRepo.create({
      id: attemptId,
      paymentId,
      orderId,
      attemptNumber,
      provider: "stripe",
      status: "initiated",
      amountCents,
      currency: currency.toUpperCase(),
      idempotencyKey: attemptIdempotencyKey,
      requestedAt: new Date(),
    });

    await this.idempotencyRepo.upsert({
      id: randomUUID(),
      key: idempotencyKey,
      resourceType: "payment_intent",
      resourceId: paymentId,
      expiresAt: idempotencyExpiresAt,
    });

    paymentEventBus.emit({
      eventId: randomUUID(),
      eventType: "payment.initiated",
      paymentId,
      orderId,
      customerId,
      occurredAt: new Date().toISOString(),
      version: 1,
      source: "payment-service",
      payload: {
        amountCents,
        currency: currency.toUpperCase(),
        provider: "stripe",
        attemptNumber,
        expiresAt: expiresAt.toISOString(),
      },
    } satisfies PaymentInitiatedEvent);

    let clientSecret: string;
    let providerPaymentId: string;

    try {
      const result = await this.provider.createPaymentIntent({
        paymentId,
        orderId,
        customerId,
        amountCents,
        currency: currency.toUpperCase(),
        description: payment.description ?? `Order payment`,
        idempotencyKey,
        metadata: {
          paymentId,
          orderId,
          customerId,
          attemptNumber: String(attemptNumber),
        },
      });

      clientSecret = result.clientSecret;
      providerPaymentId = result.providerPaymentId;

      await this.paymentRepo.updateStatus(paymentId, "processing", {
        providerPaymentId,
      });

      await this.attemptRepo.markResponded(
        attemptId,
        "succeeded",
        new Date(),
        { providerAttemptId: providerPaymentId },
      );

      const result2 = await this.engine.transition(
        paymentId,
        "pending_provider",
        "processing",
        {
          orderId,
          actorType: "system",
          providerPaymentId,
          metadata: { providerPaymentId },
        },
      );

      if (!result2.success) {
        await this.paymentRepo.updateStatus(paymentId, "processing", {
          providerPaymentId,
        });
      }

      paymentEventBus.emit({
        eventId: randomUUID(),
        eventType: "payment.processing",
        paymentId,
        orderId,
        customerId,
        occurredAt: new Date().toISOString(),
        version: 1,
        source: "payment-service",
        payload: {
          providerPaymentId,
          amountCents,
          currency: currency.toUpperCase(),
          provider: "stripe",
        },
      } satisfies PaymentProcessingEvent);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown Stripe error";

      await this.paymentRepo.updateStatus(paymentId, "failed", {
        failureCode: "provider_error",
        failureMessage: errorMessage,
        failedAt: new Date(),
      });

      await this.attemptRepo.markResponded(attemptId, "failed", new Date(), {
        errorCode: "provider_error",
        errorMessage,
      });

      paymentEventBus.emit({
        eventId: randomUUID(),
        eventType: "payment.failed",
        paymentId,
        orderId,
        customerId,
        occurredAt: new Date().toISOString(),
        version: 1,
        source: "payment-service",
        payload: {
          providerPaymentId: null,
          failureCode: "provider_error",
          failureMessage: errorMessage,
          attemptNumber,
          canRetry: failedAttempts.length + 1 < this.config.maxPaymentAttempts,
          maxAttempts: this.config.maxPaymentAttempts,
        },
      } satisfies PaymentFailedEvent);

      throw err;
    }

    const response: CreatePaymentIntentResponse = {
      paymentId,
      clientSecret,
      providerPaymentId,
      amountCents,
      currency: currency.toUpperCase(),
      status: "processing",
      expiresAt: expiresAt.toISOString(),
    };

    await this.idempotencyRepo.setResponse(idempotencyKey, 201, response as unknown as Record<string, unknown>);

    return response;
  }

  async getPaymentStatus(
    paymentId: string,
    requestingUserId: string,
    requestingRole: string,
  ): Promise<PaymentStatusResponse> {
    const payment = await this.paymentRepo.findById(paymentId);
    if (!payment) throw new PaymentNotFoundError(paymentId);

    const isAdmin = requestingRole === "admin" || requestingRole === "superadmin";
    if (!isAdmin && payment.customerId !== requestingUserId) {
      throw new PaymentOwnershipError();
    }

    return this.toStatusResponse(payment as unknown as PaymentRecord);
  }

  async getPaymentForOrder(
    orderId: string,
    requestingUserId: string,
    requestingRole: string,
  ): Promise<PaymentStatusResponse | null> {
    const isAdmin = requestingRole === "admin" || requestingRole === "superadmin";

    const allPayments = await this.paymentRepo.findAllForOrder(orderId);
    if (allPayments.length === 0) return null;

    const latest = allPayments[0]!;

    if (!isAdmin && latest.customerId !== requestingUserId) {
      throw new PaymentOwnershipError();
    }

    return this.toStatusResponse(latest as unknown as PaymentRecord);
  }

  async cancelPayment(
    orderId: string,
    requestingUserId: string,
    requestingRole: string,
    reason?: string,
  ): Promise<void> {
    const payment = await this.paymentRepo.findActiveForOrder(orderId);
    if (!payment) throw new OrderNotFoundError(orderId);

    const isAdmin = requestingRole === "admin" || requestingRole === "superadmin";
    if (!isAdmin && payment.customerId !== requestingUserId) {
      throw new PaymentOwnershipError();
    }

    if (payment.providerPaymentId) {
      await this.provider.cancelPaymentIntent({
        providerPaymentId: payment.providerPaymentId,
        idempotencyKey: `cancel-${payment.id}`,
      });
    }

    const result = await this.engine.transition(
      payment.id,
      payment.status as PaymentStatus,
      "cancelled",
      {
        orderId,
        actorId: requestingUserId,
        actorType: isAdmin ? "admin" : "customer",
        cancelledAt: new Date(),
        metadata: { reason: reason ?? null },
      },
    );

    if (result.success) {
      paymentEventBus.emit({
        eventId: randomUUID(),
        eventType: "payment.cancelled",
        paymentId: payment.id,
        orderId,
        customerId: payment.customerId,
        occurredAt: new Date().toISOString(),
        version: 1,
        source: "payment-service",
        payload: {
          providerPaymentId: payment.providerPaymentId ?? null,
          reason: reason ?? null,
        },
      } satisfies PaymentCancelledEvent);
    }
  }

  async handleWebhookSucceeded(
    providerPaymentId: string,
    webhookEventId: string,
  ): Promise<void> {
    const payment = await this.paymentRepo.findByProviderPaymentId(providerPaymentId);
    if (!payment) {
      throw new PaymentNotFoundError(providerPaymentId);
    }

    const currentStatus = payment.status as PaymentStatus;
    if (currentStatus === "succeeded") return;

    const result = await this.engine.transition(
      payment.id,
      currentStatus,
      "succeeded",
      {
        orderId: payment.orderId,
        actorType: "webhook",
        confirmedAt: new Date(),
        metadata: { webhookEventId },
      },
    );

    if (result.success) {
      paymentEventBus.emit({
        eventId: randomUUID(),
        eventType: "payment.succeeded",
        paymentId: payment.id,
        orderId: payment.orderId,
        customerId: payment.customerId,
        occurredAt: new Date().toISOString(),
        version: 1,
        source: "payment-service",
        payload: {
          providerPaymentId,
          amountCents: payment.amountCents,
          currency: payment.currency,
          provider: payment.provider,
        },
      } satisfies PaymentSucceededEvent);
    }
  }

  async handleWebhookFailed(
    providerPaymentId: string,
    failureCode: string | null,
    failureMessage: string | null,
    webhookEventId: string,
  ): Promise<void> {
    const payment = await this.paymentRepo.findByProviderPaymentId(providerPaymentId);
    if (!payment) {
      throw new PaymentNotFoundError(providerPaymentId);
    }

    const currentStatus = payment.status as PaymentStatus;
    if (currentStatus === "failed") return;

    const allForOrder = await this.paymentRepo.findAllForOrder(payment.orderId);
    const failedCount = allForOrder.filter(
      (p) => p.status === "failed" || p.status === "cancelled" || p.status === "expired",
    ).length;
    const canRetry = failedCount + 1 < this.config.maxPaymentAttempts;

    const result = await this.engine.transition(
      payment.id,
      currentStatus,
      "failed",
      {
        orderId: payment.orderId,
        actorType: "webhook",
        failureCode,
        failureMessage,
        failedAt: new Date(),
        metadata: { webhookEventId },
      },
    );

    if (result.success) {
      paymentEventBus.emit({
        eventId: randomUUID(),
        eventType: "payment.failed",
        paymentId: payment.id,
        orderId: payment.orderId,
        customerId: payment.customerId,
        occurredAt: new Date().toISOString(),
        version: 1,
        source: "payment-service",
        payload: {
          providerPaymentId,
          failureCode,
          failureMessage,
          attemptNumber: payment.attemptNumber,
          canRetry,
          maxAttempts: this.config.maxPaymentAttempts,
        },
      } satisfies PaymentFailedEvent);
    }
  }

  async handleWebhookRequiresAction(
    providerPaymentId: string,
    nextActionType: string | null,
    webhookEventId: string,
  ): Promise<void> {
    const payment = await this.paymentRepo.findByProviderPaymentId(providerPaymentId);
    if (!payment) return;

    const currentStatus = payment.status as PaymentStatus;
    if (currentStatus === "requires_action") return;

    const result = await this.engine.transition(
      payment.id,
      currentStatus,
      "requires_action",
      {
        orderId: payment.orderId,
        actorType: "webhook",
        requiresAction: true,
        nextActionType,
        metadata: { webhookEventId },
      },
    );

    if (result.success) {
      paymentEventBus.emit({
        eventId: randomUUID(),
        eventType: "payment.requires_action",
        paymentId: payment.id,
        orderId: payment.orderId,
        customerId: payment.customerId,
        occurredAt: new Date().toISOString(),
        version: 1,
        source: "payment-service",
        payload: {
          providerPaymentId,
          nextActionType: nextActionType ?? "use_stripe_sdk",
        },
      } satisfies PaymentRequiresActionEvent);
    }
  }

  async handleWebhookCancelled(
    providerPaymentId: string,
    webhookEventId: string,
  ): Promise<void> {
    const payment = await this.paymentRepo.findByProviderPaymentId(providerPaymentId);
    if (!payment) return;

    const currentStatus = payment.status as PaymentStatus;
    if (currentStatus === "cancelled") return;

    const result = await this.engine.transition(
      payment.id,
      currentStatus,
      "cancelled",
      {
        orderId: payment.orderId,
        actorType: "webhook",
        cancelledAt: new Date(),
        metadata: { webhookEventId, source: "stripe_webhook" },
      },
    );

    if (result.success) {
      paymentEventBus.emit({
        eventId: randomUUID(),
        eventType: "payment.cancelled",
        paymentId: payment.id,
        orderId: payment.orderId,
        customerId: payment.customerId,
        occurredAt: new Date().toISOString(),
        version: 1,
        source: "payment-service",
        payload: {
          providerPaymentId,
          reason: "stripe_cancelled",
        },
      } satisfies PaymentCancelledEvent);
    }
  }

  async handleWebhookDisputed(
    providerPaymentId: string,
    disputeReason: string | null,
    webhookEventId: string,
  ): Promise<void> {
    const payment = await this.paymentRepo.findByProviderPaymentId(providerPaymentId);
    if (!payment) return;

    const currentStatus = payment.status as PaymentStatus;
    if (currentStatus === "disputed") return;

    await this.engine.transition(payment.id, currentStatus, "disputed", {
      orderId: payment.orderId,
      actorType: "webhook",
      metadata: { webhookEventId, disputeReason },
    });

    paymentEventBus.emit({
      eventId: randomUUID(),
      eventType: "payment.disputed",
      paymentId: payment.id,
      orderId: payment.orderId,
      customerId: payment.customerId,
      occurredAt: new Date().toISOString(),
      version: 1,
      source: "payment-service",
      payload: {
        providerPaymentId,
        disputeReason,
      },
    });
  }

  async applyReconciliationTransition(
    paymentId: string,
    stripeStatus: string,
    stripeFailureCode: string | null,
    stripeFailureMessage: string | null,
  ): Promise<void> {
    const payment = await this.paymentRepo.findById(paymentId);
    if (!payment) return;

    const currentStatus = payment.status as PaymentStatus;
    const targetStatus = stripeStatusToPaymentStatus(stripeStatus);

    if (currentStatus === targetStatus) return;

    const isAllowed =
      targetStatus === "succeeded" ||
      targetStatus === "failed" ||
      targetStatus === "cancelled" ||
      targetStatus === "requires_action";

    if (!isAllowed) return;

    await this.engine.transition(payment.id, currentStatus, targetStatus, {
      orderId: payment.orderId,
      actorType: "reconciliation",
      failureCode: stripeFailureCode,
      failureMessage: stripeFailureMessage,
      failedAt: targetStatus === "failed" ? new Date() : undefined,
      cancelledAt: targetStatus === "cancelled" ? new Date() : undefined,
      confirmedAt: targetStatus === "succeeded" ? new Date() : undefined,
      metadata: { source: "reconciliation" },
    });

    if (targetStatus === "succeeded") {
      paymentEventBus.emit({
        eventId: randomUUID(),
        eventType: "payment.succeeded",
        paymentId: payment.id,
        orderId: payment.orderId,
        customerId: payment.customerId,
        occurredAt: new Date().toISOString(),
        version: 1,
        source: "payment-service",
        payload: {
          providerPaymentId: payment.providerPaymentId ?? "",
          amountCents: payment.amountCents,
          currency: payment.currency,
          provider: payment.provider,
        },
      } satisfies PaymentSucceededEvent);
    } else if (targetStatus === "failed") {
      paymentEventBus.emit({
        eventId: randomUUID(),
        eventType: "payment.failed",
        paymentId: payment.id,
        orderId: payment.orderId,
        customerId: payment.customerId,
        occurredAt: new Date().toISOString(),
        version: 1,
        source: "payment-service",
        payload: {
          providerPaymentId: payment.providerPaymentId ?? null,
          failureCode: stripeFailureCode,
          failureMessage: stripeFailureMessage,
          attemptNumber: payment.attemptNumber,
          canRetry: false,
          maxAttempts: this.config.maxPaymentAttempts,
        },
      } satisfies PaymentFailedEvent);
    }
  }

  async expirePayment(paymentId: string): Promise<void> {
    const payment = await this.paymentRepo.findById(paymentId);
    if (!payment) return;

    const currentStatus = payment.status as PaymentStatus;
    if (currentStatus === "expired") return;

    const result = await this.engine.transition(
      payment.id,
      currentStatus,
      "expired",
      {
        orderId: payment.orderId,
        actorType: "reconciliation",
        expiredAt: new Date(),
        metadata: { source: "reconciliation_ttl" },
      },
    );

    if (result.success) {
      paymentEventBus.emit({
        eventId: randomUUID(),
        eventType: "payment.expired",
        paymentId: payment.id,
        orderId: payment.orderId,
        customerId: payment.customerId,
        occurredAt: new Date().toISOString(),
        version: 1,
        source: "payment-service",
        payload: {
          providerPaymentId: payment.providerPaymentId ?? null,
          attemptNumber: payment.attemptNumber,
        },
      } satisfies PaymentExpiredEvent);
    }
  }

  private toStatusResponse(payment: PaymentRecord): PaymentStatusResponse {
    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      status: payment.status,
      amountCents: payment.amountCents,
      currency: payment.currency,
      provider: payment.provider,
      attemptNumber: payment.attemptNumber,
      failureCode: payment.failureCode,
      failureMessage: payment.failureMessage,
      requiresAction: payment.requiresAction,
      nextActionType: payment.nextActionType,
      expiresAt: payment.expiresAt?.toISOString() ?? null,
      confirmedAt: payment.confirmedAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };
  }
}
