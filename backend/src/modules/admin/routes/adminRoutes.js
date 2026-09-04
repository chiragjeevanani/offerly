import express from 'express';
import {
  getAllUsers,
  updateUserStatus,
  updateMerchantStatus,
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
  updateWalletSettingsConfig
} from '../controllers/adminController.js';
import { protect, authorize } from '../../../middlewares/auth.js';

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
router.delete('/merchants/:id', authorize('admin'), deleteMerchant);
router.post('/cities', authorize('admin'), saveCity);
router.delete('/cities/:id', authorize('admin'), deleteCity);
router.post('/plans', authorize('admin'), savePlan);
router.delete('/plans/:id', authorize('admin'), deletePlan);
router.get('/wallet-settings', authorize('admin'), getWalletSettingsConfig);
router.put('/wallet-settings', authorize('admin'), updateWalletSettingsConfig);

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
