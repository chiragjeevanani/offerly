import express from 'express';
import { protect, authorize } from '../../../middlewares/auth.js';
import {
  getProductsByMerchant,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
  searchProducts,
  debugAuth
} from '../controllers/productController.js';

const router = express.Router();

// IMPORTANT: More specific routes must come before generic ones

// Debug endpoint (merchant only)
router.get('/debug/auth', protect, authorize('merchant'), debugAuth);

// Get product statistics (merchant only) - must be before /:id
router.get('/stats', protect, authorize('merchant'), getProductStats);

// Search products for offer creation (merchant only)
router.get('/search', protect, authorize('merchant'), searchProducts);

// Get products by merchant - /merchant/me must be before /merchant/:merchantId
router.get('/merchant/me', protect, authorize('merchant'), getProductsByMerchant);
router.get('/merchant/:merchantId', getProductsByMerchant);

// Create product (merchant only)
router.post('/', protect, authorize('merchant'), createProduct);

// Update product (merchant only) - must be before /:id GET route
router.put('/:id', protect, authorize('merchant'), updateProduct);

// Delete product (merchant only) - must be before /:id GET route
router.delete('/:id', protect, authorize('merchant'), deleteProduct);

// Get single product - must be LAST to avoid catching other routes
router.get('/:id', getProductById);

export default router;
