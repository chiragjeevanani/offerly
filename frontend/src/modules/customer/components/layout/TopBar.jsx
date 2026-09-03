import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import BottomSheet from '../ui/BottomSheet';
import { useApp } from '../../context/AppContext';

// Nav links to display in the new top bar (desktop only)
const navLinks = [
  { label: 'Explore', icon: ExploreRoundedIcon, path: '/explore' },
  { label: 'Saved Objects', icon: BookmarkRoundedIcon, path: '/saved' },
  { label: 'Locations', icon: MapRoundedIcon, path: '/map' },
];

const TopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, unreadCount, selectedCity, setSelectedCity, currentLocation, setCurrentLocation, fetchLocation, isLocating } = useApp();
  const [showLocationSheet, setShowLocationSheet] = useState(false);

  // Determine back navigation context if deeply nested (though mainly handled gracefully by browser)
  const isNested = location.pathname.startsWith('/offer/') || location.pathname.startsWith('/store/');
  const activeLocation = currentLocation || selectedCity || 'Indore, Madhya Pradesh';

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100 px-4 py-3 flex items-center gap-3">
      
      {/* Dynamic Back Button / Mobile Logo */}
      <div className="flex items-center gap-3">
        {location.pathname !== '/home' && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-100 text-gray-500 hover:text-gray-900 transition-all"
          >
            <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
          </motion.button>
        )}

        {/* Logo + Location (Mobile) */}
        <div 
          className="lg:hidden flex items-center gap-2.5 cursor-pointer group min-w-0" 
          onClick={() => setShowLocationSheet(true)}
        >
          <img src="/offerly-logo-ring.png" alt="Offerly" className="w-9 h-9 object-contain drop-shadow-sm flex-shrink-0" />
          <div className="flex flex-col min-w-0 max-w-[210px] sm:max-w-[320px]">
            <span className="font-bold text-base text-gray-900 leading-tight">Offerly</span>
            <div className="flex items-center gap-1 mt-0.5 min-w-0">
               <LocationOnRoundedIcon sx={{ fontSize: 13 }} className="text-primary flex-shrink-0" />
               <span 
                 className="text-xs font-medium text-gray-600 group-hover:text-primary transition-colors truncate"
                 title={activeLocation}
               >
                 {activeLocation}
               </span>
               <KeyboardArrowDownRoundedIcon sx={{ fontSize: 14 }} className="text-gray-400 group-hover:text-primary transition-colors flex-shrink-0" />
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-8 flex-1">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/home')}>
          <img src="/offerly-logo-ring.png" alt="Offerly" className="w-10 h-10 object-contain drop-shadow-sm" />
          <span className="font-bold text-xl text-gray-900 tracking-tight">
            Offerly
          </span>
        </div>

        <div 
          className="flex flex-col items-start cursor-pointer group border-l border-gray-100 pl-6 max-w-[360px]" 
          onClick={() => setShowLocationSheet(true)}
        >
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Current Location</p>
          <div className="flex items-center gap-1.5 min-w-0">
             <LocationOnRoundedIcon sx={{ fontSize: 14 }} className="text-primary flex-shrink-0" />
             <span 
               className="text-sm font-semibold text-gray-700 group-hover:text-primary transition-colors truncate"
               title={activeLocation}
             >
               {activeLocation}
             </span>
             <KeyboardArrowDownRoundedIcon sx={{ fontSize: 16 }} className="text-gray-400 group-hover:text-primary transition-colors flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Desktop Quick Nav Links (Center) */}
      <div className="hidden lg:flex flex-1 justify-center items-center gap-6">
         {navLinks.map((item) => (
           <button
             key={item.path}
             onClick={() => navigate(item.path)}
             className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all font-bold text-[11px] uppercase tracking-widest ${
               location.pathname.startsWith(item.path)
                 ? 'text-[#5EB929] bg-[#5EB929]/5 shadow-sm border border-[#5EB929]/10'
                 : 'text-gray-400 hover:text-gray-900 hover:bg-white'
             }`}
           >
             <item.icon sx={{ fontSize: 16 }} />
             {item.label}
           </button>
         ))}
      </div>

      {/* Right User Actions (Cart, Notifications, Profile) */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Search Icon (Desktop only, not on home) */}
        {location.pathname !== '/home' && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/search')}
            className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md text-gray-400 hover:text-gray-900 transition-all"
          >
            <SearchRoundedIcon sx={{ fontSize: 20 }} />
          </motion.button>
        )}

        {/* Cart Icon (Mobile & Desktop) */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/cart')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md text-gray-400 hover:text-gray-900 transition-all"
        >
          <ShoppingCartRoundedIcon sx={{ fontSize: 20 }} />
        </motion.button>

        {/* Notifications Icon (Mobile & Desktop) */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/notifications')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md relative text-gray-400 hover:text-gray-900 transition-all"
        >
          <NotificationsRoundedIcon sx={{ fontSize: 20 }} />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#5EB929] rounded-full shadow-lg shadow-[#5EB929]/40"
              />
            )}
          </AnimatePresence>
        </motion.button>

        {/* Profile Avatar (Mobile & Desktop) */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/profile')}
          className="w-9 h-9 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-sm hover:shadow-md cursor-pointer group transition-all"
        >
          <span className="text-[#5EB929] font-bold text-[12px] group-hover:scale-110 transition-transform">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </span>
        </motion.button>
      </div>
    </header>

    {/* Location Picker BottomSheet */}
    <BottomSheet
      isOpen={showLocationSheet}
      onClose={() => setShowLocationSheet(false)}
      title="Current Location"
    >
      <div className="p-5 space-y-4">
        {/* Active detected address card */}
        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-[#5EB929] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5EB929]">Active Location</span>
          </div>
          <p className="text-sm font-bold text-gray-900 leading-snug">
            {activeLocation}
          </p>
        </div>

        {/* Detect GPS Location Button */}
        <button
          onClick={async () => {
            if (fetchLocation) await fetchLocation();
            setShowLocationSheet(false);
          }}
          disabled={isLocating}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl bg-primary text-white font-bold text-sm shadow-md shadow-primary/25 active:scale-95 transition-all disabled:opacity-50"
        >
          <MyLocationRoundedIcon sx={{ fontSize: 18 }} className={isLocating ? 'animate-spin' : ''} />
          <span>{isLocating ? 'Detecting GPS Location...' : 'Use Current GPS Location'}</span>
        </button>

        {/* Quick City Switcher */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">Switch City</p>
          <div className="grid grid-cols-2 gap-2">
            {['Indore', 'Bhopal', 'Mumbai', 'Delhi', 'Pune', 'Ujjain'].map((c) => (
              <button
                key={c}
                onClick={() => {
                  setSelectedCity(c);
                  setCurrentLocation(`${c}, Madhya Pradesh`);
                  localStorage.setItem('offerly_full_location', `${c}, Madhya Pradesh`);
                  setShowLocationSheet(false);
                }}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                  (currentLocation?.includes(c) || selectedCity === c)
                    ? 'border-[#5EB929] bg-[#5EB929]/10 text-[#5EB929]'
                    : 'border-gray-100 hover:border-gray-200 text-gray-700 bg-white'
                }`}
              >
                📍 {c}
              </button>
            ))}
          </div>
        </div>
      </div>
    </BottomSheet>
  </>
  );
};

export default TopBar;
