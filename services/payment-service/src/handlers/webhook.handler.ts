import { randomUUID } from "node:crypto";
import type { Stripe } from "../providers/stripe/stripe.client.js";
import type { StripeWebhookVerifier } from "../providers/stripe/webhook.verifier.js";
import type { WebhookEventRepository } from "../repositories/webhook-event.repository.js";
import type { PaymentService } from "../services/payment.service.js";
import type { RefundService } from "../services/refund.service.js";
import type { FastifyBaseLogger } from "fastify";

const HANDLED_EVENT_TYPES = new Set([
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.requires_action",
  "payment_intent.canceled",
  "payment_intent.processing",
  "charge.dispute.created",
  "refund.updated",
  "refund.failed",
]);

export class WebhookHandler {
  constructor(
    private readonly verifier: StripeWebhookVerifier,
    private readonly webhookRepo: WebhookEventRepository,
    private readonly paymentService: PaymentService,
    private readonly refundService: RefundService,
    private readonly logger: FastifyBaseLogger,
  ) {}

  async handle(rawBody: Buffer, signatureHeader: string): Promise<void> {
    const event = this.verifier.verify(rawBody, signatureHeader);

    if (!HANDLED_EVENT_TYPES.has(event.type)) {
      this.logger.debug(
        { eventType: event.type, eventId: event.id },
        "[webhook] Ignoring unhandled Stripe event type",
      );
      return;
    }

    const { inserted, row: webhookRow } = await this.webhookRepo.insertIfNotExists({
      id: randomUUID(),
      provider: "stripe",
      providerEventId: event.id,
      type: event.type,
      status: "received",
      rawPayload: this.sanitizePayload(event),
      receivedAt: new Date(),
    });

    if (!inserted) {
      this.logger.debug(
        { eventId: event.id, eventType: event.type },
        "[webhook] Duplicate Stripe event received — skipping",
      );
      return;
    }

    this.logger.info(
      { eventId: event.id, eventType: event.type },
      "[webhook] Processing Stripe webhook event",
    );

    let paymentId: string | null = null;

    try {
      paymentId = await this.route(event);
      await this.webhookRepo.markProcessed(webhookRow.id, paymentId);
      this.logger.info(
        { eventId: event.id, eventType: event.type, paymentId },
        "[webhook] Stripe webhook event processed successfully",
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await this.webhookRepo.markFailed(webhookRow.id, errorMessage);
      this.logger.error(
        { err, eventId: event.id, eventType: event.type },
        "[webhook] Failed to process Stripe webhook event",
      );
      throw err;
    }
  }

  private async route(event: Stripe.Event): Promise<string | null> {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        await this.paymentService.handleWebhookSucceeded(intent.id, event.id);
        return this.getPaymentIdFromMetadata(intent.metadata);
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const failureCode = intent.last_payment_error?.code ?? null;
        const failureMessage = intent.last_payment_error?.message ?? null;
        await this.paymentService.handleWebhookFailed(
          intent.id,
          failureCode,
          failureMessage,
          event.id,
        );
        return this.getPaymentIdFromMetadata(intent.metadata);
      }

      case "payment_intent.requires_action": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const nextActionType = intent.next_action?.type ?? null;
        await this.paymentService.handleWebhookRequiresAction(
          intent.id,
          nextActionType,
          event.id,
        );
        return this.getPaymentIdFromMetadata(intent.metadata);
      }

      case "payment_intent.canceled": {
        const intent = event.data.object as Stripe.PaymentIntent;
        await this.paymentService.handleWebhookCancelled(intent.id, event.id);
        return this.getPaymentIdFromMetadata(intent.metadata);
      }

      case "payment_intent.processing": {
        this.logger.debug(
          { eventId: event.id },
          "[webhook] payment_intent.processing — no action needed",
        );
        return null;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const paymentIntentId =
          typeof dispute.payment_intent === "string"
            ? dispute.payment_intent
            : (dispute.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

        if (paymentIntentId) {
          await this.paymentService.handleWebhookDisputed(
            paymentIntentId,
            dispute.reason ?? null,
            event.id,
          );
        }
        return null;
      }

      case "refund.updated":
      case "refund.failed": {
        const refund = event.data.object as Stripe.Refund;
        await this.refundService.handleWebhookRefundUpdated(
          refund.id,
          refund.status ?? "failed",
        );
        return null;
      }

      default:
        return null;
    }
  }

  private getPaymentIdFromMetadata(
    metadata: Record<string, string> | null,
  ): string | null {
    return metadata?.["paymentId"] ?? null;
  }

  private sanitizePayload(event: Stripe.Event): Record<string, unknown> {
    return {
      id: event.id,
      type: event.type,
      created: event.created,
      livemode: event.livemode,
      api_version: event.api_version,
    };
  }
}
