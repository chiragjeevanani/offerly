// Geodesic helpers for drawing regular hexagons on a Google Map.
// Zones are stored as { center, radiusMeters, path } — `path` is the
// precomputed vertex list so it can be rendered/persisted without
// re-deriving it from center+radius every time.

const EARTH_RADIUS_METERS = 6371000;
const HEXAGON_BEARINGS = [0, 60, 120, 180, 240, 300];

export const MIN_ZONE_RADIUS_METERS = 100;
export const MAX_ZONE_RADIUS_METERS = 5000;
export const DEFAULT_ZONE_RADIUS_METERS = 800;
export const ZONE_RADIUS_STEP_METERS = 25;

const toRadians = (deg) => (deg * Math.PI) / 180;
const toDegrees = (rad) => (rad * 180) / Math.PI;

export const destinationPoint = (center, bearingDeg, distanceMeters) => {
  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;
  const bearingRad = toRadians(bearingDeg);
  const lat1 = toRadians(center.lat);
  const lng1 = toRadians(center.lng);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

  return { lat: toDegrees(lat2), lng: toDegrees(lng2) };
};

export const computeHexagonPath = (center, radiusMeters) => {
  if (!center || typeof center.lat !== 'number' || typeof center.lng !== 'number') {
    return [];
  }
  return HEXAGON_BEARINGS.map((bearing) => destinationPoint(center, bearing, radiusMeters));
};

// Straight-line geodesic distance between two lat/lng points, used to turn a
// dragged handle position back into a radius while resizing a hexagon.
export const haversineDistance = (a, b) => {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
};

export const clampRadius = (radiusMeters) =>
  Math.min(MAX_ZONE_RADIUS_METERS, Math.max(MIN_ZONE_RADIUS_METERS, Math.round(radiusMeters)));
