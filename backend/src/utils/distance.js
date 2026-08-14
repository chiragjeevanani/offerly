/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // Validate inputs
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    return null;
  }

  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
const toRad = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Validate if coordinates are valid
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {boolean} True if valid
 */
const isValidCoordinate = (lat, lon) => {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
};

/**
 * Format distance for display
 * @param {number} distance - Distance in kilometers
 * @returns {string} Formatted distance string
 */
export const formatDistance = (distance) => {
  if (distance === null || distance === undefined || isNaN(distance)) {
    return 'N/A';
  }

  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }

  return `${distance.toFixed(1)} km`;
};
