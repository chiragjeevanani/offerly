import express from 'express';
import { getPayoutRequests, payPayoutRequest, rejectPayoutRequest } from '../../payment/controllers/settlementController.js';
import { getIncentiveSettingsConfig, updateIncentiveSettingsConfig, getIncentiveSummary } from '../controllers/incentiveController.js';
import {
  getAllUsers,
  updateUserStatus,
  updateMerchantStatus,
  updateMerchantZone,
  deleteMerchant,
  saveCity,
  deleteCity,
  getCities,
  savePlan,
  getPlans,
  deletePlan,
  getDashboardStats,
  getAllRedemptions,
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  globalSearch,
  getAllAdRequests,
  updateAdRequestStatus,
  deleteAdRequest,
  getApprovedAds,
  getWalletSettingsConfig,
  updateWalletSettingsConfig,
  getCustomerSubscriptionSettingsConfig,
  updateCustomerSubscriptionSettingsConfig
} from '../controllers/adminController.js';
import { getMerchantWallet, adjustMerchantWallet } from '../controllers/merchantWalletController.js';
import { protect, authorize } from '../../../middlewares/auth.js';
import { updateSupportContacts } from '../controllers/supportSettingsController.js';
import { getBlueTickConfig, updateBlueTickConfig } from '../../merchant/controllers/blueTickController.js';
import { countAudience, searchTargets, sendBroadcast, getBroadcasts } from '../controllers/broadcastController.js';
import {
  getHomeBanners,
  createHomeBanner,
  updateHomeBanner,
  reorderHomeBanners,
  deleteHomeBanner,
} from '../controllers/homeBannerController.js';

const router = express.Router();

// Public Ad Requests (move above protect)
router.get('/ads/approved', getApprovedAds);

router.use(protect); // All admin routes below require login

// Dashboard
router.get('/dashboard', authorize('admin'), getDashboardStats);

// Admin only routes
router.get('/users', authorize('admin'), getAllUsers);
router.put('/users/:id/status', authorize('admin'), updateUserStatus);
router.get('/redemptions', authorize('admin'), getAllRedemptions);
router.put('/merchants/:id/status', authorize('admin'), updateMerchantStatus);
router.put('/merchants/:id/zone', authorize('admin'), updateMerchantZone);
router.delete('/merchants/:id', authorize('admin'), deleteMerchant);
router.get('/merchants/:id/wallet', authorize('admin'), getMerchantWallet);
router.put('/merchants/:id/wallet', authorize('admin'), adjustMerchantWallet);
router.post('/cities', authorize('admin'), saveCity);
router.delete('/cities/:id', authorize('admin'), deleteCity);
router.post('/plans', authorize('admin'), savePlan);
router.delete('/plans/:id', authorize('admin'), deletePlan);
router.get('/wallet-settings', authorize('admin'), getWalletSettingsConfig);
router.put('/wallet-settings', authorize('admin'), updateWalletSettingsConfig);
// Refer & Earn + Customer Distribution Fund
router.get('/incentive-settings', authorize('admin'), getIncentiveSettingsConfig);
router.put('/incentive-settings', authorize('admin'), updateIncentiveSettingsConfig);
router.get('/incentive-summary', authorize('admin'), getIncentiveSummary);
// Blue tick (verified seller) rules
router.get('/blue-tick-settings', authorize('admin'), getBlueTickConfig);
router.put('/blue-tick-settings', authorize('admin'), updateBlueTickConfig);
// Send Notification (to customers / merchants)
router.get('/broadcasts', authorize('admin'), getBroadcasts);
router.get('/broadcasts/count', authorize('admin'), countAudience);
router.get('/broadcasts/search', authorize('admin'), searchTargets);
router.post('/broadcasts', authorize('admin'), sendBroadcast);
// Store payouts for Offerly-funded discounts
router.get('/payouts', authorize('admin'), getPayoutRequests);
router.put('/payouts/:id/pay', authorize('admin'), payPayoutRequest);
router.put('/payouts/:id/reject', authorize('admin'), rejectPayoutRequest);
router.get('/customer-subscription-settings', authorize('admin'), getCustomerSubscriptionSettingsConfig);
router.put('/customer-subscription-settings', authorize('admin'), updateCustomerSubscriptionSettingsConfig);
router.put('/support-contacts', authorize('admin'), updateSupportContacts);

// Home Banners (ad carousel above "Select Services" in the customer app)
router.get('/home-banners', authorize('admin'), getHomeBanners);
router.post('/home-banners', authorize('admin'), createHomeBanner);
router.put('/home-banners/reorder', authorize('admin'), reorderHomeBanners);
router.put('/home-banners/:id', authorize('admin'), updateHomeBanner);
router.delete('/home-banners/:id', authorize('admin'), deleteHomeBanner);

// Helper public routes
router.get('/cities', getCities);
router.get('/plans', getPlans);

// Notifications
router.get('/notifications', authorize('admin'), getAdminNotifications);
router.put('/notifications/read-all', authorize('admin'), markAllAdminNotificationsRead);
router.put('/notifications/:id/read', authorize('admin'), markAdminNotificationRead);

// Search
router.get('/search', authorize('admin'), globalSearch);

// Ad Requests
router.get('/ads', authorize('admin'), getAllAdRequests);
router.put('/ads/:id/status', authorize('admin'), updateAdRequestStatus);
router.delete('/ads/:id', authorize('admin'), deleteAdRequest);

// Public Ad Requests (already moved above protect)
// router.get('/ads/approved', getApprovedAds);

export default router;
