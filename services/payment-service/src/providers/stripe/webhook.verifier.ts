import type { Stripe } from "./stripe.client.js";

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}

export class StripeWebhookVerifier {
  constructor(
    private readonly client: Stripe,
    private readonly webhookSecret: string,
  ) {}

  verify(rawBody: Buffer | string, signatureHeader: string): Stripe.Event {
    if (!signatureHeader) {
      throw new WebhookVerificationError(
        "Missing stripe-signature header",
      );
    }

    try {
      return this.client.webhooks.constructEvent(
        rawBody,
        signatureHeader,
        this.webhookSecret,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown webhook verification error";
      throw new WebhookVerificationError(
        `Stripe webhook signature verification failed: ${message}`,
      );
    }
  }
}
