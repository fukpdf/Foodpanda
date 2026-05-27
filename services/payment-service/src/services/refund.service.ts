import { randomUUID } from "node:crypto";
import type { Database } from "@deliveryos/database";
import type { PaymentProvider } from "../providers/provider.interface.js";
import { PaymentRepository } from "../repositories/payment.repository.js";
import { RefundRepository } from "../repositories/refund.repository.js";
import { PaymentStateMachineEngine } from "../state-machine/engine.js";
import { paymentEventBus } from "../events/event-bus.js";
import type {
  RefundReason,
  PaymentStatus,
  RefundResponse,
} from "../types/payment.types.js";
import { REFUND_ELIGIBLE_STATUSES } from "../types/payment.types.js";
import type {
  PaymentRefundedEvent,
  PaymentPartiallyRefundedEvent,
} from "../types/event.types.js";
import { PaymentNotFoundError, PaymentOwnershipError } from "./payment.service.js";

export class RefundNotEligibleError extends Error {
  constructor(public readonly paymentId: string, public readonly status: string) {
    super(
      `Payment [${paymentId}] with status [${status}] is not eligible for refund. ` +
        `Eligible statuses: ${Array.from(REFUND_ELIGIBLE_STATUSES).join(", ")}`,
    );
    this.name = "RefundNotEligibleError";
  }
}

export class RefundAmountExceededError extends Error {
  constructor(
    public readonly requestedCents: number,
    public readonly availableCents: number,
  ) {
    super(
      `Refund amount ${requestedCents} cents exceeds available ${availableCents} cents`,
    );
    this.name = "RefundAmountExceededError";
  }
}

export class RefundNotFoundError extends Error {
  constructor(public readonly refundId: string) {
    super(`Refund [${refundId}] not found`);
    this.name = "RefundNotFoundError";
  }
}

export class RefundService {
  private readonly paymentRepo: PaymentRepository;
  private readonly refundRepo: RefundRepository;
  private readonly engine: PaymentStateMachineEngine;

  constructor(
    private readonly db: Database,
    private readonly provider: PaymentProvider,
    private readonly config: {
      idempotencyKeyTtlHours: number;
    },
  ) {
    this.paymentRepo = new PaymentRepository(db);
    this.refundRepo = new RefundRepository(db);
    this.engine = new PaymentStateMachineEngine(db);
  }

