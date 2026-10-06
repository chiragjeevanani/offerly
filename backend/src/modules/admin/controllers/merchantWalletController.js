import Joi from 'joi';
import mongoose from 'mongoose';
import Merchant from '../../merchant/models/Merchant.js';
import MerchantSubscription from '../../payment/models/MerchantSubscription.js';
import DiscountWalletTransaction from '../../payment/models/DiscountWalletTransaction.js';

const MAX_WALLET = 10_000_000;

const walletSnapshot = async (merchantId) => {
  const [merchant, subscription, transactions] = await Promise.all([
    Merchant.findById(merchantId).select('storeName discountWallet hasUsedFreeTrial').lean(),
    MerchantSubscription.findOne({ merchantId, planType: { $ne: 'advertisement' } })
      .populate('planId', 'name price duration')
      .sort({ createdAt: -1 })
      .lean(),
    DiscountWalletTransaction.find({ merchantId }).sort({ createdAt: -1 }).limit(25).lean(),
  ]);
  if (!merchant) return null;

  return {
    balance: merchant.discountWallet?.balance || 0,
    hasUsedFreeTrial: Boolean(merchant.hasUsedFreeTrial),
    subscription: subscription
      ? {
          plan: subscription.planId
            ? { id: subscription.planId._id, name: subscription.planId.name, price: subscription.planId.price, duration: subscription.planId.duration }
            : null,
          status: subscription.status,
          isTrial: Boolean(subscription.isTrial),
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          isExpired: Boolean(subscription.endDate && new Date(subscription.endDate) < new Date()),
        }
      : null,
    transactions: transactions.map((t) => ({
      id: t._id,
      type: t.type,
      amount: t.amount,
      balanceAfter: t.balanceAfter,
      note: t.note,
      createdAt: t.createdAt,
    })),
  };
};

// @desc    Merchant's discount wallet balance, membership and recent wallet history
// @route   GET /api/admin/merchants/:id/wallet
// @access  Private/Admin
export const getMerchantWallet = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, error: 'Invalid merchant ID format' });
  }
  try {
    const data = await walletSnapshot(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Merchant not found' });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('getMerchantWallet error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load wallet' });
  }
};

// @desc    Add to, deduct from, or set a merchant's discount wallet balance
// @route   PUT /api/admin/merchants/:id/wallet
// @access  Private/Admin
export const adjustMerchantWallet = async (req, res) => {
  const schema = Joi.object({
    action: Joi.string().valid('add', 'deduct', 'set').required(),
    amount: Joi.number().min(0).max(MAX_WALLET).required(),
    note: Joi.string().allow('').max(200).optional(),
  });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ success: false, error: error.details[0].message });
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, error: 'Invalid merchant ID format' });
  }

  const { action } = req.body;
  const amount = Math.round(req.body.amount);
  const note = (req.body.note || '').trim();
  const merchantId = req.params.id;

  try {
    const current = await Merchant.findById(merchantId).select('discountWallet').lean();
    if (!current) return res.status(404).json({ success: false, error: 'Merchant not found' });
    const before = current.discountWallet?.balance || 0;

    let updated;
    if (action === 'add') {
      if (amount <= 0) return res.status(400).json({ success: false, error: 'Enter an amount greater than 0' });
      updated = await Merchant.findOneAndUpdate(
        { _id: merchantId },
        { $inc: { 'discountWallet.balance': amount } },
        { new: true }
      );
    } else if (action === 'deduct') {
      if (amount <= 0) return res.status(400).json({ success: false, error: 'Enter an amount greater than 0' });
      // Conditional on balance so a concurrent customer-discount debit can't push it negative.
      updated = await Merchant.findOneAndUpdate(
        { _id: merchantId, 'discountWallet.balance': { $gte: amount } },
        { $inc: { 'discountWallet.balance': -amount } },
        { new: true }
      );
      if (!updated) {
        return res.status(400).json({ success: false, error: `Can't deduct ₹${amount} - the wallet only has ₹${before}` });
      }
    } else {
      updated = await Merchant.findOneAndUpdate(
        { _id: merchantId },
        { $set: { 'discountWallet.balance': amount } },
        { new: true }
      );
    }

    const after = updated.discountWallet?.balance || 0;
    const change = action === 'set' ? after - before : (action === 'add' ? amount : -amount);

    if (change !== 0) {
      await DiscountWalletTransaction.create({
        merchantId,
        type: change > 0 ? 'admin_credit' : 'admin_debit',
        amount: Math.abs(change),
        balanceAfter: after,
        note: note || (action === 'set' ? `Balance set to ₹${after} by admin` : `${change > 0 ? 'Added' : 'Deducted'} by admin`),
        adminId: req.user?._id || null,
      });
    }

    const data = await walletSnapshot(merchantId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('adjustMerchantWallet error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update wallet' });
  }
};
