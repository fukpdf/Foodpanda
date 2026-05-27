export type PaymentStatus =
  | "pending_provider"
  | "processing"
  | "requires_action"
  | "authorized"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "refunded"
  | "partially_refunded"
  | "disputed"
  | "expired";

export type PaymentProvider = "stripe" | "razorpay" | "paypal" | "adyen";

export type RefundStatus = "pending" | "processing" | "succeeded" | "failed" | "cancelled";

export type RefundReason =
  | "duplicate"
  | "fraudulent"
  | "requested_by_customer"
  | "order_cancelled"
  | "system";

export type ActorType = "customer" | "system" | "webhook" | "admin" | "reconciliation";

export const TERMINAL_STATUSES: ReadonlySet<PaymentStatus> = new Set([
  "succeeded",
  "refunded",
  "cancelled",
  "expired",
]);

export const ACTIVE_STATUSES: ReadonlySet<PaymentStatus> = new Set([
  "pending_provider",
  "processing",
  "requires_action",
  "authorized",
]);

export const REFUND_ELIGIBLE_STATUSES: ReadonlySet<PaymentStatus> = new Set([
  "succeeded",
  "partially_refunded",
]);

export const RETRYABLE_STATUSES: ReadonlySet<PaymentStatus> = new Set(["failed", "expired"]);

export const ALLOWED_TRANSITIONS: Readonly<
  Record<PaymentStatus, ReadonlyArray<PaymentStatus>>
> = {
  pending_provider: ["processing", "cancelled", "expired"],
  processing: ["succeeded", "failed", "requires_action", "cancelled"],
  requires_action: ["processing", "succeeded", "failed", "cancelled"],
  authorized: ["succeeded", "cancelled"],
  succeeded: ["refunded", "partially_refunded", "disputed"],
  failed: ["pending_provider"],
  cancelled: [],
  refunded: [],
  partially_refunded: ["refunded", "disputed"],
  disputed: ["refunded"],
  expired: [],
};

export interface PaymentRecord {
  id: string;
  orderId: string;
  customerId: string;
  provider: PaymentProvider;
  providerPaymentId: string | null;
  status: PaymentStatus;
  amountCents: number;
  currency: string;
  idempotencyKey: string;
  attemptNumber: number;
  description: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  expiresAt: Date | null;
  confirmedAt: Date | null;
  failedAt: Date | null;
  cancelledAt: Date | null;
  expiredAt: Date | null;
  requiresAction: boolean;
  nextActionType: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentIntentRequest {
  orderId: string;
  currency?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentResponse {
  paymentId: string;
  clientSecret: string;
  providerPaymentId: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  expiresAt: string;
}

export interface CancelPaymentRequest {
  reason?: string;
}

export interface RefundRequest {
  amountCents?: number;
  reason?: RefundReason;
  idempotencyKey?: string;
}

export interface RefundResponse {
  refundId: string;
  paymentId: string;
  orderId: string;
  amountCents: number;
  currency: string;
  status: RefundStatus;
  reason: RefundReason;
  providerRefundId: string | null;
  createdAt: string;
}

export interface PaymentStatusResponse {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  amountCents: number;
  currency: string;
  provider: string;
  attemptNumber: number;
  failureCode: string | null;
  failureMessage: string | null;
  requiresAction: boolean;
  nextActionType: string | null;
  expiresAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StripeStatusMapping {
  stripeStatus: string;
  paymentStatus: PaymentStatus;
}

export function stripeStatusToPaymentStatus(stripeStatus: string): PaymentStatus {
  switch (stripeStatus) {
    case "requires_payment_method":
    case "requires_confirmation":
      return "pending_provider";
    case "requires_action":
      return "requires_action";
    case "processing":
      return "processing";
    case "requires_capture":
      return "authorized";
    case "succeeded":
      return "succeeded";
    case "canceled":
      return "cancelled";
    default:
      return "processing";
  }
}
