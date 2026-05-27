import type { PaymentStatus } from "../types/payment.types.js";
import {
  ALLOWED_TRANSITIONS,
  TERMINAL_STATUSES,
} from "../types/payment.types.js";

export class InvalidPaymentTransitionError extends Error {
  readonly from: PaymentStatus;
  readonly to: PaymentStatus;
  readonly paymentId: string;

  constructor(paymentId: string, from: PaymentStatus, to: PaymentStatus) {
    super(
      `Invalid payment transition [${paymentId}]: ${from} → ${to}. ` +
        `Allowed from ${from}: [${(ALLOWED_TRANSITIONS[from] ?? []).join(", ")}]`,
    );
    this.name = "InvalidPaymentTransitionError";
    this.from = from;
    this.to = to;
    this.paymentId = paymentId;
  }
}

export class TerminalPaymentStateError extends Error {
  readonly status: PaymentStatus;
  readonly paymentId: string;

  constructor(paymentId: string, status: PaymentStatus) {
    super(
      `Payment [${paymentId}] is in terminal state [${status}] and cannot be transitioned.`,
    );
    this.name = "TerminalPaymentStateError";
    this.status = status;
    this.paymentId = paymentId;
  }
}

export function validateTransition(
  paymentId: string,
  from: PaymentStatus,
  to: PaymentStatus,
): void {
  if (TERMINAL_STATUSES.has(from)) {
    throw new TerminalPaymentStateError(paymentId, from);
  }

  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new InvalidPaymentTransitionError(paymentId, from, to);
  }
}

export function isTransitionAllowed(from: PaymentStatus, to: PaymentStatus): boolean {
  if (TERMINAL_STATUSES.has(from)) return false;
  const allowed = ALLOWED_TRANSITIONS[from];
  return !!allowed && allowed.includes(to);
}

export { ALLOWED_TRANSITIONS, TERMINAL_STATUSES };
