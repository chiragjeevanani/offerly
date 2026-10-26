// Code for the partner app's screens. Home is needed to open the app; the
// others are fetched in the background once Home is showing its orders, so a
// tab tap never waits for code, and nothing competes with Home on a slow
// connection while it is still loading.

export const loadHome = () => import('./pages/PartnerHome');

export const SCREENS = {
  orderDetail: () => import('./pages/PartnerOrderDetail'),
  history: () => import('./pages/PartnerHistory'),
  earnings: () => import('./pages/PartnerEarnings'),
  profile: () => import('./pages/PartnerProfile'),
};

let warmed = false;
// Called by Home when its lists are on screen. `extra` runs alongside (data prefetches).
export const warmPartnerScreens = (extra) => {
  if (warmed) return;
  warmed = true;
  setTimeout(() => {
    Object.values(SCREENS).forEach((load) => load().catch(() => {}));
    extra?.();
  }, 300);
};
