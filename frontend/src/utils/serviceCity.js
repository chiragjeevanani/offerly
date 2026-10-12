import { haversineDistance } from './geoHex';

// The customer feed is locked to one of the cities an admin has set up in City &
// Zone management. These helpers turn a GPS position into one of those cities,
// rather than trusting a map service's town name - out on a highway OpenStreetMap
// only knows the district ("Tinsukia"), which has no stores, so the feed went blank.

// How far outside a city's centre / zones a customer still counts as "in" it.
export const SERVICE_RADIUS_METERS = 50 * 1000;

const isPoint = (p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng);

// Admin-managed, active cities that we can place on a map. The cities API also
// lists merchant-only names (ids "merchant-city-…") with no geometry - skip those.
export const getServiceCities = (cities = []) =>
  cities.filter(
    (c) =>
      !String(c._id).startsWith('merchant-city-') &&
      c.status !== 'inactive' &&
      (isPoint(c.coordinates) || (c.zones || []).some((z) => isPoint(z.center)))
  );

const storeCount = (city) =>
  (city.zones || []).reduce((sum, z) => sum + (z.status === 'inactive' ? 0 : z.merchantCount || 0), 0);

// Where to send customers we can't place: the city with the most stores, so they
// see a full feed instead of an empty one. (Digboi while it's the only city.)
export const pickDefaultCity = (cities = []) => {
  const service = getServiceCities(cities);
  if (!service.length) return null;
  return service.reduce((best, c) => (storeCount(c) > storeCount(best) ? c : best), service[0]);
};

// Distance from a point to a city: the nearest of its centre and its zones' edges.
const distanceToCity = (point, city) => {
  const distances = [];
  if (isPoint(city.coordinates)) distances.push(haversineDistance(point, city.coordinates));
  for (const zone of city.zones || []) {
    if (zone.status === 'inactive' || !isPoint(zone.center)) continue;
    distances.push(Math.max(0, haversineDistance(point, zone.center) - (zone.radiusMeters || 0)));
  }
  return distances.length ? Math.min(...distances) : Infinity;
};

// The service city the customer is in or near, or null if they're further than
// SERVICE_RADIUS_METERS from all of them.
export const findServiceCity = (point, cities = []) => {
  if (!isPoint(point)) return null;
  let best = null;
  let bestDistance = Infinity;
  for (const city of getServiceCities(cities)) {
    const d = distanceToCity(point, city);
    if (d < bestDistance) {
      best = city;
      bestDistance = d;
    }
  }
  return bestDistance <= SERVICE_RADIUS_METERS ? best : null;
};

export const isServiceCityName = (name, cities = []) =>
  !!name && getServiceCities(cities).some((c) => c.name.toLowerCase() === String(name).toLowerCase());
