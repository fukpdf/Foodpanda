export const APP_NAME = "DeliveryOS";
export const APP_VERSION = "1.0.0";

export const SERVICE_NAMES = {
  API_GATEWAY: "api-gateway",
  AUTH_SERVICE: "auth-service",
  USER_SERVICE: "user-service",
  VENDOR_SERVICE: "vendor-service",
  MENU_SERVICE: "menu-service",
  ORDER_SERVICE: "order-service",
  DISPATCH_SERVICE: "dispatch-service",
  WALLET_SERVICE: "wallet-service",
  PAYMENT_SERVICE: "payment-service",
  NOTIFICATION_SERVICE: "notification-service",
  REALTIME_SERVICE: "realtime-service",
  ANALYTICS_SERVICE: "analytics-service",
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const TOKEN_CONFIG = {
  ACCESS_TOKEN_TTL_SECONDS: 15 * 60,
  REFRESH_TOKEN_TTL_SECONDS: 30 * 24 * 60 * 60,
  TOKEN_ISSUER: "deliveryos-auth",
  TOKEN_AUDIENCE: "deliveryos-api",
} as const;

export const RATE_LIMITS = {
  GLOBAL_RPM: 1000,
  AUTH_RPM: 20,
  ORDER_RPM: 60,
  SEARCH_RPM: 120,
} as const;

export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["picked_up"],
  picked_up: ["in_transit"],
  in_transit: ["delivered"],
  delivered: [],
  cancelled: [],
  refunded: [],
};

export const DISPATCH_CONFIG = {
  INITIAL_SEARCH_RADIUS_KM: 3,
  MAX_SEARCH_RADIUS_KM: 15,
  RADIUS_INCREMENT_KM: 2,
  MAX_ASSIGN_ATTEMPTS: 5,
  ASSIGN_TIMEOUT_SECONDS: 30,
} as const;

export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "SGD", "MYR", "PHP", "THB", "IDR"] as const;
export const SUPPORTED_LOCALES = ["en", "es", "zh", "id", "th", "ms"] as const;

export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[1-9]\d{6,14}$/,
  POSTAL_CODE: /^[A-Z0-9]{3,10}$/i,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  OBJECT_ID: /^[0-9a-fA-F]{24}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
} as const;
