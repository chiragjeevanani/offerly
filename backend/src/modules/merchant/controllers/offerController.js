import Plan from "../../admin/models/Plan.js";
import AdRequest from "../../admin/models/AdRequest.js";
import Redemption from "../../booking/models/Redemption.js";
import MerchantSubscription from "../../payment/models/MerchantSubscription.js";
import { serializeOffer, serializeMerchant } from "../../../utils/serializers.js";
import { calculateDistance, formatDistance } from "../../../utils/distance.js";
import { getFeedCache, setFeedCache, invalidateFeedCache } from "../../../utils/feedCache.js";
import mongoose from "mongoose";
import Merchant from "../models/Merchant.js";
import Offer from "../models/Offer.js";
import OfferView from "../models/OfferView.js";
import { viewBucketFor } from "../../../utils/analytics.js";

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getOwnedMerchant = async (userId) => {
  return Merchant.findById(userId);
};

const getEffectivePlan = async (merchant) => {
  const now = new Date();
  const activeSubscription = await MerchantSubscription.findOne({
    merchantId: merchant._id,
    status: "active",
    endDate: { $gte: now }, // Ensure it hasn't expired
  })
    .populate("planId")
    .sort({ createdAt: -1 });

  if (activeSubscription?.planId) {
    return activeSubscription.planId;
  }

  // Fallback to merchant.subscriptionPlanId ONLY if it's lifetime or handled elsewhere
  // But strictly, we should check for an active subscription record.
  if (!merchant.subscriptionPlanId) {
    return null;
  }

  const plan = await Plan.findById(merchant.subscriptionPlanId);
  return plan;
};

const ensureOfferAllowance = async (merchant) => {
  const plan = await getEffectivePlan(merchant);
  const maxOffers = Number(plan?.maxOffers);

  if (!Number.isFinite(maxOffers)) {
    return;
  }

  const offersCount = await Offer.countDocuments({ merchantId: merchant._id });

  if (offersCount >= maxOffers) {
    throw new Error("Current subscription plan offer limit reached");
  }
};

const FEED_DEFAULTS = {
  trendingLimit: 5,
  nearYouLimit: 4,
  storesLimit: 3,
  recommendedLimit: 6,
  bannersLimit: 5,
};

const normalizeCity = (value = "") => value.trim().toLowerCase();

const parseCoordinate = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toObjectIdString = (value) => {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  return String(value._id || value);
};

const getRecencyScore = (createdAt) => {
  if (!createdAt) {
    return 0;
  }

  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.max(0, 30 - ageDays);
};

const resolveFeedCity = (req) => {
  const queryCity =
    typeof req.query.city === "string" && req.query.city.trim() ? req.query.city.trim() : "";
  if (queryCity) {
    return queryCity;
  }

  const profileCity =
    typeof req.user?.city === "string" && req.user.city.trim() ? req.user.city.trim() : "";
  if (profileCity) {
    return profileCity;
  }

  return "";
};

const parseLimit = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, 1), 20);
};

const toFeedOffer = ({ offer, merchant, distanceKm }) => {
  const distanceLabel = distanceKm === null ? "N/A" : formatDistance(distanceKm);
  const merchantPayload = serializeMerchant({
    ...merchant,
    distance: distanceLabel,
  });

  const serialized = serializeOffer({
    ...offer,
    merchantName: merchant.businessName || merchant.storeName,
    merchantId: merchant._id,
  });

  serialized.merchant = merchantPayload;
  return serialized;
};

const pickUniqueOffers = (rankedItems, seenIds, limit) => {
  const picked = [];

  for (const item of rankedItems) {
    if (seenIds.has(item.id)) {
      continue;
    }

    seenIds.add(item.id);
    picked.push(item.offer);

    if (picked.length >= limit) {
      break;
    }
  }

  return picked;
};

