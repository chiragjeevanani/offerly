import Joi from 'joi';
import RedemptionModel from '../models/Redemption.js';
import Merchant from '../../merchant/models/Merchant.js';
import Offer from '../../merchant/models/Offer.js';
import Product from '../../merchant/models/Product.js';
import User from '../../user/models/User.js';
import { emitUserNotification, emitMerchantNotification } from '../../../config/socket.js';
import { invalidateFeedCache } from '../../../utils/feedCache.js';
import { checkAndAwardMilestone } from '../../rewards/services/milestoneService.js';
import { getWalletSettings } from '../../../utils/subscriptionWallet.js';
import DiscountWalletTransaction from '../../payment/models/DiscountWalletTransaction.js';

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

    // Extra discount for customers who've never completed a redemption anywhere
    // on the platform, funded from the merchant's discount wallet. Computed
    // server-side (never trust client-sent totals for this) and capped by
    // whatever the merchant's wallet actually holds right now.
    let walletDiscount = 0;
    const hasCompletedBefore = await RedemptionModel.exists({ customerId: req.user.id, status: 'completed' });
    if (!hasCompletedBefore) {
      const [merchantDoc, walletSettings] = await Promise.all([
        Merchant.findById(merchantId).select('discountWallet'),
        getWalletSettings(),
      ]);
      const configuredAmount = walletSettings?.newUserDiscountAmount || 0;
      const availableBalance = merchantDoc?.discountWallet?.balance || 0;
      walletDiscount = Math.max(0, Math.round(Math.min(configuredAmount, availableBalance, totals.final || 0)));
    }

    const finalTotals = {
      ...totals,
      discount: Math.round((totals.discount || 0) + walletDiscount),
      final: Math.round((totals.final || 0) - walletDiscount),
      walletDiscount,
    };

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
      totals: finalTotals,
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
        
    const calculatedSavings = redemptions.reduce((acc, r) => {
      const discount = r.totals?.discount || 0;
      if (discount > 0) return acc + discount;
      if (r.totals?.original && r.totals?.final && r.totals.original > r.totals.final) {
        return acc + (r.totals.original - r.totals.final);
      }
      const itemSavings = (r.items || []).reduce((sum, item) => {
        const orig = item.product?.price || 0;
        const offer = item.product?.offerPrice || 0;
        const qty = item.qty || 1;
        return sum + Math.max(0, (orig - offer) * qty);
      }, 0);
      return acc + itemSavings;
    }, 0);

    const userDoc = await User.findById(req.user.id).select('lifetimeSavings credits').lean();
    const finalSavings = Math.max(userDoc?.lifetimeSavings || 0, userDoc?.credits || 0, Math.round(calculatedSavings));

    res.status(200).json({ 
      success: true, 
      count: redemptions.length, 
      lifetimeSavings: finalSavings,
      data: redemptions 
    });
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

    const redemptionSavings = redemption.totals?.discount > 0 
      ? redemption.totals.discount 
      : (redemption.totals?.original && redemption.totals?.final && redemption.totals.original > redemption.totals.final
          ? (redemption.totals.original - redemption.totals.final)
          : (redemption.items || []).reduce((s, it) => s + Math.max(0, ((it.product?.price || 0) - (it.product?.offerPrice || 0)) * (it.qty || 1)), 0));

    if (redemptionSavings > 0) {
      updateTasks.push(
        User.findByIdAndUpdate(redemption.customerId, { $inc: { lifetimeSavings: Math.round(redemptionSavings) } })
      );
    }

    // Debit the merchant's wallet for the new-customer discount granted at
    // claim time - only if this is still their first-ever completed redemption
    // (it may not be, if another pending redemption elsewhere completed first)
    // and bounded by whatever balance the wallet actually has right now.
    if (redemption.totals?.walletDiscount > 0) {
      const hasOtherCompleted = await RedemptionModel.exists({
        customerId: redemption.customerId,
        status: 'completed',
        _id: { $ne: redemption._id },
      });

      if (!hasOtherCompleted) {
        const merchantForWallet = await Merchant.findById(redemption.merchantId).select('discountWallet');
        const currentBalance = merchantForWallet?.discountWallet?.balance || 0;
        const debit = Math.max(0, Math.min(redemption.totals.walletDiscount, currentBalance));

        if (debit > 0) {
          updateTasks.push(
            Merchant.findByIdAndUpdate(redemption.merchantId, { $inc: { 'discountWallet.balance': -debit } }).then(() =>
              DiscountWalletTransaction.create({
                merchantId: redemption.merchantId,
                type: 'customer_discount_debit',
                amount: debit,
                balanceAfter: currentBalance - debit,
                redemptionId: redemption._id,
                note: 'New-customer discount granted at redemption',
              })
            )
          );
        }
      }
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

// @desc    Update items on a pending redemption (merchant edits scanned cart)
// @route   PUT /api/redemptions/:id/items
// @access  Private (Merchant Only)
export const updateRedemptionItems = async (req, res) => {
  const schema = Joi.object({
    items: Joi.array().min(1).items(Joi.object({
      productId: Joi.string().required(),
      qty: Joi.number().min(1).required(),
    })).required().messages({
      'array.min': 'A booking must have at least one item. Cancel the booking instead of removing all items.',
    }),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const redemption = await RedemptionModel.findById(req.params.id);

    if (!redemption) {
      return res.status(404).json({ success: false, error: 'Redemption not found' });
    }

    // req.user IS the merchant document for merchant role
    if (redemption.merchantId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, error: 'Not authorized for this merchant' });
    }

    if (redemption.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Cannot edit a ${redemption.status} booking` });
    }

    if (new Date(redemption.qrExpiry) < new Date()) {
      redemption.status = 'expired';
      await redemption.save();
      return res.status(400).json({ success: false, error: 'QR Token has expired' });
    }

    const { items } = req.body;
    const productIds = items.map((i) => i.productId);

    const products = await Product.find({
      _id: { $in: productIds },
      merchantId: redemption.merchantId,
      isActive: true,
    }).populate('categoryId', 'name');

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));
    const missing = productIds.filter((id) => !productMap.has(id));
    if (missing.length) {
      return res.status(400).json({ success: false, error: `Product(s) not found or unavailable: ${missing.join(', ')}` });
    }

    redemption.items = items.map(({ productId, qty }) => {
      const p = productMap.get(productId);
      return {
        productId: p._id,
        product: {
          id: p._id.toString(),
          name: p.name,
          category: p.categoryId?.name || '',
          price: p.price,
          offerPrice: p.offerPrice,
          isVeg: p.isVeg,
          duration: p.duration,
        },
        qty,
      };
    });

    const base = redemption.items.reduce((s, it) => s + it.product.price * it.qty, 0);
    const final = redemption.items.reduce((s, it) => s + it.product.offerPrice * it.qty, 0);
    redemption.totals = {
      base: Math.round(base),
      discount: Math.round(base - final),
      final: Math.round(final),
      original: Math.round(base),
    };

    await redemption.save();

    res.status(200).json({ success: true, data: redemption });
  } catch (err) {
    console.error('updateRedemptionItems error:', err);
    res.status(500).json({ success: false, error: 'Server Error while updating booking items' });
  }
};

// @desc    Cancel a pending redemption (merchant rejects the whole booking)
// @route   POST /api/redemptions/:id/cancel
// @access  Private (Merchant Only)
export const cancelRedemption = async (req, res) => {
  try {
    const redemption = await RedemptionModel.findById(req.params.id);

    if (!redemption) {
      return res.status(404).json({ success: false, error: 'Redemption not found' });
    }

    if (redemption.merchantId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, error: 'Not authorized for this merchant' });
    }

    if (redemption.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Cannot cancel a ${redemption.status} booking` });
    }

    redemption.status = 'cancelled';
    await redemption.save();

    res.status(200).json({ success: true, data: redemption });
  } catch (err) {
    console.error('cancelRedemption error:', err);
    res.status(500).json({ success: false, error: 'Server Error while cancelling booking' });
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
