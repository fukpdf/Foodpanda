export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    requestId?: string;
    timestamp: string;
    details?: unknown;
  };
}

export function ok<T>(data: T, meta?: Record<string, unknown>): ApiSuccess<T> {
  return { success: true, data, ...(meta ? { meta } : {}) };
}

export function fail(
  code: string,
  message: string,
  details?: unknown,
): ApiError {
  return {
    success: false,
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
      ...(details !== undefined ? { details } : {}),
    },
  };
}

export function paginationMeta(
  page: number,
  limit: number,
  total: number,
): Record<string, unknown> {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPrevPage: page > 1,
  };
}
