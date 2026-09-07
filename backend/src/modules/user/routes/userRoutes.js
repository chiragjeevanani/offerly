import express from "express";

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
  getMySubscriptionStatus,
  purchaseCustomerSubscription,
  verifyCustomerSubscription,
} from "../controllers/subscriptionController.js";

const router = express.Router();

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
router.get("/me/subscription", protect, authorize("customer"), getMySubscriptionStatus);
router.post("/me/subscription/purchase", protect, authorize("customer"), purchaseCustomerSubscription);
router.post("/me/subscription/verify", protect, authorize("customer"), verifyCustomerSubscription);

export default router;