const buildAffinityWeights = async (user) => {
  if (!user || user.role !== "customer") {
    return { weights: {}, hash: "anon" };
  }

  const savedOfferIds = Array.isArray(user.savedOffers)
    ? user.savedOffers.map((item) => toObjectIdString(item)).filter(Boolean)
    : [];

  const redemptionRows = await Redemption.find({
    customerId: user._id,
    status: "completed",
    offerId: { $ne: null },
  })
    .select("offerId")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const redeemedOfferIds = redemptionRows
    .map((row) => toObjectIdString(row.offerId))
    .filter(Boolean);

  const candidateOfferIds = [...new Set([...savedOfferIds, ...redeemedOfferIds])];
  if (!candidateOfferIds.length) {
    return { weights: {}, hash: `${toObjectIdString(user._id)}:none` };
  }

  const candidateOffers = await Offer.find({ _id: { $in: candidateOfferIds } })
    .select("_id category")
    .lean();

  const categoryByOfferId = new Map(
    candidateOffers.map((offer) => [toObjectIdString(offer._id), String(offer.category || "").trim()]),
  );

  const weights = {};
  for (const savedId of savedOfferIds) {
    const categoryKey = normalizeCity(categoryByOfferId.get(savedId) || "");
    if (!categoryKey) {
      continue;
    }
    weights[categoryKey] = (weights[categoryKey] || 0) + 2;
  }

  for (const redeemedId of redeemedOfferIds) {
    const categoryKey = normalizeCity(categoryByOfferId.get(redeemedId) || "");
    if (!categoryKey) {
      continue;
    }
    weights[categoryKey] = (weights[categoryKey] || 0) + 3;
  }

  const hashSource = Object.entries(weights)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([category, score]) => `${category}:${score}`)
    .join("|");

  return {
    weights,
    hash: `${toObjectIdString(user._id)}:${hashSource || "none"}`,
  };
};

