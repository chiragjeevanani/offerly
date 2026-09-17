import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { onMessage } from 'firebase/messaging';

import { getMessagingIfSupported } from '../../config/firebase';
import { useApp } from '../../modules/customer/context/AppContext';
import { getPermission, isPushSupported, syncPushToken } from '../../utils/push';

/**
 * Headless. Mounted once for the customer app; renders nothing.
 *
 * Two jobs:
 *  1. Keep this device's FCM token registered against the logged-in account.
 *     Only ever silent — the permission prompt itself lives behind an explicit
 *     opt-in on the notifications page, because an unprompted browser dialog
 *     on first load is the fastest way to get permanently blocked.
 *  2. Surface foreground pushes as toasts. The service worker only handles
 *     messages that arrive while the tab is backgrounded; with the tab focused,
 *     FCM hands the payload to the page instead and nothing is shown unless we
 *     show it.
 */
const PushNotificationBridge = () => {
  const { isLoggedIn, user } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const syncedFor = useRef(null);

  const isCustomerContext =
    !location.pathname.startsWith('/merchant') &&
    !location.pathname.startsWith('/admin') &&
    (!user?.type || user.type === 'customer');

  // Re-register on login. The token itself rarely changes, but the row it maps
  // to server-side does — a device shared between accounts has to follow the
  // account that's currently signed in.
  useEffect(() => {
    if (!isLoggedIn || !isCustomerContext || !isPushSupported()) return;
    if (getPermission() !== 'granted') return;

    const userId = user?.id || user?._id;
    if (!userId || syncedFor.current === userId) return;

    syncedFor.current = userId;
    syncPushToken({ requestPermission: false }).catch(() => {
      /* non-fatal — the opt-in control can retry */
    });
  }, [isLoggedIn, isCustomerContext, user?.id, user?._id]);

  useEffect(() => {
    if (!isLoggedIn) {
      syncedFor.current = null;
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || !isCustomerContext || !isPushSupported()) return undefined;

    let unsubscribe = null;
    let cancelled = false;

    getMessagingIfSupported().then((messaging) => {
      if (!messaging || cancelled) return;

      unsubscribe = onMessage(messaging, (payload) => {
        const title = payload?.notification?.title || payload?.data?.title;
        const body = payload?.notification?.body || payload?.data?.body || '';
        const link = payload?.data?.link;

        if (!title && !body) return;

        toast(
          (t) => (
            <button
              type="button"
              onClick={() => {
                toast.dismiss(t.id);
                if (link) navigate(link);
              }}
              className="text-left"
            >
              {title ? <span className="block font-semibold">{title}</span> : null}
              {body ? <span className="block text-xs opacity-80">{body}</span> : null}
            </button>
          ),
          { duration: 5000, icon: '🔔' }
        );
      });
    });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [isLoggedIn, isCustomerContext, navigate]);

  return null;
};

export default PushNotificationBridge;
