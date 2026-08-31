import test from "node:test";
import assert from "node:assert/strict";
import {
  InvalidTransitionError,
  OrderNotCancellableError,
  TerminalStateError,
  validateCancellation,
  validateTransition,
} from "./transitions.js";

test("validateTransition accepts a valid transition", () => {
  assert.doesNotThrow(() =>
    validateTransition({
      orderId: "00000000-0000-0000-0000-000000000001",
      fromState: "CREATED",
      toState: "PAYMENT_PENDING",
    }),
  );
});

test("validateTransition rejects illegal transitions", () => {
  assert.throws(
    () =>
      validateTransition({
        orderId: "00000000-0000-0000-0000-000000000001",
        fromState: "CREATED",
        toState: "DELIVERED",
      }),
    (error: unknown) =>
      error instanceof InvalidTransitionError &&
      error.code === "INVALID_STATE_TRANSITION",
  );
});

test("validateTransition rejects terminal states", () => {
  assert.throws(
    () =>
      validateTransition({
        orderId: "00000000-0000-0000-0000-000000000001",
        fromState: "DELIVERED",
        toState: "REFUNDED",
      }),
    (error: unknown) =>
      error instanceof TerminalStateError &&
      error.code === "ORDER_IN_TERMINAL_STATE",
  );
});

test("validateCancellation rejects non-cancellable orders", () => {
  assert.throws(
    () =>
      validateCancellation({
        orderId: "00000000-0000-0000-0000-000000000001",
        currentState: "RIDER_ASSIGNED",
        actorId: "00000000-0000-0000-0000-000000000002",
        actorRole: "customer",
        reason: "Changed my mind",
      }),
    (error: unknown) =>
      error instanceof OrderNotCancellableError &&
      error.code === "ORDER_NOT_CANCELLABLE",
  );
});
