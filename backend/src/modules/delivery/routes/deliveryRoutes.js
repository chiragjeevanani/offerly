import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect, authorize } from '../../../middlewares/auth.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import { createPushHandlers } from '../../user/controllers/pushController.js';
import {
  getDeliveryConfig,
  getOrderPayment,
  verifyOrderPayment,
  cancelMyOrder,
  storeAcceptOrder,
  storeMarkReady,
  getPartnerMe,
  updatePartnerMe,
  updatePartnerDocuments,
  getAvailableOrders,
  getPartnerOrders,
  getPartnerOrder,
  acceptOrder,
  releaseOrder,
  pickupOrder,
  deliverOrder,
  getAdminSettings,
  updateAdminSettings,
  getAdminPartners,
  updatePartnerStatus,
  settlePartner,
  getAdminOrders,
  adminUnassignOrder,
  adminCancelOrder,
  adminRetryRefund,
} from '../controllers/deliveryController.js';

const router = express.Router();

// Phone push for partners: same handlers as customers/merchants, storing the
// token on DeliveryPartner.fcmTokens. Any status may register, so a pending
// partner hears the moment they are approved.
const partnerPush = createPushHandlers(DeliveryPartner, { testLink: '/delivery' });

const pushTestLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many test notifications, please wait a moment' },
});

// The 4-digit handover code is guessable by brute force without this.
const deliverLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Too many attempts. Wait a few minutes and try again.' },
});

// Public: is delivery on, and what it costs
router.get('/config', getDeliveryConfig);

// Customer
router.post('/orders/:id/pay', protect, authorize('customer'), getOrderPayment);
router.post('/orders/:id/verify-payment', protect, authorize('customer'), verifyOrderPayment);
router.post('/orders/:id/cancel', protect, authorize('customer'), cancelMyOrder);

// Store
router.post('/store/orders/:id/accept', protect, authorize('merchant'), storeAcceptOrder);
router.post('/store/orders/:id/ready', protect, authorize('merchant'), storeMarkReady);

// Delivery partner
router.get('/partner/me', protect, authorize('delivery'), getPartnerMe);
router.put('/partner/me', protect, authorize('delivery'), updatePartnerMe);
router.put('/partner/me/documents', protect, authorize('delivery'), updatePartnerDocuments);
router.get('/partner/me/push-tokens', protect, authorize('delivery'), partnerPush.list);
router.post('/partner/me/push-tokens', protect, authorize('delivery'), partnerPush.register);
router.delete('/partner/me/push-tokens', protect, authorize('delivery'), partnerPush.unregister);
router.post('/partner/me/push-tokens/test', protect, authorize('delivery'), pushTestLimiter, partnerPush.test);
router.get('/partner/available', protect, authorize('delivery'), getAvailableOrders);
router.get('/partner/orders', protect, authorize('delivery'), getPartnerOrders);
router.get('/partner/orders/:id', protect, authorize('delivery'), getPartnerOrder);
router.post('/partner/orders/:id/accept', protect, authorize('delivery'), acceptOrder);
router.post('/partner/orders/:id/release', protect, authorize('delivery'), releaseOrder);
router.post('/partner/orders/:id/pickup', protect, authorize('delivery'), pickupOrder);
router.post('/partner/orders/:id/deliver', protect, authorize('delivery'), deliverLimiter, deliverOrder);

// Admin
router.get('/admin/settings', protect, authorize('admin'), getAdminSettings);
router.put('/admin/settings', protect, authorize('admin'), updateAdminSettings);
router.get('/admin/partners', protect, authorize('admin'), getAdminPartners);
router.put('/admin/partners/:id/status', protect, authorize('admin'), updatePartnerStatus);
router.post('/admin/partners/:id/settle', protect, authorize('admin'), settlePartner);
router.get('/admin/orders', protect, authorize('admin'), getAdminOrders);
router.post('/admin/orders/:id/unassign', protect, authorize('admin'), adminUnassignOrder);
router.post('/admin/orders/:id/cancel', protect, authorize('admin'), adminCancelOrder);
router.post('/admin/orders/:id/retry-refund', protect, authorize('admin'), adminRetryRefund);

export default router;
