import type { PaymentProvider } from "../providers/provider.interface.js";
import { PaymentRepository } from "../repositories/payment.repository.js";
import { IdempotencyRepository } from "../repositories/idempotency.repository.js";
import { WebhookEventRepository } from "../repositories/webhook-event.repository.js";
import type { PaymentService } from "./payment.service.js";
import type { Database } from "@deliveryos/database";
import type { FastifyBaseLogger } from "fastify";
import type { PaymentStatus } from "../types/payment.types.js";
import { ACTIVE_STATUSES } from "../types/payment.types.js";

export class ReconciliationService {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private readonly paymentRepo: PaymentRepository;
  private readonly idempotencyRepo: IdempotencyRepository;
  private readonly webhookRepo: WebhookEventRepository;

  constructor(
    private readonly db: Database,
    private readonly provider: PaymentProvider,
    private readonly paymentService: PaymentService,
    private readonly config: {
      intervalMs: number;
      staleThresholdMinutes: number;
      paymentIntentExpiryHours: number;
    },
    private readonly logger: FastifyBaseLogger,
  ) {
    this.paymentRepo = new PaymentRepository(db);
    this.idempotencyRepo = new IdempotencyRepository(db);
    this.webhookRepo = new WebhookEventRepository(db);
  }

  start(): void {
    if (this.intervalHandle) return;

    this.logger.info(
      { intervalMs: this.config.intervalMs },
      "[reconciliation] Starting reconciliation service",
    );

    this.intervalHandle = setInterval(() => {
      this.runCycle().catch((err) => {
        this.logger.error(
          { err },
          "[reconciliation] Unhandled error in reconciliation cycle",
        );
      });
    }, this.config.intervalMs);
  }

  stop(): void {
    if (!this.intervalHandle) return;
    clearInterval(this.intervalHandle);
    this.intervalHandle = null;
    this.logger.info("[reconciliation] Stopped reconciliation service");
  }

  async runCycle(): Promise<void> {
    if (this.isRunning) {
      this.logger.debug(
        "[reconciliation] Previous cycle still running — skipping",
      );
      return;
    }

    this.isRunning = true;
    const cycleStart = Date.now();

    try {
      await this.reconcileStalePayments();
      await this.expireTimedOutPayments();
      await this.cleanupIdempotencyKeys();
    } finally {
      this.isRunning = false;
      this.logger.debug(
        { durationMs: Date.now() - cycleStart },
        "[reconciliation] Cycle complete",
      );
    }
  }

  private async reconcileStalePayments(): Promise<void> {
    const staleStatuses: PaymentStatus[] = ["processing", "requires_action"];

    const stalePayments = await this.paymentRepo.findStaleProcessing(
      this.config.staleThresholdMinutes,
      staleStatuses,
    );

    if (stalePayments.length === 0) return;

    this.logger.info(
      { count: stalePayments.length },
      "[reconciliation] Found stale payments to reconcile",
    );

    for (const payment of stalePayments) {
      try {
        if (!payment.providerPaymentId) continue;

        const stripePayment = await this.provider.retrievePaymentIntent(
          payment.providerPaymentId,
        );

        await this.paymentService.applyReconciliationTransition(
          payment.id,
          stripePayment.status,
          stripePayment.failureCode,
          stripePayment.failureMessage,
        );

        this.logger.info(
          {
            paymentId: payment.id,
            orderId: payment.orderId,
            currentStatus: payment.status,
            stripeStatus: stripePayment.status,
          },
          "[reconciliation] Applied reconciliation transition",
        );
      } catch (err) {
        this.logger.error(
          { err, paymentId: payment.id },
          "[reconciliation] Failed to reconcile payment",
        );
      }
    }
  }

  private async expireTimedOutPayments(): Promise<void> {
    const expiryThresholdMinutes = this.config.paymentIntentExpiryHours * 60;

    const pendingPayments = await this.paymentRepo.findPendingProviderOlderThan(
      expiryThresholdMinutes,
    );

    for (const payment of pendingPayments) {
      try {
        await this.paymentService.expirePayment(payment.id);
        this.logger.info(
          { paymentId: payment.id, orderId: payment.orderId },
          "[reconciliation] Expired timed-out pending payment",
        );
      } catch (err) {
        this.logger.error(
          { err, paymentId: payment.id },
          "[reconciliation] Failed to expire payment",
        );
      }
    }

    const staleActivePayments = await this.paymentRepo.findStaleProcessing(
      expiryThresholdMinutes,
      Array.from(ACTIVE_STATUSES) as PaymentStatus[],
    );

    for (const payment of staleActivePayments) {
      if (payment.expiresAt && payment.expiresAt < new Date()) {
        try {
          await this.paymentService.expirePayment(payment.id);
          this.logger.info(
            { paymentId: payment.id },
            "[reconciliation] Expired payment past expiresAt",
          );
        } catch (err) {
          this.logger.error(
            { err, paymentId: payment.id },
            "[reconciliation] Failed to expire active payment",
          );
        }
      }
    }
  }

  private async cleanupIdempotencyKeys(): Promise<void> {
    try {
      const deleted = await this.idempotencyRepo.deleteExpired();
      if (deleted > 0) {
        this.logger.info(
          { deleted },
          "[reconciliation] Cleaned up expired idempotency keys",
        );
      }
    } catch (err) {
      this.logger.error(
        { err },
        "[reconciliation] Failed to clean up idempotency keys",
      );
    }
  }
}
