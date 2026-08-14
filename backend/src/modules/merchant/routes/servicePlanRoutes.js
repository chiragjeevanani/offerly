import express from 'express';
import {
  getServicePlans,
  getServicePlanById,
  createServicePlan,
  updateServicePlan,
  deleteServicePlan
} from '../controllers/servicePlanController.js';
import { protect } from '../../../middlewares/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getServicePlans)
  .post(createServicePlan);

router.route('/:id')
  .get(getServicePlanById)
  .put(updateServicePlan)
  .delete(deleteServicePlan);

export default router;
