// Every customer page is code-split (see the ad-blocker note in App.jsx), so the
// first tap on a tab used to download that page's chunk first - about half a
// second of nothing on a mobile connection - and only then navigate. The loaders
// live here so the router and the prefetcher share the exact same import()
// calls: the browser caches the module promise, so a prefetched page is ready by
// the time React asks for it.
export const customerPageLoaders = {
  home: () => import('../modules/customer/pages/home/Home'),
  explore: () => import('../modules/customer/pages/explore/Explore'),
  map: () => import('../modules/customer/pages/explore/MapView'),
  offerDetail: () => import('../modules/customer/pages/offers/OfferDetail'),
  saved: () => import('../modules/customer/pages/offers/SavedOffers'),
  redemptions: () => import('../modules/customer/pages/offers/MyRedemptions'),
  qr: () => import('../modules/customer/pages/redemption/QrScreen'),
  leaveReview: () => import('../modules/customer/pages/redemption/LeaveReview'),
  store: () => import('../modules/customer/pages/store/StoreProfile'),
  profile: () => import('../modules/customer/pages/profile/Profile'),
  referral: () => import('../modules/customer/pages/profile/Referral'),
  notifications: () => import('../modules/customer/pages/profile/Notifications'),
  search: () => import('../modules/customer/pages/search/SearchResults'),
  cart: () => import('../modules/customer/pages/redemption/CartView'),
  subscribe: () => import('../modules/customer/pages/subscription/SubscribePage'),
  rewards: () => import('../modules/customer/pages/rewards/RewardsHub'),
};

const loaderForPath = {
  '/home': customerPageLoaders.home,
  '/explore': customerPageLoaders.explore,
  '/map': customerPageLoaders.map,
  '/saved': customerPageLoaders.saved,
  '/profile': customerPageLoaders.profile,
};

const quietly = (loader) => {
  try {
    loader().catch(() => {});
  } catch {
    // A failed prefetch is never fatal - the real navigation retries the import.
  }
};

// Start downloading one tab's page right away (used on touch/hover, before the click lands).
export const preloadCustomerPath = (path) => {
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

// Warm every page in the background once the app has settled: the five tabs first,
// then everything else. Respects Data Saver and 2G.
export const preloadCustomerPages = () => {
  if (shouldSkipPrefetch()) return;

  whenIdle(() => {
    Object.values(loaderForPath).forEach(quietly);

    whenIdle(() => {
      Object.values(customerPageLoaders).forEach(quietly);
    }, 4000);
  }, 2500);
};
