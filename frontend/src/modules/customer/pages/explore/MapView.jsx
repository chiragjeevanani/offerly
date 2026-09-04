import { useEffect, useState, useMemo, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { merchantAPI } from '../../../../api/merchant.api';
import { offerAPI } from '../../../../api/offer.api';
import { categoryAPI } from '../../../../api/category.api';
import { useApp } from '../../context/AppContext';
import PageTransition from '../../components/ui/PageTransition';
import StoreCard from '../../components/ui/StoreCard';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { motion, AnimatePresence } from 'framer-motion';

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%',
};

const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: false,
  styles: [
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#e9e9e9" }, { "lightness": 17 }] },
    { "featureType": "landscape", "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }, { "lightness": 20 }] },
    { "featureType": "road.highway", "elementType": "geometry.fill", "stylers": [{ "color": "#ffffff" }, { "lightness": 17 }] },
    { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#ffffff" }, { "lightness": 29 }, { "weight": 0.2 }] },
    { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }, { "lightness": 18 }] },
    { "featureType": "road.local", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }, { "lightness": 16 }] },
    { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }, { "lightness": 21 }] },
    { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#dedede" }, { "lightness": 21 }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "visibility": "on" }, { "color": "#ffffff" }, { "lightness": 16 }] },
    { "elementType": "labels.text.fill", "stylers": [{ "saturation": 36 }, { "color": "#333333" }, { "lightness": 40 }] },
    { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
    { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#f2f2f2" }, { "lightness": 19 }] },
    { "featureType": "administrative", "elementType": "geometry.fill", "stylers": [{ "color": "#fefefe" }, { "lightness": 20 }] },
    { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#fefefe" }, { "lightness": 17 }, { "weight": 1.2 }] }
  ]
};

const MapView = () => {
  const { user, selectedCity } = useApp();
  const cityFilter = selectedCity !== 'Select City' ? selectedCity : (user?.city || undefined);
  
  const [merchants, setMerchants] = useState([]);
  const [offerCounts, setOfferCounts] = useState({});
  const [selected, setSelected] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [map, setMap] = useState(null);
  const [userLocation, setUserLocation] = useState({ lat: 26.5012, lng: 93.9681 }); // Default fallback

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAP_API_KEY
  });

  // Get real-time user position
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          console.log('Location permission denied, using default center.');
        }
      );
    }
  }, []);

  const center = useMemo(() => userLocation, [userLocation]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await categoryAPI.getAll();
        setCategories(response.categories || []);
      } catch (error) {}
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const loadMapData = async () => {
      try {
        if (!cityFilter) return;
        const [merchantRes, offersRes] = await Promise.all([
          merchantAPI.getAll({ status: 'approved', city: cityFilter }),
          offerAPI.getAll({ status: 'active', city: cityFilter })
        ]);
        setMerchants(merchantRes.merchants || []);
        const counts = {};
        (offersRes.offers || []).forEach((o) => {
          const mId = o.merchantId?._id || o.merchantId;
          if (mId) counts[mId] = (counts[mId] || 0) + 1;
        });
        setOfferCounts(counts);
      } catch (error) {}
    };
    loadMapData();
  }, [cityFilter]);

  const isMerchantOpen = (merchant) => {
    if (!merchant) return false;
    if (merchant.isOpen === false) return false;
    if (!merchant.businessHours) return true;

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const now = new Date();
    const today = days[now.getDay()];
    const hours = merchant.businessHours[today];

    if (!hours) return true;
    if (hours.isClosed || hours.isOpen === false) return false;
    if (!hours.open || !hours.close) return true;

    try {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [openH, openM] = hours.open.split(':').map(Number);
      const [closeH, closeM] = hours.close.split(':').map(Number);
      const openMinutes = openH * 60 + openM;
      const closeMinutes = closeH * 60 + closeM;
      return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    } catch {
      return true;
    }
  };

  const displayedMerchants = useMemo(() => {
    let filtered = merchants;
    if (selectedCategory !== 'All') {
      filtered = merchants.filter(m => m.category === selectedCategory);
    }
    filtered = filtered.filter(isMerchantOpen);
    return [...filtered].sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
  }, [merchants, selectedCategory]);

  const onMapLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
  }, []);

  if (!isLoaded) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-[#5EB929]/20 border-t-[#5EB929] rounded-full animate-spin" />
    </div>
  );

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-background pb-24">
        
        {/* Compact Filters */}
        <div className="sticky top-0 z-[100] bg-background/80 backdrop-blur-md px-4 py-3 border-b border-gray-100/50">
          <div className="flex overflow-x-auto scrollbar-hide gap-2">
            <button
              onClick={() => { setSelectedCategory('All'); setSelected(null); }}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                selectedCategory === 'All'
                  ? 'bg-[#5EB929] text-white shadow-lg shadow-[#5EB929]/20'
                  : 'bg-white text-gray-400 border border-gray-100 hover:border-[#5EB929]/30'
              }`}
            >
              All Partners
            </button>
            {categories.map((cat) => (
              <button
                key={cat._id}
                onClick={() => { setSelectedCategory(cat.name); setSelected(null); }}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                  selectedCategory === cat.name
                    ? 'bg-[#5EB929] text-white shadow-lg shadow-[#5EB929]/20'
                    : 'bg-white text-gray-400 border border-gray-100 hover:border-[#5EB929]/30'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1.5">
               <div className="w-2 h-2 rounded-full bg-[#5EB929] shadow-[0_0_6px_#5EB929]" />
               <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Open Shops</span>
             </div>
             <div className="flex items-center gap-1.5">
               <div className="w-2 h-2 rounded-full bg-gray-900 shadow-[0_0_6px_rgba(0,0,0,0.1)]" />
               <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">You</span>
             </div>
          </div>
          <span className="text-[10px] font-bold text-[#5EB929] uppercase tracking-tight">
            {displayedMerchants.length} Real-time Results
          </span>
        </div>

        {/* Google Map Container */}
        <div className="mx-4 h-[45vh] rounded-[2.5rem] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-white relative">
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={center}
            zoom={14}
            options={MAP_OPTIONS}
            onLoad={onMapLoad}
            onClick={() => setSelected(null)}
          >
            {/* User Marker */}
            <Marker 
              position={center} 
              icon={{
                path: window.google?.maps.SymbolPath.CIRCLE,
                fillColor: "#333",
                fillOpacity: 1,
                strokeColor: "#FFF",
                strokeWeight: 2,
                scale: 7
              }}
            />

            {/* Merchant Markers */}
            {displayedMerchants.map((merchant) => {
              if (!merchant.coordinates?.lat) return null;
              return (
                <Marker
                  key={merchant._id}
                  position={{ lat: merchant.coordinates.lat, lng: merchant.coordinates.lng }}
                  onClick={() => setSelected(merchant)}
                  icon={{
                    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                    fillColor: "#5EB929",
                    fillOpacity: 1,
                    strokeColor: "#FFFFFF",
                    strokeWeight: 2,
                    scale: 1.5,
                    anchor: new window.google.maps.Point(12, 24)
                  }}
                />
              );
            })}

            {/* InfoWindow Overlay */}
            <AnimatePresence>
              {selected && (
                <InfoWindow
                  position={{ lat: selected.coordinates.lat, lng: selected.coordinates.lng }}
                  onCloseClick={() => setSelected(null)}
                  options={{ pixelOffset: new window.google.maps.Size(0, -35) }}
                >
                  <div className="text-center p-1 min-w-[140px] font-sans">
                    <div className="relative w-12 h-12 mx-auto mb-2">
                       <img src={selected.logo || selected.coverImage} className="w-full h-full rounded-2xl object-cover shadow-sm border-2 border-white" alt=""/>
                       {selected.verified && (
                         <div className="absolute -top-1 -right-1 bg-[#5EB929] text-white p-0.5 rounded-full shadow-sm">
                           <CheckCircleRoundedIcon sx={{ fontSize: 10 }} />
                         </div>
                       )}
                    </div>
                    <h4 className="text-[11px] font-bold text-gray-900 uppercase tracking-tight leading-tight">{selected.storeName}</h4>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{selected.category}</p>
                    <div className="flex items-center justify-center gap-1 mt-2 bg-[#5EB929]/5 py-1 px-2 rounded-lg">
                       <span className="text-[9px] font-bold text-[#5EB929]">{offerCounts[selected._id] || 0} ACTIVE OFFERS</span>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </AnimatePresence>
          </GoogleMap>
        </div>

        {/* Store List Section */}
        <div className="px-4 mt-6 space-y-4">
          <div className="flex items-center justify-between px-1">
             <h2 className="text-[11px] font-bold text-gray-900 uppercase tracking-tight">
               {selected ? 'Selected Partner' : 'Top Rated Nearby'}
             </h2>
             {selected && (
               <button onClick={() => setSelected(null)} className="text-[9px] font-bold text-[#5EB929] uppercase tracking-widest">Reset View</button>
             )}
          </div>
          
          <div className="space-y-3">
            {selected ? (
              <StoreCard merchant={selected} variant="row" offerCount={offerCounts[selected._id] || 0} />
            ) : displayedMerchants.length > 0 ? (
              displayedMerchants.map((merchant) => (
                <StoreCard
                  key={merchant._id}
                  merchant={merchant}
                  variant="row"
                  offerCount={offerCounts[merchant._id] || 0}
                />
              ))
            ) : (
              <div className="py-12 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No open shops in this area</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </PageTransition>
  );
};

export default MapView;
