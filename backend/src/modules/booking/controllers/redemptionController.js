import Joi from 'joi';
import RedemptionModel from '../models/Redemption.js';
import Merchant from '../../merchant/models/Merchant.js';
import Offer from '../../merchant/models/Offer.js';
import Product from '../../merchant/models/Product.js';
import User from '../../user/models/User.js';
import { notifyMerchant, notifyUser } from '../../user/services/notificationService.js';
import { invalidateFeedCache } from '../../../utils/feedCache.js';
import { checkAndAwardMilestone } from '../../rewards/services/milestoneService.js';
import { getWalletSettings } from '../../../utils/subscriptionWallet.js';
import { getCustomerSubscriptionStatus } from '../../../utils/customerSubscription.js';
import DiscountWalletTransaction from '../../payment/models/DiscountWalletTransaction.js';
import { resolveLine, stockError, decrementStockForItems } from '../../merchant/services/inventoryService.js';

// @desc    Create a redemption/booking
// @route   POST /api/redemptions
// @access  Private (Customer Only)
export const createRedemption = async (req, res) => {
  const schema = Joi.object({
    offerId: Joi.string().allow(null),
    merchantId: Joi.string().required(),
    items: Joi.array().items(Joi.object({
      productId: Joi.string().required(),
      variantId: Joi.string().allow(null, ''),
      product: Joi.object({
        id: Joi.string().required(),
        name: Joi.string().required(),
        category: Joi.string().allow('', null),
        price: Joi.number().required(),
        offerPrice: Joi.number().required(),
        image: Joi.string().allow('', null),
        variantLabel: Joi.string().allow('', null),
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

    const { enabled, isSubscribed } = await getCustomerSubscriptionStatus(req.user.id);
    if (enabled && !isSubscribed) {
      return res.status(403).json({
        success: false,
        error: 'An active subscription is required to claim offers.',
        code: 'SUBSCRIPTION_REQUIRED',
      });
    }

    // Stock check, and pin each line's variant + display name server-side so
    // the pass always says which size/colour was reserved.
    for (const item of items || []) {
      const line = await resolveLine({ productId: item.productId, variantId: item.variantId || null });
      if (line.error) {
        return res.status(400).json({ success: false, error: line.error, code: line.code });
      }
      const stockErr = stockError(line, item.qty);
      if (stockErr) {
        return res.status(400).json({ success: false, error: stockErr, code: 'OUT_OF_STOCK' });
      }
      item.variantId = line.variant?._id || null;
      item.product = { ...item.product, name: line.displayName, variantLabel: line.label };
    }

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

    // Notify the merchant: persisted record + live socket event + FCM push.
    // The socket keeps carrying the whole redemption (Bookings.jsx reads
    // `notification.data.customerName`); the push gets a small subset,
    // since FCM caps a message at 4KB.
    try {
      await notifyMerchant(merchantId.toString(), {
        type: 'new_booking',
        title: 'New booking request',
        body: `${redemption.customerName || 'A customer'} placed a request (#${internalId}).`,
        data: {
          redemptionId: redemption._id.toString(),
          internalId,
        },
        socketData: redemption,
        link: '/merchant/bookings',
      });
    } catch (notifyErr) {
      console.error('Merchant notification error (non-blocking):', notifyErr);
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

    updateTasks.push(decrementStockForItems(redemption.items));

    await Promise.all(updateTasks);

    const merchant = await Merchant.findById(redemption.merchantId).select("city").lean();
    invalidateFeedCache({ city: merchant?.city || "" });

    // Notify the customer: in-app record + live socket event + FCM push.
    // Awaited so the push actually goes out before the request ends, but
    // never allowed to fail the redemption itself.
    try {
      await notifyUser(redemption.customerId.toString(), {
        type: 'booking_fulfilled',
        title: 'Booking Fulfilled!',
        body: `Your booking #${redemption.internalId} has been verified and fulfilled.`,
        data: {
          redemptionId: redemption._id.toString(),
          internalId: redemption.internalId,
          status: 'completed',
        },
        link: `/redeem/${redemption._id}`,
      });
    } catch (notifyErr) {
      console.error('Customer notification error (non-blocking):', notifyErr);
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

const redemptionItemsSchema = Joi.object({
  items: Joi.array().min(1).items(Joi.object({
    productId: Joi.string().required(),
    variantId: Joi.string().allow(null, ''),
    qty: Joi.number().integer().min(1).required(),
  })).required().messages({
    'array.min': 'A booking must have at least one item. Cancel the booking instead of removing all items.',
  }),
});

// Re-snapshots `items` from the live catalogue onto a pending redemption and
// recomputes its totals. Prices always come from the DB, never the client.
// A new-customer wallet discount granted at claim time is kept, capped to the
// new payable amount. Returns an error string if any product is unavailable.
// With `checkStock`, lines whose quantity grew must fit in current stock.
const applyRedemptionItems = async (redemption, items, { checkStock = false } = {}) => {
  const lineKey = (productId, variantId) => `${productId}|${variantId || ''}`;
  const previousQty = new Map(
    redemption.items.map((it) => [lineKey(String(it.productId), it.variantId ? String(it.variantId) : ''), it.qty])
  );

  const products = await Product.find({
    _id: { $in: items.map((i) => i.productId) },
    merchantId: redemption.merchantId,
  }).populate('categoryId', 'name');
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const nextItems = [];
  for (const { productId, variantId, qty } of items) {
    const product = productMap.get(productId);
    if (!product) return `Product not found or unavailable: ${productId}`;
    const line = await resolveLine({ product, variantId: variantId || null });
    if (line.error) return line.error;
    if (checkStock && qty > (previousQty.get(lineKey(productId, variantId)) || 0)) {
      const stockErr = stockError(line, qty);
      if (stockErr) return stockErr;
    }
    nextItems.push({
      productId: product._id,
      variantId: line.variant?._id || null,
      product: {
        id: product._id.toString(),
        name: line.displayName,
        category: product.categoryId?.name || '',
        price: line.price,
        offerPrice: line.offerPrice,
        image: product.images?.[0] || '',
        variantLabel: line.label,
        isVeg: product.isVeg,
        duration: product.duration,
      },
      qty,
    });
  }
  redemption.items = nextItems;

  const base = Math.round(redemption.items.reduce((s, it) => s + it.product.price * it.qty, 0));
  const final = Math.round(redemption.items.reduce((s, it) => s + it.product.offerPrice * it.qty, 0));
  const walletDiscount = Math.max(0, Math.min(redemption.totals?.walletDiscount || 0, final));
  redemption.totals = {
    base,
    discount: base - final + walletDiscount,
    final: final - walletDiscount,
    original: base,
    walletDiscount,
  };

  return null;
};

// @desc    Update items on a pending redemption (merchant edits scanned cart)
// @route   PUT /api/redemptions/:id/items
// @access  Private (Merchant Only)
export const updateRedemptionItems = async (req, res) => {
  const { error } = redemptionItemsSchema.validate(req.body);
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

    const applyError = await applyRedemptionItems(redemption, req.body.items);
    if (applyError) {
      return res.status(400).json({ success: false, error: applyError });
    }

    await redemption.save();

    res.status(200).json({ success: true, data: redemption });
  } catch (err) {
    console.error('updateRedemptionItems error:', err);
    res.status(500).json({ success: false, error: 'Server Error while updating booking items' });
  }
};

// @desc    Update items on the customer's own pending redemption (edit after pickup generated)
// @route   PUT /api/redemptions/:id/my-items
// @access  Private (Customer, owner only)
export const updateMyRedemptionItems = async (req, res) => {
  const { error } = redemptionItemsSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const redemption = await RedemptionModel.findById(req.params.id);

    if (!redemption) {
      return res.status(404).json({ success: false, error: 'Redemption not found' });
    }

    if (redemption.customerId.toString() !== req.user.id.toString()) {
      return res.status(401).json({ success: false, error: 'Not authorized for this booking' });
    }

    if (redemption.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Cannot edit a ${redemption.status} booking` });
    }

    if (new Date(redemption.qrExpiry) < new Date()) {
      redemption.status = 'expired';
      await redemption.save();
      return res.status(400).json({ success: false, error: 'This pass has expired' });
    }

    // Same rule as the cart: adding or increasing items needs the store open,
    // trimming the booking down is always allowed.
    const { items } = req.body;
    const lineKey = (productId, variantId) => `${productId}|${variantId || ''}`;
    const previousQty = new Map(redemption.items.map((it) => [lineKey(it.productId, it.variantId), it.qty]));
    const isGrowing = items.some((i) => i.qty > (previousQty.get(lineKey(i.productId, i.variantId)) || 0));
    if (isGrowing) {
      const merchant = await Merchant.findById(redemption.merchantId).select('isOpen').lean();
      if (merchant && merchant.isOpen === false) {
        return res.status(400).json({ success: false, error: 'This store is closed for now' });
      }
    }

    const applyError = await applyRedemptionItems(redemption, items, { checkStock: true });
    if (applyError) {
      return res.status(400).json({ success: false, error: applyError });
    }

    await redemption.save();

    try {
      await notifyMerchant(redemption.merchantId.toString(), {
        type: 'booking_updated',
        title: 'Booking updated',
        body: `${redemption.customerName || 'A customer'} changed the items on #${redemption.internalId}.`,
        data: {
          redemptionId: redemption._id.toString(),
          internalId: redemption.internalId,
        },
        socketData: redemption,
        link: '/merchant/bookings',
      });
    } catch (notifyErr) {
      console.error('Merchant notification error (non-blocking):', notifyErr);
    }

    res.status(200).json({ success: true, data: redemption });
  } catch (err) {
    console.error('updateMyRedemptionItems error:', err);
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
