import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { storage } from '../../../utils/storage';
import axios from 'axios';
import { cityAPI } from '../../../api/city.api';
import { findServiceCity, isServiceCityName, pickDefaultCity } from '../../../utils/serviceCity';

const FilterContext = createContext(null);

const COORDS_KEY = 'offerly_last_coords';
// v2: stores the street/town parts, not a resolved feed city
const GEOCODE_KEY = 'offerly_geocode_cache_v2';
const GEOCODE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
// ~500 m in degrees. A user who hasn't really moved doesn't need a fresh reverse-geocode.
const GEOCODE_REUSE_DEGREES = 0.005;
// Same key and freshness as useCities(), so this shares that cached request.
const CITIES_STALE_MS = 30 * 60 * 1000;

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

const getPosition = (options) =>
  new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));

// Street-level label for the top bar. Only cosmetic - the feed city comes from
// our own city list (see utils/serviceCity.js), never from this.
const reverseGeocode = async ({ lat, lng }) => {
  const cached = readJson(GEOCODE_KEY);
  if (
    cached &&
    Date.now() - cached.ts < GEOCODE_MAX_AGE_MS &&
    Math.abs(cached.lat - lat) < GEOCODE_REUSE_DEGREES &&
    Math.abs(cached.lng - lng) < GEOCODE_REUSE_DEGREES
  ) {
    return cached;
  }
  const response = await axios.get(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
    { timeout: 7000 }
  );
  const addr = response.data?.address || {};
  const place = {
    locality: addr.suburb || addr.neighbourhood || addr.residential || addr.road || addr.quarter || '',
    town: addr.city || addr.town || addr.village || addr.state_district || addr.county || '',
    state: addr.state || '',
  };
  writeJson(GEOCODE_KEY, { lat, lng, ...place, ts: Date.now() });
  return place;
};

export const FilterProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [selectedCity, setSelectedCityState] = useState(storage.getUser()?.city || '');
  const [currentLocation, setCurrentLocation] = useState(() => {
    return (
      localStorage.getItem('offerly_full_location') ||
      [storage.getUser()?.address, storage.getUser()?.city].filter(Boolean).join(', ')
    );
  });
  const [isLocating, setIsLocating] = useState(false);
  // True when GPS put the customer outside every city we serve, so the feed is
  // showing the default city instead - Home explains that rather than looking broken.
  const [outsideServiceArea, setOutsideServiceArea] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  // Seeded with the last known position so the home feed can rank by distance on
  // the very first request instead of waiting seconds for a GPS fix and refetching.
  const [userLocation, setUserLocation] = useState(() => {
    const saved = readJson(COORDS_KEY);
    return isCoord(saved) ? { lat: saved.lat, lng: saved.lng } : null;
  });

  const selectedCityRef = useRef(selectedCity);
  useEffect(() => {
    selectedCityRef.current = selectedCity;
  }, [selectedCity]);

  const loadCities = useCallback(async () => {
    try {
      const res = await queryClient.fetchQuery({
        queryKey: ['cities'],
        queryFn: () => cityAPI.getAll(),
        staleTime: CITIES_STALE_MS,
      });
      return res?.cities || [];
    } catch {
      return [];
    }
  }, [queryClient]);

  const applyCity = useCallback((city) => {
    if (!city) return;
    setSelectedCityState(city);
    const user = storage.getUser();
    if (user && user.city !== city) {
      storage.setUser({ ...user, city });
    }
  }, []);

  const applyLabel = useCallback((label) => {
    if (!label) return;
    setCurrentLocation(label);
    localStorage.setItem('offerly_full_location', label);
  }, []);

  // Manual city choice (top bar / home city sheet) - also clears the
  // "outside service area" note, since the customer picked this city themselves.
  const setSelectedCity = useCallback(
    (city) => {
      setOutsideServiceArea(false);
      applyCity(city);
    },
    [applyCity]
  );

  // A stored city that isn't one we serve (e.g. "Tinsukia" saved by an older
  // version) would lock the feed to nothing. Swap it for the nearest service city
  // to the last known position, else the default city.
  const ensureServiceCity = useCallback(
    async (cities) => {
      if (!cities.length || isServiceCityName(selectedCityRef.current, cities)) return;
      const saved = readJson(COORDS_KEY);
      const city = findServiceCity(saved, cities) || pickDefaultCity(cities);
      if (city) {
        applyCity(city.name);
        applyLabel(city.name);
      }
    },
    [applyCity, applyLabel]
  );

  const fetchCurrentLocation = useCallback(async () => {
    setIsLocating(true);
    const cities = await loadCities();
    // Put a usable city in place straight away, so the feed never waits on GPS
    await ensureServiceCity(cities);

    if (!navigator.geolocation) {
      setIsLocating(false);
      return;
    }

    let position;
    try {
      // Network location first: near-instant and plenty for picking a city.
      position = await getPosition({ timeout: 10000, enableHighAccuracy: false, maximumAge: 5 * 60 * 1000 });
    } catch (error) {
      // Outdoors, away from known Wi-Fi, the quick fix often fails - try real GPS
      // once before giving up. Nothing to retry if permission was refused.
      if (error?.code !== error?.PERMISSION_DENIED) {
        try {
          position = await getPosition({ timeout: 15000, enableHighAccuracy: true, maximumAge: 0 });
        } catch (retryError) {
          console.warn('Geolocation failed:', retryError?.message);
        }
      } else {
        console.warn('Geolocation permission denied');
      }
    }

    if (!position) {
      // No fix: the default/last city set by ensureServiceCity stays in place.
      setIsLocating(false);
      return;
    }

    const point = { lat: position.coords.latitude, lng: position.coords.longitude };
    // Only publish a new position when it actually moved; a fresh object every
    // load would make everything keyed on location refetch for nothing.
    setUserLocation((prev) =>
      prev && Math.abs(prev.lat - point.lat) < 1e-4 && Math.abs(prev.lng - point.lng) < 1e-4 ? prev : point
    );
    writeJson(COORDS_KEY, point);

    const nearby = findServiceCity(point, cities);
    const feedCity = nearby || pickDefaultCity(cities);
    if (feedCity) applyCity(feedCity.name);
    setOutsideServiceArea(!nearby && cities.length > 0);

    try {
      const place = await reverseGeocode(point);
      // Inside a service area, name the city the feed is showing ("NH315, Digboi").
      // Outside one, show where the customer really is; Home explains the feed.
      const label = nearby
        ? [place.locality, nearby.name, place.state]
        : [place.locality, place.town, place.state];
      applyLabel(label.filter(Boolean).join(', ') || feedCity?.name);
    } catch (error) {
      console.error('Failed to reverse geocode location:', error);
      applyLabel(feedCity?.name);
    } finally {
      setIsLocating(false);
    }
  }, [loadCities, ensureServiceCity, applyCity, applyLabel]);

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
      outsideServiceArea,
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
      setSelectedCity,
      currentLocation,
      fetchCurrentLocation,
      isLocating,
      outsideServiceArea,
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
