import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import { useApp } from '../customer/context/AppContext';
import { deliveryAPI } from '../../api/delivery.api';
import PartnerOrderAlert from './components/PartnerOrderAlert';
import { hydratePartnerCache, persistPartnerCache } from './utils/partnerCache';

const PartnerLogin = lazy(() => import('./auth/PartnerLogin'));
const PartnerVerify = lazy(() => import('./auth/PartnerVerify'));
const PartnerSignup = lazy(() => import('./auth/PartnerSignup'));
const PartnerStatus = lazy(() => import('./pages/PartnerStatus'));
// The signed-in screens. Home starts downloading as soon as this file loads (in
// parallel with the profile request, not after it); the others right after the
// first screen is up, so a tab tap never waits for its code.
const loadHome = () => import('./pages/PartnerHome');
const SCREENS = [
  () => import('./pages/PartnerOrderDetail'),
  () => import('./pages/PartnerHistory'),
  () => import('./pages/PartnerEarnings'),
  () => import('./pages/PartnerProfile'),
];
if (typeof window !== 'undefined' && localStorage.getItem('offerly_auth_token')) loadHome().catch(() => {});
const PartnerHome = lazy(loadHome);
const PartnerOrderDetail = lazy(SCREENS[0]);
const PartnerHistory = lazy(SCREENS[1]);
const PartnerEarnings = lazy(SCREENS[2]);
const PartnerProfile = lazy(SCREENS[3]);
const PartnerLegal = lazy(() => import('./pages/PartnerLegal'));

const Loader = () => (
  <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
    <div className="w-9 h-9 border-4 border-[#5EB929] border-t-transparent rounded-full animate-spin" />
  </div>
);

// The partner's profile, today's numbers and limits. Shared by every screen.
const usePartnerMe = (enabled = true) =>
  useQuery({
    queryKey: ['partnerMe'],
    queryFn: async () => (await deliveryAPI.getMe())?.data,
    enabled,
    refetchInterval: 60_000,
    staleTime: 15_000,
  });

// Own socket: the shared SocketContext joins by customer/merchant role, so the
// partner app joins its own room plus its city's pool room.
const usePartnerSocket = (partner) => {
  const queryClient = useQueryClient();
  const id = partner?.id;
  const city = partner?.city;
  useEffect(() => {
    if (!id) return undefined;
    // WebSocket straight away: the default starts with several long-polling
    // round trips before upgrading, which costs seconds on a slow phone network.
    const socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000', { transports: ['websocket', 'polling'] });
    socket.on('connect', () => socket.emit('join', { userId: id, role: 'delivery', city }));
    socket.on('delivery_notification', (n) => {
      queryClient.invalidateQueries({ queryKey: ['partnerAvailable'] });
      queryClient.invalidateQueries({ queryKey: ['partnerActive'] });
      queryClient.invalidateQueries({ queryKey: ['partnerOrder'] });
      if (n?.type === 'pool_update' && n.action === 'added') {
        toast('New order nearby', { icon: '🛵' });
      } else if (n?.title) {
        toast(n.title + (n.body ? ` - ${n.body}` : ''));
      }
      if (['account_status', 'settled'].includes(n?.type)) {
        queryClient.invalidateQueries({ queryKey: ['partnerMe'] });
      }
    });
    return () => socket.disconnect();
  }, [id, city, queryClient]);
};

const NAV = [
  { to: '/delivery', label: 'Home', icon: HomeRoundedIcon, end: true },
  { to: '/delivery/history', label: 'Orders', icon: ReceiptLongRoundedIcon },
  { to: '/delivery/earnings', label: 'Earnings', icon: AccountBalanceWalletRoundedIcon },
  { to: '/delivery/profile', label: 'Profile', icon: PersonRoundedIcon },
];

