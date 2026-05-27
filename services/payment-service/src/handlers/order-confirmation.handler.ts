import type { FastifyBaseLogger } from "fastify";
import type { PaymentEventBus } from "../events/event-bus.js";
import type { PaymentSucceededEvent } from "../types/event.types.js";

export interface OrderConfirmationConfig {
  orderServiceUrl: string;
  orderInternalKey: string;
  timeoutMs?: number;
}

export class OrderConfirmationHandler {
  private readonly timeoutMs: number;

  constructor(
    private readonly config: OrderConfirmationConfig,
    private readonly logger: FastifyBaseLogger,
  ) {
    this.timeoutMs = config.timeoutMs ?? 10_000;
  }

  register(bus: PaymentEventBus): void {
    bus.subscribe<PaymentSucceededEvent>(
      "payment.succeeded",
      (event) => {
        this.confirmOrder(event).catch((err) => {
          this.logger.error(
            {
              err,
              paymentId: event.paymentId,
              orderId: event.orderId,
            },
            "[order-confirmation] Failed to confirm order — will retry on next reconciliation",
          );
        });
      },
    );
  }

  async confirmOrder(event: PaymentSucceededEvent): Promise<void> {
    const { orderId, paymentId, payload } = event;

    const url = `${this.config.orderServiceUrl}/internal/orders/${orderId}/confirm-payment`;

    this.logger.info(
      { orderId, paymentId },
      "[order-confirmation] Calling order-service to confirm payment",
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Key": this.config.orderInternalKey,
          "X-Request-ID": paymentId,
        },
        body: JSON.stringify({
          paymentId,
          paymentReference: payload.providerPaymentId,
          amountCents: payload.amountCents,
          currency: payload.currency,
        }),
        signal: controller.signal,
      });

      if (!response.ok && response.status !== 409) {
        const body = await response.text();
        throw new Error(
          `Order-service returned ${response.status}: ${body}`,
        );
      }

      if (response.status === 409) {
        this.logger.info(
          { orderId, paymentId },
          "[order-confirmation] Order already confirmed (idempotent 409)",
        );
        return;
      }

      this.logger.info(
        { orderId, paymentId },
        "[order-confirmation] Order payment confirmed successfully",
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
