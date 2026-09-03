import express from 'express';
import {
    createRedemption,
    getCustomerRedemptions,
    getRedemptionById,
    verifyQR,
    getMerchantRedemptions,
    lookupByInternalId,
    previewQR,
    updateRedemptionItems,
    cancelRedemption
} from '../controllers/redemptionController.js';
import { protect, authorize } from '../../../middlewares/auth.js';

const router = express.Router();

router.route('/')
    .post(protect, createRedemption);

router.get('/customer', protect, getCustomerRedemptions);
router.get('/merchant', protect, authorize('merchant'), getMerchantRedemptions);
router.get('/lookup/:internalId', protect, authorize('merchant'), lookupByInternalId);
router.post('/preview-qr', protect, authorize('merchant'), previewQR);
router.post('/verify-qr', protect, authorize('merchant'), verifyQR);
router.put('/:id/items', protect, authorize('merchant'), updateRedemptionItems);
router.post('/:id/cancel', protect, authorize('merchant'), cancelRedemption);
router.get('/:id', protect, getRedemptionById);

export default router;