const PartnerLayout = ({ children }) => {
  const location = useLocation();
  const hideNav = location.pathname.startsWith('/delivery/orders/');
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className={`max-w-lg mx-auto ${hideNav ? '' : 'pb-24'}`}>{children}</div>
      {!hideNav && (
        <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-gray-100 pb-safe" aria-label="Main">
          <div className="max-w-lg mx-auto grid grid-cols-4">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 transition-colors ${isActive ? 'text-[#5EB929]' : 'text-gray-400'}`}
              >
                {({ isActive }) => (
                  <>
                    <item.icon sx={{ fontSize: 24 }} />
                    <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
};

const SignedInApp = () => {
  const queryClient = useQueryClient();
  // Last session's profile and orders, shown at once while fresh ones load.
  useState(() => hydratePartnerCache(queryClient));
  useEffect(() => persistPartnerCache(queryClient), [queryClient]);
  // Home's order lists load alongside the profile instead of after it.
  useEffect(() => {
    queryClient.prefetchQuery({ queryKey: ['partnerActive'], queryFn: async () => (await deliveryAPI.getMyOrders('active'))?.data || [] });
    queryClient.prefetchQuery({ queryKey: ['partnerAvailable'], queryFn: async () => (await deliveryAPI.getAvailable())?.data || [] });
  }, [queryClient]);
  const { data, isLoading, isError, refetch } = usePartnerMe();
  const partner = data?.partner;
  usePartnerSocket(partner?.status === 'approved' ? partner : null);
  const approved = partner?.status === 'approved';
  useEffect(() => {
    if (!approved) return undefined;
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200));
    const handle = idle(() => {
      SCREENS.forEach((load) => load().catch(() => {}));
      // The Orders tab's list too, so its first visit isn't a spinner.
      queryClient.prefetchQuery({ queryKey: ['partnerHistory'], queryFn: async () => (await deliveryAPI.getMyOrders('history'))?.data || [], staleTime: 30_000 });
    });
    return () => (window.cancelIdleCallback || clearTimeout)(handle);
  }, [approved, queryClient]);

  if (isLoading) return <Loader />;
  if (isError || !partner) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm font-semibold text-gray-600">Couldn't load your account. Check your connection.</p>
        <button onClick={() => refetch()} className="px-6 h-11 rounded-xl bg-[#5EB929] text-white font-bold text-xs uppercase tracking-widest">Try again</button>
      </div>
    );
  }

  if (partner.status !== 'approved') return <PartnerStatus partner={partner} />;

  return (
    <PartnerLayout>
      {/* Rings until a waiting order is accepted or rejected */}
      <PartnerOrderAlert me={data} />
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<PartnerHome me={data} />} />
          <Route path="/orders/:id" element={<PartnerOrderDetail />} />
          <Route path="/history" element={<PartnerHistory />} />
          <Route path="/earnings" element={<PartnerEarnings me={data} />} />
          <Route path="/profile" element={<PartnerProfile partner={partner} />} />
          <Route path="*" element={<Navigate to="/delivery" replace />} />
        </Routes>
      </Suspense>
    </PartnerLayout>
  );
};

// Terms and Privacy open for everyone - signed out, pending approval or approved.
const LEGAL_DOCS = { '/delivery/terms': 'terms', '/delivery/privacy': 'privacy' };

const DeliveryPartnerApp = () => {
  const { user, isLoggedIn, authStatus } = useApp();
  const location = useLocation();
  const legalDoc = LEGAL_DOCS[location.pathname.replace(/\/$/, '')];

  if (legalDoc) {
    return (
      <Suspense fallback={<Loader />}>
        <PartnerLegal doc={legalDoc} />
      </Suspense>
    );
  }
  if (authStatus === 'loading') return <Loader />;

  const isPartner = isLoggedIn && (user?.type === 'delivery' || user?.role === 'delivery');
  if (!isPartner) {
    return (
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/login" element={<PartnerLogin />} />
          <Route path="/signup" element={<PartnerLogin />} />
          <Route path="/verify" element={<PartnerVerify />} />
          <Route path="/signup/details" element={<PartnerSignup />} />
          <Route path="*" element={<Navigate to="/delivery/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<Loader />}>
      <SignedInApp />
    </Suspense>
  );
};

export default DeliveryPartnerApp;
