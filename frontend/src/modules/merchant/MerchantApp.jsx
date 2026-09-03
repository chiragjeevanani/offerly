import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import QrCodeScannerRoundedIcon from '@mui/icons-material/QrCodeScannerRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import ContactSupportRoundedIcon from '@mui/icons-material/ContactSupportRounded';
import HelpRoundedIcon from '@mui/icons-material/HelpRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import SpaRoundedIcon from '@mui/icons-material/SpaRounded';

import { useApp } from '../customer/context/AppContext';
import { merchantAPI } from '../../api/merchant.api';
import OtpVerify from '../customer/pages/auth/OtpVerify';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';

// Sub-modules (Lazy Loaded to prevent ad-blockers from crashing the app)
const MerchantLogin = lazy(() => import('./auth/MerchantLogin'));
const MerchantSignup = lazy(() => import('./auth/MerchantSignup'));
const MerchantStatus = lazy(() => import('./auth/MerchantStatus'));
const MerchantRegistrationFlow = lazy(() => import('./auth/MerchantRegistrationFlow'));
const MerchantDashboard = lazy(() => import('./pages/Dashboard'));
const Bookings = lazy(() => import('./pages/Bookings'));
const Products = lazy(() => import('./pages/Products'));
const ProductCategories = lazy(() => import('./pages/ProductCategories'));
const Offers = lazy(() => import('./pages/Offers'));
const Customers = lazy(() => import('./pages/Customers'));
const ScannerEntry = lazy(() => import('./pages/ScannerEntry'));
const Advertise = lazy(() => import('./pages/Advertise'));
const Insights = lazy(() => import('./pages/Insights'));

// Static Pages (Risk for Ad-Blockers)
const About = lazy(() => import('./pages/static/About'));
const LegalTerms = lazy(() => import('./pages/static/LegalTerms'));
const LegalPrivacy = lazy(() => import('./pages/static/LegalPrivacy'));
const Contact = lazy(() => import('./pages/static/Contact'));
const Support = lazy(() => import('./pages/static/Support'));

// Notifications & Profile
const Notifications = lazy(() => import('./pages/Notifications'));
const Profile = lazy(() => import('./pages/Profile'));

import SubscriptionRenewal from './components/SubscriptionRenewal';