export const getOffersFeed = async (req, res) => {
  const requestStartedAt = Date.now();
  const selectedCity = resolveFeedCity(req);

  if (!selectedCity) {
    return res.status(400).json({
      message: "City is required to load your personalized feed.",
      code: "CITY_REQUIRED",
      cityRequired: true,
    });
  }

  const normalizedCityKey = normalizeCity(selectedCity);
  const userLat = parseCoordinate(req.query.userLat);
  const userLng = parseCoordinate(req.query.userLng);

  const limitConfig = {
    trendingLimit: parseLimit(req.query.trendingLimit, FEED_DEFAULTS.trendingLimit),
    nearYouLimit: parseLimit(req.query.nearYouLimit, FEED_DEFAULTS.nearYouLimit),
    storesLimit: parseLimit(req.query.storesLimit, FEED_DEFAULTS.storesLimit),
    recommendedLimit: parseLimit(req.query.recommendedLimit, FEED_DEFAULTS.recommendedLimit),
    bannersLimit: parseLimit(req.query.bannersLimit, FEED_DEFAULTS.bannersLimit),
  };

  const affinity = await buildAffinityWeights(req.user);
  const coordsKey =
    userLat !== null && userLng !== null
      ? `${userLat.toFixed(2)}:${userLng.toFixed(2)}`
      : "no-coords";
  const cacheKey = `${normalizedCityKey}|${coordsKey}|${affinity.hash}`;
  const cachedPayload = getFeedCache(cacheKey);

  if (cachedPayload) {
    return res.status(200).json({
      ...cachedPayload,
      meta: {
        ...cachedPayload.meta,
        cache: "hit",
        durationMs: Date.now() - requestStartedAt,
      },
    });
  }

  const exactCityRegex = new RegExp(`^${escapeRegex(selectedCity)}$`, "i");
  const fuzzyCityRegex = new RegExp(escapeRegex(selectedCity), "i");

  let cityMerchants = await Merchant.find({
    status: "approved",
    city: exactCityRegex,
  })
    .select(
      "_id storeName businessName verified coordinates city totalRedemptions avgRating totalReviews logo coverImage category",
    )
    .lean();

  if (!cityMerchants.length) {
    cityMerchants = await Merchant.find({
      status: "approved",
      city: fuzzyCityRegex,
    })
      .select(
        "_id storeName businessName verified coordinates city totalRedemptions avgRating totalReviews logo coverImage category",
      )
      .lean();
  }

  const merchantIds = cityMerchants.map((merchant) => merchant._id);
  const generatedAt = new Date().toISOString();

  if (!merchantIds.length) {
    const emptyPayload = {
      city: selectedCity,
      generatedAt,
      buckets: {
        trendingOffers: [],
        nearYouOffers: [],
        mostPopulatedStores: [],
        recommendedOffers: [],
      },
      banners: [],
      meta: {
        cache: "miss",
        cityMerchantCount: 0,
        activeOfferCount: 0,
      },
    };

    setFeedCache(cacheKey, emptyPayload);
    return res.status(200).json({
      ...emptyPayload,
      meta: {
        ...emptyPayload.meta,
        durationMs: Date.now() - requestStartedAt,
      },
    });
  }

  const merchantById = new Map(cityMerchants.map((merchant) => [toObjectIdString(merchant._id), merchant]));
  const now = new Date();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [activeOffers, offerRedemptionRows, storeRedemptionRows, approvedAds] = await Promise.all([
    Offer.find({
      status: "active",
      merchantId: { $in: merchantIds },
      $or: [{ validTo: { $gte: now } }, { validTo: null }],
    })
      .select(
        "_id merchantId offerType productId variantId applyToAllVariants servicePlanId bookingRequired bookingWindowDays title description discountType discountValue validFrom validTo maxRedemptions currentRedemptions image customImage useCustomImage status impressions saves terms category isTrending isNew createdAt updatedAt",
      )
      .lean(),
    Redemption.aggregate([
      {
        $match: {
          status: "completed",
          createdAt: { $gte: thirtyDaysAgo },
          merchantId: { $in: merchantIds },
          offerId: { $ne: null },
        },
      },
      { $group: { _id: "$offerId", count: { $sum: 1 } } },
    ]),
    Redemption.aggregate([
      {
        $match: {
          status: "completed",
          createdAt: { $gte: thirtyDaysAgo },
          merchantId: { $in: merchantIds },
        },
      },
      { $group: { _id: "$merchantId", count: { $sum: 1 } } },
    ]),
    AdRequest.find({
      status: "approved",
      merchantId: { $in: merchantIds },
      $or: [{ expiryAt: null }, { expiryAt: { $gt: now } }],
    })
      .select("_id merchantId storeName image")
      .sort({ createdAt: -1 })
      .limit(limitConfig.bannersLimit)
      .lean(),
  ]);

  const offerRedemptionsById = new Map(
    offerRedemptionRows.map((item) => [toObjectIdString(item._id), Number(item.count || 0)]),
  );
  const storeRedemptionsById = new Map(
    storeRedemptionRows.map((item) => [toObjectIdString(item._id), Number(item.count || 0)]),
  );

  const offerCountByMerchantId = {};
  const rankedOffers = [];

  for (const offer of activeOffers) {
    const merchant = merchantById.get(toObjectIdString(offer.merchantId));
    if (!merchant) {
      continue;
    }

    // Get Merchant Plan for Visibility Boost
    const plan = await getEffectivePlan(merchant);
    const planBoost = plan?.name?.toLowerCase().includes('enterprise') ? 15 : (plan?.name?.toLowerCase().includes('business') ? 8 : 0);
    const planName = plan?.name || 'Starter';

    const merchantId = toObjectIdString(merchant._id);
    offerCountByMerchantId[merchantId] = (offerCountByMerchantId[merchantId] || 0) + 1;

    let distanceKm = null;
    if (
      userLat !== null &&
      userLng !== null &&
      merchant.coordinates &&
      Number.isFinite(merchant.coordinates.lat) &&
      Number.isFinite(merchant.coordinates.lng)
    ) {
      distanceKm = calculateDistance(userLat, userLng, merchant.coordinates.lat, merchant.coordinates.lng);
    }

    const offerId = toObjectIdString(offer._id);
    const redemptions30d = offerRedemptionsById.get(offerId) || 0;
    const saves = Number(offer.saves || 0);
    const recencyScore = getRecencyScore(offer.createdAt);
    const categoryAffinity = affinity.weights[normalizeCity(offer.category || "")] || 0;

    const trendingScore = redemptions30d * 4 + saves * 2 + recencyScore + (offer.isTrending ? 8 : 0);
    // User range awareness: Add a weight for proximity (closer is better)
    const proximityWeight = distanceKm !== null ? Math.max(0, (20 - distanceKm) * 0.5) : 0;
    const finalTrendingScore = trendingScore + proximityWeight + planBoost;

    const recommendationScore = categoryAffinity * 6 + redemptions30d * 2 + saves + recencyScore + planBoost;
    const nearYouScore =
      distanceKm === null ? trendingScore : 1000 - Math.min(distanceKm, 1000) + redemptions30d * 1.5 + (planBoost * 0.5);

    const offerData = toFeedOffer({ offer, merchant, distanceKm });
    offerData.merchant.planName = planName;
    offerData.merchant.isPremium = planBoost > 0;

    rankedOffers.push({
      id: offerId,
      offer: offerData,
      distanceKm,
      redemptions30d,
      recencyScore,
      trendingScore: finalTrendingScore, 
      recommendationScore,
      nearYouScore,
      affinityScore: categoryAffinity,
      createdAt: offer.createdAt ? new Date(offer.createdAt).getTime() : 0,
    });
  }

  const seenOfferIds = new Set();

  const trendingOffers = pickUniqueOffers(
    [...rankedOffers].sort((left, right) => {
      if (right.trendingScore !== left.trendingScore) {
        return right.trendingScore - left.trendingScore;
      }
      if (right.redemptions30d !== left.redemptions30d) {
        return right.redemptions30d - left.redemptions30d;
      }
      return right.createdAt - left.createdAt;
    }),
    seenOfferIds,
    limitConfig.trendingLimit,
  );

  const nearYouOffers = pickUniqueOffers(
    [...rankedOffers].sort((left, right) => {
      if (left.distanceKm !== null && right.distanceKm !== null && left.distanceKm !== right.distanceKm) {
        return left.distanceKm - right.distanceKm;
      }
      if (left.distanceKm === null && right.distanceKm !== null) {
        return 1;
      }
      if (left.distanceKm !== null && right.distanceKm === null) {
        return -1;
      }
      if (right.nearYouScore !== left.nearYouScore) {
        return right.nearYouScore - left.nearYouScore;
      }
      return right.createdAt - left.createdAt;
    }),
    seenOfferIds,
    limitConfig.nearYouLimit,
  );

  const recommendedOffers = pickUniqueOffers(
    [...rankedOffers].sort((left, right) => {
      if (right.recommendationScore !== left.recommendationScore) {
        return right.recommendationScore - left.recommendationScore;
      }
      if (right.affinityScore !== left.affinityScore) {
        return right.affinityScore - left.affinityScore;
      }
      return right.createdAt - left.createdAt;
    }),
    seenOfferIds,
    limitConfig.recommendedLimit,
  );

  const mostPopulatedStores = cityMerchants
    .map((merchant) => {
      const merchantId = toObjectIdString(merchant._id);
      let distanceKm = null;
      if (userLat !== null && userLng !== null && merchant.coordinates) {
        distanceKm = calculateDistance(userLat, userLng, merchant.coordinates.lat, merchant.coordinates.lng);
      }

      return {
        merchant,
        distanceKm,
        recentRedemptions30d: storeRedemptionsById.get(merchantId) || 0,
        offerCount: offerCountByMerchantId[merchantId] || 0,
      };
    })
    .sort((left, right) => {
      // 1. Prioritize Distance (Closer first)
      if (left.distanceKm !== null && right.distanceKm !== null && left.distanceKm !== right.distanceKm) {
        return left.distanceKm - right.distanceKm;
      }
      if (left.distanceKm === null && right.distanceKm !== null) return 1;
      if (left.distanceKm !== null && right.distanceKm === null) return -1;

      // 2. Secondary: Popularity (More redemptions first)
      if (right.recentRedemptions30d !== left.recentRedemptions30d) {
        return right.recentRedemptions30d - left.recentRedemptions30d;
      }
      
      // 3. Tertiary: Rating
      return Number(right.merchant.avgRating || 0) - Number(left.merchant.avgRating || 0);
    })
    .slice(0, limitConfig.storesLimit)
    .map((item) => ({
      ...serializeMerchant(item.merchant),
      recentRedemptions30d: item.recentRedemptions30d,
      offerCount: item.offerCount,
    }));

  const adBanners = approvedAds.map((ad) => ({
    _id: toObjectIdString(ad._id),
    id: toObjectIdString(ad._id),
    title: ad.storeName || merchantById.get(toObjectIdString(ad.merchantId))?.storeName || "Sponsored Offer",
    image: ad.image || "",
    merchantId: toObjectIdString(ad.merchantId),
    isAd: true,
  }));

  const trendingBanners = trendingOffers.map((offer) => ({
    ...offer,
    isAd: false,
  }));

  const payload = {
    city: selectedCity,
    generatedAt,
    buckets: {
      trendingOffers,
      nearYouOffers,
      mostPopulatedStores,
      recommendedOffers,
    },
    banners: [...adBanners, ...trendingBanners].slice(0, limitConfig.bannersLimit),
    meta: {
      cache: "miss",
      cityMerchantCount: cityMerchants.length,
      activeOfferCount: activeOffers.length,
    },
  };

  setFeedCache(cacheKey, payload);

  return res.status(200).json({
    ...payload,
    meta: {
      ...payload.meta,
      durationMs: Date.now() - requestStartedAt,
    },
  });
};

