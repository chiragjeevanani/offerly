import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider, useApp } from './modules/customer/context/AppContext';
import { SocketProvider } from './context/SocketContext';
import AppLayout from './modules/customer/components/layout/AppLayout';

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

// Static pages
const About = lazy(() => import('./modules/customer/pages/static/About'));
const TermsAndConditions = lazy(() => import('./modules/customer/pages/static/TermsAndConditions'));
const PrivacyPolicy = lazy(() => import('./modules/customer/pages/static/PrivacyPolicy'));
const Contact = lazy(() => import('./modules/customer/pages/static/Contact'));
const Support = lazy(() => import('./modules/customer/pages/static/Support'));

// Business & Platform modules
const MerchantApp = lazy(() => import('./modules/merchant/MerchantApp'));
const AdminApp = lazy(() => import('./modules/admin/AdminApp'));

const ProtectedRoute = ({ children, isLoggedIn }) => {
  return isLoggedIn ? children : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  const { isLoggedIn } = useApp();
  
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Merchant Panel - Independent Layout */}
        <Route path="/merchant/*" element={<MerchantApp />} />
        
        {/* Admin Panel - Independent Layout */}
        <Route path="/admin/*" element={<AdminApp />} />

        {/* Customer Auth Routes - WITHOUT AppLayout (no navbar/sidebar) */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<CustomerLogin />} />
        <Route path="/signup" element={<CustomerSignup />} />
        <Route path="/verify" element={<OtpVerify />} />

        {/* Customer App - Protected routes WITH AppLayout */}
        <Route path="/*" element={
          <AppLayout>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="home" element={<Home />} />
                <Route path="explore" element={<ProtectedRoute isLoggedIn={isLoggedIn}><Explore /></ProtectedRoute>} />
                <Route path="map" element={<ProtectedRoute isLoggedIn={isLoggedIn}><MapView /></ProtectedRoute>} />
                <Route path="cart" element={<ProtectedRoute isLoggedIn={isLoggedIn}><CartView /></ProtectedRoute>} />
                <Route path="offer/:id" element={<ProtectedRoute isLoggedIn={isLoggedIn}><OfferDetail /></ProtectedRoute>} />
                <Route path="saved" element={<ProtectedRoute isLoggedIn={isLoggedIn}><SavedOffers /></ProtectedRoute>} />
                <Route path="redemptions" element={<ProtectedRoute isLoggedIn={isLoggedIn}><MyRedemptions /></ProtectedRoute>} />
                <Route path="redeem/:id" element={<ProtectedRoute isLoggedIn={isLoggedIn}><QrScreen /></ProtectedRoute>} />
                <Route path="review/:id" element={<ProtectedRoute isLoggedIn={isLoggedIn}><LeaveReview /></ProtectedRoute>} />
                <Route path="store/:id" element={<ProtectedRoute isLoggedIn={isLoggedIn}><StoreProfile /></ProtectedRoute>} />
                <Route path="profile" element={<ProtectedRoute isLoggedIn={isLoggedIn}><Profile /></ProtectedRoute>} />
                <Route path="referral" element={<ProtectedRoute isLoggedIn={isLoggedIn}><Referral /></ProtectedRoute>} />
                <Route path="notifications" element={<ProtectedRoute isLoggedIn={isLoggedIn}><Notifications /></ProtectedRoute>} />
                <Route path="search" element={<ProtectedRoute isLoggedIn={isLoggedIn}><SearchResults /></ProtectedRoute>} />

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
              iconTheme: { primary: '#3D7A4F', secondary: '#fff' },
            },
          }}
        />
      </SocketProvider>
    </AppProvider>
  </BrowserRouter>
);

export default App;
