// Merchant pages are code-split (see the ad-blocker note in MerchantApp.jsx), which
// meant the first visit to each tab downloaded its chunk on tap. The loaders live
// here so the router and the prefetcher share the same import() calls: once a page
// is prefetched, React gets it from the browser's module cache instantly.
export const merchantPageLoaders = {
  dashboard: () => import('./pages/Dashboard'),
  bookings: () => import('./pages/Bookings'),
  products: () => import('./pages/Products'),
  categories: () => import('./pages/ProductCategories'),
  offers: () => import('./pages/Offers'),
  customers: () => import('./pages/Customers'),
  scanner: () => import('./pages/ScannerEntry'),
  advertise: () => import('./pages/Advertise'),
  insights: () => import('./pages/Insights'),
  notifications: () => import('./pages/Notifications'),
  profile: () => import('./pages/Profile'),
};

const loaderForPath = {
  '/merchant': merchantPageLoaders.dashboard,
  '/merchant/bookings': merchantPageLoaders.bookings,
  '/merchant/products': merchantPageLoaders.products,
  '/merchant/categories': merchantPageLoaders.categories,
  '/merchant/offers': merchantPageLoaders.offers,
  '/merchant/customers': merchantPageLoaders.customers,
  '/merchant/scanner': merchantPageLoaders.scanner,
  '/merchant/advertise': merchantPageLoaders.advertise,
  '/merchant/insights': merchantPageLoaders.insights,
  '/merchant/notifications': merchantPageLoaders.notifications,
  '/merchant/profile': merchantPageLoaders.profile,
};

const quietly = (loader) => {
  try {
    loader().catch(() => {});
  } catch {
    // A failed prefetch is never fatal - the real navigation retries the import.
  }
};

export const preloadMerchantPath = (path) => {
  const loader = loaderForPath[path];
  if (loader) quietly(loader);
};

const shouldSkipPrefetch = () => {
  const connection = navigator.connection;
  return Boolean(connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType || '')));
};

const whenIdle = (callback, timeout) => {
  if (typeof window.requestIdleCallback === 'function') {
    return window.requestIdleCallback(callback, { timeout });
  }
  return window.setTimeout(callback, Math.min(timeout, 1500));
};

// Everyday pages first; the two heavy ones (charts, QR scanner library) go last.
const HEAVY = new Set([merchantPageLoaders.insights, merchantPageLoaders.scanner]);

export const preloadMerchantPages = () => {
  if (shouldSkipPrefetch()) return;

  whenIdle(() => {
    Object.values(merchantPageLoaders)
      .filter((loader) => !HEAVY.has(loader))
      .forEach(quietly);

    whenIdle(() => {
      HEAVY.forEach(quietly);
    }, 5000);
  }, 2500);
};
