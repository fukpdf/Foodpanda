import { randomUUID } from "node:crypto";

export function buildPaymentIntentKey(paymentId: string): string {
  return `pi-create-${paymentId}`;
}

export function buildAttemptKey(paymentId: string, attemptNumber: number): string {
  return `attempt-${paymentId}-${attemptNumber}`;
}

export function buildRefundKey(paymentId: string, amountCents: number, suffix?: string): string {
  const base = `refund-${paymentId}-${amountCents}`;
  return suffix ? `${base}-${suffix}` : base;
}

export function buildCancelKey(paymentId: string): string {
  return `cancel-${paymentId}`;
}

export function generateRequestKey(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

export function idempotencyExpiresAt(ttlHours: number): Date {
  return new Date(Date.now() + ttlHours * 60 * 60 * 1000);
}
