import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { userAPI } from '../api/user.api';
import { useApp } from '../modules/customer/context/AppContext';
import {
  disablePushToken,
  getPermission,
  isPushSupported,
  syncPushToken,
} from '../utils/push';

/**
 * Drives the "Enable notifications" control.
 *
 * `permission` is the browser's own state; `enabled` additionally means we hold
 * a token registered against this account. The two can disagree — permission
 * granted on this browser under a different login, for instance — so the UI
 * reads `enabled`, not `permission`.
 */
export const usePushNotifications = () => {
  const { isLoggedIn } = useApp();
  const [supported] = useState(() => isPushSupported());
  const [permission, setPermission] = useState(() => getPermission());
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported || !isLoggedIn) {
      setEnabled(false);
      return;
    }

    let cancelled = false;

    userAPI
      .getPushTokens()
      .then((res) => {
        if (cancelled) return;
        const devices = res?.devices || [];
        setEnabled(devices.length > 0 && getPermission() === 'granted');
      })
      .catch(() => {
        /* non-fatal: the toggle just shows as off */
      });

    return () => {
      cancelled = true;
    };
  }, [supported, isLoggedIn]);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const result = await syncPushToken({ requestPermission: true });
      setPermission(getPermission());

      if (result.ok) {
        setEnabled(true);
        toast.success('Notifications enabled');
        return true;
      }

      const messages = {
        unsupported: "This browser can't do push notifications",
        denied: 'Notifications are blocked — enable them in your browser settings',
        dismissed: 'Notification permission was dismissed',
        'no-token': 'Could not register this device, please try again',
      };
      toast.error(messages[result.reason] || 'Could not enable notifications');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      await disablePushToken();
      setEnabled(false);
      toast.success('Notifications turned off');
      return true;
    } finally {
      setBusy(false);
    }
  }, []);

  const sendTest = useCallback(async () => {
    try {
      await userAPI.sendTestPush();
      toast.success('Test notification sent');
    } catch (error) {
      toast.error(error?.message || 'Could not send test notification');
    }
  }, []);

  return { supported, permission, enabled, busy, enable, disable, sendTest };
};

export default usePushNotifications;
