import express from 'express';
import { 
    createReview, 
    getMerchantReviews 
} from '../controllers/reviewController.js';
import { protect, authorize } from '../../../middlewares/auth.js';

const router = express.Router();

router.post('/', protect, authorize('customer'), createReview);
router.get('/merchant/:merchantId', getMerchantReviews);

export default router;