export const getOffers = async (req, res) => {
  const isAdmin = req.user?.role === "admin";
  const query = {};

  // Public visibility rules:
  // - only approved merchants
  // - only active offers
  // Admin can bypass via explicit filters.
  if (req.query.merchantId) {
    query.merchantId = req.query.merchantId;
    if (!isAdmin) {
      const merchant = await Merchant.findOne({
        _id: req.query.merchantId,
        status: "approved",
      })
        .select("_id")
        .lean();

      if (!merchant) {
        return res.status(200).json({ offers: [] });
      }

      query.status = "active";
    }
  } else {
    if (isAdmin) {
      if (req.query.status) {
        query.status = req.query.status;
      }
    } else {
      const approvedMerchants = await Merchant.find({ status: "approved" })
        .select("_id")
        .lean();
      query.merchantId = { $in: approvedMerchants.map((item) => item._id) };
      query.status = "active";
    }
  }

  // Existing: Filter by category
  if (req.query.category) {
    query.category = req.query.category;
  }

  // NEW: text search across offer and merchant fields
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), "i");
    const matchedMerchants = await Merchant.find({
      status: "approved",
      $or: [{ storeName: searchRegex }, { category: searchRegex }, { city: searchRegex }],
    })
      .select("_id")
      .lean();

    const matchedMerchantIds = matchedMerchants.map((item) => item._id);
    query.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { category: searchRegex },
      { terms: searchRegex },
      ...(matchedMerchantIds.length ? [{ merchantId: { $in: matchedMerchantIds } }] : []),
    ];
  }

  // NEW: Filter by isNew
  if (req.query.isNew === 'true') {
    query.isNew = true;
  }

  // NEW: Filter by isTrending
  if (req.query.isTrending === 'true') {
    query.isTrending = true;
  }

  // NEW: Filter by city (via merchant)
  if (req.query.city) {
    const normalizedCity = req.query.city.trim();
    let cityMerchants = await Merchant.find({
      city: new RegExp(`^${escapeRegex(normalizedCity)}$`, "i"),
      status: "approved",
    })
      .select("_id")
      .lean();

    // Fallback for slightly different city spellings/stored formats.
    if (!cityMerchants.length) {
      cityMerchants = await Merchant.find({
        city: new RegExp(escapeRegex(normalizedCity), "i"),
        status: "approved",
      })
        .select("_id")
        .lean();
    }

    const cityMerchantIds = cityMerchants.map(m => m._id);

    if (query.merchantId?.$in) {
      // Intersect with existing merchant filter
      query.merchantId.$in = query.merchantId.$in.filter(id =>
        cityMerchantIds.some(cid => cid.equals(id))
      );
    } else {
      query.merchantId = { $in: cityMerchantIds };
    }
  }

  // Pagination & Sorting
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  let sortObj = { createdAt: -1 };
  if (req.query.sortBy && req.query.sortBy !== "distance") {
    const order = req.query.sortOrder === "asc" ? 1 : -1;
    sortObj = { [req.query.sortBy]: order };
  }

  const offersQuery = Offer.find(query)
    .populate('merchantId', 'storeName businessName verified coordinates city totalRedemptions subscriptionPlanId')
    .populate('productId', 'name price')
    .populate('servicePlanId', 'name price')
    .sort(sortObj)
    .skip(skip)
    .limit(limit);

  const offers = await offersQuery;
  const totalOffers = await Offer.countDocuments(query);

  // Parse user coordinates for distance calculation
  const userLat = req.query.userLat ? parseFloat(req.query.userLat) : null;
  const userLng = req.query.userLng ? parseFloat(req.query.userLng) : null;

  // Enrich offers with merchant data and distance
  let enrichedOffers = await Promise.all(offers.map(async (offer) => {
    const offerObj = offer.toObject();

    // Add merchant name
    if (offerObj.merchantId) {
      offerObj.merchantName = offerObj.merchantId.businessName || offerObj.merchantId.storeName;

      // Plan boost logic for general list
      let planBoost = 0;
      if (offerObj.merchantId.subscriptionPlanId) {
        const plan = await Plan.findById(offerObj.merchantId.subscriptionPlanId);
        if (plan) {
           planBoost = plan.name.toLowerCase().includes('enterprise') ? 15 : (plan.name.toLowerCase().includes('business') ? 8 : 0);
        }
      }
      offerObj.planBoost = planBoost;

      offerObj.merchant = {
        _id: offerObj.merchantId._id,
        storeName: offerObj.merchantId.storeName || offerObj.merchantId.businessName,
        verified: offerObj.merchantId.verified || false,
        coordinates: offerObj.merchantId.coordinates,
        city: offerObj.merchantId.city,
        totalRedemptions: offerObj.merchantId.totalRedemptions || 0,
        planBoost: planBoost
      };

      // Calculate distance if user coordinates provided
      if (userLat && userLng && offerObj.merchantId.coordinates) {
        const distance = calculateDistance(
          userLat,
          userLng,
          offerObj.merchantId.coordinates.lat,
          offerObj.merchantId.coordinates.lng
        );
        offerObj.merchant.distance = formatDistance(distance);
        offerObj.distanceKm = distance;
      } else {
        offerObj.distanceKm = 9999; // Far away if no coords
      }
    }

    if (offerObj.productId) {
      offerObj.productPrice = offerObj.productId.price;
      offerObj.productName = offerObj.productId.name;
    }

    if (offerObj.servicePlanId) {
      offerObj.servicePlanPrice = offerObj.servicePlanId.price;
      offerObj.servicePlanName = offerObj.servicePlanId.name;
    }

    return offerObj;
  }));

  // Re-sort if nearby is requested or by plan boost
  if (req.query.sortBy === 'distance') {
    enrichedOffers.sort((a, b) => {
      // 1. Distance First
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      // 2. Plan Boost Second
      return (b.planBoost || 0) - (a.planBoost || 0);
    });
  } else {
    // Default boost for general view
    enrichedOffers.sort((a, b) => (b.planBoost || 0) - (a.planBoost || 0));
  }

  return res.status(200).json({ 
    offers: enrichedOffers.map(serializeOffer),
    total: totalOffers,
    page: page,
    limit: limit,
    totalPages: Math.ceil(totalOffers / limit)
  });
};

