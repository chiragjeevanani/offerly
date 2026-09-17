import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import axiosInstance from '../api/axios';
import {
  disablePushToken,
  getPermission,
  isPushSupported,
  syncPushToken,
} from '../utils/push';

const ENDPOINTS = {
  customer: '/users/me/push-tokens',
  merchant: '/merchants/me/push-tokens',
};

/**
 * Drives the "Enable notifications" control for either persona.
 *
 * `permission` is the browser's own state; `enabled` additionally means we hold
 * a token registered against this account. The two can disagree — permission
 * granted on this browser under a different login, for instance — so the UI
 * reads `enabled`, not `permission`.
 *
 * @param {object} [options]
 * @param {'customer'|'merchant'} [options.persona]
 * @param {boolean} [options.isLoggedIn] Gate the initial lookup; each persona
 *   tracks auth in its own context, so the caller passes it in rather than
 *   this hook picking a context and breaking in the other app.
 */
export const usePushNotifications = ({ persona = 'customer', isLoggedIn = true } = {}) => {
  const [supported] = useState(() => isPushSupported());
  const [permission, setPermission] = useState(() => getPermission());
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  const endpoint = ENDPOINTS[persona] || ENDPOINTS.customer;

  useEffect(() => {
    if (!supported || !isLoggedIn) {
      setEnabled(false);
      return undefined;
    }

    let cancelled = false;

    axiosInstance
      .get(endpoint)
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
  }, [supported, isLoggedIn, endpoint]);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const result = await syncPushToken({ requestPermission: true, persona });
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
  }, [persona]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      await disablePushToken(persona);
      setEnabled(false);
      toast.success('Notifications turned off');
      return true;
    } finally {
      setBusy(false);
    }
  }, [persona]);

  const sendTest = useCallback(async () => {
    try {
      await axiosInstance.post(`${endpoint}/test`);
      toast.success('Test notification sent');
    } catch (error) {
      toast.error(error?.message || 'Could not send test notification');
    }
  }, [endpoint]);

  return { supported, permission, enabled, busy, enable, disable, sendTest };
};

export default usePushNotifications;
