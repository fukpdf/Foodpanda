export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface RiderCandidate {
  riderId: string;
  userId: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  estimatedPickupSeconds: number;
  totalActiveOrders: number;
  averageRating: number | null;
  vehicleType: string;
}

export interface DispatchRequest {
  orderId: string;
  vendorBranchId: string;
  pickupLocation: GeoPoint;
  dropoffLocation: GeoPoint;
  estimatedPrepSeconds: number;
  attemptNumber: number;
  excludeRiderIds?: string[];
}

export interface DispatchResult {
  riderId: string;
  distanceMeters: number;
  estimatedPickupSeconds: number;
  estimatedDeliverySeconds: number;
  algorithm: string;
  candidateCount: number;
}

export interface IDispatchAlgorithm {
  readonly name: string;
  findBestRider(
    request: DispatchRequest,
    candidates: RiderCandidate[],
  ): Promise<RiderCandidate | null>;
}

export interface DispatchConfig {
  maxSearchRadiusMeters: number;
  offerTimeoutSeconds: number;
  maxAttempts: number;
  candidateLimit: number;
}

export const DEFAULT_DISPATCH_CONFIG: DispatchConfig = {
  maxSearchRadiusMeters: 10_000,
  offerTimeoutSeconds: 60,
  maxAttempts: 5,
  candidateLimit: 20,
};
