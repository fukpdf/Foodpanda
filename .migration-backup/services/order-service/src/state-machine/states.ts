import type { OrderState } from "../types/order.types.js";

export const TERMINAL_STATES: ReadonlySet<OrderState> = new Set([
  "DELIVERED",
  "REFUNDED",
]);

export const CANCELLABLE_STATES: ReadonlySet<OrderState> = new Set([
  "CREATED",
  "PAYMENT_PENDING",
  "CONFIRMED",
  "ACCEPTED_BY_VENDOR",
  "PREPARING",
]);

export const ALLOWED_TRANSITIONS: Readonly<
  Record<OrderState, ReadonlyArray<OrderState>>
> = {
  CREATED: ["PAYMENT_PENDING", "CANCELLED"],
  PAYMENT_PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["ACCEPTED_BY_VENDOR", "CANCELLED"],
  ACCEPTED_BY_VENDOR: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY_FOR_PICKUP", "CANCELLED"],
  READY_FOR_PICKUP: ["RIDER_ASSIGNED"],
  RIDER_ASSIGNED: ["PICKED_UP", "READY_FOR_PICKUP"],
  PICKED_UP: ["ON_THE_WAY"],
  ON_THE_WAY: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: ["REFUNDED"],
  REFUNDED: [],
};

export function isTerminal(state: OrderState): boolean {
  return TERMINAL_STATES.has(state);
}

export function isCancellable(state: OrderState): boolean {
  return CANCELLABLE_STATES.has(state);
}

export function canTransition(from: OrderState, to: OrderState): boolean {
  return (ALLOWED_TRANSITIONS[from] as OrderState[]).includes(to);
}
