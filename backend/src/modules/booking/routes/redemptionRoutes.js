import express from 'express';
import { 
    createRedemption, 
    getCustomerRedemptions, 
    getRedemptionById,
    verifyQR,
    getMerchantRedemptions,
    lookupByInternalId,
    previewQR
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
router.get('/:id', protect, getRedemptionById);

export default router;
