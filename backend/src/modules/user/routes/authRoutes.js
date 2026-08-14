import express from 'express';
import {
  sendOtp,
  verifyOtp,
  registerCustomer,
  registerMerchantUser,
  adminLogin,
} from '../controllers/authController.js';

const router = express.Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register-customer', registerCustomer);
router.post('/register-merchant-user', registerMerchantUser);
router.post('/admin-login', adminLogin);

export default router;
