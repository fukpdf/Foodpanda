import type { OrderState, CancellationActor } from "../types/order.types.js";
import { canTransition, isCancellable, isTerminal } from "./states.js";

export class InvalidTransitionError extends Error {
  readonly code = "INVALID_STATE_TRANSITION";
  constructor(
    readonly fromState: OrderState,
    readonly toState: OrderState,
    readonly orderId: string,
  ) {
    super(
      `Cannot transition order ${orderId} from ${fromState} to ${toState}`,
    );
    this.name = "InvalidTransitionError";
  }
}

export class TerminalStateError extends Error {
  readonly code = "ORDER_IN_TERMINAL_STATE";
  constructor(
    readonly state: OrderState,
    readonly orderId: string,
  ) {
    super(`Order ${orderId} is in terminal state ${state} — no transitions allowed`);
    this.name = "TerminalStateError";
  }
}

export class OrderNotCancellableError extends Error {
  readonly code = "ORDER_NOT_CANCELLABLE";
  constructor(
    readonly state: OrderState,
    readonly orderId: string,
  ) {
    super(
      `Order ${orderId} in state ${state} cannot be cancelled`,
    );
    this.name = "OrderNotCancellableError";
  }
}

export interface TransitionContext {
  orderId: string;
  fromState: OrderState;
  toState: OrderState;
  actorId?: string;
  actorRole?: string;
  reason?: string;
  note?: string;
  metadata?: Record<string, unknown>;
}

export interface CancellationContext {
  orderId: string;
  currentState: OrderState;
  actorId: string;
  actorRole: CancellationActor;
  reason: string;
}

export function validateTransition(ctx: TransitionContext): void {
  if (isTerminal(ctx.fromState)) {
    throw new TerminalStateError(ctx.fromState, ctx.orderId);
  }

  if (!canTransition(ctx.fromState, ctx.toState)) {
    throw new InvalidTransitionError(ctx.fromState, ctx.toState, ctx.orderId);
  }
}

export function validateCancellation(ctx: CancellationContext): void {
  if (!isCancellable(ctx.currentState)) {
    throw new OrderNotCancellableError(ctx.currentState, ctx.orderId);
  }
}
