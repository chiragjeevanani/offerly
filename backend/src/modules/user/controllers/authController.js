import Joi from 'joi';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import OtpSession from '../models/OtpSession.js';
import Merchant from '../../merchant/models/Merchant.js';
import Admin from '../../admin/models/Admin.js';
import AdminNotification from '../../admin/models/AdminNotification.js';
import ReferralHistory from '../models/ReferralHistory.js';
import { emitAdminNotification } from '../../../config/socket.js';
import { generateOTP, hashOtp, isDevOtpNumber, sendSMS } from '../../../utils/sms.js';
import { normalizePhone } from '../../../utils/phone.js';
import { serializeUser } from '../../../utils/serializers.js';

const signAuthToken = (userId, role = 'customer') =>
  jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });

const signVerificationToken = (payload) =>
  jwt.sign({ ...payload, kind: 'otp_verified' }, process.env.JWT_SECRET, {
    expiresIn: '15m',
  });

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildPhoneQuery = (phone) => {
  const normalized = normalizePhone(phone);
  const suffixRegex = new RegExp(`${escapeRegex(normalized)}$`);

  return {
    $or: [
      { phone: normalized },       // normalized format (9876543210)
      { phone: `91${normalized}` }, // country code without plus
      { phone: `+91${normalized}` }, // country code with plus
      { phone: { $regex: suffixRegex } }, // legacy formatted values (+91 98765 43210 etc.)
    ],
  };
};

const findUserByPhone = async (Model, phone) => {
  return Model.findOne(buildPhoneQuery(phone));
};

const baseSchema = Joi.object({
  phone: Joi.string().required(),
  role: Joi.string().valid('customer', 'merchant').required(),
  purpose: Joi.string().valid('login', 'register').required(),
});

export const sendOtp = async (req, res) => {
  const schema = baseSchema;
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const phone = normalizePhone(req.body.phone);
  const { role, purpose } = req.body;

  console.log(`[SendOTP] Attempting to send OTP: phone=${phone}, role=${role}, purpose=${purpose}`);

  try {
    const Model = role === 'merchant' ? Merchant : User;
    const existingUser = await findUserByPhone(Model, phone);

    console.log(`[SendOTP] User search result: ${existingUser ? 'Found' : 'Not Found'}`);

    if (purpose === 'login') {
      if (!existingUser) {
        console.log(`[SendOTP] Login failed: Account not found for phone ${phone}`);
        return res.status(404).json({ success: false, error: 'Account not found for this role' });
      }
    }

    if (purpose === 'register' && existingUser) {
      console.log(`[SendOTP] Signup failed: Account already exists for phone ${phone}`);
      return res.status(400).json({ success: false, error: 'Phone number already registered' });
    }

    const otp = isDevOtpNumber(phone, role) ? process.env.DEFAULT_DEV_OTP || '123456' : generateOTP();
    console.log(`\n🔑 [DEV OTP] Phone: ${phone} | Role: ${role} | OTP: ${otp}\n`);
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    console.log(`[SendOTP] Creating/Updating OTP session. DevMode: ${isDevOtpNumber(phone, role)}`);

    await OtpSession.findOneAndUpdate(
      { phone, role, purpose },
      { phone, role, purpose, otpHash, expiresAt, attemptCount: 0, verifiedAt: null },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const smsResult = await sendSMS(phone, otp, role);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      devMode: Boolean(smsResult.skipped),
    });
  } catch (err) {
    console.error('[SendOTP] Error:', err);
    res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
};

