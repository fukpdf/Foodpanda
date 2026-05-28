import { EventEmitter } from "node:events";
import type { PaymentEvent, PaymentEventType } from "../types/event.types.js";

type PaymentEventHandler<T extends PaymentEvent = PaymentEvent> = (
  event: T,
) => void | Promise<void>;

const WILDCARD = "*";

export class PaymentEventBus {
  private readonly emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(50);
  }

  emit(event: PaymentEvent): void {
    this.emitter.emit(event.eventType, event);
    this.emitter.emit(WILDCARD, event);
  }

  subscribe<T extends PaymentEvent>(
    type: PaymentEventType,
    handler: PaymentEventHandler<T>,
  ): void {
    this.emitter.on(type, handler as PaymentEventHandler);
  }

  subscribeAll(handler: PaymentEventHandler): void {
    this.emitter.on(WILDCARD, handler);
  }

  unsubscribe(type: PaymentEventType | typeof WILDCARD, handler: PaymentEventHandler): void {
    this.emitter.off(type, handler as PaymentEventHandler);
  }

  removeAllListeners(): void {
    this.emitter.removeAllListeners();
  }
}

export const paymentEventBus = new PaymentEventBus();
