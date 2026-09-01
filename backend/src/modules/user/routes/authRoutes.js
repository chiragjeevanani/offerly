import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  sendOtp,
  verifyOtp,
  registerCustomer,
  registerMerchantUser,
  adminLogin,
} from '../controllers/authController.js';

const router = express.Router();

// These endpoints are unauthenticated by nature (that's the point of OTP/login),
// which otherwise leaves them open to SMS-bombing and brute-force guessing with
// no cost to the caller. Keyed by IP, so legitimate shared-network users don't
// get walled off by one bad actor for more than the window.
const otpRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many OTP requests, please try again later' },
});

const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later' },
});

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later' },
});

router.post('/send-otp', otpRequestLimiter, sendOtp);
router.post('/verify-otp', otpVerifyLimiter, verifyOtp);
router.post('/register-customer', registerCustomer);
router.post('/register-merchant-user', registerMerchantUser);
router.post('/admin-login', adminLoginLimiter, adminLogin);

export default router;
