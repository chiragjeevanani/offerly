import express from 'express';
import { authorize, protect } from '../../../middlewares/auth.js';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  getAllCategories,
  updateCategoryCounts,
} from '../controllers/categoryController.js';

const router = express.Router();

// Admin routes - protected
router.post('/', protect, authorize('admin'), createCategory);
router.get('/', protect, authorize('admin'), getAllCategories);
router.put('/:id', protect, authorize('admin'), updateCategory);
router.delete('/:id', protect, authorize('admin'), deleteCategory);
router.patch('/:id/toggle', protect, authorize('admin'), toggleCategoryStatus);
router.patch('/:id/update-counts', protect, authorize('admin'), updateCategoryCounts);

export default router;
