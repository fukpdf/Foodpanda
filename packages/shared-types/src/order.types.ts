import type { ID, Address, AuditFields, Money, GeoCoordinate } from "./common.types.js";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentStatus = "pending" | "authorized" | "captured" | "failed" | "refunded";

export type PaymentMethod =
  | "card"
  | "wallet"
  | "cash_on_delivery"
  | "bank_transfer"
  | "apple_pay"
  | "google_pay";

export type OrderItemModifier = {
  modifierGroupId: ID;
  modifierGroupName: string;
  optionId: ID;
  optionName: string;
  additionalPrice: Money;
};

export type OrderItem = {
  id: ID;
  menuItemId: ID;
  name: string;
  quantity: number;
  unitPrice: Money;
  totalPrice: Money;
  modifiers: OrderItemModifier[];
  notes?: string;
  imageUrl?: string;
};

export type OrderPricing = {
  subtotal: Money;
  deliveryFee: Money;
  serviceFee: Money;
  tax: Money;
  discount: Money;
  tip: Money;
  total: Money;
};

export type OrderTimeline = {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  actorId?: ID;
};

export type Order = AuditFields & {
  id: ID;
  orderNumber: string;
  customerId: ID;
  vendorId: ID;
  riderId?: ID;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  items: OrderItem[];
  pricing: OrderPricing;
  deliveryAddress: Address;
  vendorAddress: Address;
  estimatedPickupAt?: string;
  estimatedDeliveryAt?: string;
  actualPickupAt?: string;
  actualDeliveryAt?: string;
  currentLocation?: GeoCoordinate;
  promoCode?: string;
  customerNotes?: string;
  vendorNotes?: string;
  riderNotes?: string;
  rating?: OrderRating;
  timeline: OrderTimeline[];
  cancelReason?: string;
  cancelledBy?: "customer" | "vendor" | "system";
};

export type OrderRating = {
  foodRating: number;
  deliveryRating: number;
  overallRating: number;
  comment?: string;
  ratedAt: string;
};

export type CreateOrderPayload = {
  vendorId: ID;
  items: Array<{
    menuItemId: ID;
    quantity: number;
    modifiers?: Array<{ modifierGroupId: ID; optionId: ID }>;
    notes?: string;
  }>;
  deliveryAddressId: ID;
  paymentMethod: PaymentMethod;
  promoCode?: string;
  customerNotes?: string;
  tip?: Money;
};

export type DispatchJob = {
  id: ID;
  orderId: ID;
  status: "pending" | "assigning" | "assigned" | "completed" | "failed";
  assignedRiderId?: ID;
  attemptCount: number;
  searchRadiusKm: number;
  createdAt: string;
  updatedAt: string;
};
