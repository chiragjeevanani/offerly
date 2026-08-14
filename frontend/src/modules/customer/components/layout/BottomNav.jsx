import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';

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

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[9999] bg-white/95 backdrop-blur-xl border-t border-gray-100/50 pb-safe shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-around px-1 pt-1 pb-1">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path ||
            (tab.path === '/saved' && location.pathname.startsWith('/saved'));
          const Icon = tab.icon;

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center gap-1 flex-1 py-2 relative group"
            >
              {/* Active indicator bar (top) */}
              {isActive && (
                <motion.div
                  layoutId="customer-bottom-nav-indicator"
                  className="absolute top-0 left-0 right-0 h-0.5 bg-[#3D7A4F] rounded-full mx-3 shadow-[0_2px_10px_rgba(61,122,79,0.3)]"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}

              <motion.div
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className={`${isActive ? 'text-[#3D7A4F]' : 'text-gray-400'} transition-colors group-active:scale-90`}
              >
                <Icon sx={{ fontSize: 22 }} />
              </motion.div>

              <span
                className={`text-[9px] font-black leading-none uppercase tracking-tighter transition-colors ${
                  isActive ? 'text-[#3D7A4F]' : 'text-gray-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
