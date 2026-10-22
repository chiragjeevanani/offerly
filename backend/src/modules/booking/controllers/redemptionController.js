import Joi from 'joi';
import mongoose from 'mongoose';
import { hasActiveMerchantSubscription } from '../../../utils/merchantSubscription.js';
import RedemptionModel from '../models/Redemption.js';
import Merchant from '../../merchant/models/Merchant.js';
import Offer from '../../merchant/models/Offer.js';
import Product from '../../merchant/models/Product.js';
import User from '../../user/models/User.js';
import { notifyMerchant, notifyUser } from '../../user/services/notificationService.js';
import { invalidateFeedCache } from '../../../utils/feedCache.js';
import { checkAndAwardMilestone } from '../../rewards/services/milestoneService.js';
import {
  checkAndAwardReferral,
  reserveReferralPoints,
  refundReferralPoints,
  releaseReferralPoints,
} from '../../user/services/referralService.js';
import { getIncentiveSettings, evaluateCustomerBonus, bonusAmountFor, allowedCreditSpend } from '../../user/services/incentiveService.js';
import { creditSettlementForRedemption } from '../../payment/services/settlementService.js';
import { getCustomerSubscriptionStatus } from '../../../utils/customerSubscription.js';
import DiscountWalletTransaction from '../../payment/models/DiscountWalletTransaction.js';
import { resolveLine, stockError } from '../../merchant/services/inventoryService.js';
import { calculateDistance } from '../../../utils/distance.js';
import { createRazorpayOrder } from '../../../utils/razorpay.js';
import {
  getDeliverySettings,
  deliveryFeeFor,
  giftFor,
  amountDue,
  generateDeliveryOtp,
  announceNewOrder,
  cancelDeliveryOrder,
  withoutSecrets,
  CANCELLABLE_STAGES,
  DELIVERY_ORDER_TTL_MS,
  PAYMENT_WINDOW_MS,
} from '../../delivery/services/deliveryService.js';
import {
  trackedLines,
  reserveLines,
  releaseLines,
  releaseStockHold,
  consumeStockForRedemption,
  rebalanceStockHold,
} from '../../merchant/services/stockService.js';

// Everything a pass gives back when it expires or is cancelled.
const releaseHolds = async (redemption) => {
  await releaseReferralPoints(redemption);
  await releaseStockHold(redemption);
};

// Builds pass line items from the live catalogue: name, price and offer price
// always come from the DB, never the client. `needsStockCheck(productId,
// variantId, qty)` says which lines must fit in current stock. Returns
// `{ items }` or `{ error, code }`.
const buildItemSnapshots = async (merchantId, items, needsStockCheck = () => false) => {
  const products = await Product.find({
    _id: { $in: items.map((i) => i.productId) },
    merchantId,
  }).populate('categoryId', 'name');
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const nextItems = [];
  for (const { productId, variantId, qty } of items) {
    const product = productMap.get(productId);
    if (!product) return { error: `Product not found or unavailable: ${productId}` };
    const line = await resolveLine({ product, variantId: variantId || null });
    if (line.error) return { error: line.error, code: line.code };
    if (needsStockCheck(productId, variantId, qty)) {
      const stockErr = stockError(line, qty);
      if (stockErr) return { error: stockErr, code: 'OUT_OF_STOCK' };
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
        foodType: product.foodType || (product.isVeg === true ? 'veg' : product.isVeg === false ? 'non_veg' : null),
        duration: product.duration,
      },
      qty,
    });
  }
  return { items: nextItems };
};

