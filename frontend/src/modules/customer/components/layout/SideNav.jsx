import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import { useApp } from '../../context/AppContext';

const navItems = [
  { label: 'Home', icon: HomeRoundedIcon, path: '/home' },
  { label: 'Explore', icon: ExploreRoundedIcon, path: '/explore' },
  { label: 'Map', icon: MapRoundedIcon, path: '/map' },
  { label: 'Rewards & Milestones', icon: EmojiEventsRoundedIcon, path: '/rewards' },
  { label: 'Saved Offers', icon: BookmarkRoundedIcon, path: '/saved' },
  { label: 'My Redemptions', icon: ReceiptLongRoundedIcon, path: '/redemptions' },
  { label: 'Notifications', icon: NotificationsRoundedIcon, path: '/notifications' },
  { label: 'Referral', icon: CardGiftcardRoundedIcon, path: '/referral' },
  { label: 'Profile', icon: PersonRoundedIcon, path: '/profile' },
];

const SideNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, unreadCount } = useApp();
  const [isHovered, setIsHovered] = useState(false);

  // Sidebar is collapsed by default, expands on hover
  const isExpanded = isHovered;

  return (
    <aside 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`hidden lg:flex flex-col bg-surface shadow-sm z-30 border-r border-border/80 transition-all duration-300 ease-in-out flex-shrink-0 h-full overflow-y-auto scrollbar-hide ${
        isExpanded ? 'w-64' : 'w-[80px]'
      }`}
    >
      {/* Nav links */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              whileHover={isExpanded ? { x: 4 } : { scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`w-full flex items-center ${isExpanded ? 'gap-3 px-4 py-3.5' : 'justify-center py-3.5 my-1'} rounded-2xl transition-all text-sm font-semibold relative ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:bg-primary/5 hover:text-primary'
              }`}
              title={!isExpanded ? item.label : ''}
            >
              <div className="relative">
                <Icon sx={{ fontSize: 22 }} />
                {!isExpanded && item.path === '/notifications' && unreadCount > 0 && (
                  <span className="absolute -top-1 right-[-4px] bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              
              {isExpanded && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}

              {isExpanded && item.path === '/notifications' && unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}

              {/* Active Indicator Bar on the left */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-r-md" />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom credits block */}
      {user && (
        <div className="px-4 pb-6 mt-auto">
          <div className="bg-gradient-to-br from-green-50 to-primary-light rounded-2xl p-4 flex flex-col items-center border border-primary/10 shadow-sm relative overflow-hidden group">
            {/* Decorative background element */}
            <div className="absolute top-[-20%] right-[-10%] w-16 h-16 bg-primary/10 rounded-full blur-xl pointer-events-none transition-transform group-hover:scale-150"></div>
            
            {isExpanded ? (
              <div className="w-full relative z-10">
                <p className="text-xs text-text-secondary font-medium mb-0.5 flex items-center gap-1.5">
                  <CardGiftcardRoundedIcon sx={{ fontSize: 14 }} className="text-primary" />
                  Available Credits
                </p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold text-primary tracking-tight">₹{user.credits || 0}</span>
                </div>
              </div>
            ) : (
              <div className="relative z-10">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                  <CardGiftcardRoundedIcon sx={{ fontSize: 16 }} className="text-primary" />
                </div>
                <p className="text-xs font-bold text-primary">₹{user.credits || 0}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};

export default SideNav;
