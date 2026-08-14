import express from 'express';
import {
  getVariantsByProduct,
  createVariant,
  updateVariant,
  deleteVariant
} from '../controllers/variantController.js';
import { protect } from '../../../middlewares/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.route('/products/:productId/variants')
  .get(getVariantsByProduct)
  .post(createVariant);

router.route('/products/:productId/variants/:variantId')
  .put(updateVariant)
  .delete(deleteVariant);

export default router;