export const getOfferById = async (req, res) => {
  const offer = await Offer.findById(req.params.id)
    .populate('merchantId')
    .populate('productId', 'name price')
    .populate('servicePlanId', 'name price');

  if (!offer) {
    return res.status(404).json({ message: "Offer not found" });
  }

  const isAdmin = req.user?.role === "admin";
  const isOwner =
    req.user &&
    offer.merchantId &&
    offer.merchantId._id.toString() === req.user._id.toString();

  if (!isAdmin && !isOwner) {
    const isVisibleToPublic =
      offer.status === "active" && offer.merchantId?.status === "approved";
    if (!isVisibleToPublic) {
      return res.status(404).json({ message: "Offer not found" });
    }
  }

  const offerObj = offer.toObject();
  
  // Serialize merchant separately
  let merchantData = null;
  if (offerObj.merchantId) {
    merchantData = serializeMerchant(offerObj.merchantId);
    offerObj.merchantName = offerObj.merchantId.businessName || offerObj.merchantId.storeName;
  }
  
  // Add product price and name if available
  if (offerObj.productId) {
    offerObj.productPrice = offerObj.productId.price;
    offerObj.productName = offerObj.productId.name;
  }
  
  // Add service plan price and name if available
  if (offerObj.servicePlanId) {
    offerObj.servicePlanPrice = offerObj.servicePlanId.price;
    offerObj.servicePlanName = offerObj.servicePlanId.name;
  }

  const serializedOffer = serializeOffer(offerObj);
  
  // Add merchant object to response
  if (merchantData) {
    serializedOffer.merchant = merchantData;
  }

  return res.status(200).json({ offer: serializedOffer });
};

