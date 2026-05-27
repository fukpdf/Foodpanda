export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
  };
}

export function success<T>(data: T): SuccessResponse<T> {
  return { success: true, data, timestamp: new Date().toISOString() };
}

export function failure(
  code: string,
  message: string,
  details?: unknown,
): ErrorResponse {
  return {
    success: false,
    error: { code, message, details, timestamp: new Date().toISOString() },
  };
}

export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  PAYMENT_NOT_FOUND: "PAYMENT_NOT_FOUND",
  ACTIVE_PAYMENT_EXISTS: "ACTIVE_PAYMENT_EXISTS",
  ORDER_NOT_ELIGIBLE: "ORDER_NOT_ELIGIBLE",
  MAX_ATTEMPTS_REACHED: "MAX_ATTEMPTS_REACHED",
  REFUND_NOT_ELIGIBLE: "REFUND_NOT_ELIGIBLE",
  REFUND_AMOUNT_EXCEEDED: "REFUND_AMOUNT_EXCEEDED",
  WEBHOOK_VERIFICATION_FAILED: "WEBHOOK_VERIFICATION_FAILED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
