export type OrderState =
  | "CREATED"
  | "PAYMENT_PENDING"
  | "CONFIRMED"
  | "ACCEPTED_BY_VENDOR"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "RIDER_ASSIGNED"
  | "PICKED_UP"
  | "ON_THE_WAY"
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
  | "assigned_to_rider"
  | "picked_up"
  | "in_transit"
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
  RIDER_ASSIGNED: "assigned_to_rider",
  PICKED_UP: "picked_up",
  ON_THE_WAY: "in_transit",
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
  assigned_to_rider: "RIDER_ASSIGNED",
  picked_up: "PICKED_UP",
  in_transit: "ON_THE_WAY",
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

export interface OrderWithItems {
  order: import("@deliveryos/database").OrderFoundation;
  items: import("@deliveryos/database").OrderItem[];
  stateHistory: import("@deliveryos/database").OrderStateHistory[];
  activeDispatch: import("@deliveryos/database").DispatchAssignment | null;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface OrderFilters extends PaginationQuery {
  status?: DBOrderStatus;
}
