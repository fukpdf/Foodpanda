export class OrderServiceClient {
  constructor(
    private readonly orderServiceUrl: string,
    private readonly internalKey: string | undefined,
  ) {}

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      ...(this.internalKey
        ? { "X-Internal-Key": this.internalKey }
        : {}),
    };
  }

  async notifyRiderAssigned(
    orderId: string,
    riderId: string,
    estimatedDeliveryAt?: Date,
  ): Promise<void> {
    const res = await fetch(
      `${this.orderServiceUrl}/internal/orders/${orderId}/rider-assigned`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          riderId,
          estimatedDeliveryAt: estimatedDeliveryAt?.toISOString(),
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "(no body)");
      throw new Error(
        `order-service /rider-assigned returned ${res.status}: ${text}`,
      );
    }
  }

  async notifyRiderAccepted(orderId: string, actorId?: string): Promise<void> {
    const res = await fetch(
      `${this.orderServiceUrl}/internal/orders/${orderId}/rider-accepted`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ actorId }),
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "(no body)");
      throw new Error(
        `order-service /rider-accepted returned ${res.status}: ${text}`,
      );
    }
  }

  async notifyArrivedAtVendor(orderId: string, actorId?: string): Promise<void> {
    const res = await fetch(
      `${this.orderServiceUrl}/internal/orders/${orderId}/arrived-at-vendor`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ actorId }),
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "(no body)");
      throw new Error(
        `order-service /arrived-at-vendor returned ${res.status}: ${text}`,
      );
    }
  }

  async notifyPickedUp(orderId: string, actorId?: string): Promise<void> {
    const res = await fetch(
      `${this.orderServiceUrl}/internal/orders/${orderId}/picked-up`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ actorId }),
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "(no body)");
      throw new Error(
        `order-service /picked-up returned ${res.status}: ${text}`,
      );
    }
  }

  async notifyInTransit(orderId: string, actorId?: string): Promise<void> {
    const res = await fetch(
      `${this.orderServiceUrl}/internal/orders/${orderId}/in-transit`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ actorId }),
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "(no body)");
      throw new Error(
        `order-service /in-transit returned ${res.status}: ${text}`,
      );
    }
  }

  async notifyArrivedAtCustomer(orderId: string, actorId?: string): Promise<void> {
    const res = await fetch(
      `${this.orderServiceUrl}/internal/orders/${orderId}/arrived-at-customer`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ actorId }),
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "(no body)");
      throw new Error(
        `order-service /arrived-at-customer returned ${res.status}: ${text}`,
      );
    }
  }

  async notifyDelivered(orderId: string, actorId?: string): Promise<void> {
    const res = await fetch(
      `${this.orderServiceUrl}/internal/orders/${orderId}/delivered`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ actorId }),
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "(no body)");
      throw new Error(
        `order-service /delivered returned ${res.status}: ${text}`,
      );
    }
  }

  async notifyDispatchFailed(
    orderId: string,
    reason?: string,
  ): Promise<void> {
    const res = await fetch(
      `${this.orderServiceUrl}/internal/orders/${orderId}/dispatch-failed`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ reason }),
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "(no body)");
      throw new Error(
        `order-service /dispatch-failed returned ${res.status}: ${text}`,
      );
    }
  }
}
