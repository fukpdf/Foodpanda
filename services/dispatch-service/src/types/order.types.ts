export type OrderState =
  | "CREATED"
  | "PAYMENT_PENDING"
  | "CONFIRMED"
  | "ACCEPTED_BY_VENDOR"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "DISPATCH_CREATED"
  | "RIDER_ASSIGNED"
  | "RIDER_ACCEPTED"
  | "ARRIVED_AT_VENDOR"
  | "PICKED_UP"
  | "ON_THE_WAY"
  | "ARRIVED_AT_CUSTOMER"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export type DBOrderStatus =
  | "draft"
  | "pending"
  | "confirmed"
  | "accepted_by_vendor"
  | "preparing"
  | "ready_for_pickup"
  | "dispatch_created"
  | "assigned_to_rider"
  | "rider_accepted"
  | "arrived_at_vendor"
  | "picked_up"
  | "in_transit"
  | "arrived_at_customer"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "failed";

export const ORDER_STATE_TO_DB: Record<OrderState, DBOrderStatus> = {
  CREATED: "draft",
  PAYMENT_PENDING: "pending",
  CONFIRMED: "confirmed",
  ACCEPTED_BY_VENDOR: "accepted_by_vendor",
  PREPARING: "preparing",
  READY_FOR_PICKUP: "ready_for_pickup",
  DISPATCH_CREATED: "dispatch_created",
  RIDER_ASSIGNED: "assigned_to_rider",
  RIDER_ACCEPTED: "rider_accepted",
  ARRIVED_AT_VENDOR: "arrived_at_vendor",
  PICKED_UP: "picked_up",
  ON_THE_WAY: "in_transit",
  ARRIVED_AT_CUSTOMER: "arrived_at_customer",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
};

export const DB_STATUS_TO_STATE: Record<DBOrderStatus, OrderState | null> = {
  draft: "CREATED",
  pending: "PAYMENT_PENDING",
  confirmed: "CONFIRMED",
  accepted_by_vendor: "ACCEPTED_BY_VENDOR",
  preparing: "PREPARING",
  ready_for_pickup: "READY_FOR_PICKUP",
  dispatch_created: "DISPATCH_CREATED",
  assigned_to_rider: "RIDER_ASSIGNED",
  rider_accepted: "RIDER_ACCEPTED",
  arrived_at_vendor: "ARRIVED_AT_VENDOR",
  picked_up: "PICKED_UP",
  in_transit: "ON_THE_WAY",
  arrived_at_customer: "ARRIVED_AT_CUSTOMER",
  delivered: "DELIVERED",
  cancelled: "CANCELLED",
  refunded: "REFUNDED",
  failed: null,
};

export type CancellationActor = "customer" | "vendor" | "rider" | "system" | "admin";

export interface OrderItemInput {
  menuItemId?: string;
  menuItemName: string;
  menuItemDescription?: string;
  menuItemImageUrl?: string;
  quantity: number;
  unitPriceCents: number;
  modifiers?: Array<{ name: string; priceCents: number; quantity?: number }>;
  specialInstructions?: string;
}

export interface CreateOrderInput {
  vendorBranchId: string;
  deliveryAddressId?: string;
  items: OrderItemInput[];
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryAddressSnapshot?: Record<string, unknown>;
  customerNote?: string;
  paymentMethod?: string;
  metadata?: Record<string, unknown>;
}

export interface TransitionOrderInput {
  orderId: string;
  toState: OrderState;
  actorId?: string;
  actorRole?: string;
  reason?: string;
  note?: string;
  metadata?: Record<string, unknown>;
}

export interface CancelOrderInput {
  orderId: string;
  actorId: string;
  actorRole: CancellationActor;
  reason: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface OrderFilters {
  page?: number;
  limit?: number;
  status?: DBOrderStatus;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}
