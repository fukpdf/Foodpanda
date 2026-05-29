import type {
  IDispatchAlgorithm,
  RiderCandidate,
  DispatchRequest,
} from "../../types/dispatch.types.js";

export class NearestRiderAlgorithm implements IDispatchAlgorithm {
  readonly name = "nearest_rider";

  private readonly MAX_ACTIVE_ORDERS = 2;
  private readonly MIN_RATING_THRESHOLD = 3.0;

  async findBestRider(
    _request: DispatchRequest,
    candidates: RiderCandidate[],
  ): Promise<RiderCandidate | null> {
    const eligible = candidates.filter((r) => {
      if (r.totalActiveOrders >= this.MAX_ACTIVE_ORDERS) return false;
      if (
        r.averageRating !== null &&
        r.averageRating < this.MIN_RATING_THRESHOLD
      )
        return false;
      return true;
    });

    if (eligible.length === 0) return null;

    eligible.sort((a, b) => {
      const distanceScore = a.distanceMeters - b.distanceMeters;
      if (distanceScore !== 0) return distanceScore;

      const ratingA = a.averageRating ?? 3.0;
      const ratingB = b.averageRating ?? 3.0;
      return ratingB - ratingA;
    });

    return eligible[0] ?? null;
  }
}
