import { lazy, Suspense, useEffect } from 'react';
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
import { playNotificationSound } from '../../utils/notificationSound';

const PartnerLogin = lazy(() => import('./auth/PartnerLogin'));
const PartnerVerify = lazy(() => import('./auth/PartnerVerify'));
const PartnerSignup = lazy(() => import('./auth/PartnerSignup'));
const PartnerStatus = lazy(() => import('./pages/PartnerStatus'));
const PartnerHome = lazy(() => import('./pages/PartnerHome'));
const PartnerOrderDetail = lazy(() => import('./pages/PartnerOrderDetail'));
const PartnerHistory = lazy(() => import('./pages/PartnerHistory'));
const PartnerEarnings = lazy(() => import('./pages/PartnerEarnings'));
const PartnerProfile = lazy(() => import('./pages/PartnerProfile'));

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
    const socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000');
    socket.on('connect', () => socket.emit('join', { userId: id, role: 'delivery', city }));
    socket.on('delivery_notification', (n) => {
      queryClient.invalidateQueries({ queryKey: ['partnerAvailable'] });
      queryClient.invalidateQueries({ queryKey: ['partnerActive'] });
      queryClient.invalidateQueries({ queryKey: ['partnerOrder'] });
      if (n?.type === 'pool_update' && n.action === 'added') {
        playNotificationSound({ type: 'chime' });
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
  const { data, isLoading, isError, refetch } = usePartnerMe();
  const partner = data?.partner;
  usePartnerSocket(partner?.status === 'approved' ? partner : null);

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

const DeliveryPartnerApp = () => {
  const { user, isLoggedIn, authStatus } = useApp();

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
