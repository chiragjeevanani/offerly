// Zone geometry helpers. A zone is a hexagon stored on City.zones as
// { center, radiusMeters, path } - `path` is the 6 precomputed vertices.
// Mirrors frontend/src/utils/geoHex.js so both sides agree on what a zone covers.

const EARTH_RADIUS_METERS = 6371000;
const HEXAGON_BEARINGS = [0, 60, 120, 180, 240, 300];
const toRadians = (deg) => (deg * Math.PI) / 180;
const toDegrees = (rad) => (rad * 180) / Math.PI;

const isPoint = (p) =>
  !!p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)) && !(Number(p.lat) === 0 && Number(p.lng) === 0);

const destinationPoint = (center, bearingDeg, distanceMeters) => {
  const angular = distanceMeters / EARTH_RADIUS_METERS;
  const bearing = toRadians(bearingDeg);
  const lat1 = toRadians(center.lat);
  const lng1 = toRadians(center.lng);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );
  return { lat: toDegrees(lat2), lng: toDegrees(lng2) };
};

const haversineMeters = (a, b) => {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
};

export const zonePath = (zone) => {
  if (Array.isArray(zone?.path) && zone.path.length >= 3) return zone.path;
  if (!isPoint(zone?.center)) return [];
  return HEXAGON_BEARINGS.map((b) => destinationPoint(zone.center, b, zone.radiusMeters || 800));
};

// Ray-casting point-in-polygon. Zones are a few km across, so treating
// lat/lng as a flat plane is accurate enough.
export const pointInPolygon = (point, polygon) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const crosses =
      a.lat > point.lat !== b.lat > point.lat &&
      point.lng < ((b.lng - a.lng) * (point.lat - a.lat)) / (b.lat - a.lat) + a.lng;
    if (crosses) inside = !inside;
  }
  return inside;
};

/**
 * Returns the zone of `city` that contains `point`, or null. When hexagons
 * overlap, the one whose center is closest wins. Inactive zones are skipped
 * unless `includeInactive` is set.
 */
export const findZoneForPoint = (city, point, { includeInactive = false } = {}) => {
  if (!city || !isPoint(point)) return null;
  const p = { lat: Number(point.lat), lng: Number(point.lng) };
  let best = null;
  let bestDistance = Infinity;
  for (const zone of city.zones || []) {
    if (!includeInactive && (zone.status || 'active') !== 'active') continue;
    const path = zonePath(zone);
    if (path.length < 3 || !pointInPolygon(p, path)) continue;
    const distance = isPoint(zone.center) ? haversineMeters(p, zone.center) : 0;
    if (distance < bestDistance) {
      best = zone;
      bestDistance = distance;
    }
  }
  return best;
};

export const zoneIdForPoint = (city, point, options) => {
  const zone = findZoneForPoint(city, point, options);
  return zone ? String(zone._id) : '';
};
