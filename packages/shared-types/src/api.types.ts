import type { PaginationMeta } from "./common.types.js";

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "PAYMENT_FAILED"
  | "ORDER_CANCELLED"
  | "VENDOR_CLOSED"
  | "OUT_OF_STOCK";

export type ApiErrorDetail = {
  field?: string;
  message: string;
  code?: string;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetail[];
    requestId?: string;
    timestamp: string;
  };
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type PaginatedResponse<T> = ApiSuccessResponse<T[]> & {
  pagination: PaginationMeta;
};

export type PaginationParams = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type HealthCheckResponse = {
  status: "ok" | "degraded" | "down";
  version: string;
  uptime: number;
  timestamp: string;
  services?: Record<string, "ok" | "degraded" | "down">;
};

export type ServiceInfo = {
  name: string;
  version: string;
  environment: string;
  region?: string;
};

export type WebhookEvent<T = unknown> = {
  id: string;
  type: string;
  payload: T;
  timestamp: string;
  version: string;
};

export type RealtimeEventType =
  | "order.status_changed"
  | "order.location_updated"
  | "rider.location_updated"
  | "vendor.status_changed"
  | "notification.new";

export type RealtimeEvent<T = unknown> = {
  type: RealtimeEventType;
  payload: T;
  timestamp: string;
  channelId: string;
};