export const getMyOffers = async (req, res) => {
  const merchant = await getOwnedMerchant(req.user._id);

  if (!merchant) {
    return res.status(404).json({ message: "Merchant profile not found" });
  }

  const offers = await Offer.find({ merchantId: merchant._id })
    .populate('productId', 'name price')
    .populate('servicePlanId', 'name price')
    .sort({ createdAt: -1 });
  
  // Enrich offers with merchant name and product/service prices
  const enrichedOffers = offers.map(offer => {
    const offerObj = offer.toObject();
    
    // Add merchant name
    offerObj.merchantName = merchant.businessName || merchant.storeName;
    
    // Add product price and name if available
    if (offerObj.productId) {
      offerObj.productPrice = offerObj.productId.price;
      offerObj.productName = offerObj.productId.name;
    }
    
    // Add service plan price and name if available
    if (offerObj.servicePlanId) {
      offerObj.servicePlanPrice = offerObj.servicePlanId.price;
      offerObj.servicePlanName = offerObj.servicePlanId.name;
    }
    
    return offerObj;
  });
  
  return res.status(200).json({ offers: enrichedOffers.map(serializeOffer) });
};

export const createOffer = async (req, res) => {
  const merchant = await getOwnedMerchant(req.user._id);

  if (!merchant) {
    return res.status(404).json({ message: "Merchant profile not found" });
  }

  await ensureOfferAllowance(merchant);

  // Validate offer type specific requirements
  const offerType = req.body.offerType || "generic";
  
  if (offerType === "product" && !req.body.productId) {
    return res.status(400).json({ message: "Product ID is required for product-based offers" });
  }
  
  if (offerType === "service" && !req.body.servicePlanId) {
    return res.status(400).json({ message: "Service Plan ID is required for service-based offers" });
  }

  const hasMaxRedemptions =
    req.body.maxRedemptions !== undefined &&
    req.body.maxRedemptions !== null &&
    req.body.maxRedemptions !== "";
  const parsedMaxRedemptions = hasMaxRedemptions ? Number(req.body.maxRedemptions) : 100;
  const normalizedMaxRedemptions =
    Number.isFinite(parsedMaxRedemptions) && parsedMaxRedemptions >= 0
      ? parsedMaxRedemptions
      : 100;

  const offer = await Offer.create({
    merchantId: merchant._id,
    
    // Offer type and linking (NEW - backward compatible)
    offerType: offerType,
    productId: req.body.productId || null,
    variantId: req.body.variantId || null,
    applyToAllVariants: Boolean(req.body.applyToAllVariants),
    servicePlanId: req.body.servicePlanId || null,
    bookingRequired: Boolean(req.body.bookingRequired),
    bookingWindowDays: Number(req.body.bookingWindowDays || 7),
    
    // Common fields (EXISTING - unchanged)
    title: req.body.title,
    description: req.body.description || "",
    discountType: req.body.discountType || "percentage",
    discountValue: Number(req.body.discountValue || 0),
    validFrom: req.body.validFrom || new Date(),
    validTo: req.body.validTo || null,
    maxRedemptions: normalizedMaxRedemptions,
    currentRedemptions: Number(req.body.currentRedemptions || 0),
    
    // Image handling (ENHANCED - backward compatible)
    image: req.body.image || "",
    customImage: req.body.customImage || null,
    useCustomImage: Boolean(req.body.useCustomImage),
    
    status: req.body.status || "active",
    category: req.body.category || merchant.category || "General",
    isTrending: Boolean(req.body.isTrending),
    isNew: "isNew" in req.body ? Boolean(req.body.isNew) : true,
    terms: Array.isArray(req.body.terms)
      ? req.body.terms
      : (typeof req.body.terms === "string" && req.body.terms.trim()
          ? [req.body.terms.trim()]
          : []),
  });

  invalidateFeedCache({ city: merchant.city });

  return res.status(201).json({ offer: serializeOffer(offer) });
};

