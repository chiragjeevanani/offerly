import express from "express";
import rateLimit from "express-rate-limit";

import { authorize, protect } from "../../../middlewares/auth.js";
import {
  getCities,
  getMyNotifications,
  getMyProfile,
  getPlans,
  getReferralHistory,
  getSavedOffers,
  markAllNotificationsRead,
  markNotificationRead,
  redeemCredits,
  toggleSavedOffer,
  updateMyProfile,
} from "../controllers/userController.js";
import {
  getMyPushTokens,
  registerPushToken,
  sendTestPush,
  unregisterPushToken,
} from "../controllers/pushController.js";
import {
  getMySubscriptionStatus,
  purchaseCustomerSubscription,
  verifyCustomerSubscription,
} from "../controllers/subscriptionController.js";

const router = express.Router();

// The test endpoint only ever pushes to the caller's own devices, but it's
// still a free Firebase send per request — cap it so a stuck client loop
// can't burn quota.
const pushTestLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many test notifications, please wait a moment" },
});

router.get("/cities", getCities);
router.get("/plans", getPlans);
router.get("/me", protect, getMyProfile);
router.put("/me", protect, updateMyProfile);
router.get("/notifications", protect, getMyNotifications);
router.patch("/notifications/:id/read", protect, markNotificationRead);
router.put("/notifications/:id/read", protect, markNotificationRead);
router.patch("/notifications/read-all", protect, markAllNotificationsRead);
router.put("/notifications/read-all", protect, markAllNotificationsRead);
router.get("/saved-offers", protect, getSavedOffers);
router.post("/saved-offers/:offerId/toggle", protect, toggleSavedOffer);
router.get("/referrals", protect, getReferralHistory);
router.get("/referrals/history", protect, getReferralHistory);
router.post("/credits/redeem", protect, redeemCredits);
// Firebase Cloud Messaging device tokens. Customer-only: the merchant and
// admin consoles stay on sockets for now.
router.get("/me/push-tokens", protect, authorize("customer"), getMyPushTokens);
router.post("/me/push-tokens", protect, authorize("customer"), registerPushToken);
router.delete("/me/push-tokens", protect, authorize("customer"), unregisterPushToken);
router.post("/me/push-tokens/test", protect, authorize("customer"), pushTestLimiter, sendTestPush);

router.get("/me/subscription", protect, authorize("customer"), getMySubscriptionStatus);
router.post("/me/subscription/purchase", protect, authorize("customer"), purchaseCustomerSubscription);
router.post("/me/subscription/verify", protect, authorize("customer"), verifyCustomerSubscription);

export default router;
