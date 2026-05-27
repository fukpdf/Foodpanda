import type { PaymentStatus, RefundStatus } from "./payment.types.js";

export type PaymentEventType =
  | "payment.initiated"
  | "payment.processing"
  | "payment.requires_action"
  | "payment.succeeded"
  | "payment.failed"
  | "payment.cancelled"
  | "payment.expired"
  | "payment.refunded"
  | "payment.partially_refunded"
  | "payment.disputed";

export interface BasePaymentEvent {
  eventId: string;
  eventType: PaymentEventType;
  paymentId: string;
  orderId: string;
  customerId: string;
  occurredAt: string;
  version: number;
  source: string;
}

export interface PaymentInitiatedEvent extends BasePaymentEvent {
  eventType: "payment.initiated";
  payload: {
    amountCents: number;
    currency: string;
    provider: string;
    attemptNumber: number;
    expiresAt: string;
  };
}

export interface PaymentProcessingEvent extends BasePaymentEvent {
  eventType: "payment.processing";
  payload: {
    providerPaymentId: string;
    amountCents: number;
    currency: string;
    provider: string;
  };
}

export interface PaymentRequiresActionEvent extends BasePaymentEvent {
  eventType: "payment.requires_action";
  payload: {
    providerPaymentId: string;
    nextActionType: string;
  };
}

export interface PaymentSucceededEvent extends BasePaymentEvent {
  eventType: "payment.succeeded";
  payload: {
    providerPaymentId: string;
    amountCents: number;
    currency: string;
    provider: string;
  };
}

export interface PaymentFailedEvent extends BasePaymentEvent {
  eventType: "payment.failed";
  payload: {
    providerPaymentId: string | null;
    failureCode: string | null;
    failureMessage: string | null;
    attemptNumber: number;
    canRetry: boolean;
    maxAttempts: number;
  };
}

export interface PaymentCancelledEvent extends BasePaymentEvent {
  eventType: "payment.cancelled";
  payload: {
    providerPaymentId: string | null;
    reason: string | null;
  };
}

export interface PaymentExpiredEvent extends BasePaymentEvent {
  eventType: "payment.expired";
  payload: {
    providerPaymentId: string | null;
    attemptNumber: number;
  };
}

export interface PaymentRefundedEvent extends BasePaymentEvent {
  eventType: "payment.refunded";
  payload: {
    refundId: string;
    providerRefundId: string | null;
    amountCents: number;
    currency: string;
    reason: string;
    status: RefundStatus;
    isPartial: boolean;
  };
}

export interface PaymentPartiallyRefundedEvent extends BasePaymentEvent {
  eventType: "payment.partially_refunded";
  payload: {
    refundId: string;
    providerRefundId: string | null;
    refundedAmountCents: number;
    totalAmountCents: number;
    currency: string;
  };
}

export interface PaymentDisputedEvent extends BasePaymentEvent {
  eventType: "payment.disputed";
  payload: {
    providerPaymentId: string | null;
    disputeReason: string | null;
  };
}

export type PaymentEvent =
  | PaymentInitiatedEvent
  | PaymentProcessingEvent
  | PaymentRequiresActionEvent
  | PaymentSucceededEvent
  | PaymentFailedEvent
  | PaymentCancelledEvent
  | PaymentExpiredEvent
  | PaymentRefundedEvent
  | PaymentPartiallyRefundedEvent
  | PaymentDisputedEvent;

export function isPaymentEvent(obj: unknown): obj is PaymentEvent {
  if (typeof obj !== "object" || obj === null) return false;
  if (!("eventType" in obj)) return false;
  const et = (obj as { eventType: unknown }).eventType;
  return typeof et === "string" && et.startsWith("payment.");
}
