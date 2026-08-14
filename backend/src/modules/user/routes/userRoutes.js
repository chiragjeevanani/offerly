import express from "express";

import { protect } from "../../../middlewares/auth.js";
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

export default router;