export const updateOffer = async (req, res) => {
  const merchant = await getOwnedMerchant(req.user._id);

  if (!merchant) {
    return res.status(404).json({ message: "Merchant profile not found" });
  }

  const offer = await Offer.findOne({ _id: req.params.id, merchantId: merchant._id });

  if (!offer) {
    return res.status(404).json({ message: "Offer not found" });
  }

  // Validate offer type specific requirements if offerType is being changed
  if (req.body.offerType) {
    if (req.body.offerType === "product" && !req.body.productId && !offer.productId) {
      return res.status(400).json({ message: "Product ID is required for product-based offers" });
    }
    
    if (req.body.offerType === "service" && !req.body.servicePlanId && !offer.servicePlanId) {
      return res.status(400).json({ message: "Service Plan ID is required for service-based offers" });
    }
  }

  if ("terms" in req.body) {
    req.body.terms = Array.isArray(req.body.terms)
      ? req.body.terms
      : (typeof req.body.terms === "string" && req.body.terms.trim()
          ? [req.body.terms.trim()]
          : []);
  }

  const editableFields = [
    // Existing fields
    "title",
    "description",
    "discountType",
    "discountValue",
    "validFrom",
    "validTo",
    "maxRedemptions",
    "currentRedemptions",
    "image",
    "status",
    "category",
    "isTrending",
    "isNew",
    "terms",
    // NEW fields (backward compatible)
    "offerType",
    "productId",
    "variantId",
    "applyToAllVariants",
    "servicePlanId",
    "bookingRequired",
    "bookingWindowDays",
    "customImage",
    "useCustomImage",
  ];

  for (const field of editableFields) {
    if (field in req.body) {
      offer[field] = req.body[field];
    }
  }

  await offer.save();
  invalidateFeedCache({ city: merchant.city });

  return res.status(200).json({ offer: serializeOffer(offer) });
};

