import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import useKeyboardVisible from '../../../../hooks/useKeyboardVisible';
import { preloadCustomerPath } from '../../../../routes/customerPages';

const tabs = [
  { label: 'Home', icon: HomeRoundedIcon, path: '/home' },
  { label: 'Explore', icon: ExploreRoundedIcon, path: '/explore' },
  { label: 'Map', icon: MapRoundedIcon, path: '/map' },
  { label: 'Offers', icon: LocalOfferRoundedIcon, path: '/saved' },
  { label: 'Profile', icon: PersonRoundedIcon, path: '/profile' },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isKeyboardOpen = useKeyboardVisible();

  // The tapped tab lights up immediately. Without this the highlight only moved
  // once the next page had finished loading, so a tap looked ignored. Tied to the
  // page the tap happened on, so it clears itself as soon as the route changes.
  const [tap, setTap] = useState(null);
  const currentPath = tap && tap.from === location.pathname ? tap.to : location.pathname;

  if (isKeyboardOpen) return null;

  return (
    // No backdrop-blur: a full-width blur filter over scrolling content is a
    // well-known source of dropped frames on mid-range Android phones.
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-gray-200/50 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-around px-2 py-1 max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive =
            currentPath === tab.path ||
            (tab.path === '/saved' && currentPath.startsWith('/saved'));
          const Icon = tab.icon;

          return (
            <motion.button
              key={tab.path}
              whileTap={{ scale: 0.9 }}
              // Begin fetching the page's code the moment a finger touches the tab,
              // ~100 ms before the click event fires.
              onPointerDown={() => preloadCustomerPath(tab.path)}
              onClick={() => {
                if (tab.path === location.pathname) return;
                setTap({ from: location.pathname, to: tab.path });
                navigate(tab.path);
              }}
              className="relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-150 select-none group"
            >
              {/* Fluid animated pill background for active tab */}
              {isActive && (
                <motion.div
                  layoutId="customer-bottom-nav-active-pill"
                  className="absolute inset-x-1 inset-y-0.5 bg-primary/10 rounded-xl"
                  transition={{ type: 'spring', stiffness: 600, damping: 40 }}
                />
              )}

              <motion.div
                animate={{
                  scale: isActive ? 1.1 : 1,
                  y: isActive ? -1 : 0,
                }}
                transition={{ type: 'spring', stiffness: 450, damping: 22 }}
                className={`relative z-10 transition-colors ${
                  isActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-600'
                }`}
              >
                <Icon sx={{ fontSize: 20 }} />
              </motion.div>

              <span
                className={`relative z-10 text-[10px] tracking-tight leading-none mt-0.5 transition-colors ${
                  isActive
                    ? 'text-primary font-bold'
                    : 'text-gray-400 group-hover:text-gray-600 font-medium'
                }`}
              >
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
