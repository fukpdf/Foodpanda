import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { riders, dispatchAssignments } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type {
  IDispatchAlgorithm,
  DispatchRequest,
  DispatchResult,
  DispatchConfig,
  RiderCandidate,
} from "../types/dispatch.types.js";
import { DEFAULT_DISPATCH_CONFIG } from "../types/dispatch.types.js";
import { NearestRiderAlgorithm } from "./algorithms/nearest-rider.js";
import {
  haversineDistanceMeters,
  estimatePickupSeconds,
  estimateDeliverySeconds,
} from "../utils/geo.js";
import type { EventBus } from "../events/event-bus.js";
import type {
  DispatchInitiatedEvent,
  DispatchRiderAssignedEvent,
  DispatchFailedEvent,
} from "../types/event.types.js";

type Database = NodePgDatabase<Record<string, unknown>>;

export class DispatchEngine {
  private readonly algorithm: IDispatchAlgorithm;
  private readonly config: DispatchConfig;

  constructor(
    private readonly db: Database,
    private readonly eventBus: EventBus,
    algorithm?: IDispatchAlgorithm,
    config?: Partial<DispatchConfig>,
  ) {
    this.algorithm = algorithm ?? new NearestRiderAlgorithm();
    this.config = { ...DEFAULT_DISPATCH_CONFIG, ...config };
  }

  async dispatch(request: DispatchRequest): Promise<DispatchResult | null> {
    const initiatedEvent: DispatchInitiatedEvent = {
      eventId: randomUUID(),
      eventType: "dispatch.initiated",
      orderId: request.orderId,
      occurredAt: new Date().toISOString(),
      version: 1,
      source: "order-service",
      payload: {
        attemptNumber: request.attemptNumber,
        candidateCount: 0,
      },
    };

    const candidates = await this.findCandidates(request);

    initiatedEvent.payload.candidateCount = candidates.length;
    this.eventBus.emit(initiatedEvent);

    if (candidates.length === 0) {
      const failedEvent: DispatchFailedEvent = {
        eventId: randomUUID(),
        eventType: "dispatch.failed",
        orderId: request.orderId,
        occurredAt: new Date().toISOString(),
        version: 1,
        source: "order-service",
        payload: {
          attemptNumber: request.attemptNumber,
          reason: "No available riders within search radius",
        },
      };
      this.eventBus.emit(failedEvent);
      return null;
    }

    const best = await this.algorithm.findBestRider(request, candidates);

    if (!best) {
      const failedEvent: DispatchFailedEvent = {
        eventId: randomUUID(),
        eventType: "dispatch.failed",
        orderId: request.orderId,
        occurredAt: new Date().toISOString(),
        version: 1,
        source: "order-service",
        payload: {
          attemptNumber: request.attemptNumber,
          reason: "No eligible rider found after applying selection criteria",
        },
      };
      this.eventBus.emit(failedEvent);
      return null;
    }

    const deliveryDistanceMeters = haversineDistanceMeters(
      request.pickupLocation.latitude,
      request.pickupLocation.longitude,
      request.dropoffLocation.latitude,
      request.dropoffLocation.longitude,
    );

    const estimatedDeliverySeconds = estimateDeliverySeconds(
      best.estimatedPickupSeconds,
      deliveryDistanceMeters,
    );

    const expiresAt = new Date(
      Date.now() + this.config.offerTimeoutSeconds * 1000,
    );

    await this.db.insert(dispatchAssignments).values({
      id: randomUUID(),
      orderId: request.orderId,
      riderId: best.riderId,
      status: "pending",
      riderLatitudeAtAssignment: best.latitude,
      riderLongitudeAtAssignment: best.longitude,
      distanceToPickupMeters: best.distanceMeters,
      estimatedPickupSeconds: best.estimatedPickupSeconds,
      estimatedDeliverySeconds,
      algorithm: this.algorithm.name,
      attemptNumber: request.attemptNumber,
      expiresAt,
    });

    const assignedEvent: DispatchRiderAssignedEvent = {
      eventId: randomUUID(),
      eventType: "dispatch.rider_assigned",
      orderId: request.orderId,
      occurredAt: new Date().toISOString(),
      version: 1,
      source: "order-service",
      payload: {
        riderId: best.riderId,
        distanceMeters: best.distanceMeters,
        estimatedPickupSeconds: best.estimatedPickupSeconds,
        algorithm: this.algorithm.name,
      },
    };
    this.eventBus.emit(assignedEvent);

    return {
      riderId: best.riderId,
      distanceMeters: best.distanceMeters,
      estimatedPickupSeconds: best.estimatedPickupSeconds,
      estimatedDeliverySeconds,
      algorithm: this.algorithm.name,
      candidateCount: candidates.length,
    };
  }

  private async findCandidates(
    request: DispatchRequest,
  ): Promise<RiderCandidate[]> {
    const allOnlineRiders = await this.db
      .select()
      .from(riders)
      .where(
        and(
          eq(riders.availability, "online"),
          eq(riders.status, "active"),
          eq(riders.isVerified, true),
          isNull(riders.deletedAt),
        ),
      )
      .limit(this.config.candidateLimit * 3);

    const candidates: RiderCandidate[] = [];

    for (const rider of allOnlineRiders) {
      if (
        rider.currentLatitude === null ||
        rider.currentLongitude === null
      ) {
        continue;
      }

      const distanceMeters = haversineDistanceMeters(
        request.pickupLocation.latitude,
        request.pickupLocation.longitude,
        rider.currentLatitude,
        rider.currentLongitude,
      );

      if (distanceMeters > this.config.maxSearchRadiusMeters) continue;

      const estimatedPickup = estimatePickupSeconds(distanceMeters);

      candidates.push({
        riderId: rider.id,
        userId: rider.userId,
        latitude: rider.currentLatitude,
        longitude: rider.currentLongitude,
        distanceMeters,
        estimatedPickupSeconds: estimatedPickup,
        totalActiveOrders: 0,
        averageRating: rider.averageRating,
        vehicleType: rider.vehicleType,
      });
    }

    candidates.sort((a, b) => a.distanceMeters - b.distanceMeters);
    return candidates.slice(0, this.config.candidateLimit);
  }
}
