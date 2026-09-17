import { deleteToken, getToken } from 'firebase/messaging';

import { getMessagingIfSupported, vapidKey } from '../config/firebase';
import axiosInstance from '../api/axios';

const LAST_TOKEN_KEY = 'offerly_fcm_token';
// Which persona the stored token is registered under, so logout knows which
// endpoint to release it from.
const PERSONA_KEY = 'offerly_fcm_persona';
const SW_PATH = '/firebase-messaging-sw.js';

// Customer and merchant share one Firebase project, one origin and therefore
// one service worker — the token is identical either way. What separates them
// is which collection it is stored in, which is decided by the endpoint.
const ENDPOINTS = {
  customer: '/users/me/push-tokens',
  merchant: '/merchants/me/push-tokens',
};

const endpointFor = (persona) => ENDPOINTS[persona] || ENDPOINTS.customer;

const readStored = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStored = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage blocked — only costs us the tidy unregister on logout */
  }
};

/**
 * Which of the two arrays the token goes into server-side: `fcmTokens.web` or
 * `fcmTokens.app`. Those are the only accepted values — the server 400s on
 * anything else — so every branch here must return one of exactly those two.
 * Anything running inside a native shell counts as `app`, Android or iOS alike.
 */
export const detectPlatform = () => {
  if (typeof window === 'undefined') return 'web';

  if (window.Capacitor?.isNativePlatform?.() || window.Capacitor?.isNative) return 'app';
  if (window.cordova || window.ReactNativeWebView) return 'app';
  // Marker a native WebView wrapper can append to its user agent.
  if (/OfferlyApp/i.test(navigator.userAgent || '')) return 'app';

  return 'web';
};

export const isPushSupported = () =>
  typeof window !== 'undefined' &&
  'Notification' in window &&
  'serviceWorker' in navigator &&
  'PushManager' in window;

export const getPermission = () =>
  (typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported');

/**
 * Register our own worker and hand it to getToken explicitly.
 *
 * Without this, FCM looks for /firebase-messaging-sw.js on the default scope
 * itself, which races with whatever else registers a worker and is hard to
 * debug when it picks the wrong one.
 */
const getSwRegistration = async () => {
  const existing = await navigator.serviceWorker.getRegistration(SW_PATH);
  if (existing) return existing;
  return navigator.serviceWorker.register(SW_PATH, { scope: '/' });
};

/**
 * Mint an FCM token and store it against the logged-in user.
 *
 * @param {object} [options]
 * @param {boolean} [options.requestPermission] Prompt if permission is still
 *   'default'. Leave false for the silent on-login sync so we never fire a
 *   browser permission dialog the user didn't ask for.
 * @param {'customer'|'merchant'} [options.persona] Which account the token is
 *   registered against.
 * @returns {Promise<{ok: boolean, reason?: string, token?: string, platform?: string}>}
 */
export const syncPushToken = async ({ requestPermission = false, persona = 'customer' } = {}) => {
  if (!isPushSupported()) {
    return { ok: false, reason: 'unsupported' };
  }

  let permission = Notification.permission;

  if (permission === 'denied') {
    return { ok: false, reason: 'denied' };
  }

  if (permission === 'default') {
    if (!requestPermission) {
      return { ok: false, reason: 'not-granted' };
    }
    permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { ok: false, reason: permission === 'denied' ? 'denied' : 'dismissed' };
    }
  }

  const messaging = await getMessagingIfSupported();
  if (!messaging) {
    return { ok: false, reason: 'unsupported' };
  }

  try {
    const registration = await getSwRegistration();
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });

    if (!token) {
      return { ok: false, reason: 'no-token' };
    }

    const platform = detectPlatform();

    await axiosInstance.post(endpointFor(persona), { token, platform });

    writeStored(LAST_TOKEN_KEY, token);
    writeStored(PERSONA_KEY, persona);

    return { ok: true, token, platform };
  } catch (error) {
    console.warn('[Push] Failed to register token:', error?.message);
    return { ok: false, reason: 'error', error };
  }
};

/**
 * Turn push off for this device: drop it server-side first (so we stop being
 * sent to even if the local delete fails), then revoke the token itself.
 */
export const disablePushToken = async (persona = 'customer') => {
  const token = readStored(LAST_TOKEN_KEY);

  if (token) {
    try {
      await axiosInstance.delete(endpointFor(persona), { data: { token } });
    } catch (error) {
      console.warn('[Push] Failed to unregister token server-side:', error?.message);
    }
  }

  try {
    const messaging = await getMessagingIfSupported();
    if (messaging) {
      await deleteToken(messaging);
    }
  } catch (error) {
    console.warn('[Push] Failed to delete local token:', error?.message);
  }

  try {
    localStorage.removeItem(LAST_TOKEN_KEY);
    localStorage.removeItem(PERSONA_KEY);
  } catch {
    /* ignore */
  }

  return { ok: true };
};

/**
 * Logout cleanup. Deliberately drops only the server-side registration and
 * keeps the browser token, so signing back in on this device is silent rather
 * than re-prompting for permission.
 */
export const releasePushTokenOnLogout = async (authToken) => {
  const token = readStored(LAST_TOKEN_KEY);

  if (!token) return;

  // Release from whichever persona the token was registered under — hitting
  // the wrong endpoint would 403 and leave the device still subscribed.
  const persona = readStored(PERSONA_KEY) || 'customer';

  try {
    await axiosInstance.delete(endpointFor(persona), {
      data: { token },
      ...(authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : {}),
    });
  } catch {
    // Best effort: the auth token may already be gone. The server also evicts
    // this token from the old account the next time it's registered anywhere.
  }
};
