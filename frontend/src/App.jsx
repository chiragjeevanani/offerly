import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider, useApp } from './modules/customer/context/AppContext';
import { SocketProvider } from './context/SocketContext';
import AppLayout from './modules/customer/components/layout/AppLayout';
import ScrollToTop from './components/common/ScrollToTop';
import PushNotificationBridge from './components/common/PushNotificationBridge';
import SplashScreen from './modules/customer/components/ui/SplashScreen';
import { useRewardsEnabled } from './hooks/useRewardsEnabled';
import { customerPageLoaders as pages, preloadCustomerPages } from './routes/customerPages';

// Loading Component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// Auth pages
import CustomerLogin from './modules/customer/pages/auth/CustomerLogin';
import CustomerSignup from './modules/customer/pages/auth/CustomerSignup';
import OtpVerify from './modules/customer/pages/auth/OtpVerify';

// Core pages (Dynamic Imports)
// (The import() calls live in routes/customerPages.js so they can also be prefetched.)
const Home = lazy(pages.home);
const Explore = lazy(pages.explore);
const MapView = lazy(pages.map);
const OfferDetail = lazy(pages.offerDetail);
const SavedOffers = lazy(pages.saved);
const MyRedemptions = lazy(pages.redemptions);
const QrScreen = lazy(pages.qr);
const LeaveReview = lazy(pages.leaveReview);
const StoreProfile = lazy(pages.store);
const Profile = lazy(pages.profile);
const Referral = lazy(pages.referral);
const Notifications = lazy(pages.notifications);
const SearchResults = lazy(pages.search);
const CartView = lazy(pages.cart);
const SubscribePage = lazy(pages.subscribe);
const RewardsHub = lazy(pages.rewards);

// Static pages
const About = lazy(() => import('./modules/customer/pages/static/About'));
const TermsAndConditions = lazy(() => import('./modules/customer/pages/static/TermsAndConditions'));
const PrivacyPolicy = lazy(() => import('./modules/customer/pages/static/PrivacyPolicy'));
const Contact = lazy(() => import('./modules/customer/pages/static/Contact'));
const Support = lazy(() => import('./modules/customer/pages/static/Support'));

// Business & Platform modules
const MerchantApp = lazy(() => import('./modules/merchant/MerchantApp'));
const AdminApp = lazy(() => import('./modules/admin/AdminApp'));

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, authStatus } = useApp();
  if (authStatus === 'loading') {
    return <PageLoader />;
  }
  return isLoggedIn ? children : <Navigate to="/login" replace />;
};

// /rewards is unreachable while admin has Milestones & Rewards switched off
const RewardsRoute = ({ children }) => {
  const { enabled, isLoading } = useRewardsEnabled();
  if (isLoading) {
    return <PageLoader />;
  }
  return enabled ? children : <Navigate to="/home" replace />;
};

const PublicOnlyRoute = ({ children }) => {
  const { isLoggedIn, authStatus } = useApp();
  if (authStatus === 'loading') {
    return <PageLoader />;
  }
  return isLoggedIn ? <Navigate to="/home" replace /> : children;
};

// The splash is branding, not loading - it runs on a timer, not on real progress.
// Once per browser session is enough; replaying it on every refresh or return
// visit just adds ~2.5 s in front of an app that is already ready.
const SPLASH_SEEN_KEY = 'offerly_splash_seen';
const hasSeenSplash = () => {
  try {
    return sessionStorage.getItem(SPLASH_SEEN_KEY) === '1';
  } catch {
    return false;
  }
};
const markSplashSeen = () => {
  try {
    sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
  } catch {
    // Private mode etc. - worst case the splash shows again.
  }
};

const AppRoutes = () => {
  const { isLoggedIn, authStatus } = useApp();
  const location = useLocation();
  const isBusinessRoute = location.pathname.startsWith('/merchant') || location.pathname.startsWith('/admin');

  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get('splash') === '1' || params.get('splash') === 'true') return true;
    const path = window.location.pathname;
    if (path.startsWith('/merchant') || path.startsWith('/admin')) return false;
    return !hasSeenSplash();
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('splash') === '1' || params.get('splash') === 'true') {
      setShowSplash(true);
    }
  }, [location.search]);

  // Warm every page's code in the background so tab taps navigate instantly.
  useEffect(() => {
    if (!isBusinessRoute) preloadCustomerPages();
  }, [isBusinessRoute]);
  
  return (
    <>
      {showSplash && !isBusinessRoute && (
        <SplashScreen
          duration={1500}
          onFinish={() => {
            markSplashSeen();
            setShowSplash(false);
          }}
        />
      )}
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Merchant Panel - Independent Layout */}
        <Route path="/merchant/*" element={<MerchantApp />} />
        
        {/* Admin Panel - Independent Layout */}
        <Route path="/admin/*" element={<AdminApp />} />

        {/* Customer Auth Routes - WITHOUT AppLayout (no navbar/sidebar) */}
        <Route path="/" element={isLoggedIn ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />} />
        <Route path="/login" element={<PublicOnlyRoute><CustomerLogin /></PublicOnlyRoute>} />
        <Route path="/signup" element={<PublicOnlyRoute><CustomerSignup /></PublicOnlyRoute>} />
        <Route path="/verify" element={<OtpVerify />} />

        {/* Customer App - Protected routes WITH AppLayout */}
        <Route path="/*" element={
          <AppLayout>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="home" element={<Home />} />
                <Route path="explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
                <Route path="map" element={<ProtectedRoute><MapView /></ProtectedRoute>} />
                <Route path="cart" element={<ProtectedRoute><CartView /></ProtectedRoute>} />
                <Route path="subscribe" element={<ProtectedRoute><SubscribePage /></ProtectedRoute>} />
                <Route path="offer/:id" element={<ProtectedRoute><OfferDetail /></ProtectedRoute>} />
                <Route path="saved" element={<ProtectedRoute><SavedOffers /></ProtectedRoute>} />
                <Route path="redemptions" element={<ProtectedRoute><MyRedemptions /></ProtectedRoute>} />
                <Route path="redeem/:id" element={<ProtectedRoute><QrScreen /></ProtectedRoute>} />
                <Route path="review/:id" element={<ProtectedRoute><LeaveReview /></ProtectedRoute>} />
                <Route path="store/:id" element={<ProtectedRoute><StoreProfile /></ProtectedRoute>} />
                <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="rewards" element={<ProtectedRoute><RewardsRoute><RewardsHub /></RewardsRoute></ProtectedRoute>} />
                <Route path="referral" element={<ProtectedRoute><Referral /></ProtectedRoute>} />
                <Route path="notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="search" element={<ProtectedRoute><SearchResults /></ProtectedRoute>} />

                {/* Static Pages - Public Access */}
                <Route path="about" element={<About />} />
                <Route path="terms" element={<TermsAndConditions />} />
                <Route path="privacy" element={<PrivacyPolicy />} />
                <Route path="contact" element={<Contact />} />
                <Route path="support" element={<Support />} />

                {/* Catch-all - redirect to login */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </AppLayout>
        } />
      </Routes>
    </Suspense>
    </>
  );
};

const App = () => (
  <BrowserRouter>
    <ScrollToTop />
    <AppProvider>
      <SocketProvider>
        <AppRoutes />
        <PushNotificationBridge />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 2500,
            style: {
              background: '#1A1A1A',
              color: '#fff',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 500,
            },
            success: {
              iconTheme: { primary: '#5EB929', secondary: '#fff' },
            },
          }}
        />
      </SocketProvider>
    </AppProvider>
  </BrowserRouter>
);

export default App;
