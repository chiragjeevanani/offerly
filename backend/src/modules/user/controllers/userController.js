import City from "../../admin/models/City.js";
import Plan from "../../admin/models/Plan.js";
import Offer from "../../merchant/models/Offer.js";
import {
  serializeCity,
  serializeMerchant,
  serializeNotification,
  serializeOffer,
  serializePlan,
  serializeReferralHistory,
  serializeUser,
} from "../../../utils/serializers.js";
import Notification from "../models/Notification.js";
import ReferralHistory from "../models/ReferralHistory.js";
import User from "../models/User.js";

export const getMyProfile = async (req, res) => {
  return res.status(200).json({ user: serializeUser(req.user) });
};

export const updateMyProfile = async (req, res) => {
  const allowedFields = [
    "name",
    "email",
    "avatar",
    "address",
    "city",
    "zone",
    "gender",
    "dob",
    "isProfileComplete",
  ];

  if (req.body.zone) {
    const city = req.body.city || req.user.city;
    const cityDoc = city
      ? await City.findOne({ name: city, "zones._id": req.body.zone })
      : null;
    if (!cityDoc) {
      return res.status(400).json({ message: "Selected zone does not belong to the selected city" });
    }
  }

  for (const field of allowedFields) {
    if (field in req.body) {
      req.user[field] = req.body[field];
    }
  }

  await req.user.save();

  return res.status(200).json({ user: serializeUser(req.user) });
};

export const getCities = async (_req, res) => {
  const cities = await City.find({}).sort({ name: 1 });
  return res.status(200).json({ cities: cities.map(serializeCity) });
};

export const getPlans = async (_req, res) => {
  const plans = await Plan.find({}).sort({ price: 1, createdAt: 1 });
  return res.status(200).json({ plans: plans.map(serializePlan) });
};

export const getMyNotifications = async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 });

  return res.status(200).json({
    notifications: notifications.map(serializeNotification),
    unreadCount: notifications.filter((item) => !item.isRead).length,
  });
};

export const markNotificationRead = async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }

  notification.isRead = true;
  await notification.save();

  return res.status(200).json({ notification: serializeNotification(notification) });
};

export const markAllNotificationsRead = async (req, res) => {
  await Notification.updateMany(
    {
      userId: req.user._id,
      isRead: false,
    },
    {
      isRead: true,
    },
  );

  const unreadCount = await Notification.countDocuments({
    userId: req.user._id,
    isRead: false,
  });

  return res.status(200).json({
    success: true,
    unreadCount,
  });
};

export const getSavedOffers = async (req, res) => {
  const user = await User.findById(req.user._id).select("savedOffers").lean();
  const savedOfferIds = (user?.savedOffers || []).map((item) => item.toString());
  const offers = await Offer.find({ _id: { $in: savedOfferIds } })
    .populate('merchantId')
    .sort({ createdAt: -1 });

  // Serialize offers with merchant data
  const serializedOffers = offers.map(offer => {
    const offerObj = offer.toObject ? offer.toObject() : offer;
    const serialized = serializeOffer(offerObj);
    
    // Add merchant object if populated
    if (offerObj.merchantId && typeof offerObj.merchantId === 'object') {
      serialized.merchant = serializeMerchant(offerObj.merchantId);
    }
    
    return serialized;
  });

  return res.status(200).json({
    offerIds: savedOfferIds,
    offers: serializedOffers,
  });
};

export const toggleSavedOffer = async (req, res) => {
  const offerId = req.params.offerId;
  
  // 1. Bug Fix: Ensure savedOffers array exists (for older users created before this schema)
  if (!req.user.savedOffers) {
    req.user.savedOffers = [];
  }

  const existingIndex = req.user.savedOffers.findIndex((item) => item.toString() === offerId);
  let isSaved = false;

  if (existingIndex >= 0) {
    // Already saved -> Remove it
    req.user.savedOffers.splice(existingIndex, 1);
    await Offer.findByIdAndUpdate(offerId, { $inc: { saves: -1 } }).catch(console.error);
    isSaved = false;
  } else {
    // Not saved -> Add it
    req.user.savedOffers.push(offerId);
    await Offer.findByIdAndUpdate(offerId, { $inc: { saves: 1 } }).catch(console.error);
    isSaved = true;
  }

  await req.user.save();

  return res.status(200).json({
    savedOfferIds: req.user.savedOffers.map((item) => item.toString()),
    isSaved: isSaved,
  });
};

export const getReferralHistory = async (req, res) => {
  const referrals = await ReferralHistory.find({ userId: req.user._id })
    .populate("referredUserId", "name")
    .sort({ createdAt: -1 });

  return res.status(200).json({
    referrals: referrals.map(serializeReferralHistory),
  });
};

export const redeemCredits = async (req, res) => {
  const requestedAmount = Number(req.body?.amount || 0);

  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
    return res.status(400).json({ success: false, error: "Valid amount is required" });
  }

  if ((req.user.credits || 0) < requestedAmount) {
    return res.status(400).json({ success: false, error: "Insufficient credits" });
  }

  if (requestedAmount < 100) {
    return res.status(400).json({ success: false, error: "Minimum redeem amount is 100 credits" });
  }

  await Notification.create({
    userId: req.user._id,
    title: "Redemption Request Submitted",
    body: `Your credit redemption request for Rs. ${requestedAmount} has been submitted for review.`,
    type: "referral",
    data: {
      amount: requestedAmount,
      status: "requested",
    },
  });

  return res.status(200).json({
    success: true,
    message: "Redemption request submitted successfully",
    requestedAmount,
    availableCredits: req.user.credits || 0,
  });
};
