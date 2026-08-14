import { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../../../utils/storage';
import axios from 'axios';

const FilterContext = createContext(null);

export const FilterProvider = ({ children }) => {
  const [selectedCity, setSelectedCity] = useState(storage.getUser()?.city || 'Select City');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [userLocation, setUserLocation] = useState(null);

  // Auto-fetch location on mount
  useEffect(() => {
    const fetchCurrentLocation = async () => {
      // If city is already set in storage, we might not want to override it every time
      // But the user specifically asked for auto-fetch on app open.
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        try {
          // Use Nominatim (OpenStreetMap) for free reverse geocoding
          const response = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
            { timeout: 5000 } // Add timeout to prevent hanging
          );
          
          if (response.data && response.data.address) {
            const city = response.data.address.city || 
                         response.data.address.town || 
                         response.data.address.village || 
                         response.data.address.state_district;
            
            if (city) {
              setSelectedCity(city);
              // Update storage for persistence
              const user = storage.getUser();
              if (user) {
                storage.setUser({ ...user, city });
              }
            }
          }
        } catch (error) {
          console.error('Failed to reverse geocode location:', error);
          // Coordinates are still set in userLocation, so distance sorting will work
        }
      }, (error) => {
        console.warn('Geolocation access denied or failed:', error.message);
      });
    };

    fetchCurrentLocation();
  }, []);

  const value = {
    selectedCity,
    setSelectedCity,
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
