import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider, useApp } from './modules/customer/context/AppContext';
import { SocketProvider } from './context/SocketContext';
import AppLayout from './modules/customer/components/layout/AppLayout';
import ScrollToTop from './components/common/ScrollToTop';

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
const Home = lazy(() => import('./modules/customer/pages/home/Home'));
const Explore = lazy(() => import('./modules/customer/pages/explore/Explore'));
const MapView = lazy(() => import('./modules/customer/pages/explore/MapView'));
const OfferDetail = lazy(() => import('./modules/customer/pages/offers/OfferDetail'));
const SavedOffers = lazy(() => import('./modules/customer/pages/offers/SavedOffers'));
const MyRedemptions = lazy(() => import('./modules/customer/pages/offers/MyRedemptions'));
const QrScreen = lazy(() => import('./modules/customer/pages/redemption/QrScreen'));
const LeaveReview = lazy(() => import('./modules/customer/pages/redemption/LeaveReview'));
const StoreProfile = lazy(() => import('./modules/customer/pages/store/StoreProfile'));
const Profile = lazy(() => import('./modules/customer/pages/profile/Profile'));
const Referral = lazy(() => import('./modules/customer/pages/profile/Referral'));
const Notifications = lazy(() => import('./modules/customer/pages/profile/Notifications'));
const SearchResults = lazy(() => import('./modules/customer/pages/search/SearchResults'));
const CartView = lazy(() => import('./modules/customer/pages/redemption/CartView'));
const RewardsHub = lazy(() => import('./modules/customer/pages/rewards/RewardsHub'));

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

const PublicOnlyRoute = ({ children }) => {
  const { isLoggedIn, authStatus } = useApp();
  if (authStatus === 'loading') {
    return <PageLoader />;
  }
  return isLoggedIn ? <Navigate to="/home" replace /> : children;
};

const AppRoutes = () => {
  const { isLoggedIn, authStatus } = useApp();
  
  return (
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
                <Route path="offer/:id" element={<ProtectedRoute><OfferDetail /></ProtectedRoute>} />
                <Route path="saved" element={<ProtectedRoute><SavedOffers /></ProtectedRoute>} />
                <Route path="redemptions" element={<ProtectedRoute><MyRedemptions /></ProtectedRoute>} />
                <Route path="redeem/:id" element={<ProtectedRoute><QrScreen /></ProtectedRoute>} />
                <Route path="review/:id" element={<ProtectedRoute><LeaveReview /></ProtectedRoute>} />
                <Route path="store/:id" element={<ProtectedRoute><StoreProfile /></ProtectedRoute>} />
                <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="rewards" element={<ProtectedRoute><RewardsHub /></ProtectedRoute>} />
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
  );
};

const App = () => (
  <BrowserRouter>
    <ScrollToTop />
    <AppProvider>
      <SocketProvider>
        <AppRoutes />
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