export const verifyOtp = async (req, res) => {
  const schema = baseSchema.keys({
    otp: Joi.string().length(6).required(),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const phone = normalizePhone(req.body.phone);
  const { role, purpose, otp } = req.body;

  console.log(`[VerifyOTP] Attempting to verify OTP: phone=${phone}, role=${role}, purpose=${purpose}`);

  try {
    let session = await OtpSession.findOne({ phone, role, purpose });
    const devOtp = process.env.DEFAULT_DEV_OTP || '123456';
    const isDev = isDevOtpNumber(phone, role);
    
    if (!session) {
      if (isDev && otp === devOtp) {
        session = await OtpSession.create({
          phone,
          role,
          purpose,
          otpHash: hashOtp(devOtp),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attemptCount: 0,
          verifiedAt: new Date(),
        });
      } else {
        console.log(`[VerifyOTP] Failed: No session found for ${phone}`);
        return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
      }
    }

    if (session.expiresAt <= new Date()) {
      if (isDev && otp === devOtp) {
        session.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      } else {
        console.log(`[VerifyOTP] Failed: Session expired for ${phone}`);
        return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
      }
    }

    if (session.attemptCount >= 3 && !(isDev && otp === devOtp)) {
      console.log(`[VerifyOTP] Failed: Too many attempts for ${phone}`);
      return res.status(400).json({ success: false, error: 'Too many attempts. Please request a new OTP.' });
    }

    const isValid = session.otpHash === hashOtp(otp) || (isDev && otp === devOtp);
    if (!isValid) {
      console.log(`[VerifyOTP] Failed: Hash mismatch for ${phone}`);
      session.attemptCount += 1;
      await session.save();
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    }

    console.log(`[VerifyOTP] Success: OTP verified for ${phone}`);
    session.verifiedAt = new Date();
    session.attemptCount = 0;
    await session.save();

    if (purpose === 'login') {
      const Model = role === 'merchant' ? Merchant : User;
      const user = await findUserByPhone(Model, phone);
      if (!user) {
        console.log(`[VerifyOTP] Login failed: User not found despite verified OTP (should not happen normally)`);
        return res.status(404).json({ success: false, error: 'Account not found for this role' });
      }

      const token = signAuthToken(user._id, role);
      return res.status(200).json({
        success: true,
        token,
        user: serializeUser(user),
        isNewUser: false,
      });
    }

    const verificationToken = signVerificationToken({ phone, role, purpose });
    return res.status(200).json({
      success: true,
      verificationToken,
      isNewUser: true,
    });
  } catch (err) {
    console.error('[VerifyOTP] Error:', err);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
};

const registerSchema = Joi.object({
  verificationToken: Joi.string().required(),
  name: Joi.string().required(),
  email: Joi.string().email().allow('', null),
  phone: Joi.string().required(),
  age: Joi.alternatives().try(Joi.number(), Joi.string().allow('')),
  gender: Joi.string().allow('', null),
  address: Joi.string().allow('', null),
  city: Joi.string().allow('', null),
  profilePhoto: Joi.string().allow('', null),
  userType: Joi.string().allow('', null), // Allow but ignore
  businessType: Joi.string().allow('', null),
  referralCode: Joi.string().allow('', null),
});

export const registerCustomer = async (req, res) => {
  const { error } = registerSchema.validate(req.body);
  if (error) {
    console.error('Validation error:', error.details[0].message);
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    console.log('Register customer request:', req.body);
    
    const decoded = jwt.verify(req.body.verificationToken, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
    
    if (decoded.kind !== 'otp_verified' || decoded.role !== 'customer' || decoded.purpose !== 'register') {
      console.error('Invalid token kind/role/purpose:', decoded);
      return res.status(401).json({ success: false, error: 'Invalid verification token' });
    }

    const phone = normalizePhone(req.body.phone);
    console.log('Normalized phone:', phone, 'Decoded phone:', decoded.phone);
    
    if (phone !== decoded.phone) {
      console.error('Phone mismatch:', phone, 'vs', decoded.phone);
      return res.status(400).json({ success: false, error: 'Phone mismatch' });
    }

    const existing = await findUserByPhone(User, phone);
    if (existing) {
      console.error('User already exists:', phone);
      return res.status(400).json({ success: false, error: 'Phone number already registered' });
    }

    const referralCode = `${req.body.name.trim().toUpperCase().replace(/\s/g, '').slice(0, 5)}${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    // Handle Referral logic
    let referrer = null;
    if (req.body.referralCode) {
      referrer = await User.findOne({ 
        referralCode: req.body.referralCode.trim().toUpperCase() 
      });
    }

    const user = await User.create({
      name: req.body.name,
      email: req.body.email || undefined,
      phone,
      age: req.body.age || undefined,
      gender: req.body.gender || undefined,
      address: req.body.address || '',
      city: req.body.city || '',
      profilePhoto: req.body.profilePhoto || '',
      role: 'customer',
      status: 'active',
      credits: referrer ? 20 : 0, // Bonus credits for being referred
      referralCode,
      referredBy: referrer ? referrer._id : null,
    });

    if (referrer) {
      const bonusAmount = 50;
      await User.findByIdAndUpdate(referrer._id, { $inc: { credits: bonusAmount } });
      
      await ReferralHistory.create({
        userId: referrer._id,
        referredUserId: user._id,
        amount: bonusAmount,
        description: `Referral bonus for inviting ${user.name}`
      });

      // History for the referred user as well
      await ReferralHistory.create({
        userId: user._id,
        referredUserId: referrer._id,
        amount: 20,
        description: `Welcome bonus for joining via referral from ${referrer.name}`
      });
    }

    console.log('User created successfully:', user._id);

    await OtpSession.deleteOne({ phone, role: 'customer', purpose: 'register' });

    const token = signAuthToken(user._id, 'customer');
    res.status(201).json({ success: true, token, user: serializeUser(user) });
  } catch (err) {
    console.error('Registration error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ success: false, error: 'Customer registration failed' });
  }
};

export const registerMerchantUser = async (req, res) => {
  const { error } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const decoded = jwt.verify(req.body.verificationToken, process.env.JWT_SECRET);
    if (decoded.kind !== 'otp_verified' || decoded.role !== 'merchant' || decoded.purpose !== 'register') {
      return res.status(401).json({ success: false, error: 'Invalid verification token' });
    }

    const phone = normalizePhone(req.body.phone);
    if (phone !== decoded.phone) {
      return res.status(400).json({ success: false, error: 'Phone mismatch' });
    }

    const existing = await findUserByPhone(Merchant, phone);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Phone number already registered' });
    }

    const merchant = new Merchant({
      ownerName: req.body.name,
      email: req.body.email || undefined,
      phone,
      businessType: req.body.businessType || '',
      role: 'merchant',
      status: 'pending',
      onboardingStep: 0, // Changed from 'initial' to 0
      hasRequestedStore: false,
    });
    
    // Set ownerId to self ID to satisfy unique index and link with other features
    merchant.ownerId = merchant._id;
    await merchant.save();

    // Notify Admins
    const notification = await AdminNotification.create({
      title: 'New Merchant Registration',
      body: `${req.body.name} has registered and is waiting for approval.`,
      type: 'merchant_signup',
      data: { merchantId: merchant._id }
    });
    emitAdminNotification(notification);

    await OtpSession.deleteOne({ phone, role: 'merchant', purpose: 'register' });

    const token = signAuthToken(merchant._id, 'merchant');
    res.status(201).json({ success: true, token, user: serializeUser(merchant) });
  } catch (err) {
    console.error('Merchant registration error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ success: false, error: 'Merchant user registration failed' });
  }
};

export const adminLogin = async (req, res) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const { email, password } = req.body;

  try {
    const adminUser = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
    if (!adminUser || !(await adminUser.comparePassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = signAuthToken(adminUser._id, 'admin');
    res.status(200).json({
      success: true,
      token,
      user: adminUser,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
};
