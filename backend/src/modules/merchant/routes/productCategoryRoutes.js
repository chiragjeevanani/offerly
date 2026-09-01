import express from 'express';
import { protect, authorize } from '../../../middlewares/auth.js';
import {
  getMyCategories,
  getCategoriesByMerchant,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/productCategoryController.js';

const router = express.Router();

// IMPORTANT: More specific routes must come before generic ones
router.get('/merchant/me', protect, authorize('merchant'), getMyCategories);
router.get('/merchant/:merchantId', getCategoriesByMerchant);

router.post('/', protect, authorize('merchant'), createCategory);
router.put('/:id', protect, authorize('merchant'), updateCategory);
router.delete('/:id', protect, authorize('merchant'), deleteCategory);

export default router;
