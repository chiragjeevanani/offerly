import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '../../../utils/storage';
import axios from 'axios';

const FilterContext = createContext(null);

const COORDS_KEY = 'offerly_last_coords';
const GEOCODE_KEY = 'offerly_geocode_cache';
const GEOCODE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
// ~500 m in degrees. A user who hasn't really moved doesn't need a fresh reverse-geocode.
const GEOCODE_REUSE_DEGREES = 0.005;

const readJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked - the cache is only an optimisation.
  }
};

const isCoord = (value) => Number.isFinite(value?.lat) && Number.isFinite(value?.lng);

export const FilterProvider = ({ children }) => {
  const [selectedCity, setSelectedCity] = useState(storage.getUser()?.city || '');
  const [currentLocation, setCurrentLocation] = useState(() => {
    return (
      localStorage.getItem('offerly_full_location') ||
      [storage.getUser()?.address, storage.getUser()?.city].filter(Boolean).join(', ')
    );
  });
  const [isLocating, setIsLocating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  // Seeded with the last known position so the home feed can rank by distance on
  // the very first request instead of waiting seconds for a GPS fix and refetching.
  const [userLocation, setUserLocation] = useState(() => {
    const saved = readJson(COORDS_KEY);
    return isCoord(saved) ? { lat: saved.lat, lng: saved.lng } : null;
  });

  const applyPlace = useCallback((fullLoc, city) => {
    setCurrentLocation(fullLoc);
    localStorage.setItem('offerly_full_location', fullLoc);

    if (city) {
      setSelectedCity(city);
      const user = storage.getUser();
      if (user) {
        storage.setUser({ ...user, city });
      }
    }
  }, []);

  const fetchCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Only publish a new position when it actually moved; a fresh object every
        // load would make everything keyed on location refetch for nothing.
        setUserLocation((prev) =>
          prev && Math.abs(prev.lat - latitude) < 1e-4 && Math.abs(prev.lng - longitude) < 1e-4
            ? prev
            : { lat: latitude, lng: longitude }
        );
        writeJson(COORDS_KEY, { lat: latitude, lng: longitude });

        const cached = readJson(GEOCODE_KEY);
        if (
          cached &&
          Date.now() - cached.ts < GEOCODE_MAX_AGE_MS &&
          Math.abs(cached.lat - latitude) < GEOCODE_REUSE_DEGREES &&
          Math.abs(cached.lng - longitude) < GEOCODE_REUSE_DEGREES
        ) {
          applyPlace(cached.fullLoc, cached.city);
          setIsLocating(false);
          return;
        }

        try {
          // Use Nominatim (OpenStreetMap) with zoom=18 for full street/suburb/locality details
          const response = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { timeout: 7000 }
          );

          if (response.data) {
            const addr = response.data.address || {};
            const city = addr.city || addr.town || addr.village || addr.state_district || addr.county || '';
            const locality = addr.suburb || addr.neighbourhood || addr.residential || addr.road || addr.quarter;
            const state = addr.state || '';

            const parts = [locality, city, state].filter(Boolean);
            const fullLoc = parts.length > 0
              ? parts.join(', ')
              : (response.data.display_name?.split(',').slice(0, 3).join(', ') || '');

            applyPlace(fullLoc, city);
            writeJson(GEOCODE_KEY, { lat: latitude, lng: longitude, fullLoc, city, ts: Date.now() });
          }
        } catch (error) {
          console.error('Failed to reverse geocode location:', error);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.warn('Geolocation access denied or failed:', error.message);
        setIsLocating(false);
      },
      // City-level accuracy is plenty for "near you", and skipping the GPS warm-up
      // (plus accepting a recent fix) turns a multi-second wait into a near-instant one.
      { timeout: 10000, enableHighAccuracy: false, maximumAge: 5 * 60 * 1000 }
    );
  }, [applyPlace]);

  // Auto-fetch location on mount
  useEffect(() => {
    fetchCurrentLocation();
  }, [fetchCurrentLocation]);

  const value = useMemo(
    () => ({
      selectedCity,
      setSelectedCity,
      currentLocation,
      setCurrentLocation,
      fetchLocation: fetchCurrentLocation,
      isLocating,
      selectedCategory,
      setSelectedCategory,
      searchQuery,
      setSearchQuery,
      unreadCount,
      setUnreadCount,
      userLocation,
      setUserLocation,
    }),
    [
      selectedCity,
      currentLocation,
      fetchCurrentLocation,
      isLocating,
      selectedCategory,
      searchQuery,
      unreadCount,
      userLocation,
    ]
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};

export const useFilter = () => {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilter must be used within FilterProvider');
  return ctx;
};

export default FilterContext;
