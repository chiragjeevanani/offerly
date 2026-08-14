import Joi from 'joi';
import RedemptionModel from '../models/Redemption.js';
import Merchant from '../../merchant/models/Merchant.js';
import Offer from '../../merchant/models/Offer.js';
import { emitUserNotification, emitMerchantNotification } from '../../../config/socket.js';
import { invalidateFeedCache } from '../../../utils/feedCache.js';
import { checkAndAwardMilestone } from '../../rewards/services/milestoneService.js';

// @desc    Create a redemption/booking
// @route   POST /api/redemptions
// @access  Private (Customer Only)
export const createRedemption = async (req, res) => {
  const schema = Joi.object({
    offerId: Joi.string().allow(null),
    merchantId: Joi.string().required(),
    items: Joi.array().items(Joi.object({
      productId: Joi.string().required(),
      product: Joi.object({
        id: Joi.string().required(),
        name: Joi.string().required(),
        category: Joi.string().allow('', null),
        price: Joi.number().required(),
        offerPrice: Joi.number().required(),
        isVeg: Joi.any(),
        duration: Joi.any()
      }).required(),
      qty: Joi.number().min(1).required(),
    })),
    totals: Joi.object({
      base: Joi.number().required(),
      discount: Joi.number().required(),
      final: Joi.number().required(),
      original: Joi.number().required(),
      subtotal: Joi.number(), // backward compatibility
      total: Joi.number(), // backward compatibility
    }),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const { offerId, merchantId, items, totals } = req.body;

    // Friendly ID generation (e.g. B-54321)
    const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const nums = Math.floor(10000 + Math.random() * 90000);
    const internalId = `${letter}-${nums}`;

    // Generate QR Token
    const qrToken = `qr_${merchantId}_${req.user.id}_${Date.now()}`;
    const qrExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    const redemption = await RedemptionModel.create({
      offerId,
      merchantId,
      customerId: req.user.id,
      customerName: req.user.name || '',
      items,
      totals,
      qrToken,
      qrExpiry,
      internalId,
      status: 'pending'
    });

    // Emit new booking notification to merchant
    try {
      emitMerchantNotification(merchantId.toString(), {
        type: 'new_booking',
        data: redemption
      });
    } catch (socketErr) {
      console.error('WebSocket emit error for merchant:', socketErr);
    }

    res.status(201).json({ success: true, data: redemption });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get redemptions for customer
// @route   GET /api/redemptions/customer
// @access  Private
export const getCustomerRedemptions = async (req, res) => {
  try {
    const redemptions = await RedemptionModel.find({ customerId: req.user.id })
        .populate('merchantId', 'storeName logo address')
        .populate('offerId', 'title')
        .sort('-createdAt');
        
    res.status(200).json({ success: true, count: redemptions.length, data: redemptions });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get single redemption by ID
// @route   GET /api/redemptions/:id
// @access  Private
export const getRedemptionById = async (req, res) => {
  try {
    const redemption = await RedemptionModel.findById(req.params.id)
        .populate('merchantId', 'storeName logo address city phone locality avgRating totalReviews verified')
        .populate('offerId', 'title discountType discountValue validTo image category');
        
    if (!redemption) {
      return res.status(404).json({ success: false, error: 'Redemption not found' });
    }

    res.status(200).json({ success: true, data: redemption });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Verify QR (for merchant)
// @route   POST /api/redemptions/verify-qr
// @access  Private (Merchant Only)
export const verifyQR = async (req, res) => {
  const schema = Joi.object({
    qrToken: Joi.string().required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const { qrToken } = req.body;

    const redemption = await RedemptionModel.findOne({ qrToken });

    if (!redemption) {
      return res.status(404).json({ success: false, error: 'Invalid QR Token' });
    }

    if (redemption.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Already ${redemption.status}` });
    }

    if (new Date(redemption.qrExpiry) < new Date()) {
      redemption.status = 'expired';
      await redemption.save();
      return res.status(400).json({ success: false, error: 'QR Token has expired' });
    }

    // Verify merchant ownership
    // req.user IS the merchant document for merchant role
    if (redemption.merchantId.toString() !== req.user._id.toString()) {
       return res.status(401).json({ success: false, error: 'Not authorized for this merchant' });
    }

    // Mark complete
    redemption.status = 'completed';
    redemption.scannedAt = Date.now();
    await redemption.save();

    const updateTasks = [
      Merchant.findByIdAndUpdate(redemption.merchantId, { $inc: { totalRedemptions: 1 } }),
    ];

    if (redemption.offerId) {
      updateTasks.push(
        Offer.findByIdAndUpdate(redemption.offerId, { $inc: { currentRedemptions: 1 } }),
      );
    }

    await Promise.all(updateTasks);

    const merchant = await Merchant.findById(redemption.merchantId).select("city").lean();
    invalidateFeedCache({ city: merchant?.city || "" });

    // Notify the customer via WebSocket
    try {
      emitUserNotification(redemption.customerId.toString(), {
        type: 'booking_fulfilled',
        title: 'Booking Fulfilled!',
        body: `Your booking #${redemption.internalId} has been verified and fulfilled.`,
        redemptionId: redemption._id,
        status: 'completed',
      });
    } catch (socketErr) {
      console.error('WebSocket emit error (non-blocking):', socketErr);
    }

    // Check & award milestone rewards in background (non-blocking)
    try {
      checkAndAwardMilestone(redemption.customerId).catch((err) => {
        console.error('[Milestone] Async check failed:', err);
      });
    } catch (milestoneErr) {
      console.error('[Milestone] Trigger error:', milestoneErr);
    }

    res.status(200).json({ success: true, message: 'Redemption successful', data: redemption });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
};

// @desc    Get redemptions for merchant
// @route   GET /api/redemptions/merchant
// @access  Private (Merchant Only)
export const getMerchantRedemptions = async (req, res) => {
  try {
    // req.user IS the merchant document for merchant role
    const redemptions = await RedemptionModel.find({ merchantId: req.user._id })
        .populate('offerId', 'title')
        .sort('-createdAt');
        
    res.status(200).json({ success: true, count: redemptions.length, data: redemptions });
  } catch (err) {
    console.error('getMerchantRedemptions error:', err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Lookup redemption by internalId (for merchant manual Pass ID entry)
// @route   GET /api/redemptions/lookup/:internalId
// @access  Private (Merchant Only)
export const lookupByInternalId = async (req, res) => {
  try {
    const { internalId } = req.params;

    const redemption = await RedemptionModel.findOne({
      internalId: internalId.toUpperCase(),
      merchantId: req.user._id,
    });

    if (!redemption) {
      return res.status(404).json({ success: false, error: `Pass ID "${internalId}" not found or belongs to another store.` });
    }

    if (redemption.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Pass ID "${internalId}" has already been ${redemption.status}.` });
    }

    if (new Date(redemption.qrExpiry) < new Date()) {
      redemption.status = 'expired';
      await redemption.save();
      return res.status(400).json({ success: false, error: `Pass ID "${internalId}" has expired.` });
    }

    res.status(200).json({ success: true, data: redemption });
  } catch (err) {
    console.error('lookupByInternalId error:', err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Preview QR (for merchant scanner before fulfilling)
// @route   POST /api/redemptions/preview-qr
// @access  Private (Merchant Only)
export const previewQR = async (req, res) => {
  const schema = Joi.object({
    qrToken: Joi.string().required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const { qrToken } = req.body;

    const redemption = await RedemptionModel.findOne({ qrToken });

    if (!redemption) {
      return res.status(404).json({ success: false, error: 'Invalid QR Token' });
    }

    if (redemption.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Already ${redemption.status}` });
    }

    if (new Date(redemption.qrExpiry) < new Date()) {
      redemption.status = 'expired';
      await redemption.save();
      return res.status(400).json({ success: false, error: 'QR Token has expired' });
    }

    // Verify merchant ownership
    if (redemption.merchantId.toString() !== req.user._id.toString()) {
       return res.status(401).json({ success: false, error: 'Not authorized for this merchant' });
    }

    res.status(200).json({ success: true, data: redemption });
  } catch (err) {
    console.error('previewQR error:', err);
    res.status(500).json({ success: false, error: 'Server Error while previewing QR' });
  }
};
