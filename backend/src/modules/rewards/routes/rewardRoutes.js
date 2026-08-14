import express from 'express';
import { protect, authorize } from '../../../middlewares/auth.js';
import {
  getMyProgress,
  getMyCards,
  scratchCard,
  getAdminMilestones,
  createAdminMilestone,
  updateAdminMilestone,
  deleteAdminMilestone,
  getAdminRewards,
  createAdminReward,
  updateAdminReward,
  deleteAdminReward,
  getAdminCards,
  triggerMilestoneCheckAdmin,
} from '../controllers/rewardController.js';

const router = express.Router();

// ==========================================
// Customer Routes
// ==========================================
router.get('/progress', protect, getMyProgress);
router.get('/my-cards', protect, getMyCards);
router.post('/scratch/:cardId', protect, scratchCard);

// ==========================================
// Admin Routes
// ==========================================
router.get('/admin/milestones', protect, authorize('admin'), getAdminMilestones);
router.post('/admin/milestones', protect, authorize('admin'), createAdminMilestone);
router.put('/admin/milestones/:id', protect, authorize('admin'), updateAdminMilestone);
router.delete('/admin/milestones/:id', protect, authorize('admin'), deleteAdminMilestone);

router.get('/admin/rewards', protect, authorize('admin'), getAdminRewards);
router.post('/admin/rewards', protect, authorize('admin'), createAdminReward);
router.put('/admin/rewards/:id', protect, authorize('admin'), updateAdminReward);
router.delete('/admin/rewards/:id', protect, authorize('admin'), deleteAdminReward);

router.get('/admin/cards', protect, authorize('admin'), getAdminCards);
router.post('/admin/trigger-check', protect, authorize('admin'), triggerMilestoneCheckAdmin);

export default router;
