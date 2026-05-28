import type { Stripe } from "./stripe.client.js";
import type {
  CancelPaymentParams,
  CreatePaymentIntentParams,
  CreatePaymentIntentResult,
  CreateRefundParams,
  CreateRefundResult,
  PaymentProvider,
  RetrievePaymentResult,
  RetrieveRefundResult,
} from "../provider.interface.js";

const STRIPE_REASON_MAP: Record<string, "duplicate" | "fraudulent" | "requested_by_customer"> = {
  duplicate: "duplicate",
  fraudulent: "fraudulent",
  requested_by_customer: "requested_by_customer",
};

export class StripeProvider implements PaymentProvider {
  readonly providerName = "stripe";

  constructor(private readonly client: Stripe) {}

  async createPaymentIntent(
    params: CreatePaymentIntentParams,
  ): Promise<CreatePaymentIntentResult> {
    const intent = await this.client.paymentIntents.create(
      {
        amount: params.amountCents,
        currency: params.currency.toLowerCase(),
        payment_method_types: ["card"],
        description: params.description,
        metadata: {
          ...params.metadata,
          paymentId: params.paymentId,
          orderId: params.orderId,
          customerId: params.customerId,
        },
        capture_method: "automatic",
      },
      { idempotencyKey: params.idempotencyKey },
    );

    if (!intent.client_secret) {
      throw new Error(
        `Stripe PaymentIntent [${intent.id}] returned no client_secret`,
      );
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    return {
      providerPaymentId: intent.id,
      clientSecret: intent.client_secret,
      status: intent.status,
      expiresAt,
    };
  }

  async retrievePaymentIntent(
    providerPaymentId: string,
  ): Promise<RetrievePaymentResult> {
    const intent = await this.client.paymentIntents.retrieve(providerPaymentId);

    const lastCharge =
      intent.latest_charge &&
      typeof intent.latest_charge === "object"
        ? (intent.latest_charge as Stripe.Charge)
        : null;

    const failureCode =
      lastCharge?.failure_code ?? intent.last_payment_error?.code ?? null;

    const failureMessage =
      lastCharge?.failure_message ??
      intent.last_payment_error?.message ??
      null;

    let nextActionType: string | null = null;
    if (intent.next_action) {
      nextActionType = intent.next_action.type ?? null;
    }

    return {
      providerPaymentId: intent.id,
      status: intent.status,
      amountCents: intent.amount,
      currency: intent.currency.toUpperCase(),
      metadata: (intent.metadata as Record<string, string>) ?? {},
      failureCode,
      failureMessage,
      nextActionType,
    };
  }

  async cancelPaymentIntent(params: CancelPaymentParams): Promise<void> {
    await this.client.paymentIntents.cancel(
      params.providerPaymentId,
      { cancellation_reason: "abandoned" },
      { idempotencyKey: params.idempotencyKey },
    );
  }

  async createRefund(params: CreateRefundParams): Promise<CreateRefundResult> {
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: params.providerPaymentId,
    };

    if (params.amountCents !== undefined) {
      refundParams.amount = params.amountCents;
    }

    if (params.reason && STRIPE_REASON_MAP[params.reason]) {
      refundParams.reason = STRIPE_REASON_MAP[params.reason];
    }

    const refund = await this.client.refunds.create(refundParams, {
      idempotencyKey: params.idempotencyKey,
    });

    return {
      providerRefundId: refund.id,
      status: refund.status ?? "pending",
      amountCents: refund.amount,
      currency: refund.currency.toUpperCase(),
    };
  }

  async retrieveRefund(providerRefundId: string): Promise<RetrieveRefundResult> {
    const refund = await this.client.refunds.retrieve(providerRefundId);

    return {
      providerRefundId: refund.id,
      status: refund.status ?? "pending",
      amountCents: refund.amount,
      failureReason: refund.failure_reason ?? null,
    };
  }
}
