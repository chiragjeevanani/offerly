import { resolveStoreType } from './storeTypeHelper.js';

export const objectIdToString = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  return String(value);
};

export const serializeUser = (user) => ({
  id: objectIdToString(user?._id ?? user?.id),
  name: user?.name || user?.ownerName || '',
  email: user?.email || '',
  phone: user?.phone || '',
  age: user?.age ?? '',
  gender: user?.gender || '',
  dob: user?.dob || null,
  address: user?.address || '',
  city: user?.city || '',
  zone: user?.zone || '',
  profilePhoto: user?.profilePhoto || user?.avatar || '',
  type: user?.role || user?.type || 'customer',
  status: user?.status || 'active',
  credits: user?.credits || 0,
  lifetimeSavings: user?.lifetimeSavings || 0,
  referralCode: user?.referralCode || '',
  savedOffers: (user?.savedOffers || []).map((offer) => objectIdToString(offer)),
  createdAt: user?.createdAt || null,
  updatedAt: user?.updatedAt || null,
});

export const serializePlan = (plan) => ({
  id: objectIdToString(plan?._id ?? plan?.id),
  name: plan?.name || '',
  price: plan?.price || 0,
  duration: plan?.duration || 'Monthly',
  maxProducts: plan?.maxProducts || 0,
  maxOffers: plan?.maxOffers ?? 999,
  features: plan?.features || [],
  status: plan?.status || 'active',
});

export const serializeCity = (city) => ({
  id: objectIdToString(city?._id ?? city?.id),
  name: city?.name || '',
  status: city?.status || 'active',
  coordinates: city?.coordinates || { lat: 0, lng: 0 },
  zones: (city?.zones || []).map((zone) => ({
    id: objectIdToString(zone?._id ?? zone?.id),
    name: zone?.name || '',
    merchantCount: zone?.merchantCount || 0,
    status: zone?.status || 'active',
  })),
});

export const serializeMerchant = (merchant) => ({
  id: objectIdToString(merchant?._id ?? merchant?.id),
  _id: objectIdToString(merchant?._id ?? merchant?.id),
  ownerName: merchant?.ownerName || '',
  storeName: merchant?.storeName || '',
  category: merchant?.category || '',
  city: merchant?.city || '',
  zone: merchant?.zone || '',
  locality: merchant?.locality || '',
  address: merchant?.address || '',
  phone: merchant?.phone || '',
  email: merchant?.email || '',
  avgRating: merchant?.avgRating || 0,
  totalReviews: merchant?.totalReviews || 0,
  totalRedemptions: merchant?.totalRedemptions || 0,
  coordinates: merchant?.coordinates || { lat: 0, lng: 0 },
  coverImage: merchant?.coverImage || '',
  logo: merchant?.logo || '',
  photos: merchant?.photos || [],
  verified: Boolean(merchant?.verified),
  isOpen: merchant?.isOpen !== false,
  status: merchant?.status || 'pending',
  subscriptionPlanId: objectIdToString(merchant?.subscriptionPlanId),
  walletBalance: merchant?.discountWallet?.balance || 0,
  distance: merchant?.distance || '',
  description: merchant?.description || '',
  hasRequestedStore: Boolean(merchant?.hasRequestedStore),
  rejectionReason: merchant?.rejectionReason || null,
  rejectedAt: merchant?.rejectedAt || null,
  rejectedBy: objectIdToString(merchant?.rejectedBy),
  approvedAt: merchant?.approvedAt || null,
  approvedBy: objectIdToString(merchant?.approvedBy),
  joinedAt: merchant?.joinedAt || merchant?.createdAt || null,
  createdAt: merchant?.createdAt || null,
  updatedAt: merchant?.updatedAt || null,
  documents: merchant?.documents || [],
  onboardingStep: merchant?.onboardingStep ?? 0,
  businessHours: merchant?.businessHours || null,
  bankDetails: merchant?.bankDetails || null,
  businessEmail: merchant?.businessEmail || '',
  businessPhone: merchant?.businessPhone || '',
  state: merchant?.state || '',
  pincode: merchant?.pincode || '',
  gstNumber: merchant?.gstNumber || '',
  storeType: resolveStoreType(merchant?.storeType, merchant?.category),
});

export const serializeOffer = (offer) => ({
  id: objectIdToString(offer?._id ?? offer?.id),
  _id: objectIdToString(offer?._id ?? offer?.id),
  merchantId: objectIdToString(offer?.merchantId),
  
  // Offer type and linking (NEW)
  offerType: offer?.offerType || 'generic',
  productId: objectIdToString(offer?.productId),
  variantId: objectIdToString(offer?.variantId),
  applyToAllVariants: Boolean(offer?.applyToAllVariants),
  servicePlanId: objectIdToString(offer?.servicePlanId),
  bookingRequired: Boolean(offer?.bookingRequired),
  bookingWindowDays: offer?.bookingWindowDays || 7,
  
  // Product/Service pricing (populated from linked entities)
  productPrice: offer?.productPrice || offer?.productId?.price || null,
  servicePlanPrice: offer?.servicePlanPrice || offer?.servicePlanId?.price || null,
  productName: offer?.productName || offer?.productId?.name || null,
  servicePlanName: offer?.servicePlanName || offer?.servicePlanId?.name || null,
  
  // Merchant info (populated)
  merchantName: offer?.merchantName || offer?.merchantId?.businessName || offer?.merchantId?.storeName || null,
  // Passed through as-is when a caller has already built one (e.g. the feed
  // and offer-list endpoints attach distance/isOpen before serializing).
  merchant: offer?.merchant || undefined,

  // Common fields
  title: offer?.title || '',
  description: offer?.description || '',
  discountType: offer?.discountType || 'percentage',
  discountValue: offer?.discountValue || 0,
  validFrom: offer?.validFrom || offer?.createdAt || null,
  validTo: offer?.validTo || null,
  maxRedemptions: offer?.maxRedemptions ?? 100,
  currentRedemptions: offer?.currentRedemptions ?? 0,
  
  // Image handling (ENHANCED)
  image: offer?.useCustomImage ? (offer?.customImage || offer?.image) : offer?.image || '',
  customImage: offer?.customImage || null,
  useCustomImage: Boolean(offer?.useCustomImage),
  
  status: offer?.status || 'active',
  impressions: offer?.impressions || 0,
  saves: offer?.saves || 0,
  terms: Array.isArray(offer?.terms)
    ? offer.terms
    : (typeof offer?.terms === 'string' && offer.terms.trim()
        ? [offer.terms.trim()]
        : []),
  category: offer?.category || '',
  isTrending: Boolean(offer?.isTrending),
  isNew: Boolean(offer?.isNewOffer),
  createdAt: offer?.createdAt || null,
  updatedAt: offer?.updatedAt || null,
});

