import express from "express";

import { authorize, protect } from "../../../middlewares/auth.js";
import {
  createMerchantPlanOrder,
  getMerchantPlanStatus,
  razorpayWebhook,
  verifyMerchantPlanPayment,
} from "../controllers/paymentController.js";

const router = express.Router();

router.post("/merchant-plan/order", protect, authorize("merchant"), createMerchantPlanOrder);
router.post("/merchant-plan/verify", protect, authorize("merchant"), verifyMerchantPlanPayment);
router.post("/razorpay/webhook", razorpayWebhook);
router.get(
  "/merchant-plan/status/:applicationId",
  protect,
  authorize("merchant", "admin"),
  getMerchantPlanStatus,
);

export default router;
