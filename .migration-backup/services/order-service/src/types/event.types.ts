import type { OrderState } from "./order.types.js";

export type OrderEventType =
  | "order.created"
  | "order.state_changed"
  | "order.cancelled"
  | "order.confirmed"
  | "order.accepted_by_vendor"
  | "order.preparing"
  | "order.ready_for_pickup"
  | "order.dispatch_created"
  | "order.rider_assigned"
  | "order.rider_accepted"
  | "order.arrived_at_vendor"
  | "order.picked_up"
  | "order.on_the_way"
  | "order.arrived_at_customer"
  | "order.delivered"
  | "order.refunded"
  | "dispatch.initiated"
  | "dispatch.rider_assigned"
  | "dispatch.failed";

export interface BaseOrderEvent {
  eventId: string;
  eventType: OrderEventType;
  orderId: string;
  occurredAt: string;
  version: number;
  source: string;
}

export interface OrderCreatedEvent extends BaseOrderEvent {
  eventType: "order.created";
  payload: {
    customerId: string;
    vendorBranchId: string;
    orderNumber: string;
    totalCents: number;
    itemCount: number;
  };
}

export interface OrderStateChangedEvent extends BaseOrderEvent {
  eventType: "order.state_changed";
  payload: {
    fromState: OrderState | null;
    toState: OrderState;
    actorId: string | null;
    actorRole: string | null;
    reason: string | null;
  };
}

export interface OrderCancelledEvent extends BaseOrderEvent {
  eventType: "order.cancelled";
  payload: {
    cancelledById: string;
    cancellationReason: string;
    actorRole: string;
    previousState: OrderState;
  };
}

export interface DispatchInitiatedEvent extends BaseOrderEvent {
  eventType: "dispatch.initiated";
  payload: {
    attemptNumber: number;
    candidateCount: number;
  };
}

export interface DispatchRiderAssignedEvent extends BaseOrderEvent {
  eventType: "dispatch.rider_assigned";
  payload: {
    riderId: string;
    distanceMeters: number;
    estimatedPickupSeconds: number;
    algorithm: string;
  };
}

export interface DispatchFailedEvent extends BaseOrderEvent {
  eventType: "dispatch.failed";
  payload: {
    attemptNumber: number;
    reason: string;
  };
}

export type OrderEvent =
  | OrderCreatedEvent
  | OrderStateChangedEvent
  | OrderCancelledEvent
  | DispatchInitiatedEvent
  | DispatchRiderAssignedEvent
  | DispatchFailedEvent;

export type EventHandler<T extends OrderEvent = OrderEvent> = (
  event: T,
) => void | Promise<void>;
