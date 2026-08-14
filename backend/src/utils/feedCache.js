const DEFAULT_TTL_MS = Number(process.env.FEED_CACHE_TTL_MS || 60000);

const cacheStore = new Map();

const now = () => Date.now();

const isExpired = (entry) => !entry || entry.expiresAt <= now();

const cleanupExpired = () => {
  for (const [key, entry] of cacheStore.entries()) {
    if (isExpired(entry)) {
      cacheStore.delete(key);
    }
  }
};

export const getFeedCache = (key) => {
  const entry = cacheStore.get(key);
  if (isExpired(entry)) {
    cacheStore.delete(key);
    return null;
  }

  return entry.value;
};

export const setFeedCache = (key, value, ttlMs = DEFAULT_TTL_MS) => {
  const safeTtl = Number.isFinite(Number(ttlMs)) ? Number(ttlMs) : DEFAULT_TTL_MS;
  cacheStore.set(key, {
    value,
    expiresAt: now() + Math.max(1000, safeTtl),
  });

  if (cacheStore.size > 500) {
    cleanupExpired();
  }
};

export const invalidateFeedCache = ({ city } = {}) => {
  if (!city) {
    cacheStore.clear();
    return;
  }

  const normalizedCity = String(city || "").trim().toLowerCase();
  if (!normalizedCity) {
    cacheStore.clear();
    return;
  }

  for (const key of cacheStore.keys()) {
    if (key.startsWith(`${normalizedCity}|`)) {
      cacheStore.delete(key);
    }
  }
};

export const getFeedCacheStats = () => {
  cleanupExpired();
  return { entries: cacheStore.size };
};
