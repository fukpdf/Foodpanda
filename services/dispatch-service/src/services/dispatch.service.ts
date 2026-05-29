import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { vendorBranches, ordersFoundation } from "@workspace/db";
import type { DispatchAssignment } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { EventBus } from "../events/event-bus.js";
import { DispatchEngine } from "../dispatch-engine/dispatcher.js";
import { DispatchRepository } from "../repositories/dispatch.repository.js";
import { DispatchRecordRepository } from "../repositories/dispatch-record.repository.js";
import type { DispatchConfig } from "../types/dispatch.types.js";
import type { ResolvedDispatchEnv } from "../config/env.js";
import { OrderServiceClient } from "../client/order-service.client.js";

type Database = NodePgDatabase<Record<string, unknown>>;

const TERMINAL_ASSIGNMENT_STATUSES = new Set([
  "accepted",
  "rejected",
  "cancelled",
  "completed",
  "expired",
]);

export class DispatchService {
  private readonly engine: DispatchEngine;
  readonly dispatchRepo: DispatchRepository;
  private readonly dispatchRecordRepo: DispatchRecordRepository;
  readonly orderServiceClient: OrderServiceClient;
  private readonly maxAttempts: number;

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

    this.maxAttempts = envConfig.DISPATCH_MAX_ATTEMPTS;
    this.engine = new DispatchEngine(db, eventBus, undefined, dispatchConfig);
    this.dispatchRepo = new DispatchRepository(db);
    this.dispatchRecordRepo = new DispatchRecordRepository(db);
    this.orderServiceClient = new OrderServiceClient(
      envConfig.ORDER_SERVICE_URL,
      envConfig.ORDER_SERVICE_INTERNAL_KEY,
    );
  }

  // ── A. Idempotent dispatch initiation with retry support ─────────────────

  async initiateDispatch(orderId: string): Promise<boolean> {
    // F. Idempotency: if a pending offer already exists, skip
    const existingPending =
      await this.dispatchRepo.findActivePendingForOrder(orderId);
    if (existingPending) {
      return false;
    }

    // F. Idempotency: if dispatch record is already accepted/completed
    const dispatchRecord = await this.dispatchRecordRepo.findByOrder(orderId);
    if (
      dispatchRecord?.status === "accepted" ||
      dispatchRecord?.status === "completed"
    ) {
      return false;
    }

    const [order] = await this.db
      .select()
      .from(ordersFoundation)
      .where(eq(ordersFoundation.id, orderId))
      .limit(1);

    if (!order) throw new Error(`Order ${orderId} not found`);

    const attemptNumber =
      (await this.dispatchRepo.countAttemptsForOrder(orderId)) + 1;

    // A. Max attempts guard — prevent infinite retry loop
    if (attemptNumber > this.maxAttempts) {
      await this.dispatchRecordRepo
        .updateStatus(orderId, "cancelled", {
          cancellationReason: "Max dispatch attempts exceeded",
          cancelledAt: new Date(),
        })
        .catch(() => {});
      await this.orderServiceClient
        .notifyDispatchFailed(orderId, "Max dispatch attempts exceeded")
        .catch(() => {});
      return false;
    }

    const [branch] = await this.db
      .select()
      .from(vendorBranches)
      .where(eq(vendorBranches.id, order.vendorBranchId))
      .limit(1);

    if (!branch?.latitude || !branch?.longitude) {
      throw new Error(
        `Vendor branch ${order.vendorBranchId} has no coordinates`,
      );
    }

    // C. Reassignment: exclude all previously attempted riders
    const previousAttempts = await this.dispatchRepo.findByOrder(orderId);
    const excludeRiderIds = [
      ...new Set(previousAttempts.map((a) => a.riderId)),
    ];

    // Create / update dispatch record for this attempt
    await this.dispatchRecordRepo.upsert(orderId, {
      status: "pending",
      pickupLatitude: branch.latitude,
      pickupLongitude: branch.longitude,
      dropoffLatitude: order.deliveryLatitude ?? 0,
      dropoffLongitude: order.deliveryLongitude ?? 0,
      maxAttempts: this.maxAttempts,
      totalAttempts: attemptNumber,
    });

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
      excludeRiderIds,
    });

    if (!result) {
      // No rider found this attempt
      if (attemptNumber >= this.maxAttempts) {
        // B. Exhausted all attempts — notify order-service to cancel
        await this.dispatchRecordRepo
          .updateStatus(orderId, "cancelled", {
            cancellationReason: "No riders available after max attempts",
            cancelledAt: new Date(),
          })
          .catch(() => {});
        await this.orderServiceClient
          .notifyDispatchFailed(
            orderId,
            "No riders available after max dispatch attempts",
          )
          .catch(() => {});
      }
      return false;
    }

    // Update dispatch record: offer pending
    await this.dispatchRecordRepo.upsert(orderId, {
      status: "offer_pending",
      currentRiderId: result.riderId,
      totalAttempts: attemptNumber,
    });

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

  // ── G. Acknowledge: accept or reject a dispatch offer ────────────────────

  async acknowledgeDispatch(
    assignmentId: string,
    riderId: string,
    accepted: boolean,
    reason?: string,
  ): Promise<{ orderId: string; idempotent?: boolean }> {
    const assignment = await this.dispatchRepo.findById(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment ${assignmentId} not found`);
    }

    if (assignment.riderId !== riderId) {
      throw new Error(
        `Assignment ${assignmentId} does not belong to rider ${riderId}`,
      );
    }

    // F. Idempotency: already in a terminal state
    if (TERMINAL_ASSIGNMENT_STATUSES.has(assignment.status)) {
      return { orderId: assignment.orderId, idempotent: true };
    }

    if (accepted) {
      await this.dispatchRepo.updateStatus(assignmentId, "accepted", {
        respondedAt: new Date(),
      });
      await this.dispatchRecordRepo.updateStatus(
        assignment.orderId,
        "accepted",
        { riderAcceptedAt: new Date() },
      );
    } else {
      await this.dispatchRepo.updateStatus(assignmentId, "rejected", {
        respondedAt: new Date(),
        rejectionReason: reason,
      });
      // A. Trigger retry asynchronously — fire and forget
      void Promise.resolve().then(() =>
        this.initiateDispatch(assignment.orderId).catch(() => {}),
      );
    }

    return { orderId: assignment.orderId };
  }

  // ── B + D. Expiry processing (called by sweep worker) ────────────────────

  async processExpiredOffer(assignment: DispatchAssignment): Promise<void> {
    // Guard: only process genuinely pending offers
    if (assignment.status !== "pending") return;

    await this.dispatchRepo.updateStatus(assignment.id, "expired", {
      respondedAt: new Date(),
    });

    // A. Trigger retry after expiry
    await this.initiateDispatch(assignment.orderId).catch(() => {});
  }

  async processExpiredOffers(): Promise<number> {
    const expired = await this.dispatchRepo.findExpiredOffers();
    let processed = 0;
    for (const assignment of expired) {
      try {
        await this.processExpiredOffer(assignment);
        processed++;
      } catch {
        // Continue processing remaining expired offers
      }
    }
    return processed;
  }

  // ── G. Dispatch lifecycle update helpers ─────────────────────────────────

  async recordArrivedAtVendor(orderId: string): Promise<void> {
    await this.dispatchRecordRepo.updateStatus(orderId, "arrived_vendor", {
      arrivedVendorAt: new Date(),
    });
  }

  async recordPickedUp(orderId: string): Promise<void> {
    await this.dispatchRecordRepo.updateStatus(orderId, "pending", {
      pickedUpAt: new Date(),
    });
  }

  async recordInTransit(orderId: string): Promise<void> {
    await this.dispatchRecordRepo.updateStatus(orderId, "in_transit", {
      inTransitAt: new Date(),
    });
  }

  async recordArrivedAtCustomer(orderId: string): Promise<void> {
    await this.dispatchRecordRepo.updateStatus(orderId, "arrived_customer", {
      arrivedCustomerAt: new Date(),
    });
  }

  async recordDelivered(orderId: string): Promise<void> {
    await this.dispatchRecordRepo.updateStatus(orderId, "completed", {
      completedAt: new Date(),
    });
  }
}