export const deleteOffer = async (req, res) => {
  const merchant = await getOwnedMerchant(req.user._id);

  if (!merchant) {
    return res.status(404).json({ message: "Merchant profile not found" });
  }

  const offer = await Offer.findOneAndDelete({ _id: req.params.id, merchantId: merchant._id });

  if (!offer) {
    return res.status(404).json({ message: "Offer not found" });
  }

  invalidateFeedCache({ city: merchant.city });

  return res.status(200).json({ success: true });
};

const MAX_VIEWS_PER_BATCH = 25;
const VIEW_SOURCES = new Set(["feed", "detail", "store", "search", "saved", "other"]);

// @desc    Record offer views (batched from the customer app)
// @route   POST /api/offers/views
// @access  Public (optionalAuth - anonymous views still count)
export const recordOfferViews = async (req, res) => {
  const incoming = Array.isArray(req.body?.views) ? req.body.views : [];

  if (incoming.length === 0) {
    return res.status(200).json({ recorded: 0 });
  }

  // Signed-in viewers key on their user id so the same person is deduped across
  // devices; everyone else falls back to the anonymous session id the client mints.
  const sessionKey = String(req.body?.sessionKey || "").trim().slice(0, 64);
  const viewerKey = req.user?._id ? req.user._id.toString() : sessionKey;

  if (!viewerKey) {
    return res.status(400).json({ message: "sessionKey is required for anonymous views" });
  }

  const bucket = viewBucketFor();

  // Collapse repeats inside the payload itself before touching the database.
  const unique = new Map();
  for (const entry of incoming.slice(0, MAX_VIEWS_PER_BATCH)) {
    const offerId = String(entry?.offerId || "");
    if (!mongoose.Types.ObjectId.isValid(offerId)) continue;

    const source = VIEW_SOURCES.has(entry?.source) ? entry.source : "other";
    if (!unique.has(offerId)) {
      unique.set(offerId, source);
    }
  }

  if (unique.size === 0) {
    return res.status(200).json({ recorded: 0 });
  }

  // Only count views of offers that actually exist, and resolve the owning merchant
  // so the analytics queries never have to join back through Offer.
  const offers = await Offer.find({ _id: { $in: [...unique.keys()] } })
    .select("_id merchantId")
    .lean();

  if (offers.length === 0) {
    return res.status(200).json({ recorded: 0 });
  }

  const documents = offers.map((offer) => ({
    insertOne: {
      document: {
        offerId: offer._id,
        merchantId: offer.merchantId,
        userId: req.user?._id || null,
        viewerKey,
        source: unique.get(offer._id.toString()) || "other",
        bucket,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  }));

  let recordedIds = [];

  try {
    const result = await OfferView.bulkWrite(documents, { ordered: false });
    // Duplicates are the expected case, not an error - they mean the viewer already
    // counted for this offer inside the current dedupe window.
    recordedIds = offers
      .filter((_, index) => !(result.getWriteErrors?.() || []).some((e) => e.index === index))
      .map((offer) => offer._id);
  } catch (error) {
    if (error?.code !== 11000 && !Array.isArray(error?.writeErrors)) {
      throw error;
    }

    const failedIndexes = new Set((error.writeErrors || []).map((entry) => entry.index));
    recordedIds = offers.filter((_, index) => !failedIndexes.has(index)).map((offer) => offer._id);
  }

  if (recordedIds.length > 0) {
    // Keep the lifetime counter on the offer in step, so the feed and offer list can
    // show impressions without hitting the events collection.
    await Offer.updateMany({ _id: { $in: recordedIds } }, { $inc: { impressions: 1 } });
  }

  return res.status(200).json({ recorded: recordedIds.length });
};
