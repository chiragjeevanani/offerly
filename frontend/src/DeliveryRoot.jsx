import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './modules/customer/context/AppContext';
import ScrollToTop from './components/common/ScrollToTop';
import DeliveryPartnerApp from './modules/delivery/DeliveryPartnerApp';
import { toasterProps } from './config/toaster';

// Root for /delivery/* only (main.jsx picks it by path). It skips App.jsx, so
// a partner's phone never downloads or runs the customer app (its login pages,
// splash, layout and animation library) just to open the partner app.

// Push registration pulls in Firebase; load it a few seconds in, once the first
// screen is up, so it never competes with opening the app.
const PushNotificationBridge = lazy(() => import('./components/common/PushNotificationBridge'));
const LaterPushBridge = () => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 4000);
    return () => clearTimeout(timer);
  }, []);
  return ready ? (
    <Suspense fallback={null}>
      <PushNotificationBridge />
    </Suspense>
  ) : null;
};

// Anything outside /delivery belongs to the main app: load it properly.
const LeaveDeliveryApp = () => {
  const location = useLocation();
  useEffect(() => {
    window.location.replace(location.pathname + location.search + location.hash);
  }, [location]);
  return null;
};

const DeliveryRoot = () => (
  <BrowserRouter>
    <ScrollToTop />
    <AppProvider>
      <Routes>
        <Route path="/delivery/*" element={<DeliveryPartnerApp />} />
        <Route path="*" element={<LeaveDeliveryApp />} />
      </Routes>
      <LaterPushBridge />
      <Toaster {...toasterProps} />
    </AppProvider>
  </BrowserRouter>
);

export default DeliveryRoot;
