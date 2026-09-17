import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { onMessage } from 'firebase/messaging';

import { getMessagingIfSupported } from '../../config/firebase';
import { useApp } from '../../modules/customer/context/AppContext';
import { getPermission, isPushSupported, syncPushToken } from '../../utils/push';

/**
 * Headless. Mounted once for the whole SPA; renders nothing.
 *
 * Two jobs:
 *  1. Keep this device's FCM token registered against the signed-in account,
 *     under the right persona. Only ever silent — the permission prompt lives
 *     behind an explicit opt-in on the notifications pages, because an
 *     unprompted browser dialog on first load is the fastest way to get
 *     permanently blocked.
 *  2. Surface foreground pushes as toasts. The service worker only handles
 *     messages that arrive while the tab is backgrounded; with the tab focused
 *     FCM hands the payload to the page instead, and nothing is shown unless
 *     we show it.
 *
 * Customer and merchant share one Firebase project and one service worker, so
 * the token is identical for both — the persona only decides which endpoint it
 * is registered against, and therefore which collection stores it.
 */
const PushNotificationBridge = () => {
  const { isLoggedIn, user } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const syncedFor = useRef(null);

  // Admin has no push surface, so it gets no token and no listener.
  const isAdminArea = location.pathname.startsWith('/admin') || user?.type === 'admin';
  const persona = user?.type === 'merchant' ? 'merchant' : 'customer';
  const active = isLoggedIn && !isAdminArea && isPushSupported();

  // Re-register on login and whenever the persona changes. The token itself
  // rarely changes, but the row it maps to server-side does — a device shared
  // between accounts has to follow whoever is currently signed in.
  useEffect(() => {
    if (!active) return;
    if (getPermission() !== 'granted') return;

    const ownerId = user?.id || user?._id;
    if (!ownerId) return;

    const key = `${persona}:${ownerId}`;
    if (syncedFor.current === key) return;

    syncedFor.current = key;
    syncPushToken({ requestPermission: false, persona }).catch(() => {
      /* non-fatal — the opt-in control can retry */
    });
  }, [active, persona, user?.id, user?._id]);

  useEffect(() => {
    if (!isLoggedIn) {
      syncedFor.current = null;
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!active) return undefined;

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
  }, [active, navigate]);

  return null;
};

export default PushNotificationBridge;
