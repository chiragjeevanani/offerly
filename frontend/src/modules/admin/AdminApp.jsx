import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import SpaceDashboardRoundedIcon from '@mui/icons-material/SpaceDashboardRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import ViewListRoundedIcon from '@mui/icons-material/ViewListRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';

// Admin Pages (Lazy Loaded for performance and ad-blocker resilience)
const AdminDashboard = lazy(() => import('./pages/Dashboard'));
const MerchantManagement = lazy(() => import('./pages/MerchantManagement'));
const BookingLedger = lazy(() => import('./pages/BookingLedger'));
const CityManagement = lazy(() => import('./pages/CityManagement'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const SubscriptionManagement = lazy(() => import('./pages/SubscriptionManagement'));
const PromotionRequest = lazy(() => import('./pages/PromotionRequest'));
const Analytics = lazy(() => import('./pages/Analytics'));
const CategoryManagement = lazy(() => import('./pages/CategoryManagement'));
const RewardsManagement = lazy(() => import('./pages/RewardsManagement'));
const Notifications = lazy(() => import('./pages/Notifications'));
const SearchResults = lazy(() => import('./pages/SearchResults'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
import { STORAGE_KEYS } from '../../config/constants';
import { useApp } from '../customer/context/AppContext';
import { adminAPI } from '../../api/admin.api';
import { useSocket } from '../../hooks/useSocket';

const AdminSidebar = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const location = useLocation();
  const { logout } = useApp();
  const navigate = useNavigate();
  const [merchantsExpanded, setMerchantsExpanded] = useState(
    location.pathname.includes('/admin/merchants')
  );

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: SpaceDashboardRoundedIcon },
    {
      name: 'Merchants',
      icon: StorefrontRoundedIcon,
      path: '/admin/merchants',
    },
    { name: 'Customers', path: '/admin/users', icon: GroupRoundedIcon },
    { name: 'Milestones & Rewards', path: '/admin/rewards', icon: EmojiEventsRoundedIcon },
    { name: 'Categories', path: '/admin/categories', icon: CategoryRoundedIcon },
    { name: 'Subscriptions', path: '/admin/plans', icon: PaymentsRoundedIcon },
    { name: 'Cities & Zones', path: '/admin/cities', icon: MapRoundedIcon },
    { name: 'Ad Requests', path: '/admin/ads', icon: CampaignRoundedIcon },
    { name: 'Ledger', path: '/admin/ledger', icon: ViewListRoundedIcon },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChartRoundedIcon },
  ];

  const isActive = (path) => {
    if (!path) return false;
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path.split('?')[0]);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`w-[260px] bg-[#0E1015] h-screen fixed left-0 top-0 flex flex-col border-r border-[#1F232B] z-50 text-gray-300 shadow-2xl transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Brand */}
        <div className="px-6 py-6 border-b border-[#1F232B]/50 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white uppercase flex items-center gap-2.5">
              <img src="/offerly-logo-ring.png" alt="Offerly" className="w-8 h-8 object-contain" />
              Offerly
            </h1>
            <p className="text-[9px] font-bold text-[#5EB929] uppercase tracking-[.35em] mt-1.5 ml-10">Control Center</p>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1 -mr-2 text-gray-500 hover:text-white rounded-lg hover:bg-[#1A1D24] transition-colors"
          >
            <CloseRoundedIcon />
          </button>
        </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-5 overflow-y-auto no-scrollbar space-y-1">
        <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-3">Main Menu</p>
        {navItems.map((item) => {
          if (item.expandable) {
            const isParentActive = location.pathname.includes('/admin/merchants');
            return (
              <div key={item.name} className="mb-2">
                <button
                  onClick={item.onToggle}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-md transition-all text-sm font-bold ${
                    isParentActive
                      ? 'text-white bg-[#1A1D24]'
                      : 'text-gray-400 hover:text-white hover:bg-[#1A1D24]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon sx={{ fontSize: 20 }} className={isParentActive ? 'text-[#5EB929]' : 'opacity-70'} />
                    <span>{item.name}</span>
                  </div>
                  <KeyboardArrowDownRoundedIcon
                    sx={{ fontSize: 18 }}
                    className={`transition-transform duration-300 ${item.expanded ? 'rotate-180' : ''} ${isParentActive ? 'text-white' : 'opacity-50'}`}
                  />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${item.expanded ? 'max-h-40 mt-1' : 'max-h-0'}`}>
                  <div className="ml-5 pl-4 border-l-2 border-[#1F232B] space-y-1 py-1">
                    {item.children.map((child) => {
                      const isChildActive = location.pathname + location.search === child.path || (child.path === '/admin/merchants' && location.pathname === '/admin/merchants' && !location.search);
                      return (
                        <Link
                          key={child.name}
                          to={child.path}
                          className={`block px-4 py-2.5 rounded-md text-xs font-bold transition-all relative ${
                            isChildActive
                              ? 'text-white bg-[#5EB929]/10'
                              : 'text-gray-500 hover:text-gray-300 hover:bg-[#1A1D24]/50'
                          }`}
                        >
                          {isChildActive && (
                            <div className="absolute left-[-18px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#5EB929] shadow-[0_0_8px_rgba(94, 185, 41,0.8)]" />
                          )}
                          {child.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          }

          const active = isActive(item.path);
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all text-sm font-bold group relative overflow-hidden ${
                active
                  ? 'bg-gradient-to-r from-[#5EB929]/20 to-transparent text-white border-l-2 border-[#5EB929] shadow-[inset_4px_0_0_0_#5EB929]'
                  : 'text-gray-400 hover:text-white hover:bg-[#1A1D24]/50 border-l-2 border-transparent'
              }`}
            >
              <item.icon
                sx={{ fontSize: 20 }}
                className={active ? 'text-[#5EB929]' : 'opacity-70 group-hover:text-white group-hover:opacity-100 transition-colors'}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#1F232B]/50 bg-[#0A0C0F]">
        <button
          onClick={() => { logout(); navigate('/admin/login'); }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all font-bold text-sm"
        >
          <LogoutRoundedIcon sx={{ fontSize: 18 }} />
          Sign Out
        </button>
      </div>
    </div>
    </>
  );
};

const AdminHeader = ({ onMenuToggle, pageTitle }) => {
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const { socket } = useSocket();
  const location = useLocation();
  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await adminAPI.getNotifications();
        const unread = res.data?.filter(n => !n.isRead).length || 0;
        setPendingCount(unread);
      } catch (err) {}
    };
    fetchPending();

    if (socket) {
      socket.on('admin_notification', () => {
        setPendingCount(prev => prev + 1);
      });
      return () => socket.off('admin_notification');
    }
  }, [socket]);

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/admin/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isDashboard = location.pathname === '/admin' || location.pathname === '/admin/';

  return (
    <div className="bg-white border-b border-gray-100 px-4 lg:px-10 h-16 lg:h-20 flex items-center justify-between sticky top-0 z-[80] transition-all duration-300">
      {/* Left: Mobile Title or Desktop Breadcrumb */}
      <div className="flex items-center gap-4">
        {/* Mobile View: Back arrow and Title */}
        <div className="lg:hidden flex items-center gap-3">
          {!isDashboard && (
            <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded-lg">
              <ArrowBackRoundedIcon className="text-gray-700" sx={{ fontSize: 24 }} />
            </button>
          )}
          <h1 className="text-[19px] font-medium text-gray-800">{pageTitle}</h1>
        </div>

        {/* Desktop View */}
        <div className="hidden lg:flex items-center gap-2 text-sm font-bold">
          <span className="text-gray-400 font-medium">Admin</span>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900 font-semibold">{pageTitle}</span>
        </div>
      </div>

      {/* Middle: Desktop Search Only */}
      <div className="hidden lg:block flex-1 max-w-lg mx-10 relative group">
        <SearchRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#5EB929] transition-colors" sx={{ fontSize: 20 }} />
        <input
          type="text"
          placeholder="Search merchants, users, or cities (Enter)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearchKeyPress}
          className="w-full bg-gray-100/80 border border-gray-200/50 rounded-xl py-2.5 pl-12 pr-4 text-xs font-bold text-gray-700 focus:bg-white focus:ring-2 focus:ring-[#5EB929]/20 focus:border-[#5EB929] transition-all outline-none shadow-inner shadow-gray-200/30"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold text-gray-400 bg-white border border-gray-200 rounded font-mono">⌘</kbd>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold text-gray-400 bg-white border border-gray-200 rounded font-mono">K</kbd>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 lg:gap-4">
        {/* Mobile View: Filter Icon */}
        <div className="lg:hidden flex items-center gap-2">
          <div className="h-6 w-px bg-gray-200 mx-1" />
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">
            <FilterListRoundedIcon />
          </button>
        </div>

        {/* Desktop Only Actions */}
        <div className="hidden lg:flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-100/80 px-3 py-1.5 rounded-lg border border-gray-200/50">
            <CalendarTodayRoundedIcon sx={{ fontSize: 14 }} className="text-gray-500" />
            <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">{currentDate}</span>
          </div>
          
          <button 
            onClick={() => navigate('/admin/notifications')}
            className="relative p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <NotificationsRoundedIcon sx={{ fontSize: 26 }} className="text-gray-600" />
            {pendingCount > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-white">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>

          <div className="h-8 w-px bg-gray-200" />

          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900 leading-none group-hover:text-[#5EB929] transition-colors">Super Admin</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">System Owner</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#5EB929] to-emerald-400 text-white flex items-center justify-center shadow-lg shadow-[#5EB929]/20">
              <AccountCircleRoundedIcon sx={{ fontSize: 22 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', icon: SpaceDashboardRoundedIcon, path: '/admin' },
    { label: 'Merchants', icon: GroupRoundedIcon, path: '/admin/merchants' },
    { label: 'Offers', icon: LocalOfferRoundedIcon, path: '/admin/offers' },
    { label: 'Users', icon: PersonRoundedIcon, path: '/admin/users' },
    { label: 'Settings', icon: SettingsRoundedIcon, path: '/admin/settings' },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-1 flex justify-around items-center z-[100] shadow-[0_-4px_20px_rgba(0,0,0,0.03)] pb-safe">
      {navItems.map((item) => {
        const isActive = (item.path === '/admin') ? (location.pathname === '/admin' || location.pathname === '/admin/') : location.pathname.startsWith(item.path);
        return (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-1 p-2 transition-all ${
              isActive ? 'text-[#5EB929]' : 'text-gray-400'
            }`}
          >
            <item.icon sx={{ fontSize: 24 }} />
            <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

const AdminLayout = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Determine current page title for mobile
  const getPageTitle = () => {
    if (location.pathname.includes('/merchants')) return 'Merchant Approvals';
    if (location.pathname.includes('/offers')) return 'Offers';
    if (location.pathname.includes('/users')) return 'Users';
    if (location.pathname.includes('/settings')) return 'Settings';
    return 'Dashboard';
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar - Desktop Only */}
      <div className="hidden lg:block w-[260px] flex-shrink-0">
        <AdminSidebar isMobileMenuOpen={false} setIsMobileMenuOpen={() => {}} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <AdminHeader 
          onMenuToggle={() => setIsMobileMenuOpen(true)} 
          pageTitle={getPageTitle()}
        />
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 no-scrollbar pb-40 lg:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="min-h-full"
            >
              {children}
              {/* Bottom Spacer for Mobile Scroll */}
              <div className="h-32 lg:hidden" />
            </motion.div>
          </AnimatePresence>
        </main>

        <BottomNav />
      </div>
    </div>
  );
};

const AdminApp = () => {
  const { user, isLoggedIn, authStatus } = useApp();

  // Check if user is authenticated as admin
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  const storedUser = (() => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      return data ? JSON.parse(data) : null;
    } catch { 
      return null; 
    }
  })();

  // Debug logging
  console.log('🔍 AdminApp Auth Check:', {
    hasToken: !!token,
    isLoggedIn,
    authStatus,
    userRole: user?.role,
    storedUserRole: storedUser?.role,
    pathname: window.location.pathname
  });

  const isAdmin = (
    (isLoggedIn && (user?.role === 'admin' || user?.type === 'admin')) || 
    (token && storedUser && (storedUser?.role === 'admin' || storedUser?.type === 'admin'))
  );

  console.log('✅ Is Admin:', isAdmin);

  // Not authenticated as admin → show login
  if (!isAdmin) {
    console.log('❌ Not admin, showing login page');
    return (
      <Routes>
        <Route path="/login" element={<AdminLogin />} />
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    );
  }

  // Authenticated as admin → show dashboard
  console.log('✅ Admin authenticated, showing dashboard');
  return (
    <AdminLayout>
      <Suspense fallback={<div className="p-8 text-center text-gray-500 font-bold">Initializing Portal...</div>}>
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/cities" element={<CityManagement />} />
          <Route path="/merchants" element={<MerchantManagement />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/rewards" element={<RewardsManagement />} />
          <Route path="/plans" element={<SubscriptionManagement />} />
          <Route path="/ads" element={<PromotionRequest />} />
          <Route path="/ledger" element={<BookingLedger />} />
          <Route path="/categories" element={<CategoryManagement />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/login" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
    </AdminLayout>
  );
};

export default AdminApp;
