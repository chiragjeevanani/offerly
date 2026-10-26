// Keeps the partner app's last-known profile and order lists on the phone, so
// reopening the app shows them at once while fresh data loads, instead of a
// spinner per screen. Stored per account (the id inside the login token), marked
// stale, so every screen still refetches straight away. The open-order pool is
// never kept: an old pool would ring for orders that are already gone.

const STORE_KEY = 'offerly_partner_cache_v1';
const PERSISTED = ['partnerMe', 'partnerActive', 'partnerHistory'];
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

const ownerId = () => {
  try {
    const token = localStorage.getItem('offerly_auth_token') || '';
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload?.id ? String(payload.id) : null;
  } catch {
    return null;
  }
};

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
  } catch {
    return null;
  }
};

// Payout details stay on the server; the Profile form fills them in once the
// fresh profile arrives.
const strip = (key, data) => {
  if (key !== 'partnerMe' || !data?.partner) return data;
  return {
    ...data,
    partner: { ...data.partner, bankDetails: { accountHolderName: '', accountNumber: '', ifscCode: '', upiId: '' } },
  };
};

// Puts the saved data into the query cache, marked stale. Call once, before the
// first query of the signed-in app runs.
export const hydratePartnerCache = (queryClient) => {
  const saved = read();
  const owner = ownerId();
  if (!saved || !owner || saved.owner !== owner || Date.now() - (saved.at || 0) > MAX_AGE_MS) return;
  for (const key of PERSISTED) {
    if (saved.data?.[key] !== undefined && queryClient.getQueryData([key]) === undefined) {
      queryClient.setQueryData([key], saved.data[key], { updatedAt: 0 });
    }
  }
};

// Saves the persisted queries whenever one of them gets fresh data.
export const persistPartnerCache = (queryClient) => {
  let timer = null;
  const save = () => {
    timer = null;
    const owner = ownerId();
    if (!owner) return;
    const data = {};
    for (const key of PERSISTED) {
      const value = queryClient.getQueryData([key]);
      if (value !== undefined) data[key] = strip(key, value);
    }
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ owner, at: Date.now(), data }));
    } catch {
      /* storage full or blocked - the cache is only a speed-up */
    }
  };
  return queryClient.getQueryCache().subscribe((event) => {
    if (event?.type !== 'updated' || event.action?.type !== 'success') return;
    if (!PERSISTED.includes(event.query?.queryKey?.[0])) return;
    if (!timer) timer = setTimeout(save, 500);
  });
};

export const clearPartnerCache = () => {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    /* nothing to clear */
  }
};