export const serializeProduct = (product) => ({
  id: objectIdToString(product?._id ?? product?.id),
  _id: objectIdToString(product?._id ?? product?.id),
  merchantId: objectIdToString(product?.merchantId),
  categoryType: product?.categoryType || 'product_based',
  categoryId: objectIdToString(product?.categoryId?._id ?? product?.categoryId),
  categoryName: product?.categoryId?.name || 'Uncategorized',
  categoryDiscountPercent: product?.categoryId?.discountPercent ?? 0,
  name: product?.name || '',
  description: product?.description || '',
  price: product?.price || 0,
  offerPrice: product?.offerPrice || 0,
  discount: product?.discount || 0,
  offerId: objectIdToString(product?.offerId),
  categoryType: product?.categoryType || (product?.duration ? 'service_based' : 'product_based'),
  isVeg: (product?.categoryType === 'service_based' || product?.duration) ? null : (product?.isVeg ?? null),
  duration: product?.duration ?? null,
  images: product?.images || [],
  image: product?.image || (product?.images && product?.images[0]) || '',
  status: product?.status || 'available',
  isActive: product?.isActive ?? true,
  createdAt: product?.createdAt || null,
  updatedAt: product?.updatedAt || null,
});

export const serializeProductCategory = (category) => ({
  id: objectIdToString(category?._id ?? category?.id),
  merchantId: objectIdToString(category?.merchantId),
  name: category?.name || '',
  discountPercent: category?.discountPercent ?? 0,
  isActive: category?.isActive ?? true,
  isDefault: Boolean(category?.isDefault),
  order: category?.order ?? 0,
  productCount: category?.productCount ?? 0,
});

export const serializeReview = (review) => ({
  id: objectIdToString(review?._id ?? review?.id),
  merchantId: objectIdToString(review?.merchantId),
  offerId: objectIdToString(review?.offerId),
  customerId: objectIdToString(review?.customerId),
  customerName: review?.customerName || '',
  rating: review?.rating || 0,
  text: review?.text || '',
  createdAt: review?.createdAt || null,
});

export const serializeNotification = (notification) => ({
  id: objectIdToString(notification?._id ?? notification?.id),
  type: notification?.type || 'info',
  title: notification?.title || '',
  body: notification?.body || notification?.message || '',
  read: Boolean(notification?.isRead ?? notification?.read),
  isRead: Boolean(notification?.isRead ?? notification?.read),
  createdAt: notification?.createdAt || null,
});

export const serializeAdRequest = (ad) => ({
  id: objectIdToString(ad?._id ?? ad?.id),
  merchantId: objectIdToString(ad?.merchantId),
  storeName: ad?.storeName || '',
  type: ad?.type || 'banner',
  status: ad?.status || 'pending',
  image: ad?.image || '',
  createdAt: ad?.createdAt || null,
  expiryAt: ad?.expiryAt || null,
});

export const serializeReferralHistory = (entry) => ({
  id: objectIdToString(entry?._id ?? entry?.id),
  friendName:
    entry?.friendName ||
    entry?.referredUserId?.name ||
    entry?.description ||
    'Referral Reward',
  date: entry?.date || (entry?.createdAt ? new Date(entry.createdAt).toISOString().slice(0, 10) : ''),
  credits: entry?.credits ?? entry?.amount ?? 0,
  status: entry?.status || 'credited',
});

export const serializeRedemption = (redemption) => ({
  id: redemption?.internalId || objectIdToString(redemption?._id ?? redemption?.id),
  databaseId: objectIdToString(redemption?._id ?? redemption?.id),
  internalId: redemption?.internalId || objectIdToString(redemption?._id ?? redemption?.id),
  merchantId: objectIdToString(redemption?.merchantId),
  offerId: objectIdToString(redemption?.offerId),
  customerId: objectIdToString(redemption?.customerId),
  customerName: redemption?.customerName || '',
  status: redemption?.status || 'pending',
  qrToken: redemption?.qrToken || '',
  qrExpiry: redemption?.qrExpiry || null,
  items: (redemption?.items || []).map((item) => ({
    productId: objectIdToString(item?.productId),
    product: item?.product || null,
    qty: item?.qty || 0,
  })),
  totals: {
    base: redemption?.totals?.base ?? redemption?.totals?.original ?? 0,
    discount: redemption?.totals?.discount ?? 0,
    final: redemption?.totals?.final ?? redemption?.totals?.total ?? 0,
    original: redemption?.totals?.original ?? redemption?.totals?.base ?? 0,
    walletDiscount: redemption?.totals?.walletDiscount ?? 0,
  },
  scannedAt: redemption?.scannedAt || null,
  createdAt: redemption?.createdAt || null,
  hasReview: Boolean(redemption?.hasReview),
});
