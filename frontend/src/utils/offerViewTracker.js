import { API_BASE_URL, STORAGE_KEYS } from '../config/constants';

// Client half of offer-view tracking.
//
// Views are queued in memory and flushed in batches rather than fired one request
// per card - a customer scrolling the feed can cross a dozen cards in a few seconds,
// and that should cost one request, not twelve.
//
// The server deduplicates authoritatively (unique index on offer + viewer + 30-min
// bucket), so the local dedupe here is purely to avoid pointless network traffic.

const SESSION_KEY_STORAGE = 'offerly_view_session';
const FLUSH_DELAY_MS = 4000;
const MAX_BATCH = 25;
// Must match VIEW_DEDUPE_WINDOW_MS on the server.
const DEDUPE_WINDOW_MS = 30 * 60 * 1000;

/** Stable anonymous id so logged-out views can still be deduplicated. */
const getSessionKey = () => {
  try {
    let key = localStorage.getItem(SESSION_KEY_STORAGE);
    if (!key) {
      key =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(SESSION_KEY_STORAGE, key);
    }
    return key;
  } catch {
    // Private browsing with storage disabled - fall back to a per-tab key.
    return 'anonymous';
  }
};

const queue = new Map();
const alreadySent = new Map();
let flushTimer = null;

const currentBucket = () => Math.floor(Date.now() / DEDUPE_WINDOW_MS);

/** Drop dedupe entries from expired buckets so the map can't grow forever. */
const pruneSentCache = () => {
  const bucket = currentBucket();
  for (const [key, entryBucket] of alreadySent) {
    if (entryBucket !== bucket) {
      alreadySent.delete(key);
    }
  }
};

const sendBatch = (views, { keepalive = false } = {}) => {
  if (views.length === 0) return Promise.resolve();

  const token = (() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    } catch {
      return null;
    }
  })();

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  // fetch + keepalive rather than sendBeacon, because sendBeacon cannot carry the
  // Authorization header and the view would land as anonymous on page hide.
  return fetch(`${API_BASE_URL}/offers/views`, {
    method: 'POST',
    headers,
    keepalive,
    body: JSON.stringify({ sessionKey: getSessionKey(), views }),
  }).catch(() => {
    // Analytics must never surface an error to the customer. A dropped batch just
    // means a slightly low view count.
  });
};

export const flushOfferViews = ({ keepalive = false } = {}) => {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (queue.size === 0) return Promise.resolve();

  const views = [...queue.entries()]
    .slice(0, MAX_BATCH)
    .map(([offerId, source]) => ({ offerId, source }));

  for (const view of views) {
    queue.delete(view.offerId);
  }

  return sendBatch(views, { keepalive });
};

/**
 * Queue a view of `offerId`. Safe to call repeatedly - repeat calls inside the
 * current dedupe window are dropped locally.
 */
export const trackOfferView = (offerId, source = 'other') => {
  if (!offerId) return;

  const id = String(offerId);
  const bucket = currentBucket();
  const cacheKey = `${id}:${source}`;

  pruneSentCache();

  if (alreadySent.get(cacheKey) === bucket) return;
  alreadySent.set(cacheKey, bucket);

  queue.set(id, source);

  if (queue.size >= MAX_BATCH) {
    flushOfferViews();
    return;
  }

  if (!flushTimer) {
    flushTimer = setTimeout(() => flushOfferViews(), FLUSH_DELAY_MS);
  }
};

// Flush whatever is pending before the tab goes away, so counts survive a customer
// closing the app mid-scroll.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushOfferViews({ keepalive: true });
    }
  });

  window.addEventListener('pagehide', () => flushOfferViews({ keepalive: true }));
}