  async createRefund(
    paymentId: string,
    options: {
      amountCents?: number;
      reason?: RefundReason;
      idempotencyKey?: string;
      initiatedById?: string;
      initiatedByRole?: string;
    },
  ): Promise<RefundResponse> {
    const payment = await this.paymentRepo.findById(paymentId);
    if (!payment) throw new PaymentNotFoundError(paymentId);

    if (!REFUND_ELIGIBLE_STATUSES.has(payment.status as PaymentStatus)) {
      throw new RefundNotEligibleError(paymentId, payment.status);
    }

    if (!payment.providerPaymentId) {
      throw new RefundNotEligibleError(paymentId, "no_provider_payment_id");
    }

    const alreadyRefundedCents = await this.refundRepo.sumRefundedCents(paymentId);
    const availableCents = payment.amountCents - alreadyRefundedCents;

    if (availableCents <= 0) {
      throw new RefundNotEligibleError(paymentId, "fully_refunded");
    }

    const refundCents = options.amountCents ?? availableCents;

    if (refundCents > availableCents) {
      throw new RefundAmountExceededError(refundCents, availableCents);
    }

    const idempotencyKey =
      options.idempotencyKey ?? `refund-${paymentId}-${Date.now()}`;

    const existingRefund = await this.refundRepo.findByIdempotencyKey(idempotencyKey);
    if (existingRefund) {
      return this.toRefundResponse(existingRefund, payment.orderId);
    }

    const refundId = randomUUID();

    const refund = await this.refundRepo.create({
      id: refundId,
      paymentId,
      orderId: payment.orderId,
      provider: payment.provider,
      status: "pending",
      amountCents: refundCents,
      currency: payment.currency,
      reason: (options.reason ?? "requested_by_customer") as typeof refund.reason,
      initiatedById: options.initiatedById ?? null,
      initiatedByRole: options.initiatedByRole ?? null,
      idempotencyKey,
    });

    let providerRefundId: string | null = null;

    try {
      const stripeReason =
        options.reason === "duplicate" ||
        options.reason === "fraudulent" ||
        options.reason === "requested_by_customer"
          ? options.reason
          : "requested_by_customer";

      const result = await this.provider.createRefund({
        providerPaymentId: payment.providerPaymentId,
        amountCents: refundCents < payment.amountCents ? refundCents : undefined,
        reason: stripeReason,
        idempotencyKey,
      });

      providerRefundId = result.providerRefundId;

      await this.refundRepo.updateStatus(refundId, "processing", {
        providerRefundId,
      });

      const isFullRefund = alreadyRefundedCents + refundCents >= payment.amountCents;

      const targetStatus: PaymentStatus = isFullRefund
        ? "refunded"
        : "partially_refunded";

      await this.engine.transition(
        paymentId,
        payment.status as PaymentStatus,
        targetStatus,
        {
          orderId: payment.orderId,
          actorId: options.initiatedById,
          actorType: "admin",
          metadata: {
            refundId,
            refundCents,
            providerRefundId,
          },
        },
      );

      if (isFullRefund) {
        paymentEventBus.emit({
          eventId: randomUUID(),
          eventType: "payment.refunded",
          paymentId,
          orderId: payment.orderId,
          customerId: payment.customerId,
          occurredAt: new Date().toISOString(),
          version: 1,
          source: "payment-service",
          payload: {
            refundId,
            providerRefundId,
            amountCents: refundCents,
            currency: payment.currency,
            reason: options.reason ?? "requested_by_customer",
            status: "processing",
            isPartial: false,
          },
        } satisfies PaymentRefundedEvent);
      } else {
        paymentEventBus.emit({
          eventId: randomUUID(),
          eventType: "payment.partially_refunded",
          paymentId,
          orderId: payment.orderId,
          customerId: payment.customerId,
          occurredAt: new Date().toISOString(),
          version: 1,
          source: "payment-service",
          payload: {
            refundId,
            providerRefundId,
            refundedAmountCents: refundCents,
            totalAmountCents: payment.amountCents,
            currency: payment.currency,
          },
        } satisfies PaymentPartiallyRefundedEvent);
      }

      return this.toRefundResponse(
        { ...refund, providerRefundId, status: "processing" },
        payment.orderId,
      );
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Unknown error";
      await this.refundRepo.updateStatus(refundId, "failed", {
        failureReason: reason,
      });
      throw err;
    }
  }

  async getRefund(
    refundId: string,
    requestingUserId: string,
    requestingRole: string,
  ): Promise<RefundResponse> {
    const refund = await this.refundRepo.findById(refundId);
    if (!refund) throw new RefundNotFoundError(refundId);

    const payment = await this.paymentRepo.findById(refund.paymentId);
    if (!payment) throw new PaymentNotFoundError(refund.paymentId);

    const isAdmin = requestingRole === "admin" || requestingRole === "superadmin";
    if (!isAdmin && payment.customerId !== requestingUserId) {
      throw new PaymentOwnershipError();
    }

    return this.toRefundResponse(refund, payment.orderId);
  }

  async handleWebhookRefundUpdated(
    providerRefundId: string,
    stripeStatus: string,
  ): Promise<void> {
    const refund = await this.refundRepo.findByProviderRefundId(providerRefundId);
    if (!refund) return;

    const newStatus =
      stripeStatus === "succeeded"
        ? "succeeded"
        : stripeStatus === "failed"
          ? "failed"
          : "processing";

    await this.refundRepo.updateStatus(refund.id, newStatus, {
      processedAt: stripeStatus === "succeeded" ? new Date() : undefined,
    });
  }

  private toRefundResponse(
    refund: {
      id: string;
      paymentId: string;
      amountCents: number;
      currency: string;
      status: string;
      reason: string;
      providerRefundId: string | null;
      createdAt: Date;
    },
    orderId: string,
  ): RefundResponse {
    return {
      refundId: refund.id,
      paymentId: refund.paymentId,
      orderId,
      amountCents: refund.amountCents,
      currency: refund.currency,
      status: refund.status as RefundResponse["status"],
      reason: refund.reason as RefundResponse["reason"],
      providerRefundId: refund.providerRefundId,
      createdAt: refund.createdAt.toISOString(),
    };
  }
}