// Reuse the loader from the main app or define a simple one
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const MerchantSidebar = ({ merchant, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const location = useLocation();
  const { logout } = useApp();
  const navigate = useNavigate();

  const mainNavItems = [
    { name: 'Dashboard', path: '/merchant', icon: DashboardRoundedIcon },
    { name: 'Insights', path: '/merchant/insights', icon: InsightsRoundedIcon },
    { name: 'Live Bookings', path: '/merchant/bookings', icon: ReceiptLongRoundedIcon },
    { name: 'Verify QR', path: '/merchant/scanner', icon: QrCodeScannerRoundedIcon },
  ];

  const storeNavItems = [
    { 
      name: merchant?.storeType === 'service_based' ? 'Store Services' : 'Store Products', 
      path: '/merchant/products', 
      icon: merchant?.storeType === 'service_based' ? SpaRoundedIcon : Inventory2RoundedIcon 
    },
    { name: 'Categories & Discounts', path: '/merchant/categories', icon: CategoryRoundedIcon },
    { name: 'Active Offers', path: '/merchant/offers', icon: LocalOfferRoundedIcon },
    { name: 'Customers', path: '/merchant/customers', icon: PeopleAltRoundedIcon },
    { name: 'Advertise', path: '/merchant/advertise', icon: CampaignRoundedIcon, badge: 'BOOST' },
  ];

  const accountNavItems = [
    { name: 'Notifications', path: '/merchant/notifications', icon: NotificationsRoundedIcon },
    { name: 'Profile', path: '/merchant/profile', icon: PersonRoundedIcon },
  ];

  const helpNavItems = [
    { name: 'About', path: '/merchant/about', icon: InfoRoundedIcon },
    { name: 'Support', path: '/merchant/support', icon: HelpRoundedIcon },
    { name: 'Contact', path: '/merchant/contact', icon: ContactSupportRoundedIcon },
    { name: 'Terms', path: '/merchant/terms', icon: DescriptionRoundedIcon },
    { name: 'Privacy', path: '/merchant/privacy', icon: SecurityRoundedIcon },
  ];

  const handleNavClick = () => {
    // Close mobile menu when navigation item is clicked
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  const renderNavItem = (item) => {
    const isActive = location.pathname === item.path || (item.path !== '/merchant' && location.pathname.startsWith(item.path));
    return (
      <Link
        key={item.name}
        to={item.path}
        onClick={handleNavClick}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group relative ${isActive
            ? 'bg-[#5EB929]/10 text-white font-bold'
            : 'text-gray-400 hover:text-white hover:bg-white/[0.04] font-bold'
          }`}
      >
        {/* Active accent stripe */}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#5EB929] rounded-r-full shadow-[0_0_10px_rgba(94, 185, 41,0.5)]" />
        )}
        {item.badge && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-amber-400 text-black text-[7px] font-bold rounded-md shadow-lg scale-90">
            {item.badge}
          </span>
        )}
        <item.icon sx={{ fontSize: 18 }} className={isActive ? 'text-[#5EB929]' : 'text-gray-500 group-hover:text-[#5EB929] transition-colors'} />
        <span className="text-[12px] uppercase tracking-wide">{item.name}</span>
      </Link>
    );
  };

  return (
    <div className={`w-[260px] gradient-dark-sidebar h-screen fixed left-0 top-0 flex flex-col shadow-2xl z-50 transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
      {/* Mobile Close Button */}
      <button
        onClick={() => setIsMobileMenuOpen(false)}
        className="lg:hidden absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
        aria-label="Close menu"
      >
        <CloseRoundedIcon sx={{ fontSize: 20 }} />
      </button>

      {/* ── Brand + Store Info ─────────────────── */}
      <div className="p-6 pb-5">
        <div className="flex items-center gap-2.5">
          <img src="/offerly-logo-ring.png" alt="Offerly" className="w-7 h-7 object-contain" />
          <h1 className="text-xl font-display font-bold text-white tracking-tight uppercase">
             OFFERLY<span className="text-[#5EB929] italic">BIZ</span>
          </h1>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 border border-white/10 p-0.5 flex-shrink-0 shadow-2xl">
            {merchant?.logo ? (
              <img src={merchant?.logo} className="w-full h-full object-cover rounded-lg" alt="" />
            ) : (
              <div className="w-full h-full bg-[#5EB929]/20 flex items-center justify-center text-[#5EB929] font-bold text-lg rounded-lg">
                {merchant?.storeName?.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white truncate leading-tight tracking-tight">{merchant?.storeName}</p>
            <p className="text-[9px] font-bold text-[#5EB929] uppercase mt-1 tracking-widest opacity-80">{merchant?.category}</p>
          </div>
        </div>
      </div>

      {/* ── Divider ────────────────────────────── */}
      <div className="mx-6 h-px bg-gradient-to-r from-transparent via-gray-700/50 to-transparent" />

      {/* ── Navigation ─────────────────────────── */}
      <nav className="flex-1 p-4 flex flex-col gap-0.5 overflow-y-auto scrollbar-thin">
        <p className="text-micro text-gray-500 uppercase tracking-widest pl-4 mb-2 mt-2">Overview</p>
        {mainNavItems.map(renderNavItem)}

        <p className="text-micro text-gray-500 uppercase tracking-widest pl-4 mb-2 mt-5">Store Management</p>
        {storeNavItems.map(renderNavItem)}

        <p className="text-micro text-gray-500 uppercase tracking-widest pl-4 mb-2 mt-5">Account</p>
        {accountNavItems.map(renderNavItem)}

        <p className="text-micro text-gray-500 uppercase tracking-widest pl-4 mb-2 mt-5">Help & Legal</p>
        {helpNavItems.map(renderNavItem)}
      </nav>

      {/* ── Bottom Section ─────────────────────── */}
      <div className="p-4 space-y-2">
        {/* Subscription Badge */}
        {merchant?.subscription?.plan?.name && (
          <div className="mx-2 mb-2 p-3.5 rounded-2xl bg-[#5EB929]/10 border border-[#5EB929]/20 shadow-lg shadow-[#5EB929]/5">
            <div className="flex items-center gap-2">
              <WorkspacePremiumRoundedIcon sx={{ fontSize: 16 }} className="text-[#5EB929]" />
              <span className="text-[10px] font-bold text-[#5EB929] uppercase tracking-widest">{merchant.subscription.plan.name}</span>
            </div>
            {merchant.remainingDays !== undefined && (
              <p className="text-[9px] font-bold text-gray-500 mt-1 pl-6 uppercase tracking-tight">{merchant.remainingDays} Days Active</p>
            )}
          </div>
        )}

        <div className="mx-2 h-px bg-gray-800/50" />

        <button
          onClick={() => { logout(); navigate('/merchant'); handleNavClick(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-400/5 transition-all font-medium text-sm"
        >
          <LogoutRoundedIcon sx={{ fontSize: 18 }} />
          Logout
        </button>
        <Link to="/" onClick={handleNavClick} className="flex items-center gap-2 text-micro text-gray-500 hover:text-gray-300 px-4 tracking-widest transition-colors py-1.5">
          <ArrowBackIosNewRoundedIcon sx={{ fontSize: 10 }} /> Back to Offerly
        </Link>
      </div>
    </div>
  );
};

const MerchantBottomNav = ({ unreadCount }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Home', path: '/merchant', icon: DashboardRoundedIcon },
    { label: 'Orders', path: '/merchant/bookings', icon: ReceiptLongRoundedIcon },
    { label: 'Verify', path: '/merchant/scanner', icon: QrCodeScannerRoundedIcon, special: true },
    { label: 'Offers', path: '/merchant/offers', icon: LocalOfferRoundedIcon },
    { label: 'Account', path: '/merchant/profile', icon: PersonRoundedIcon },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[9999] pointer-events-none">
       {/* Background glass bar stuck to edges */}
       <div className="bg-white/90 backdrop-blur-2xl border-t border-gray-100 h-16 w-full flex items-center justify-around px-2 pointer-events-auto relative shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          {navItems.map((item) => {
             const isActive = location.pathname === item.path;
             const Icon = item.icon;

             if (item.special) {
                return (
                   <button 
                      key={item.label} onClick={() => navigate(item.path)}
                      className="relative -top-5 w-16 h-16 bg-gray-900 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-black/40 group active:scale-90 transition-all border-4 border-[#F8FAFC]"
                   >
                      <div className="absolute inset-0 bg-[#5EB929] rounded-2xl opacity-0 group-active:opacity-100 transition-opacity" />
                      <Icon sx={{ fontSize: 32 }} className="relative z-10 text-white" />
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#5EB929] rounded-full border-2 border-white animate-pulse shadow-[0_0_10px_rgba(94, 185, 41,0.5)]" />
                   </button>
                );
             }

             return (
                <button 
                   key={item.label} onClick={() => navigate(item.path)}
                   className="flex flex-col items-center justify-center gap-1 w-14 group transition-all relative h-full"
                >
                   <div className="relative">
                      <Icon 
                        sx={{ fontSize: 24 }} 
                        className={`transition-all duration-300 ${isActive ? 'text-[#5EB929]' : 'text-gray-400 group-active:scale-90'}`} 
                      />
                      {item.label === 'Account' && unreadCount > 0 && (
                         <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#5EB929] rounded-full border-2 border-white" />
                      )}
                   </div>
                   <span className={`text-[9px] font-bold uppercase tracking-tight transition-colors ${isActive ? 'text-[#5EB929]' : 'text-gray-400'}`}>
                      {item.label}
                   </span>
                   {isActive && (
                      <motion.div layoutId="nav-pill" className="absolute bottom-0 w-8 h-1 bg-[#5EB929] rounded-t-full shadow-[0_0_10px_rgba(94, 185, 41,0.4)]" />
                   )}
                </button>
             );
          })}
       </div>
    </div>
  );
};

// Global Guard Wrapper
const MerchantApp = () => {
  const { user, isLoggedIn, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [merchant, setMerchant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchMerchant = async () => {
    if (isLoggedIn && user) {
      try {
        setLoading(true);
        const [mRes, sRes] = await Promise.all([
          merchantAPI.getById('me'),
          merchantAPI.getMySubscription()
        ]);

        if (mRes.merchant) {
          const merchantData = mRes.merchant;
          if (sRes.subscription) {
            const endDate = new Date(sRes.subscription.endDate);
            const now = new Date();
            merchantData.subscription = sRes.subscription;
            merchantData.isSubscriptionExpired = endDate < now;
            merchantData.remainingDays = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
          } else if (merchantData.status === 'approved') {
            // Approved but no subscription yet = expired/needs selection
            merchantData.isSubscriptionExpired = true;
            merchantData.remainingDays = 0;
          }
          setMerchant(merchantData);
        }
        fetchUnreadCount();
      } catch (error) {
        console.error('Failed to fetch merchant data:', error);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await merchantAPI.getNotifications();
      if (response.success) {
        setUnreadCount(response.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  useEffect(() => {
    fetchMerchant();
  }, [isLoggedIn, user]);

  useEffect(() => {
    if (location.pathname === '/merchant/status' && isLoggedIn && user) {
      fetchMerchant();
    }
  }, [location.pathname, isLoggedIn, user]);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !merchant?._id) return;

    const handleNotification = (notification) => {
      toast.success(notification.title, {
        description: notification.body,
        duration: 6000,
      });
      fetchUnreadCount();
      if (notification.type === 'store_status') {
        fetchMerchant();
      }
    };

    socket.on('merchant_notification', handleNotification);

    return () => {
      socket.off('merchant_notification', handleNotification);
    };
  }, [socket, merchant?._id]);

  if (loading) return (
    <div className="min-h-screen grid place-items-center bg-background">
      <div className="w-10 h-10 border-2 border-[#5EB929]/20 border-t-[#5EB929] rounded-full animate-spin" />
    </div>
  );

  if (!isLoggedIn || user?.type !== 'merchant') {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/merchant/login" replace />} />
        <Route path="/login" element={<MerchantLogin />} />
        <Route path="/signup" element={<MerchantSignup />} />
        <Route path="/verify" element={<OtpVerify />} />
        <Route path="*" element={<Navigate to="/merchant" replace />} />
      </Routes>
    );
  }

  if (!merchant || !merchant.hasRequestedStore || (merchant.onboardingStep < 4)) {
    return (
      <Routes>
        <Route path="/register" element={<MerchantRegistrationFlow />} />
        <Route path="/status" element={<Navigate to="/merchant/register" replace />} />
        <Route path="*" element={<Navigate to="/merchant/register" replace />} />
      </Routes>
    );
  }

  if (merchant.status === 'pending' || merchant.status === 'rejected') {
    return (
      <Routes>
        <Route path="/status" element={<MerchantStatus merchant={merchant} onStatusChange={fetchMerchant} />} />
        <Route path="*" element={<Navigate to="/merchant/status" replace />} />
      </Routes>
    );
  }

  if (merchant.isSubscriptionExpired) {
    return <SubscriptionRenewal merchant={merchant} />;
  }

  if (merchant?.status === 'approved') {
    return (
      <div className="flex bg-background min-h-screen font-sans">
        <MerchantSidebar merchant={merchant} />
        
        {/* Premium Mobile Top Nav */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-[9999] bg-white/80 backdrop-blur-2xl border-b border-gray-100 h-14 flex items-center justify-between px-4">
            <div className="flex items-center gap-2.5">
              {location.pathname !== '/merchant' && (
                <button 
                  onClick={() => navigate(-1)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 active:scale-95 transition-all"
                >
                  <ArrowBackIosNewRoundedIcon sx={{ fontSize: 16 }} />
                </button>
              )}
              <img src="/offerly-logo-ring.png" alt="Offerly" className="w-6 h-6 object-contain" />
              <h1 className="text-[15px] font-bold text-gray-900 tracking-tight uppercase">
                 OFFERLY<span className="text-[#5EB929] italic">BIZ</span>
              </h1>
            </div>
           <button 
             onClick={() => navigate('/merchant/notifications')}
             className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 active:scale-95 transition-all"
           >
              <NotificationsRoundedIcon sx={{ fontSize: 20 }} />
              {unreadCount > 0 && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-[#5EB929] rounded-full border-2 border-white animate-pulse" />
              )}
           </button>
        </div>
        
        {/* New Premium Mobile Nav Bar */}
        <MerchantBottomNav unreadCount={unreadCount} />

        <main className="flex-1 lg:ml-[260px] p-4 lg:p-8 pt-20 pb-24 lg:pb-8 relative overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-[#5EB929]/[0.03] rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 w-full max-w-7xl mx-auto">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<MerchantDashboard merchant={merchant} onMerchantUpdate={fetchMerchant} />} />
                <Route path="/bookings" element={<Bookings merchant={merchant} />} />
                <Route path="/scanner" element={<ScannerEntry merchant={merchant} />} />
                <Route path="/products" element={<Products merchant={merchant} />} />
                <Route path="/categories" element={<ProductCategories merchant={merchant} />} />
                <Route path="/offers" element={<Offers merchant={merchant} />} />
                <Route path="/customers" element={<Customers merchant={merchant} />} />
                <Route path="/insights" element={<Insights merchant={merchant} />} />
                <Route path="/advertise" element={<Advertise merchant={merchant} />} />
                <Route path="/subscription" element={<SubscriptionRenewal merchant={merchant} />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/profile" element={<Profile merchant={merchant} onMerchantUpdate={fetchMerchant} />} />
                <Route path="/about" element={<About />} />
                <Route path="/support" element={<Support />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/terms" element={<LegalTerms />} />
                <Route path="/privacy" element={<LegalPrivacy />} />
                <Route path="*" element={<Navigate to="/merchant" replace />} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
    );
  }

  // Fallback: any merchant state the branches above don't explicitly cover
  // (status is only ever pending/rejected/approved, all handled higher up,
  // so this is just a safety net against unexpected data).
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-0">
      <div className="w-full max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/status" element={<MerchantStatus merchant={merchant} onStatusChange={fetchMerchant} />} />
          <Route path="*" element={<Navigate to="/merchant/status" replace />} />
        </Routes>
      </div>
    </div>
  );
};

const Placeholder = ({ title }) => (
  <div className="bg-white rounded-3xl p-12 border border-blue-50/50 shadow-sm text-center">
    <div className="w-20 h-20 bg-primary/5 text-primary rounded-3xl flex items-center justify-center mx-auto mb-6">
      <Inventory2RoundedIcon sx={{ fontSize: 40 }} />
    </div>
    <h1 className="text-3xl font-bold text-gray-900 mb-2 uppercase">{title}</h1>
    <p className="text-gray-500 font-medium max-w-sm mx-auto">This section is being architected with full CRUD support for {title.toLowerCase()}. Stay tuned!</p>
  </div>
);

export default MerchantApp;
