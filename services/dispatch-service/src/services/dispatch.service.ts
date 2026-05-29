import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { vendorBranches, ordersFoundation } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { EventBus } from "../events/event-bus.js";
import { DispatchEngine } from "../dispatch-engine/dispatcher.js";
import { DispatchRepository } from "../repositories/dispatch.repository.js";
import type { DispatchConfig } from "../types/dispatch.types.js";
import type { ResolvedDispatchEnv } from "../config/env.js";
import { OrderServiceClient } from "../client/order-service.client.js";

type Database = NodePgDatabase<Record<string, unknown>>;

export class DispatchService {
  private readonly engine: DispatchEngine;
  private readonly dispatchRepo: DispatchRepository;
  readonly orderServiceClient: OrderServiceClient;

  constructor(
    private readonly db: Database,
    private readonly eventBus: EventBus,
    envConfig: Pick<
      ResolvedDispatchEnv,
      | "DISPATCH_MAX_RADIUS_METERS"
      | "DISPATCH_OFFER_TIMEOUT_SECONDS"
      | "DISPATCH_MAX_ATTEMPTS"
      | "DISPATCH_CANDIDATE_LIMIT"
      | "ORDER_SERVICE_URL"
      | "ORDER_SERVICE_INTERNAL_KEY"
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
    this.orderServiceClient = new OrderServiceClient(
      envConfig.ORDER_SERVICE_URL,
      envConfig.ORDER_SERVICE_INTERNAL_KEY,
    );
  }

  async initiateDispatch(orderId: string): Promise<boolean> {
    const [order] = await this.db
      .select()
      .from(ordersFoundation)
      .where(eq(ordersFoundation.id, orderId))
      .limit(1);

    if (!order) throw new Error(`Order ${orderId} not found`);

    const attemptNumber =
      (await this.dispatchRepo.countAttemptsForOrder(orderId)) + 1;

    const [branch] = await this.db
      .select()
      .from(vendorBranches)
      .where(eq(vendorBranches.id, order.vendorBranchId))
      .limit(1);

    if (!branch) {
      throw new Error(`Vendor branch ${order.vendorBranchId} not found`);
    }

    if (!branch.latitude || !branch.longitude) {
      throw new Error(
        `Vendor branch ${order.vendorBranchId} has no coordinates`,
      );
    }

    const result = await this.engine.dispatch({
      orderId,
      vendorBranchId: order.vendorBranchId,
      pickupLocation: {
        latitude: branch.latitude,
        longitude: branch.longitude,
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

    await this.orderServiceClient.notifyRiderAssigned(
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
  ): Promise<{ orderId: string }> {
    const assignment = await this.dispatchRepo.findById(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment ${assignmentId} not found`);
    }

    if (assignment.riderId !== riderId) {
      throw new Error(`Assignment ${assignmentId} does not belong to rider ${riderId}`);
    }

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

    return { orderId: assignment.orderId };
  }
}
