import test from "node:test";
import assert from "node:assert/strict";
import { ALLOWED_TRANSITIONS, canTransition, isCancellable, isTerminal } from "./states.js";

test("order lifecycle allows the canonical happy path", () => {
  const path = [
    ["CREATED", "PAYMENT_PENDING"],
    ["PAYMENT_PENDING", "CONFIRMED"],
    ["CONFIRMED", "ACCEPTED_BY_VENDOR"],
    ["ACCEPTED_BY_VENDOR", "PREPARING"],
    ["PREPARING", "READY_FOR_PICKUP"],
    ["READY_FOR_PICKUP", "DISPATCH_CREATED"],
    ["DISPATCH_CREATED", "RIDER_ASSIGNED"],
    ["RIDER_ASSIGNED", "RIDER_ACCEPTED"],
    ["RIDER_ACCEPTED", "ARRIVED_AT_VENDOR"],
    ["ARRIVED_AT_VENDOR", "PICKED_UP"],
    ["PICKED_UP", "ON_THE_WAY"],
    ["ON_THE_WAY", "ARRIVED_AT_CUSTOMER"],
    ["ARRIVED_AT_CUSTOMER", "DELIVERED"],
  ] as const;

  for (const [from, to] of path) assert.equal(canTransition(from, to), true);
});

test("terminal states reject further lifecycle transitions", () => {
  assert.equal(isTerminal("DELIVERED"), true);
  assert.equal(isTerminal("REFUNDED"), true);
  assert.equal(canTransition("DELIVERED", "PREPARING"), false);
  assert.equal(canTransition("REFUNDED", "DELIVERED"), false);
  assert.deepEqual(ALLOWED_TRANSITIONS.REFUNDED, []);
});

test("cancellation is restricted to cancellable states", () => {
  assert.equal(isCancellable("PAYMENT_PENDING"), true);
  assert.equal(isCancellable("DISPATCH_CREATED"), true);
  assert.equal(isCancellable("RIDER_ASSIGNED"), false);
  assert.equal(isCancellable("DELIVERED"), false);
});
