// ─── localStorage Utilities for Offerly Customer Panel ────────────────────────
import { mockCategories, mockSubscriptionPlans } from './mockData';

export { mockCategories, mockSubscriptionPlans };

export const KEYS = {
  USER: 'offerly_user',
  USERS: 'offerly_users', // Global users list for Admin
  OFFERS: 'offerly_offers',
  MERCHANTS: 'offerly_merchants',
  SAVED: 'offerly_saved',
  REDEMPTIONS: 'offerly_redemptions',
  REVIEWS: 'offerly_reviews',
  NOTIFICATIONS: 'offerly_notifications',
  AUTH_TOKEN: 'offerly_auth_token',
  REFERRAL_HISTORY: 'offerly_referral_history',
  SEEDED: 'offerly_seeded',
  PRODUCTS: 'offerly_products',
  CART: 'offerly_cart',
  CITIES: 'offerly_cities',
  PLANS: 'offerly_plans',
  ADS: 'offerly_ads',
};

// ── Generic Helpers ────────────────────────────────────────────────────────────
export const lsGet = (key) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
};

export const lsSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('localStorage write error', e);
  }
};

export const lsRemove = (key) => localStorage.removeItem(key);

// ── Seed ──────────────────────────────────────────────────────────────────────
export const seedIfNeeded = (mockData) => {
  if (!lsGet(KEYS.SEEDED) || !lsGet(KEYS.PLANS)) {
    lsSet(KEYS.USERS, mockData.mockUsers);
    lsSet(KEYS.OFFERS, mockData.mockOffers);
    lsSet(KEYS.MERCHANTS, mockData.mockMerchants);
    lsSet(KEYS.PRODUCTS, mockData.mockProducts);
    lsSet(KEYS.REVIEWS, mockData.mockReviews);
    lsSet(KEYS.NOTIFICATIONS, mockData.mockNotifications);
    lsSet(KEYS.REFERRAL_HISTORY, mockData.mockReferralHistory);
    lsSet(KEYS.CITIES, mockData.mockCities);
    lsSet(KEYS.PLANS, mockData.mockSubscriptionPlans);
    lsSet(KEYS.ADS, mockData.mockAdRequests);
    lsSet(KEYS.SEEDED, true);
  }
};

// ── Auth ─────────────────────────────────────────────────────────────────────
export const getAuthUser = () => lsGet(KEYS.USER);

export const setAuthUser = (user) => {
  lsSet(KEYS.USER, user);
  lsSet(KEYS.AUTH_TOKEN, `mock_jwt_${user.id}_${Date.now()}`);
};

export const clearAuth = () => {
  lsRemove(KEYS.USER);
  lsRemove(KEYS.AUTH_TOKEN);
};

export const isAuthenticated = () => !!lsGet(KEYS.AUTH_TOKEN);

/**
 * Get user by phone number
 */
export const getUserByPhone = (phone) => {
  const users = getAllUsers();
  const cleanPhone = phone.replace(/\D/g, '');
  return users.find(u => 
    u.phone.replace(/\D/g, '').endsWith(cleanPhone)
  );
};

/**
 * Check if phone is already registered
 */
export const isPhoneRegistered = (phone) => {
  return getUserByPhone(phone) !== undefined;
};

/**
 * Generate referral code from name
 */