// @desc    Create a redemption/booking
// @route   POST /api/redemptions
// @access  Private (Customer Only)
export const createRedemption = async (req, res) => {
  const schema = Joi.object({
    offerId: Joi.string().allow(null),
    merchantId: Joi.string().required(),
    // Only the identity of each line is trusted from the client. Names, prices and
    // totals are rebuilt from the catalogue below, and the fields the client still
    // sends (product snapshot, totals) are accepted for compatibility but ignored.
    items: Joi.array().min(1).items(Joi.object({
      productId: Joi.string().required(),
      variantId: Joi.string().allow(null, ''),
      product: Joi.object().unknown(true),
      qty: Joi.number().integer().min(1).required(),
    })).required(),
    totals: Joi.object().unknown(true),
    useReferralPoints: Joi.boolean(),
    fulfillment: Joi.string().valid('pickup', 'delivery'),
    delivery: Joi.when('fulfillment', {
      is: 'delivery',
      then: Joi.object({
        paymentMode: Joi.string().valid('cod', 'online').required(),
        address: Joi.object({
          name: Joi.string().trim().min(2).max(60).required(),
          phone: Joi.string().trim().pattern(/^[6-9]\d{9}$/).required()
            .messages({ 'string.pattern.base': 'Enter a valid 10-digit mobile number' }),
          line1: Joi.string().trim().min(3).max(150).required(),
          line2: Joi.string().trim().max(150).allow(''),
          landmark: Joi.string().trim().max(100).allow(''),
          pincode: Joi.string().trim().pattern(/^\d{6}$/).allow('')
            .messages({ 'string.pattern.base': 'Enter a valid 6-digit pincode' }),
          lat: Joi.number().min(-90).max(90).allow(null),
          lng: Joi.number().min(-180).max(180).allow(null),
        }).required(),
      }).required(),
      otherwise: Joi.forbidden(),
    }),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const { offerId, merchantId } = req.body;
    const isDelivery = req.body.fulfillment === 'delivery';

    const { enabled, isSubscribed } = await getCustomerSubscriptionStatus(req.user.id);
    if (enabled && !isSubscribed) {
      return res.status(403).json({
        success: false,
        error: 'An active subscription is required to claim offers.',
        code: 'SUBSCRIPTION_REQUIRED',
      });
    }

    const idsValid = [merchantId, offerId, ...req.body.items.map((i) => i.productId), ...req.body.items.map((i) => i.variantId)]
      .filter(Boolean)
      .every((id) => mongoose.isValidObjectId(id));
    if (!idsValid) {
      return res.status(400).json({ success: false, error: 'Invalid booking request' });
    }

    // The store must be live: approved, inside its membership, and open.
    const merchantDoc = await Merchant.findById(merchantId).select('status isOpen discountWallet city coordinates deliveryOnly');
    if (!merchantDoc || merchantDoc.status !== 'approved' || !(await hasActiveMerchantSubscription(merchantDoc._id))) {
      return res.status(400).json({ success: false, error: 'This store is not accepting bookings right now', code: 'STORE_UNAVAILABLE' });
    }
    if (merchantDoc.isOpen === false) {
      return res.status(400).json({ success: false, error: 'This store is closed for now', code: 'STORE_CLOSED' });
    }

    // A delivery-only store (cloud kitchen) has no counter to collect from.
    if (!isDelivery && merchantDoc.deliveryOnly) {
      return res.status(400).json({ success: false, error: 'This store only delivers. Please choose Home Delivery.', code: 'DELIVERY_ONLY' });
    }

    // Delivery: switched on by the admin, a payment mode they allow, and
    // (when a radius is set) a drop pin close enough to the store.
    const deliverySettings = await getDeliverySettings();
    let distanceKm = null;
    if (isDelivery) {
      const { paymentMode, address } = req.body.delivery;
      if (!deliverySettings.enabled) {
        return res.status(400).json({ success: false, error: 'Home delivery is not available right now. Please choose pickup.', code: 'DELIVERY_DISABLED' });
      }
      if ((paymentMode === 'cod' && !deliverySettings.allowCod) || (paymentMode === 'online' && !deliverySettings.allowOnline)) {
        return res.status(400).json({ success: false, error: 'This payment method is not available for delivery', code: 'PAYMENT_MODE_UNAVAILABLE' });
      }
      const storeLat = merchantDoc.coordinates?.lat;
      const storeLng = merchantDoc.coordinates?.lng;
      const hasPin = typeof address.lat === 'number' && typeof address.lng === 'number';
      if (hasPin && storeLat && storeLng) {
        distanceKm = Math.round(calculateDistance(storeLat, storeLng, address.lat, address.lng) * 10) / 10;
      }
      if (deliverySettings.maxDistanceKm > 0) {
        if (distanceKm === null) {
          return res.status(400).json({ success: false, error: 'Please pin your delivery location on the map', code: 'LOCATION_REQUIRED' });
        }
        if (distanceKm > deliverySettings.maxDistanceKm) {
          return res.status(400).json({
            success: false,
            error: `This store delivers within ${deliverySettings.maxDistanceKm} km. Your address is ${distanceKm} km away.`,
            code: 'OUT_OF_RANGE',
          });
        }
      }
    }

    // When the claim is tied to an offer, that offer must belong to this store
    // and still be redeemable. maxRedemptions of 0 is treated as no cap.
    if (offerId) {
      const offer = await Offer.findById(offerId).select('merchantId status validFrom validTo maxRedemptions currentRedemptions').lean();
      const now = new Date();
      if (!offer || String(offer.merchantId) !== String(merchantId) || offer.status !== 'active') {
        return res.status(400).json({ success: false, error: 'This offer is no longer available', code: 'OFFER_UNAVAILABLE' });
      }
      if ((offer.validFrom && new Date(offer.validFrom) > now) || (offer.validTo && new Date(offer.validTo) < now)) {
        return res.status(400).json({ success: false, error: 'This offer has expired', code: 'OFFER_EXPIRED' });
      }
      if (offer.maxRedemptions > 0 && (offer.currentRedemptions || 0) >= offer.maxRedemptions) {
        return res.status(400).json({ success: false, error: 'This offer has reached its redemption limit', code: 'OFFER_LIMIT_REACHED' });
      }
    }

    // Merge repeated lines so one product can't dodge the stock check by being
    // split across several entries.
    const lineKey = (productId, variantId) => `${productId}|${variantId || ''}`;
    const merged = new Map();
    for (const { productId, variantId, qty } of req.body.items) {
      const key = lineKey(productId, variantId);
      const existing = merged.get(key);
      if (existing) existing.qty += qty;
      else merged.set(key, { productId, variantId: variantId || null, qty });
    }

    const built = await buildItemSnapshots(merchantDoc._id, [...merged.values()], () => true);
    if (built.error) {
      return res.status(400).json({ success: false, error: built.error, code: built.code });
    }
    const items = built.items;

    const base = Math.round(items.reduce((s, it) => s + it.product.price * it.qty, 0));
    const subtotal = Math.round(items.reduce((s, it) => s + it.product.offerPrice * it.qty, 0));

    // Customer Distribution Fund bonus (new user, returning, welcome back,
    // loyal, special day) - the biggest one that applies, paid from the
    // merchant's discount wallet and capped by what it holds. See incentiveService.
    const incentiveSettings = await getIncentiveSettings();
    const bonus = await evaluateCustomerBonus({
      customerId: req.user.id,
      merchantDoc,
      subtotal,
      settings: incentiveSettings,
    });
    const walletDiscount = bonus?.amount || 0;

    // Friendly ID generation (e.g. B-54321)
    const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const nums = Math.floor(10000 + Math.random() * 90000);
    const internalId = `${letter}-${nums}`;
    const redemptionId = new mongoose.Types.ObjectId();

    // Set the stock aside now, atomically, so two customers can't both book
    // the last unit. Given back if the pass expires or is cancelled.
    const stockLines = await trackedLines(items);
    if (stockLines.length) {
      const held = await reserveLines(stockLines, { redemptionId, passId: internalId });
      if (held.error) {
        return res.status(400).json({ success: false, error: held.error, code: 'OUT_OF_STOCK' });
      }
    }

    // Referral points the customer ticked to spend, 1 point = ₹1, capped at
    // what's left to pay. Taken off their balance now and returned if the
    // pass expires or is cancelled (see releaseReferralPoints).
    let referralDiscount = 0;
    try {
      referralDiscount = req.body.useReferralPoints
        ? await reserveReferralPoints(req.user.id, allowedCreditSpend(incentiveSettings, subtotal, subtotal - walletDiscount))
        : 0;
    } catch (pointsErr) {
      await releaseLines(stockLines, { redemptionId, passId: internalId });
      throw pointsErr;
    }

    const finalTotals = {
      base,
      original: base,
      discount: base - subtotal + walletDiscount + referralDiscount,
      final: subtotal - walletDiscount - referralDiscount,
      walletDiscount,
      referralDiscount,
      bonusType: bonus?.type || '',
      bonusLabel: bonus?.label || '',
      bonusRule: bonus?.rule,
      creditsMinOrder: incentiveSettings.credits.minOrderValue || 0,
      creditsMaxPerOrder: incentiveSettings.credits.maxPerOrder || 0,
    };

    // Delivery charge and the admin's free gift, both on the items total.
    const gift = giftFor(deliverySettings, subtotal, isDelivery ? 'delivery' : 'pickup');
    let delivery;
    if (isDelivery) {
      const { address } = req.body.delivery;
      const fee = deliveryFeeFor(deliverySettings, subtotal);
      // Nothing to charge online (points + free delivery cover it all): no gateway trip.
      const paymentMode = finalTotals.final + fee > 0 ? req.body.delivery.paymentMode : 'cod';
      const awaitingPayment = paymentMode === 'online';
      delivery = {
        status: awaitingPayment ? 'awaiting_payment' : deliverySettings.adminVerification ? 'verifying' : 'placed',
        address: {
          name: address.name,
          phone: address.phone,
          line1: address.line1,
          line2: address.line2 || '',
          landmark: address.landmark || '',
          pincode: address.pincode || '',
          lat: typeof address.lat === 'number' ? address.lat : undefined,
          lng: typeof address.lng === 'number' ? address.lng : undefined,
        },
        city: merchantDoc.city || '',
        distanceKm: distanceKm ?? undefined,
        fee,
        paymentMode,
        paymentStatus: 'unpaid',
        otp: generateDeliveryOtp(),
        partnerPayout: Math.max(0, Math.round(deliverySettings.partnerPayoutPerDelivery || 0)),
        placedAt: awaitingPayment ? undefined : new Date(),
      };
    }

    // Generate QR Token. A delivery order lives for a day (or the payment
    // window, until it is paid); a pickup pass for 2 hours.
    const qrToken = `qr_${merchantId}_${req.user.id}_${Date.now()}`;
    const ttl = !isDelivery
      ? 2 * 60 * 60 * 1000
      : delivery.status === 'awaiting_payment' ? PAYMENT_WINDOW_MS : DELIVERY_ORDER_TTL_MS;
    const qrExpiry = new Date(Date.now() + ttl);

    let redemption;
    try {
      redemption = await RedemptionModel.create({
        _id: redemptionId,
        stockHold: { status: stockLines.length ? 'held' : 'none', lines: stockLines },
        offerId,
        merchantId,
        customerId: req.user.id,
        customerName: req.user.name || '',
        items,
        totals: finalTotals,
        qrToken,
        qrExpiry,
        internalId,
        status: 'pending',
        fulfillment: isDelivery ? 'delivery' : 'pickup',
        ...(gift ? { freeGift: gift } : {}),
        ...(delivery ? { delivery } : {}),
      });
    } catch (createErr) {
      await refundReferralPoints(req.user.id, referralDiscount);
      await releaseLines(stockLines, { redemptionId, passId: internalId });
      throw createErr;
    }

    if (isDelivery) {
      if (delivery.status === 'placed' || delivery.status === 'verifying') {
        await announceNewOrder(redemption);
        return res.status(201).json({ success: true, data: redemption });
      }

      // Online: open a Razorpay order for items + delivery. The store hears
      // about the order once it is paid (verify-payment or the webhook).
      const amount = amountDue(redemption);
      try {
        const order = await createRazorpayOrder(amount, 'INR', `dlv_${internalId}_${Date.now()}`.slice(0, 40), {
          purpose: 'delivery_order',
          redemptionId: redemption._id.toString(),
          internalId,
          customerId: String(req.user.id),
        });
        redemption.delivery.razorpayOrderId = order.id;
        await redemption.save();
        return res.status(201).json({
          success: true,
          data: redemption,
          payment: {
            key: process.env.RAZORPAY_KEY_ID,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            customerDetails: { name: req.user.name, email: req.user.email, contact: req.user.phone },
          },
        });
      } catch (payErr) {
        console.error('Delivery payment order error:', payErr);
        redemption.status = 'cancelled';
        redemption.delivery.status = 'cancelled';
        redemption.delivery.cancelledBy = 'system';
        redemption.delivery.cancelReason = 'Payment could not be started';
        await redemption.save();
        await releaseHolds(redemption);
        return res.status(502).json({ success: false, error: 'Online payment is unavailable right now. Please try Cash on Delivery.', code: 'PAYMENT_UNAVAILABLE' });
      }
    }

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
        .select('+delivery.otp')
        .populate('merchantId', 'storeName logo address city phone locality avgRating totalReviews verified coordinates')
        .populate('offerId', 'title discountType discountValue validTo image category');

    if (!redemption) {
      return res.status(404).json({ success: false, error: 'Redemption not found' });
    }

    // The delivery handover code is for the customer's eyes only.
    const isOwner = String(redemption.customerId) === String(req.user._id || req.user.id);
    res.status(200).json({ success: true, data: isOwner ? redemption : withoutSecrets(redemption) });
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
      await releaseHolds(redemption);
      return res.status(400).json({ success: false, error: 'QR Token has expired' });
    }

    // Verify merchant ownership
    // req.user IS the merchant document for merchant role
    if (redemption.merchantId.toString() !== req.user._id.toString()) {
       return res.status(401).json({ success: false, error: 'Not authorized for this merchant' });
    }

    // Delivery orders are completed by the delivery partner at the door.
    if (redemption.fulfillment === 'delivery') {
      return res.status(400).json({ success: false, error: 'This is a delivery order. It is completed by the delivery partner.' });
    }

    // Mark complete
    redemption.status = 'completed';
    redemption.scannedAt = Date.now();
    await redemption.save();

    await runCompletionEffects(redemption);

    res.status(200).json({ success: true, message: 'Redemption successful', data: redemption });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
};

// Everything that follows a pass being completed, whether scanned at the store
// or handed over by a delivery partner: counters, savings, wallet debit, stock,
// settlement credit, feed cache, customer notification, referral and milestone.
// Call once, right after saving status 'completed'.
export const runCompletionEffects = async (
  redemption,
  {
    title = 'Booking Fulfilled!',
    body = `Your booking #${redemption.internalId} has been verified and fulfilled.`,
  } = {}
) => {
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
    // Other bonuses are always debited; the new-user one only if this really
    // is the customer's first completed visit (passes before bonus types
    // existed are all new-user discounts).
    if (redemption.totals?.walletDiscount > 0) {
      const isNewUserBonus = !redemption.totals.bonusType || redemption.totals.bonusType === 'newUser';
      const hasOtherCompleted = isNewUserBonus && await RedemptionModel.exists({
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
                note: `${redemption.totals.bonusLabel || 'New User Bonus'} granted at redemption`,
              })
            )
          );
        }
      }
    }

    updateTasks.push(consumeStockForRedemption(redemption));

    await Promise.all(updateTasks);

    // The store collected less than the bill by the points + bonus on this
    // pass; Offerly owes it that amount (settlement wallet). Never allowed to
    // fail the scan - the flag on the pass lets it be retried.
    try {
      await creditSettlementForRedemption(redemption);
    } catch (settleErr) {
      console.error('Settlement credit error (non-blocking):', settleErr);
    }

    const merchant = await Merchant.findById(redemption.merchantId).select("city").lean();
    invalidateFeedCache({ city: merchant?.city || "" });

    // Notify the customer: in-app record + live socket event + FCM push.
    // Awaited so the push actually goes out before the request ends, but
    // never allowed to fail the redemption itself.
    try {
      await notifyUser(redemption.customerId.toString(), {
        type: 'booking_fulfilled',
        title,
        body,
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

    try {
      await checkAndAwardReferral(redemption);
    } catch (referralErr) {
      console.error('[Referral] Award error (non-blocking):', referralErr);
    }

    // Check & award milestone rewards in background (non-blocking)
    try {
      checkAndAwardMilestone(redemption.customerId).catch((err) => {
        console.error('[Milestone] Async check failed:', err);
      });
    } catch (milestoneErr) {
      console.error('[Milestone] Trigger error:', milestoneErr);
    }
};

// @desc    Get redemptions for merchant
// @route   GET /api/redemptions/merchant
// @access  Private (Merchant Only)
export const getMerchantRedemptions = async (req, res) => {
  try {
    // req.user IS the merchant document for merchant role
    // Online-pay delivery orders reach the store only once paid, and (when the
    // admin verifies orders first) once the admin has confirmed them.
    const redemptions = await RedemptionModel.find({ merchantId: req.user._id, 'delivery.status': { $nin: ['awaiting_payment', 'verifying'] } })
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

    if (redemption.fulfillment === 'delivery') {
      return res.status(400).json({ success: false, error: `"${internalId}" is a delivery order. Manage it from Bookings; the delivery partner completes it.` });
    }

    if (redemption.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Pass ID "${internalId}" has already been ${redemption.status}.` });
    }

    if (new Date(redemption.qrExpiry) < new Date()) {
      redemption.status = 'expired';
      await redemption.save();
      await releaseHolds(redemption);
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

  // A pass holding stock is checked by re-balancing its hold below (its own
  // reserved units count as its own). Older passes keep the plain check.
  const isHeld = redemption.stockHold?.status === 'held';
  const built = await buildItemSnapshots(
    redemption.merchantId,
    items,
    (productId, variantId, qty) => !isHeld && checkStock && qty > (previousQty.get(lineKey(productId, variantId)) || 0)
  );
  if (built.error) return built.error;

  // Customers can only grow a pass into stock that's free; a merchant editing
  // at the counter can see the shelf, so their edits are always honoured.
  const holdError = await rebalanceStockHold(redemption, built.items, { force: !checkStock });
  if (holdError) return holdError;
  redemption.items = built.items;

  const base = Math.round(redemption.items.reduce((s, it) => s + it.product.price * it.qty, 0));
  const final = Math.round(redemption.items.reduce((s, it) => s + it.product.offerPrice * it.qty, 0));
  // The bonus is re-worked under the rule it was granted with: it drops off
  // if the bill falls below that rule's minimum, and never grows past what
  // was granted (the store's wallet was only checked for that much).
  const prev = redemption.totals || {};
  const previousBonus = prev.walletDiscount || 0;
  const savedRule = prev.bonusRule?.discountType
    ? {
        discountType: prev.bonusRule.discountType,
        value: prev.bonusRule.value,
        maxDiscount: prev.bonusRule.maxDiscount,
        minOrderValue: prev.bonusRule.minOrderValue,
      }
    : undefined;
  const rule = savedRule ? { ...savedRule, enabled: true } : null;
  const walletDiscount = rule
    ? Math.min(previousBonus, bonusAmountFor(rule, final))
    : Math.max(0, Math.min(previousBonus, final));

  // Referral points stay applied, but never more than the new bill or the
  // per-order cap, and not at all below the minimum order. Any points that no
  // longer fit go straight back to the customer.
  const previousReferral = prev.referralDiscount || 0;
  const creditRoom = allowedCreditSpend(
    { credits: { minOrderValue: prev.creditsMinOrder || 0, maxPerOrder: prev.creditsMaxPerOrder || 0 } },
    final,
    final - walletDiscount
  );
  const referralDiscount = Math.max(0, Math.min(previousReferral, creditRoom));
  await refundReferralPoints(redemption.customerId, previousReferral - referralDiscount);

  redemption.totals = {
    base,
    discount: base - final + walletDiscount + referralDiscount,
    final: final - walletDiscount - referralDiscount,
    original: base,
    walletDiscount,
    referralDiscount,
    bonusType: walletDiscount > 0 ? prev.bonusType || '' : '',
    bonusLabel: walletDiscount > 0 ? prev.bonusLabel || '' : '',
    bonusRule: walletDiscount > 0 ? savedRule : undefined,
    creditsMinOrder: prev.creditsMinOrder || 0,
    creditsMaxPerOrder: prev.creditsMaxPerOrder || 0,
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

    // A delivery order is priced and (maybe) paid as placed; it can only be cancelled.
    if (redemption.fulfillment === 'delivery') {
      return res.status(400).json({ success: false, error: "Items on a delivery order can't be changed. Cancel it and place a new order instead." });
    }

    if (new Date(redemption.qrExpiry) < new Date()) {
      redemption.status = 'expired';
      await redemption.save();
      await releaseHolds(redemption);
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

    // A delivery order is priced and (maybe) paid as placed; it can only be cancelled.
    if (redemption.fulfillment === 'delivery') {
      return res.status(400).json({ success: false, error: "Items on a delivery order can't be changed. Cancel it and place a new order instead." });
    }

    if (new Date(redemption.qrExpiry) < new Date()) {
      redemption.status = 'expired';
      await redemption.save();
      await releaseHolds(redemption);
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

    // Delivery: only before the partner has it; refunds an online payment.
    if (redemption.fulfillment === 'delivery') {
      if (!CANCELLABLE_STAGES.includes(redemption.delivery?.status)) {
        return res.status(400).json({ success: false, error: 'The delivery partner already has this order' });
      }
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 200) : '';
      const cancelled = await cancelDeliveryOrder(redemption, { by: 'store', reason });
      if (!cancelled) {
        return res.status(409).json({ success: false, error: 'This order changed just now. Please refresh.' });
      }
      return res.status(200).json({ success: true, data: withoutSecrets(cancelled) });
    }

    redemption.status = 'cancelled';
    await redemption.save();
    await releaseHolds(redemption);

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
      await releaseHolds(redemption);
      return res.status(400).json({ success: false, error: 'QR Token has expired' });
    }

    // Verify merchant ownership
    if (redemption.merchantId.toString() !== req.user._id.toString()) {
       return res.status(401).json({ success: false, error: 'Not authorized for this merchant' });
    }

    if (redemption.fulfillment === 'delivery') {
      return res.status(400).json({ success: false, error: 'This is a delivery order. It is completed by the delivery partner.' });
    }

    res.status(200).json({ success: true, data: redemption });
  } catch (err) {
    console.error('previewQR error:', err);
    res.status(500).json({ success: false, error: 'Server Error while previewing QR' });
  }
};
