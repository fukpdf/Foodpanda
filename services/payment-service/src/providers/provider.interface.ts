export interface CreatePaymentIntentParams {
  paymentId: string;
  orderId: string;
  customerId: string;
  amountCents: number;
  currency: string;
  description: string;
  idempotencyKey: string;
  metadata: Record<string, string>;
}

export interface CreatePaymentIntentResult {
  providerPaymentId: string;
  clientSecret: string;
  status: string;
  expiresAt: Date;
}

export interface RetrievePaymentResult {
  providerPaymentId: string;
  status: string;
  amountCents: number;
  currency: string;
  metadata: Record<string, string>;
  failureCode: string | null;
  failureMessage: string | null;
  nextActionType: string | null;
}

export interface CancelPaymentParams {
  providerPaymentId: string;
  idempotencyKey: string;
}

export interface CreateRefundParams {
  providerPaymentId: string;
  amountCents?: number;
  reason?: "duplicate" | "fraudulent" | "requested_by_customer";
  idempotencyKey: string;
}

export interface CreateRefundResult {
  providerRefundId: string;
  status: string;
  amountCents: number;
  currency: string;
}

export interface RetrieveRefundResult {
  providerRefundId: string;
  status: string;
  amountCents: number;
  failureReason: string | null;
}

export interface PaymentProvider {
  readonly providerName: string;
  createPaymentIntent(
    params: CreatePaymentIntentParams,
  ): Promise<CreatePaymentIntentResult>;
  retrievePaymentIntent(providerPaymentId: string): Promise<RetrievePaymentResult>;
  cancelPaymentIntent(params: CancelPaymentParams): Promise<void>;
  createRefund(params: CreateRefundParams): Promise<CreateRefundResult>;
  retrieveRefund(providerRefundId: string): Promise<RetrieveRefundResult>;
}
