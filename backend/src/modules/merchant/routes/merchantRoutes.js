import express from "express";

import { authorize, optionalAuth, protect } from "../../../middlewares/auth.js";
import {
  getMerchantById,
  getMerchantCustomers,
  getMerchantDashboard,
  getMerchants,
  getMyStore,
  getMySubscription,
  registerStore,
  updateMyStore,
  updateOnboarding,
  updateBusinessDetails,
  updateKYBDocuments,
  updateLocationHours,
  getStoreConfig,
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  requestAd,
  purchaseSubscription,
  verifySubscription,
} from "../controllers/merchantController.js";
import {
  getTodayAnalytics,
  getMonthlyAnalytics,
} from "../controllers/analyticsController.js";
import { deleteMerchant } from "../../admin/controllers/adminController.js";

const router = express.Router();

router.get("/", optionalAuth, getMerchants);
router.get("/me", protect, authorize("merchant", "admin"), getMyStore);
router.get("/me/store-config", protect, authorize("merchant"), getStoreConfig);
router.patch("/me/onboarding", protect, authorize("merchant"), updateOnboarding);

// 4-Step Registration Routes
router.post("/me/registration/business-details", protect, authorize("merchant"), updateBusinessDetails);
router.post("/me/registration/kyb-documents", protect, authorize("merchant"), updateKYBDocuments);
router.post("/me/registration/location-hours", protect, authorize("merchant"), updateLocationHours);

router.get("/me/dashboard", protect, authorize("merchant", "admin"), getMerchantDashboard);
router.get("/me/customers", protect, authorize("merchant", "admin"), getMerchantCustomers);

// Insights
router.get("/me/analytics/today", protect, authorize("merchant", "admin"), getTodayAnalytics);
router.get("/me/analytics/monthly", protect, authorize("merchant", "admin"), getMonthlyAnalytics);

router.get("/me/subscription", protect, authorize("merchant", "admin"), getMySubscription);

// Subscription & Ad Requests
router.post("/me/subscription/purchase", protect, authorize("merchant"), purchaseSubscription);
router.post("/me/subscription/verify", protect, authorize("merchant"), verifySubscription);
router.post("/me/ads", protect, authorize("merchant"), requestAd);

// Notification Routes
router.get("/me/notifications", protect, authorize("merchant"), getMyNotifications);
router.patch("/me/notifications/:id/read", protect, authorize("merchant"), markNotificationRead);
router.patch("/me/notifications/mark-all-read", protect, authorize("merchant"), markAllNotificationsRead);

router.post("/register", protect, authorize("merchant"), registerStore);
router.put("/me", protect, authorize("merchant", "admin"), updateMyStore);
router.get("/:id", optionalAuth, getMerchantById);
router.delete("/:id", protect, authorize("admin"), deleteMerchant);

export default router;