export const generateReferralCode = (name) => {
  const prefix = name.trim().toUpperCase().slice(0, 5).replace(/\s/g, '');
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${suffix}`;
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Validate phone format (10 digits)
 */
export const isValidPhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10;
};

/**
 * Create user account (used after OTP verification)
 */
export const createUserAccount = (userData) => {
  const users = getAllUsers();
  
  const newUser = {
    id: `usr_${userData.userType}_${Date.now()}`,
    name: userData.name,
    email: userData.email,
    phone: userData.phone,
    age: userData.age,
    gender: userData.gender,
    address: userData.address,
    profilePhoto: userData.profilePhoto || '',
    type: userData.userType,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Add customer-specific fields
  if (userData.userType === 'customer') {
    newUser.credits = 0;
    newUser.referralCode = generateReferralCode(userData.name);
    newUser.savedOffers = [];
  }

  users.push(newUser);
  lsSet(KEYS.USERS, users);
  
  return newUser;
};

// ── User ──────────────────────────────────────────────────────────────────────
export const updateUser = (updates) => {
  const user = getAuthUser();
  if (!user) return null;
  const updated = { ...user, ...updates, updatedAt: new Date().toISOString() };
  lsSet(KEYS.USER, updated);
  // Also update in global users list
  const allUsers = getAllUsers().map(u => u.id === user.id ? updated : u);
  lsSet(KEYS.USERS, allUsers);
  return updated;
};

// ── Users (Admin) ─────────────────────────────────────────────────────────────
export const getAllUsers = () => lsGet(KEYS.USERS) || [];

export const deleteUser = (userId) => {
  const users = getAllUsers().filter(u => u.id !== userId);
  lsSet(KEYS.USERS, users);
};

// ── Cities & Zones (Admin) ────────────────────────────────────────────────────
export const getAllCities = () => lsGet(KEYS.CITIES) || [];

export const saveCity = (city) => {
  const cities = getAllCities();
  const exists = cities.findIndex(c => c.id === city.id);
  if (exists > -1) cities[exists] = city;
  else cities.push({ ...city, id: `city_${Date.now()}` });
  lsSet(KEYS.CITIES, cities);
};

export const deleteCity = (cityId) => {
  const cities = getAllCities().filter(c => c.id !== cityId);
  lsSet(KEYS.CITIES, cities);
};

// ── Subscription Plans (Admin) ────────────────────────────────────────────────
export const getAllPlans = () => lsGet(KEYS.PLANS) || [];

export const savePlan = (plan) => {
  const plans = getAllPlans();
  const exists = plans.findIndex(p => p.id === plan.id);
  if (exists > -1) plans[exists] = plan;
  else plans.push({ ...plan, id: `plan_${Date.now()}` });
  lsSet(KEYS.PLANS, plans);
};

export const deletePlan = (planId) => {
  const plans = getAllPlans().filter(p => p.id !== planId);
  lsSet(KEYS.PLANS, plans);
};

// ── Advertisement Requests (Admin) ─────────────────────────────────────────────
export const getAdRequests = () => lsGet(KEYS.ADS) || [];

export const updateAdStatus = (adId, status) => {
  const ads = getAdRequests().map(ad => ad.id === adId ? { ...ad, status } : ad);
  lsSet(KEYS.ADS, ads);
};

export const deleteAd = (adId) => {
  const ads = getAdRequests().filter(ad => ad.id !== adId);
  lsSet(KEYS.ADS, ads);
};

// ── Merchants & Plans ─────────────────────────────────────────────────────────
export const getAllMerchants = () => lsGet(KEYS.MERCHANTS) || [];

// Filter functions for approved merchants
export const getApprovedMerchants = () => {
  return getAllMerchants().filter(m => m.status === 'approved');
};

export const getApprovedMerchantIds = () => {
  return getApprovedMerchants().map(m => m.id);
};

export const filterApprovedOffers = (offers) => {
  const approvedIds = getApprovedMerchantIds();
  return offers.filter(o => approvedIds.includes(o.merchantId));
};

export const filterApprovedProducts = (products) => {
  const approvedIds = getApprovedMerchantIds();
  return products.filter(p => approvedIds.includes(p.merchantId));
};

export const getMerchantById = (id) => {
  const merchants = getAllMerchants();
  // Support both _id (MongoDB) and id (localStorage) for backward compatibility
  return merchants.find((m) => m.id === id || m._id === id) || null;
};

export const deleteMerchant = (merchantId) => {
  const merchants = getAllMerchants().filter(m => m.id !== merchantId);
  lsSet(KEYS.MERCHANTS, merchants);
};

export const saveMerchant = (merchant) => {
  const merchants = getAllMerchants();
  const exists = merchants.findIndex(m => m.id === merchant.id);
  const updatedMerchant = {
    ...merchant,
    hasRequestedStore: true,
    updatedAt: new Date().toISOString()
  };

  if (exists > -1) {
    merchants[exists] = { ...merchants[exists], ...updatedMerchant };
  } else {
    updatedMerchant.id = merchant.id || `mer_${Date.now()}`;
    updatedMerchant.status = merchant.status || 'pending';
    updatedMerchant.createdAt = new Date().toISOString();

    // Assign default coordinates if missing
    if (!updatedMerchant.coordinates) {
      const cities = getAllCities();
      const city = cities.find(c => c.name === updatedMerchant.city);
      if (city && city.coordinates) {
        // Slightly random layout to prevent perfect overlap 
        const offset = (Math.random() - 0.5) * 0.02;
        updatedMerchant.coordinates = {
          lat: city.coordinates.lat + offset,
          lng: city.coordinates.lng + offset
        };
      } else {
        // Fallback to a generic center if city not found or no coordinates
        updatedMerchant.coordinates = { lat: 26.1158, lng: 91.7086 };
      }
    }

    merchants.push(updatedMerchant);
  }
  lsSet(KEYS.MERCHANTS, merchants);
  return updatedMerchant;
};

export const getMerchantByUserId = (userId) => {
  const merchants = getAllMerchants();
  return merchants.find(m => m.ownerId === userId) || null;
};

export const toggleMerchantApproval = (merchantId, status) => {
  const merchants = getAllMerchants().map(m =>
    m.id === merchantId ? { ...m, status, updatedAt: new Date().toISOString() } : m
  );
  lsSet(KEYS.MERCHANTS, merchants);
};

// Plan Verification Logic
export const canAddProduct = (merchantId) => {
  const merchant = getMerchantById(merchantId);
  if (!merchant) return false;

  const plan = getAllPlans().find(p => p.id === merchant.subscriptionPlanId);
  if (!plan) return false;

  const currentProductCount = getProductsByMerchant(merchantId).length;
  return currentProductCount < plan.maxProducts;
};

// ── Offers ────────────────────────────────────────────────────────────────────
export const getAllOffers = () => lsGet(KEYS.OFFERS) || [];

export const deleteOffer = (offerId) => {
  const offers = getAllOffers().filter(o => o.id !== offerId);
  lsSet(KEYS.OFFERS, offers);
};

export const saveOffer = (offer) => {
  const offers = getAllOffers();
  const exists = offers.findIndex(o => o.id === offer.id);
  if (exists > -1) offers[exists] = { ...offers[exists], ...offer };
  else offers.push({ ...offer, id: offer.id || `off_${Date.now()}` });
  lsSet(KEYS.OFFERS, offers);
};

export const getOfferById = (id) => {
  const offers = getAllOffers();
  // Support both _id (MongoDB) and id (localStorage) for backward compatibility
  return offers.find((o) => o.id === id || o._id === id) || null;
};

export const getOffersByMerchant = (merchantId) => {
  return getAllOffers().filter((o) => o.merchantId === merchantId && o.status === 'active');
};

export const getOffersByCategory = (category) => {
  if (!category || category === 'All') return getAllOffers().filter((o) => o.status === 'active');
  return getAllOffers().filter((o) => o.category === category && o.status === 'active');
};

export const getTrendingOffers = () => {
  return getAllOffers().filter((o) => o.isTrending && o.status === 'active');
};

export const getNewOffers = () => {
  return getAllOffers().filter((o) => o.isNew && o.status === 'active');
};

export const searchOffers = (query) => {
  const q = query.toLowerCase();
  const offers = getAllOffers();
  const merchants = getAllMerchants();
  return offers.filter((o) => {
    const merchant = merchants.find((m) => m.id === o.merchantId);
    return (
      o.title.toLowerCase().includes(q) ||
      o.category.toLowerCase().includes(q) ||
      (merchant && merchant.storeName.toLowerCase().includes(q))
    );
  });
};

// ── Saved Offers ───────────────────────────────────────────────────────────────
export const getSavedOfferIds = () => {
  const user = getAuthUser();
  return user ? user.savedOffers || [] : [];
};

export const toggleSaveOffer = (offerId) => {
  const user = getAuthUser();
  if (!user) return false;
  const saved = user.savedOffers || [];
  const isSaved = saved.includes(offerId);
  const updated = isSaved ? saved.filter((id) => id !== offerId) : [...saved, offerId];
  // Internal update helper
  const updateAuthUser = (updates) => {
    const current = getAuthUser();
    if (!current) return null;
    const updated = { ...current, ...updates };
    lsSet(KEYS.USER, updated);
    // Also update in global users list
    const allUsers = getAllUsers().map(u => u.id === current.id ? updated : u);
    lsSet(KEYS.USERS, allUsers);
  };
  updateAuthUser({ savedOffers: updated });
  return !isSaved;
};

export const getSavedOffers = () => {
  const ids = getSavedOfferIds();
  return getAllOffers().filter((o) => ids.includes(o.id));
};

// ── Redemptions ───────────────────────────────────────────────────────────────
export const getRedemptions = () => lsGet(KEYS.REDEMPTIONS) || [];

export const getRedemptionsByMerchant = (merchantId) => {
  return getRedemptions().filter((r) => r.merchantId === merchantId);
};

export const getPendingBookingsByMerchant = (merchantId) => {
  return getRedemptions().filter((r) => r.merchantId === merchantId && r.status === 'pending');
};

export const createRedemption = (offerId, merchantId) => {
  const user = getAuthUser();
  if (!user) return null;

  const redemption = {
    id: `red_${Date.now()}`,
    offerId,
    merchantId,
    customerId: user.id,
    status: 'pending',
    qrToken: `qr_${offerId}_${user.id}_${Date.now()}`,
    qrExpiry: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    scannedAt: null,
    createdAt: new Date().toISOString(),
    hasReview: false,
  };

  const existing = getRedemptions();
  lsSet(KEYS.REDEMPTIONS, [redemption, ...existing]);
  return redemption;
};

export const getRedemptionById = (id) => {
  return getRedemptions().find((r) => r.id === id) || null;
};

export const markRedemptionComplete = (redemptionId) => {
  const redemptions = getRedemptions();
  const updated = redemptions.map((r) =>
    r.id === redemptionId
      ? { ...r, status: 'completed', scannedAt: new Date().toISOString() }
      : r
  );
  lsSet(KEYS.REDEMPTIONS, updated);
};

export const hasActiveRedemption = (offerId) => {
  const user = getAuthUser();
  if (!user) return false;
  const redemptions = getRedemptions();
  return redemptions.some(
    (r) => r.offerId === offerId && r.customerId === user.id && r.status === 'pending'
  );
};

// ── Reviews ────────────────────────────────────────────────────────────────────
export const getAllReviews = () => lsGet(KEYS.REVIEWS) || [];

export const getReviewsByMerchant = (merchantId) => {
  return getAllReviews().filter((r) => r.merchantId === merchantId);
};

export const submitReview = (merchantId, offerId, rating, text) => {
  const user = getAuthUser();
  if (!user) return null;

  const review = {
    id: `rev_${Date.now()}`,
    merchantId,
    offerId,
    customerId: user.id,
    customerName: user.name,
    rating,
    text,
    createdAt: new Date().toISOString(),
  };

  const existing = getAllReviews();
  lsSet(KEYS.REVIEWS, [review, ...existing]);

  // Update redemption hasReview flag
  const redemptions = getRedemptions();
  const updated = redemptions.map((r) =>
    r.offerId === offerId && r.customerId === user.id ? { ...r, hasReview: true } : r
  );
  lsSet(KEYS.REDEMPTIONS, updated);

  return review;
};

// ── Notifications ──────────────────────────────────────────────────────────────
export const getNotifications = () => lsGet(KEYS.NOTIFICATIONS) || [];

export const getUnreadCount = () => {
  return getNotifications().filter((n) => !n.read).length;
};

export const markAllRead = () => {
  const notifications = getNotifications().map((n) => ({ ...n, read: true }));
  lsSet(KEYS.NOTIFICATIONS, notifications);
};

export const markNotificationRead = (id) => {
  const notifications = getNotifications().map((n) =>
    n.id === id ? { ...n, read: true } : n
  );
  lsSet(KEYS.NOTIFICATIONS, notifications);
};

// ── Referral ───────────────────────────────────────────────────────────────────
export const getReferralHistory = () => lsGet(KEYS.REFERRAL_HISTORY) || [];

// ── Products ───────────────────────────────────────────────────────────────────
export const getAllProducts = () => lsGet(KEYS.PRODUCTS) || [];

export const getProductsByMerchant = (merchantId) => {
  return getAllProducts().filter((p) => p.merchantId === merchantId);
};

export const saveProduct = (product) => {
  const products = getAllProducts();
  const exists = products.findIndex(p => p.id === product.id);
  if (exists > -1) products[exists] = product;
  else products.push({ ...product, id: `p_${Date.now()}` });
  lsSet(KEYS.PRODUCTS, products);
};

export const deleteProduct = (productId) => {
  const products = getAllProducts().filter(p => p.id !== productId);
  lsSet(KEYS.PRODUCTS, products);
};

// ── Cart ───────────────────────────────────────────────────────────────────────
export const getCart = () => lsGet(KEYS.CART) || { merchantId: null, items: [] };

export const updateCartItem = (merchantId, product, qty) => {
  let cart = getCart();
  if (cart.merchantId && cart.merchantId !== merchantId) cart = { merchantId, items: [] };
  if (!cart.merchantId) cart.merchantId = merchantId;

  const existingIdx = cart.items.findIndex(item => item.product.id === product.id);
  if (qty <= 0) {
    if (existingIdx > -1) cart.items.splice(existingIdx, 1);
  } else {
    if (existingIdx > -1) cart.items[existingIdx].qty = qty;
    else cart.items.push({ product, qty });
  }

  lsSet(KEYS.CART, cart);
  return cart;
};

export const clearCart = () => lsSet(KEYS.CART, { merchantId: null, items: [] });

// ── Bookings ───────────────────────────────────────────────────────────────────
export const createBooking = (merchantId, reqData) => {
  const user = getAuthUser();
  if (!user) return null;

  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const nums = Math.floor(10000 + Math.random() * 90000);
  const bookingId = `${letter}-${nums}`;

  const booking = {
    id: bookingId,
    internalId: `req_${Date.now()}`,
    merchantId,
    customerId: user.id,
    customerName: user.name,
    items: reqData.items,
    totals: reqData.totals,
    status: 'pending',
    qrToken: bookingId,
    qrExpiry: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  const existing = getRedemptions();
  lsSet(KEYS.REDEMPTIONS, [booking, ...existing]);
  return booking;
};
