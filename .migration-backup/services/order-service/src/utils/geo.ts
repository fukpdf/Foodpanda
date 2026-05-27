const EARTH_RADIUS_METERS = 6_371_000;

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c);
}

export function estimatePickupSeconds(distanceMeters: number): number {
  const AVG_SPEED_MPS = 8.33;
  const BASE_BUFFER_SECONDS = 120;
  return Math.round(distanceMeters / AVG_SPEED_MPS) + BASE_BUFFER_SECONDS;
}

export function estimateDeliverySeconds(
  pickupSeconds: number,
  deliveryDistanceMeters: number,
): number {
  const AVG_SPEED_MPS = 8.33;
  return pickupSeconds + Math.round(deliveryDistanceMeters / AVG_SPEED_MPS) + 60;
}

export function isWithinRadius(
  centerLat: number,
  centerLon: number,
  pointLat: number,
  pointLon: number,
  radiusMeters: number,
): boolean {
  return haversineDistanceMeters(centerLat, centerLon, pointLat, pointLon) <= radiusMeters;
}
