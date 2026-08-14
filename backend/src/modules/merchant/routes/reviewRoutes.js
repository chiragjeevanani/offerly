import express from 'express';
import { 
    createReview, 
    getMerchantReviews 
} from '../controllers/reviewController.js';
import { protect } from '../../../middlewares/auth.js';

const router = express.Router();

router.post('/', protect, createReview);
router.get('/merchant/:merchantId', getMerchantReviews);

export default router;
