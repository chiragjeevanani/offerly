import { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../../../utils/storage';
import axios from 'axios';

const FilterContext = createContext(null);

export const FilterProvider = ({ children }) => {
  const [selectedCity, setSelectedCity] = useState(storage.getUser()?.city || 'Indore');
  const [currentLocation, setCurrentLocation] = useState(() => {
    return (
      localStorage.getItem('offerly_full_location') ||
      (storage.getUser()?.address
        ? `${storage.getUser().address}, ${storage.getUser()?.city || 'Indore'}`
        : `${storage.getUser()?.city || 'Indore'}, Madhya Pradesh`)
    );
  });
  const [isLocating, setIsLocating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [userLocation, setUserLocation] = useState(null);

  const fetchCurrentLocation = async () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        try {
          // Use Nominatim (OpenStreetMap) with zoom=18 for full street/suburb/locality details
          const response = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { timeout: 7000 }
          );

          if (response.data) {
            const addr = response.data.address || {};
            const city = addr.city || addr.town || addr.village || addr.state_district || addr.county || 'Indore';
            const locality = addr.suburb || addr.neighbourhood || addr.residential || addr.road || addr.quarter;
            const state = addr.state || 'Madhya Pradesh';

            const parts = [locality, city, state].filter(Boolean);
            const fullLoc = parts.length > 0
              ? parts.join(', ')
              : (response.data.display_name?.split(',').slice(0, 3).join(', ') || `${city}, ${state}`);

            setCurrentLocation(fullLoc);
            localStorage.setItem('offerly_full_location', fullLoc);

            if (city) {
              setSelectedCity(city);
              const user = storage.getUser();
              if (user) {
                storage.setUser({ ...user, city });
              }
            }
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
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Auto-fetch location on mount
  useEffect(() => {
    fetchCurrentLocation();
  }, []);

  const value = {
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
  };

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};

export const useFilter = () => {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilter must be used within FilterProvider');
  return ctx;
};

export default FilterContext;
