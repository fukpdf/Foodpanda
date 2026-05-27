import { EventEmitter } from "node:events";
import type { OrderEvent, OrderEventType, EventHandler } from "../types/event.types.js";

export interface IEventBus {
  emit(event: OrderEvent): void;
  subscribe<T extends OrderEvent>(
    type: OrderEventType,
    handler: EventHandler<T>,
  ): void;
  unsubscribe<T extends OrderEvent>(
    type: OrderEventType,
    handler: EventHandler<T>,
  ): void;
  subscribeAll(handler: EventHandler): void;
}

export class EventBus implements IEventBus {
  private readonly emitter = new EventEmitter();
  private readonly WILDCARD = "*";

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  emit(event: OrderEvent): void {
    this.emitter.emit(event.eventType, event);
    this.emitter.emit(this.WILDCARD, event);
  }

  subscribe<T extends OrderEvent>(
    type: OrderEventType,
    handler: EventHandler<T>,
  ): void {
    this.emitter.on(type, handler as EventHandler);
  }

  unsubscribe<T extends OrderEvent>(
    type: OrderEventType,
    handler: EventHandler<T>,
  ): void {
    this.emitter.off(type, handler as EventHandler);
  }

  subscribeAll(handler: EventHandler): void {
    this.emitter.on(this.WILDCARD, handler);
  }

  listenerCount(type: OrderEventType): number {
    return this.emitter.listenerCount(type);
  }
}

export const eventBus = new EventBus();
