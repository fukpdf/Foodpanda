import type { Database } from "@deliveryos/database";
import { vendorBranches } from "@deliveryos/database";
import { eq } from "@deliveryos/database/drizzle";
import type { EventBus } from "../events/event-bus.js";
import { DispatchEngine } from "../dispatch-engine/dispatcher.js";
import { OrderService } from "./order.service.js";
import { DispatchRepository } from "../repositories/dispatch.repository.js";
import { OrderRepository } from "../repositories/order.repository.js";
import type { DispatchConfig } from "../types/dispatch.types.js";
import type { ResolvedOrderEnv } from "../config/env.js";

export class DispatchService {
  private readonly engine: DispatchEngine;
  private readonly dispatchRepo: DispatchRepository;
  private readonly orderRepo: OrderRepository;
  private readonly orderService: OrderService;

  constructor(
    private readonly db: Database,
    private readonly eventBus: EventBus,
    envConfig: Pick<
      ResolvedOrderEnv,
      | "DISPATCH_MAX_RADIUS_METERS"
      | "DISPATCH_OFFER_TIMEOUT_SECONDS"
      | "DISPATCH_MAX_ATTEMPTS"
      | "DISPATCH_CANDIDATE_LIMIT"
    >,
  ) {
    const dispatchConfig: DispatchConfig = {
      maxSearchRadiusMeters: envConfig.DISPATCH_MAX_RADIUS_METERS,
      offerTimeoutSeconds: envConfig.DISPATCH_OFFER_TIMEOUT_SECONDS,
      maxAttempts: envConfig.DISPATCH_MAX_ATTEMPTS,
      candidateLimit: envConfig.DISPATCH_CANDIDATE_LIMIT,
    };

    this.engine = new DispatchEngine(db, eventBus, undefined, dispatchConfig);
    this.dispatchRepo = new DispatchRepository(db);
    this.orderRepo = new OrderRepository(db);
    this.orderService = new OrderService(db, eventBus);
  }

  async initiateDispatch(orderId: string): Promise<boolean> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    const attemptNumber = (await this.dispatchRepo.countAttemptsForOrder(orderId)) + 1;

    const branch = await this.db
      .select()
      .from(vendorBranches)
      .where(eq(vendorBranches.id, order.vendorBranchId))
      .limit(1);

    if (!branch[0]) {
      throw new Error(`Vendor branch ${order.vendorBranchId} not found`);
    }

    const vb = branch[0];

    if (!vb.latitude || !vb.longitude) {
      throw new Error(
        `Vendor branch ${order.vendorBranchId} has no coordinates`,
      );
    }

    const result = await this.engine.dispatch({
      orderId,
      vendorBranchId: order.vendorBranchId,
      pickupLocation: {
        latitude: vb.latitude,
        longitude: vb.longitude,
      },
      dropoffLocation: {
        latitude: order.deliveryLatitude ?? 0,
        longitude: order.deliveryLongitude ?? 0,
      },
      estimatedPrepSeconds: 0,
      attemptNumber,
    });

    if (!result) return false;

    const estimatedDeliveryAt = new Date(
      Date.now() + result.estimatedDeliverySeconds * 1000,
    );

    await this.orderService.assignRider(
      orderId,
      result.riderId,
      estimatedDeliveryAt,
    );

    return true;
  }

  async acknowledgeDispatch(
    assignmentId: string,
    riderId: string,
    accepted: boolean,
    reason?: string,
  ): Promise<void> {
    if (accepted) {
      await this.dispatchRepo.updateStatus(assignmentId, "accepted", {
        respondedAt: new Date(),
      });
    } else {
      await this.dispatchRepo.updateStatus(assignmentId, "rejected", {
        respondedAt: new Date(),
        rejectionReason: reason,
      });
    }
  }
}
